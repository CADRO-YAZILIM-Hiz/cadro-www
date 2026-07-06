import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';

class AuthService {
  AuthService({
    required ApiClient apiClient,
    required SecureStorageService storage,
  })  : _apiClient = apiClient,
        _storage = storage;

  final ApiClient _apiClient;
  final SecureStorageService _storage;

  Future<bool> hasSession() async {
    final token = await _storage.read(SecureStorageService.accessTokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<Map<String, String?>> getStoredProfile() async {
    return {
      'name': await _storage.read(SecureStorageService.userNameKey),
      'role': await _storage.read(SecureStorageService.userRoleKey),
      'user_id': await _storage.read(SecureStorageService.userIdKey),
    };
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    Map<String, String>? deviceContext,
  }) async {
    final payload = <String, String>{
      'username': email,
      'password': password,
      if (deviceContext != null) ...deviceContext,
    };

    final response = await _apiClient.client.post(
      ApiConstants.login,
      data: payload,
      options: Options(
        contentType: Headers.formUrlEncodedContentType,
      ),
    );

    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<Map<String, dynamic>> verifyMfa({
    required String email,
    required String code,
  }) async {
    final response = await _apiClient.client.post(
      ApiConstants.verifyMfa,
      data: {
        'email': email,
        'code': code,
      },
    );

    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<void> persistSession(Map<String, dynamic> payload) async {
    final accessToken = payload['access_token'] as String?;
    final refreshToken = payload['refresh_token'] as String?;

    if (accessToken == null || refreshToken == null) {
      throw const FormatException('Missing auth tokens');
    }

    await _storage.write(
      SecureStorageService.accessTokenKey,
      accessToken,
    );
    await _storage.write(
      SecureStorageService.refreshTokenKey,
      refreshToken,
    );

    final name = payload['name']?.toString();
    final role = payload['role']?.toString();
    final userId = payload['user_id']?.toString();

    if (name != null && name.isNotEmpty) {
      await _storage.write(SecureStorageService.userNameKey, name);
    }
    if (role != null && role.isNotEmpty) {
      await _storage.write(SecureStorageService.userRoleKey, role);
    }
    if (userId != null && userId.isNotEmpty) {
      await _storage.write(SecureStorageService.userIdKey, userId);
    }
  }

  Future<void> clearSession() => _storage.clearAuth();
}
