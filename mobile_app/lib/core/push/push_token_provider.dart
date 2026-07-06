import 'package:flutter/foundation.dart';

abstract class PushTokenProvider {
  Future<String?> getToken(String deviceId);
  Stream<String> get onTokenRefresh;
}

class PreparedPushTokenProvider implements PushTokenProvider {
  const PreparedPushTokenProvider();

  @override
  Stream<String> get onTokenRefresh => const Stream<String>.empty();

  @override
  Future<String?> getToken(String deviceId) async {
    if (kIsWeb) {
      return 'web-push-$deviceId';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'fcm-pending-$deviceId';
      case TargetPlatform.iOS:
        return 'apns-pending-$deviceId';
      case TargetPlatform.macOS:
        return 'fcm-macos-$deviceId';
      case TargetPlatform.windows:
        return 'fcm-windows-$deviceId';
      case TargetPlatform.linux:
        return 'fcm-linux-$deviceId';
      case TargetPlatform.fuchsia:
        return 'fcm-fuchsia-$deviceId';
    }
  }
}
