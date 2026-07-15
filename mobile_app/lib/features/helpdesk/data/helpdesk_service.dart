import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class HelpdeskAttachmentPayload {
  const HelpdeskAttachmentPayload({
    required this.bytes,
    required this.fileName,
  });

  final List<int> bytes;
  final String fileName;
}

class HelpdeskService {
  HelpdeskService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<Map<String, dynamic>>> fetchTickets() async {
    final response = await _apiClient.client.get(ApiConstants.mobileHelpdesk);
    final data = response.data;
    if (data is! Map) return const [];

    final items = data['items'];
    if (items is! List) return const [];

    return items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<Map<String, dynamic>> fetchTicketDetail(int ticketId) async {
    final response = await _apiClient.client.get(
      '${ApiConstants.mobileHelpdesk}/$ticketId',
    );
    final data = response.data;
    if (data is! Map || data['data'] is! Map) {
      return const {};
    }
    return Map<String, dynamic>.from(data['data'] as Map);
  }

  Future<String> createTicket({
    required String category,
    required String priority,
    required String subject,
    required String message,
    HelpdeskAttachmentPayload? attachment,
  }) async {
    final formData = FormData.fromMap({
      'category': category,
      'priority': priority,
      'subject': subject,
      'message': message,
      if (attachment != null)
        'file': MultipartFile.fromBytes(
          attachment.bytes,
          filename: attachment.fileName,
        ),
    });

    final response = await _apiClient.client.post(
      ApiConstants.mobileHelpdesk,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );

    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Ticket created';
  }

  Future<String> sendMessage({
    required int ticketId,
    required String message,
    HelpdeskAttachmentPayload? attachment,
  }) async {
    final formData = FormData.fromMap({
      'message': message,
      if (attachment != null)
        'file': MultipartFile.fromBytes(
          attachment.bytes,
          filename: attachment.fileName,
        ),
    });

    final response = await _apiClient.client.post(
      '${ApiConstants.mobileHelpdesk}/$ticketId/messages',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Message sent';
  }

  Future<String> updateStatus({
    required int ticketId,
    required String status,
    String? rejectionReason,
  }) async {
    final response = await _apiClient.client.put(
      '${ApiConstants.mobileHelpdesk}/$ticketId/status',
      data: {
        'status': status,
        if (rejectionReason != null) 'rejection_reason': rejectionReason,
      },
    );
    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Ticket updated';
  }
}
