import 'package:flutter/foundation.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/push/push_token_provider.dart';
import '../../../core/storage/secure_storage_service.dart';

class MobileDeviceService {
  MobileDeviceService({
    required ApiClient apiClient,
    required SecureStorageService storage,
    required PushTokenProvider pushTokenProvider,
  })  : _apiClient = apiClient,
        _storage = storage,
        _pushTokenProvider = pushTokenProvider;

  final ApiClient _apiClient;
  final SecureStorageService _storage;
  final PushTokenProvider _pushTokenProvider;

  Future<Map<String, String>> buildLoginPayload() async {
    final deviceId = await _getOrCreateDeviceId();
    final pushToken = await _storage.read(SecureStorageService.pushTokenKey);

    return {
      'device_id': deviceId,
      'device_name': _resolveDeviceName(),
      'device_platform': _resolvePlatform(),
      if (pushToken != null && pushToken.isNotEmpty) 'push_token': pushToken,
    };
  }

  Future<void> registerCurrentDevice() async {
    final deviceId = await _getOrCreateDeviceId();
    final pushToken = await _storage.read(SecureStorageService.pushTokenKey);

    await _apiClient.client.post(
      ApiConstants.mobileDeviceRegister,
      data: {
        'device_id': deviceId,
        'device_name': _resolveDeviceName(),
        'device_platform': _resolvePlatform(),
        'push_token': pushToken,
      },
    );
  }

  Future<void> enablePushNotifications() async {
    final deviceId = await _getOrCreateDeviceId();
    final token = await _getOrCreatePushToken(deviceId);

    await registerCurrentDevice();
    await _apiClient.client.post(
      ApiConstants.mobilePushRegister,
      data: {
        'device_id': deviceId,
        'push_token': token,
      },
    );
    await _storage.write(SecureStorageService.pushTokenKey, token);
  }

  Future<void> disablePushNotifications() async {
    final deviceId = await _getOrCreateDeviceId();
    await _apiClient.client.delete(
      ApiConstants.mobilePushRegister,
      data: {
        'device_id': deviceId,
      },
    );
    await _storage.delete(SecureStorageService.pushTokenKey);
  }

  Future<bool> isPushEnabled() async {
    try {
      final devices = await fetchDevices();
      final current = devices.cast<Map<String, dynamic>?>().firstWhere(
            (item) => item?['is_current_device'] == true,
            orElse: () => null,
          );
      if (current != null) {
        return current['push_token_registered'] == true;
      }
    } catch (_) {
      // Fall back to local storage state below.
    }

    final token = await _storage.read(SecureStorageService.pushTokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<Map<String, dynamic>> fetchNotificationSummary() async {
    final response = await _apiClient.client.get(ApiConstants.mobileNotifications);
    final data = response.data;
    if (data is! Map) return const {};
    final payload = Map<String, dynamic>.from(data['data'] as Map? ?? const {});
    final details = Map<String, dynamic>.from(payload['details'] as Map? ?? const {});
    return {
      'total': payload['total'] ?? 0,
      'pending_leaves': details['pending_leaves'] ?? payload['pending_leaves'] ?? 0,
      'pending_expenses': details['pending_expenses'] ?? payload['pending_expenses'] ?? 0,
      'pending_documents': details['pending_documents'] ?? payload['pending_documents'] ?? 0,
      'open_tickets': details['open_tickets'] ?? payload['open_tickets'] ?? 0,
    };
  }

  Future<List<Map<String, dynamic>>> fetchDevices() async {
    final deviceId = await _getOrCreateDeviceId();
    final fallbackDevice = <String, dynamic>{
      'device_id': deviceId,
      'device_name': _resolveDeviceName(),
      'device_platform': _resolvePlatform(),
      'push_token_registered': false,
      'last_login_at': DateTime.now().toIso8601String(),
      'is_local_fallback': true,
      'is_current_device': true,
    };

    try {
      await registerCurrentDevice();
    } catch (_) {
      return [fallbackDevice];
    }

    try {
      final response = await _apiClient.client.get(ApiConstants.mobileDevices);
      final data = response.data;
      if (data is! Map) {
        return [fallbackDevice];
      }

      final items = data['items'];
      if (items is! List) {
        return [fallbackDevice];
      }

      final deviceItems = items
          .whereType<Map>()
          .map((item) {
            final device = Map<String, dynamic>.from(item);
            device['is_current_device'] =
                device['device_id']?.toString() == deviceId;
            return device;
          })
          .toList();

      final alreadyIncluded = deviceItems.any(
        (item) => item['device_id']?.toString() == deviceId,
      );

      if (!alreadyIncluded) {
        deviceItems.insert(0, fallbackDevice);
      }

      return deviceItems;
    } catch (_) {
      return [fallbackDevice];
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminDevices() async {
    final response = await _apiClient.client.get(ApiConstants.mobileAdminDevices);
    final data = response.data;
    if (data is! Map) return const [];

    final items = data['items'];
    if (items is! List) return const [];

    return items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<String> ensureDeviceId() => _getOrCreateDeviceId();

  Future<void> syncExternalPushToken(String token) async {
    final deviceId = await _getOrCreateDeviceId();
    await _storage.write(SecureStorageService.pushTokenKey, token);
    await registerCurrentDevice();
    await _apiClient.client.post(
      ApiConstants.mobilePushRegister,
      data: {
        'device_id': deviceId,
        'push_token': token,
      },
    );
  }

  Future<String> _getOrCreateDeviceId() async {
    final existing = await _storage.read(SecureStorageService.deviceIdKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final now = DateTime.now();
    final value =
        '${_resolvePlatform()}-${now.microsecondsSinceEpoch}-${now.millisecondsSinceEpoch}';
    await _storage.write(SecureStorageService.deviceIdKey, value);
    return value;
  }

  Future<String> _getOrCreatePushToken(String deviceId) async {
    final existing = await _storage.read(SecureStorageService.pushTokenKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final token = await _pushTokenProvider.getToken(deviceId) ?? 'demo-push-$deviceId';
    await _storage.write(SecureStorageService.pushTokenKey, token);
    return token;
  }

  String _resolvePlatform() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.macOS:
        return 'macos';
      case TargetPlatform.windows:
        return 'windows';
      case TargetPlatform.linux:
        return 'linux';
      case TargetPlatform.fuchsia:
        return 'fuchsia';
    }
  }

  String _resolveDeviceName() {
    if (kIsWeb) return 'Flutter Web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'Flutter Android';
      case TargetPlatform.iOS:
        return 'Flutter iPhone';
      case TargetPlatform.macOS:
        return 'Flutter macOS';
      case TargetPlatform.windows:
        return 'Flutter Windows';
      case TargetPlatform.linux:
        return 'Flutter Linux';
      case TargetPlatform.fuchsia:
        return 'Flutter Fuchsia';
    }
  }
}
