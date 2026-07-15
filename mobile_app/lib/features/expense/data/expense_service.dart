import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class ExpenseAttachmentPayload {
  const ExpenseAttachmentPayload({
    required this.bytes,
    required this.fileName,
    required this.mimeType,
  });

  final List<int> bytes;
  final String fileName;
  final String mimeType;
}

class ExpenseService {
  ExpenseService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<Map<String, dynamic>>> fetchExpenses() async {
    final response = await _apiClient.client.get(ApiConstants.mobileExpenses);
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
    final response = await _apiClient.client.get(ApiConstants.mobileExpenseSummary);
    final data = response.data;
    if (data is! Map || data['data'] is! Map) {
      return {
        'pending_count': 0,
        'approved_count': 0,
        'paid_count': 0,
        'total_amount': 0.0,
        'total_items': 0,
      };
    }

    return Map<String, dynamic>.from(data['data'] as Map);
  }

  Future<String> createExpense({
    required double amount,
    required String currency,
    required String category,
    required String description,
    required DateTime expenseDate,
    ExpenseAttachmentPayload? attachment,
  }) async {
    final formData = FormData.fromMap({
      'amount': amount,
      'currency': currency,
      'category': category,
      'description': description,
      'expense_date': _toApiDate(expenseDate),
      if (attachment != null)
        'file': MultipartFile.fromBytes(
          attachment.bytes,
          filename: attachment.fileName,
        ),
    });

    final response = await _apiClient.client.post(
      ApiConstants.mobileExpenses,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );

    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Expense submitted';
  }

  String _toApiDate(DateTime value) {
    final year = value.year.toString().padLeft(4, '0');
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    return '$year-$month-$day';
  }
}
