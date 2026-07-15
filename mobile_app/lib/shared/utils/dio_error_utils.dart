import 'package:dio/dio.dart';

/// Extracts a user-friendly error message from a [DioException] or generic error.
String friendlyError(Object error) {
  if (error is DioException) {
    final statusCode = error.response?.statusCode;
    final data = error.response?.data;
    final detail =
        data is Map ? data['detail']?.toString() : null;

    if (detail != null && detail.isNotEmpty) return detail;
    if (statusCode == 401) return 'Oturum süresi doldu. Lütfen tekrar giriş yapın.';
    if (statusCode == 403) return 'Bu işlem için yetkiniz yok.';
    if (statusCode == 404) return 'Kaynak bulunamadı.';
    if (statusCode == 500) return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    if (statusCode != null) return 'Sunucu hatası (HTTP $statusCode)';

    // Connection / timeout errors
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Bağlantı zaman aşımına uğradı.';
      case DioExceptionType.connectionError:
        return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
      default:
        return error.message ?? 'Bilinmeyen ağ hatası';
    }
  }
  return '$error';
}
