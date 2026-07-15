import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../device/data/mobile_device_service.dart';
import '../data/auth_service.dart';
import '../domain/auth_state.dart';

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._authService, this._mobileDeviceService)
      : super(const AuthState());

  final AuthService _authService;
  final MobileDeviceService _mobileDeviceService;

  Future<void> bootstrap() async {
    final hasSession = await _authService.hasSession();
    final profile = await _authService.getStoredProfile();

    final storedUserId = int.tryParse(profile['user_id'] ?? '');
    if (hasSession) {
      await _registerDeviceQuietly();
    }
    state = state.copyWith(
      status: hasSession ? AuthStatus.authenticated : AuthStatus.unauthenticated,
      name: profile['name'],
      role: profile['role'],
      userId: storedUserId,
      isLoading: false,
      clearError: true,
      clearDeviceSwitchNotice: true,
    );
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearDeviceSwitchNotice: true,
    );
    try {
      final deviceContext = await _mobileDeviceService.buildLoginPayload();
      final response = await _authService.login(
        email: email,
        password: password,
        deviceContext: deviceContext,
      );

      if (response['mfa_required'] == true) {
        state = state.copyWith(
          status: AuthStatus.mfaRequired,
          email: response['email'] as String?,
          isLoading: false,
          clearDeviceSwitchNotice: true,
        );
        return;
      }

      await _authService.persistSession(response);
      await _registerDeviceQuietly();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        name: response['name'] as String?,
        role: response['role'] as String?,
        userId: response['user_id'] as int?,
        deactivatedDeviceCount: _extractDeactivatedDeviceCount(response),
        isLoading: false,
      );
    } on DioException catch (error) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: _extractError(error),
        isLoading: false,
        clearDeviceSwitchNotice: true,
      );
    } catch (_) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: 'Unexpected error',
        isLoading: false,
        clearDeviceSwitchNotice: true,
      );
    }
  }

  Future<void> verifyMfa(String code) async {
    if (state.email == null || state.email!.isEmpty) {
      state = state.copyWith(
        errorMessage: 'Missing MFA email context',
        isLoading: false,
        clearDeviceSwitchNotice: true,
      );
      return;
    }

    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearDeviceSwitchNotice: true,
    );
    try {
      final response = await _authService.verifyMfa(
        email: state.email!,
        code: code,
      );
      await _authService.persistSession(response);
      await _registerDeviceQuietly();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        name: response['name'] as String?,
        role: response['role'] as String?,
        userId: response['user_id'] as int?,
        deactivatedDeviceCount: _extractDeactivatedDeviceCount(response),
        isLoading: false,
      );
    } on DioException catch (error) {
      state = state.copyWith(
        status: AuthStatus.mfaRequired,
        errorMessage: _extractError(error),
        isLoading: false,
        clearDeviceSwitchNotice: true,
      );
    } catch (_) {
      state = state.copyWith(
        status: AuthStatus.mfaRequired,
        errorMessage: 'Unexpected error',
        isLoading: false,
        clearDeviceSwitchNotice: true,
      );
    }
  }

  Future<void> logout() async {
    await _authService.clearSession();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  String _extractError(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['detail'] is String) {
      return data['detail'] as String;
    }
    return 'Request failed';
  }

  Future<void> _registerDeviceQuietly() async {
    try {
      await _mobileDeviceService.registerCurrentDevice();
    } catch (_) {
      // Device registration should not block auth flow during early mobile rollout.
    }
  }

  int? _extractDeactivatedDeviceCount(Map<String, dynamic> response) {
    final raw = response['deactivated_device_count'];
    if (raw is int && raw > 0) {
      return raw;
    }
    if (raw is num && raw > 0) {
      return raw.toInt();
    }
    return null;
  }
}
