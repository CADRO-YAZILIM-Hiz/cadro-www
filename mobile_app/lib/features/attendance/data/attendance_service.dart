import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class AttendanceService {
  AttendanceService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<Map<String, dynamic>>> fetchMyRecords() async {
    final response = await _apiClient.client.get(ApiConstants.attendanceMyRecords);
    final data = response.data;
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<String> clockIn({
    required double latitude,
    required double longitude,
    required String qrData,
  }) async {
    final response = await _apiClient.client.post(
      ApiConstants.attendanceClockIn,
      data: {
        'latitude': latitude,
        'longitude': longitude,
        'qr_data': qrData,
      },
      options: Options(contentType: Headers.jsonContentType),
    );
    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Clock-in completed';
  }

  Future<String> clockOut({
    required double latitude,
    required double longitude,
    required String qrData,
  }) async {
    final response = await _apiClient.client.post(
      ApiConstants.attendanceClockOut,
      data: {
        'latitude': latitude,
        'longitude': longitude,
        'qr_data': qrData,
      },
      options: Options(contentType: Headers.jsonContentType),
    );
    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Clock-out completed';
  }
}
