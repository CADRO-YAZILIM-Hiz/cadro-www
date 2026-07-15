import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';
import '../data/expense_service.dart';

final expenseStatusFilterProvider = StateProvider<String>((ref) => 'ALL');

final expenseServiceProvider = Provider<ExpenseService>(
  (ref) => ExpenseService(
    apiClient: ref.watch(apiClientProvider),
  ),
);

final expenseListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(expenseServiceProvider).fetchExpenses();
});

final expenseSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(expenseServiceProvider).fetchSummary();
});
