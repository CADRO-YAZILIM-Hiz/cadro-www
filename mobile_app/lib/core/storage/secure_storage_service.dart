import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  const SecureStorageService();

  static const _storage = FlutterSecureStorage();

  static const accessTokenKey = 'access_token';
  static const refreshTokenKey = 'refresh_token';
  static const languageKey = 'language_code';
  static const userNameKey = 'user_name';
  static const userRoleKey = 'user_role';
  static const userIdKey = 'user_id';
  static const deviceIdKey = 'device_id';
  static const pushTokenKey = 'push_token';

  Future<void> write(String key, String value) => _storage.write(key: key, value: value);

  Future<String?> read(String key) => _storage.read(key: key);

  Future<void> delete(String key) => _storage.delete(key: key);

  Future<void> clearAuth() async {
    await _storage.delete(key: accessTokenKey);
    await _storage.delete(key: refreshTokenKey);
    await _storage.delete(key: userNameKey);
    await _storage.delete(key: userRoleKey);
    await _storage.delete(key: userIdKey);
  }
}
