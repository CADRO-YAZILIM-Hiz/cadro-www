import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';
import '../data/admin_service.dart';

final adminServiceProvider = Provider<AdminService>(
  (ref) => AdminService(ref.watch(apiClientProvider)),
);

final adminDashboardProvider = FutureProvider<Map<String, dynamic>>(
  (ref) => ref.watch(adminServiceProvider).fetchDashboard(),
);

typedef AdminQueueRequest = ({String queueType, String? status});

final adminQueueStatusFilterProvider = StateProvider.family<String?, String>(
  (ref, queueType) => queueType == 'helpdesk' ? 'OPEN' : 'PENDING',
);

final adminQueueProvider = FutureProvider.family<Map<String, dynamic>, AdminQueueRequest>(
  (ref, request) => ref.watch(adminServiceProvider).fetchQueue(
        request.queueType,
        status: request.status,
      ),
);

final adminQueueStatusSummaryProvider = FutureProvider.family<Map<String, dynamic>, String>(
  (ref, queueType) => ref.watch(adminServiceProvider).fetchQueueStatusSummary(queueType),
);
