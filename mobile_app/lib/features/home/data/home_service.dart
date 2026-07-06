import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class HomeService {
  HomeService(this._apiClient);

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> fetchHome() async {
    final response = await _apiClient.client.get(ApiConstants.mobileHome);
    final data = Map<String, dynamic>.from(response.data as Map);
    return Map<String, dynamic>.from(data['data'] as Map? ?? {});
  }
}

