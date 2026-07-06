import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';

final mobileDevicesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(mobileDeviceServiceProvider).fetchDevices();
});

final adminDevicesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(mobileDeviceServiceProvider).fetchAdminDevices();
});

final pushNotificationEnabledProvider = FutureProvider<bool>((ref) {
  return ref.watch(mobileDeviceServiceProvider).isPushEnabled();
});

final notificationSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(mobileDeviceServiceProvider).fetchNotificationSummary();
});
