import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class LeaveService {
  LeaveService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<Map<String, dynamic>>> fetchLeaves() async {
    final response = await _apiClient.client.get(ApiConstants.mobileLeaves);
    final data = response.data;
    if (data is! Map) return const [];

    final items = data['items'];
    if (items is! List) return const [];

    return items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<Map<String, dynamic>> fetchSummary() async {
    final response = await _apiClient.client.get(ApiConstants.mobileLeaveSummary);

    final data = response.data;
    if (data is! Map || data['data'] is! Map) {
      return {
        'year': DateTime.now().year,
        'total_used_days': 0,
        'breakdown': <String, dynamic>{},
      };
    }

    return Map<String, dynamic>.from(data['data'] as Map);
  }

  Future<List<Map<String, dynamic>>> fetchLeaveCatalog() async {
    final response = await _apiClient.client.get(ApiConstants.mobileLeaveCatalog);
    final data = response.data;
    if (data is! Map || data['data'] is! Map) return const [];

    final catalogData = data['data'] as Map;
    final catalogs = catalogData['catalogs'];
    if (catalogs is! List) return const [];

    return catalogs
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<String> createLeave({
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required double totalDays,
    required String reason,
    String? leaveCountry,
  }) async {
    final response = await _apiClient.client.post(
      ApiConstants.mobileLeaves,
      data: {
        'leave_type': leaveType,
        'start_date': _toApiDate(startDate),
        'end_date': _toApiDate(endDate),
        'total_days': totalDays,
        'reason': reason,
        if (leaveCountry != null) 'leave_country': leaveCountry,
      },
      options: Options(contentType: Headers.jsonContentType),
    );

    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Leave request submitted';
  }

  String _toApiDate(DateTime value) {
    final year = value.year.toString().padLeft(4, '0');
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    return '$year-$month-$day';
  }
}
