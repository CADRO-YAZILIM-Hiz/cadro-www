import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class AdminService {
  AdminService(this._apiClient);

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> fetchDashboard() async {
    final homeResponse = await _apiClient.client.get(ApiConstants.mobileHome);
    final approvalsResponse = await _apiClient.client.get(ApiConstants.mobileApprovals);
    final notificationsResponse = await _apiClient.client.get(ApiConstants.mobileNotifications);

    final homePayload = Map<String, dynamic>.from(homeResponse.data as Map);
    final approvalsPayload = Map<String, dynamic>.from(approvalsResponse.data as Map);
    final notificationsPayload = Map<String, dynamic>.from(notificationsResponse.data as Map);
    final notificationsData = Map<String, dynamic>.from(
      notificationsPayload['data'] as Map? ?? const {},
    );
    final notificationsDetails = Map<String, dynamic>.from(
      notificationsData['details'] as Map? ?? const {},
    );

    return {
      'profile': Map<String, dynamic>.from(homePayload['data'] as Map? ?? const {}),
      'approvals': Map<String, dynamic>.from(approvalsPayload['data'] as Map? ?? const {}),
      'notifications': {
        'total': notificationsData['total'] ?? 0,
        'pending_leaves': notificationsDetails['pending_leaves'] ?? notificationsData['pending_leaves'] ?? 0,
        'pending_expenses': notificationsDetails['pending_expenses'] ?? notificationsData['pending_expenses'] ?? 0,
        'pending_documents': notificationsDetails['pending_documents'] ?? notificationsData['pending_documents'] ?? 0,
        'open_tickets': notificationsDetails['open_tickets'] ?? notificationsData['open_tickets'] ?? 0,
      },
    };
  }

  Future<Map<String, dynamic>> fetchQueue(String queueType, {String? status}) async {
    final response = await _apiClient.client.get(
      '${ApiConstants.mobileAdminQueues}/$queueType',
      queryParameters: {
        if (status != null && status.isNotEmpty) 'status': status,
      },
    );
    final payload = Map<String, dynamic>.from(response.data as Map? ?? const {});
    final items = (payload['items'] as List? ?? const [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();

    return {
      'items': items,
      'total': payload['total'] ?? items.length,
      'page': payload['page'] ?? 1,
      'page_size': payload['page_size'] ?? items.length,
    };
  }

  Future<Map<String, dynamic>> fetchQueueStatusSummary(String queueType) async {
    final response = await _apiClient.client.get(
      '${ApiConstants.mobileAdminQueueStatusSummary}/$queueType/status-summary',
    );
    final payload = Map<String, dynamic>.from(response.data as Map? ?? const {});
    return Map<String, dynamic>.from(payload['data'] as Map? ?? const {});
  }

  Future<String> updateQueueStatus({
    required String queueType,
    required int id,
    required String status,
  }) async {
    String endpoint;
    switch (queueType) {
      case 'leaves':
        endpoint = '${ApiConstants.mobileAdminLeaves}/$id/status';
        break;
      case 'expenses':
        endpoint = '${ApiConstants.mobileAdminExpenses}/$id/status';
        break;
      case 'documents':
        endpoint = '${ApiConstants.mobileAdminDocuments}/$id/status';
        break;
      default:
        throw UnsupportedError('Queue type does not support status updates');
    }

    final response = await _apiClient.client.put(
      endpoint,
      data: {
        'status': status,
      },
    );
    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Updated';
  }
}
