import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

class ApiClient {
  ApiClient({
    Dio? dio,
    required SecureStorageService storage,
  })  : _storage = storage,
        _dio = dio ?? Dio(BaseOptions(baseUrl: ApiConstants.baseUrl)) {
    if (kDebugMode) {
      _dio.interceptors.add(
        LogInterceptor(
          requestHeader: true,
          requestBody: true,
          responseHeader: false,
          responseBody: true,
          error: true,
          logPrint: (obj) => debugPrint(obj.toString()),
        ),
      );
    }
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final isRefreshCall = options.path == ApiConstants.refresh;
          final language = await _storage.read(SecureStorageService.languageKey);

          if (!isRefreshCall) {
            final token = await _storage.read(SecureStorageService.accessTokenKey);
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }

          options.headers['Accept-Language'] = language ?? 'tr';
          handler.next(options);
        },
        onError: (error, handler) async {
          final requestPath = error.requestOptions.path;
          final isRefreshCall = requestPath == ApiConstants.refresh;

          if (error.response?.statusCode == 401 && !isRefreshCall) {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              final retryOptions = Options(
                method: error.requestOptions.method,
                headers: Map<String, dynamic>.from(error.requestOptions.headers),
                contentType: error.requestOptions.contentType,
                responseType: error.requestOptions.responseType,
                sendTimeout: error.requestOptions.sendTimeout,
                receiveTimeout: error.requestOptions.receiveTimeout,
                extra: Map<String, dynamic>.from(error.requestOptions.extra),
              );

              final retryToken = await _storage.read(
                SecureStorageService.accessTokenKey,
              );

              if (retryToken != null && retryToken.isNotEmpty) {
                retryOptions.headers ??= <String, dynamic>{};
                retryOptions.headers!['Authorization'] = 'Bearer $retryToken';
              }

              try {
                final response = await _dio.request<dynamic>(
                  error.requestOptions.path,
                  data: error.requestOptions.data,
                  queryParameters: error.requestOptions.queryParameters,
                  options: retryOptions,
                );
                handler.resolve(response);
                return;
              } on DioException catch (retryError) {
                handler.next(retryError);
                return;
              }
            }
          }

          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final SecureStorageService _storage;

  Dio get client => _dio;

  Future<bool> _tryRefreshToken() async {
    final refreshToken = await _storage.read(
      SecureStorageService.refreshTokenKey,
    );

    if (refreshToken == null || refreshToken.isEmpty) {
      await _storage.clearAuth();
      return false;
    }

    try {
      final response = await _dio.post<dynamic>(
        ApiConstants.refresh,
        data: {'refresh_token': refreshToken},
        options: Options(headers: {'Authorization': null}),
      );

      final data = response.data;
      if (data is! Map) {
        await _storage.clearAuth();
        return false;
      }

      final payload = Map<String, dynamic>.from(data);
      final accessToken = payload['access_token'] as String?;
      final nextRefreshToken = payload['refresh_token'] as String?;

      if (accessToken == null || accessToken.isEmpty) {
        await _storage.clearAuth();
        return false;
      }

      await _storage.write(SecureStorageService.accessTokenKey, accessToken);
      if (nextRefreshToken != null && nextRefreshToken.isNotEmpty) {
        await _storage.write(
          SecureStorageService.refreshTokenKey,
          nextRefreshToken,
        );
      }

      return true;
    } on DioException {
      await _storage.clearAuth();
      return false;
    } catch (_) {
      await _storage.clearAuth();
      return false;
    }
  }
}
