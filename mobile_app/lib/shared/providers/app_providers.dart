import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

import '../../app/router.dart';
import '../../core/network/api_client.dart';
import '../../core/push/firebase_push_config.dart';
import '../../core/push/firebase_push_token_provider.dart';
import '../../core/push/push_runtime_service.dart';
import '../../core/push/push_token_provider.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../features/auth/data/auth_service.dart';
import '../../features/auth/domain/auth_state.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/device/data/mobile_device_service.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) => const SecureStorageService());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(storage: ref.watch(secureStorageProvider)),
);

final pushTokenProviderProvider = Provider<PushTokenProvider>(
  (ref) => FirebasePushConfig.enabled
      ? FirebaseMessagingPushTokenProvider()
      : const PreparedPushTokenProvider(),
);

final authServiceProvider = Provider<AuthService>(
  (ref) => AuthService(
    apiClient: ref.watch(apiClientProvider),
    storage: ref.watch(secureStorageProvider),
  ),
);

final mobileDeviceServiceProvider = Provider<MobileDeviceService>(
  (ref) => MobileDeviceService(
    apiClient: ref.watch(apiClientProvider),
    storage: ref.watch(secureStorageProvider),
    pushTokenProvider: ref.watch(pushTokenProviderProvider),
  ),
);

final pushRuntimeServiceProvider = Provider<PushRuntimeService>(
  (ref) => PushRuntimeService(
    mobileDeviceService: ref.watch(mobileDeviceServiceProvider),
    pushTokenProvider: ref.watch(pushTokenProviderProvider),
  ),
);

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(
    ref.watch(authServiceProvider),
    ref.watch(mobileDeviceServiceProvider),
  ),
);

final appRouterProvider = Provider<GoRouter>((ref) => buildRouter());

final appLocaleProvider = StateProvider<Locale>((ref) => const Locale('en'));
