import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';
import '../data/helpdesk_service.dart';

final helpdeskStatusFilterProvider = StateProvider<String>((ref) => 'ALL');

final helpdeskServiceProvider = Provider<HelpdeskService>(
  (ref) => HelpdeskService(apiClient: ref.watch(apiClientProvider)),
);

final helpdeskListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(helpdeskServiceProvider).fetchTickets();
});

final helpdeskDetailProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, ticketId) {
  return ref.watch(helpdeskServiceProvider).fetchTicketDetail(ticketId);
});
