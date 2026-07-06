import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class MobileDocumentAttachment {
  const MobileDocumentAttachment({
    required this.bytes,
    required this.fileName,
  });

  final List<int> bytes;
  final String fileName;
}

class DocumentService {
  DocumentService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<Map<String, dynamic>>> fetchDocuments() async {
    final response = await _apiClient.client.get(ApiConstants.mobileDocuments);
    final data = response.data;
    if (data is! Map) return const [];
    final items = data['items'];
    if (items is! List) return const [];
    return items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<String> uploadDocument({
    required String documentType,
    required String category,
    required MobileDocumentAttachment file,
  }) async {
    final formData = FormData.fromMap({
      'document_type': documentType,
      'category': category,
      'file': MultipartFile.fromBytes(
        file.bytes,
        filename: file.fileName,
      ),
    });

    final response = await _apiClient.client.post(
      ApiConstants.mobileDocuments,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );

    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Document uploaded';
  }

  Future<String> deleteDocument(int documentId) async {
    final response = await _apiClient.client.delete(
      '${ApiConstants.mobileDocuments}/$documentId',
    );
    final data = response.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return 'Document deleted';
  }
}
