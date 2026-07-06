class FirebasePushConfig {
  static const bool enabled = bool.fromEnvironment(
    'ENABLE_FIREBASE_PUSH',
    defaultValue: false,
  );

  static const String webVapidKey = String.fromEnvironment(
    'FIREBASE_WEB_VAPID_KEY',
    defaultValue: '',
  );
}
