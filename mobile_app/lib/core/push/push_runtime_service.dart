import 'dart:async';

import '../../features/device/data/mobile_device_service.dart';
import 'firebase_push_config.dart';
import 'push_token_provider.dart';

class PushRuntimeService {
  PushRuntimeService({
    required MobileDeviceService mobileDeviceService,
    required PushTokenProvider pushTokenProvider,
  })  : _mobileDeviceService = mobileDeviceService,
        _pushTokenProvider = pushTokenProvider;

  final MobileDeviceService _mobileDeviceService;
  final PushTokenProvider _pushTokenProvider;

  StreamSubscription<String>? _tokenRefreshSubscription;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized || !FirebasePushConfig.enabled) return;
    _initialized = true;

    try {
      final deviceId = await _mobileDeviceService.ensureDeviceId();
      final token = await _pushTokenProvider.getToken(deviceId);
      if (token != null && token.isNotEmpty) {
        await _mobileDeviceService.syncExternalPushToken(token);
      }
    } catch (_) {
      // Push bootstrap should not block app startup.
    }

    _tokenRefreshSubscription = _pushTokenProvider.onTokenRefresh.listen((token) async {
      if (token.isEmpty) return;
      try {
        await _mobileDeviceService.syncExternalPushToken(token);
      } catch (_) {
        // Keep runtime resilient; next refresh or manual toggle can recover.
      }
    });
  }

  Future<void> dispose() async {
    await _tokenRefreshSubscription?.cancel();
    _tokenRefreshSubscription = null;
    _initialized = false;
  }
}
