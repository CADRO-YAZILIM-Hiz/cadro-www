import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'firebase_push_config.dart';
import 'push_token_provider.dart';

class FirebaseMessagingPushTokenProvider implements PushTokenProvider {
  FirebaseMessagingPushTokenProvider({
    FirebaseMessaging? messaging,
  }) : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;

  @override
  Stream<String> get onTokenRefresh => FirebasePushConfig.enabled
      ? _messaging.onTokenRefresh
      : const Stream<String>.empty();

  @override
  Future<String?> getToken(String deviceId) async {
    if (!FirebasePushConfig.enabled) {
      return null;
    }

    await _preparePermissions();

    final vapidKey = FirebasePushConfig.webVapidKey.trim();
    if (kIsWeb) {
      return _messaging.getToken(
        vapidKey: vapidKey.isEmpty ? null : vapidKey,
      );
    }

    return _messaging.getToken();
  }

  Future<void> _preparePermissions() async {
    if (kIsWeb || defaultTargetPlatform == TargetPlatform.iOS) {
      await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
    }

    await _messaging.setAutoInitEnabled(true);
  }
}
