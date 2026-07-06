import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';
import '../data/attendance_service.dart';

final attendanceServiceProvider = Provider<AttendanceService>((ref) {
  return AttendanceService(apiClient: ref.watch(apiClientProvider));
});

final attendanceRecordsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(attendanceServiceProvider).fetchMyRecords();
});
