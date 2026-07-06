import 'dart:io' show Platform;

class ApiConstants {
  static const String _envUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static final String baseUrl = _envUrl.isNotEmpty
      ? _envUrl
      : Platform.isAndroid
          ? 'http://10.0.2.2:8000'
          : 'http://127.0.0.1:8000';

  static const String login = '/auth/login';
  static const String verifyMfa = '/auth/verify-mfa';
  static const String refresh = '/auth/refresh';

  static const String mobileHome = '/mobile/me/home';
  static const String mobileNotifications = '/mobile/notifications/summary';
  static const String mobileApprovals = '/mobile/approvals/summary';
  static const String mobileDeviceRegister = '/mobile/device/register';
  static const String mobileDevices = '/mobile/devices';
  static const String mobileAdminDevices = '/mobile/admin/devices';
  static const String mobilePushRegister = '/mobile/push/register';
  static const String mobileLeaves = '/mobile/leaves';
  static const String mobileLeaveSummary = '/mobile/leaves/summary';
  static const String mobileLeaveCatalog = '/mobile/leave-catalog';
  static const String mobileExpenses = '/mobile/expenses';
  static const String mobileExpenseSummary = '/mobile/expenses/summary';
  static const String mobileHelpdesk = '/mobile/helpdesk';
  static const String mobileDocuments = '/mobile/documents';
  static const String mobileAdminQueues = '/mobile/admin/queues';
  static const String mobileAdminQueueStatusSummary = '/mobile/admin/queues';
  static const String mobileAdminLeaves = '/mobile/admin/leaves';
  static const String mobileAdminExpenses = '/mobile/admin/expenses';
  static const String mobileAdminDocuments = '/mobile/admin/documents';
  static const String attendanceMyRecords = '/attendance/my-records';
  static const String attendanceClockIn = '/attendance/clock-in';
  static const String attendanceClockOut = '/attendance/clock-out';
}
