import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';
import '../data/document_service.dart';

final documentStatusFilterProvider = StateProvider<String>((ref) => 'ALL');

final documentServiceProvider = Provider<DocumentService>((ref) {
  return DocumentService(apiClient: ref.watch(apiClientProvider));
});

final documentListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(documentServiceProvider).fetchDocuments();
});
