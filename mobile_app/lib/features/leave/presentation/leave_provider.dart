import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';
import '../data/leave_service.dart';

final leaveStatusFilterProvider = StateProvider<String>((ref) => 'ALL');

final leaveServiceProvider = Provider<LeaveService>(
  (ref) => LeaveService(
    apiClient: ref.watch(apiClientProvider),
  ),
);

final leaveListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(leaveServiceProvider).fetchLeaves();
});

final leaveSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(leaveServiceProvider).fetchSummary();
});

final leaveCatalogProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(leaveServiceProvider).fetchLeaveCatalog();
});
