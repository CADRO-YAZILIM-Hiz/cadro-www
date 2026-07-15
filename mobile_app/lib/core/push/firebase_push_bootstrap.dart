import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'firebase_push_config.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (!FirebasePushConfig.enabled) return;
  try {
    await Firebase.initializeApp();
    debugPrint('Background push received: ${message.messageId}');
  } catch (error) {
    debugPrint('Firebase background bootstrap skipped: $error');
  }
}

class FirebasePushBootstrap {
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized || !FirebasePushConfig.enabled) return;

    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      _initialized = true;
    } catch (error) {
      debugPrint('Firebase bootstrap skipped: $error');
    }
  }
}
