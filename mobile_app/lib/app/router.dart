import 'package:go_router/go_router.dart';

import '../features/attendance/presentation/attendance_page.dart';
import '../features/admin/presentation/admin_home_page.dart';
import '../features/admin/presentation/admin_queue_page.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/mfa_page.dart';
import '../features/auth/presentation/splash_page.dart';
import '../features/device/presentation/devices_page.dart';
import '../features/document/presentation/document_page.dart';
import '../features/expense/presentation/expense_page.dart';
import '../features/helpdesk/presentation/helpdesk_page.dart';
import '../features/home/presentation/home_page.dart';
import '../features/leave/presentation/leave_page.dart';

GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/mfa',
        builder: (context, state) => const MfaPage(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/admin-home',
        builder: (context, state) => const AdminHomePage(),
      ),
      GoRoute(
        path: '/admin-queue/:queueType',
        builder: (context, state) => AdminQueuePage(
          queueType: state.pathParameters['queueType']!,
        ),
      ),
      GoRoute(
        path: '/attendance',
        builder: (context, state) => const AttendancePage(),
      ),
      GoRoute(
        path: '/devices',
        builder: (context, state) => const DevicesPage(),
      ),
      GoRoute(
        path: '/admin-devices',
        builder: (context, state) => const AdminDevicesPage(),
      ),
      GoRoute(
        path: '/leave',
        builder: (context, state) => const LeavePage(),
      ),
      GoRoute(
        path: '/expenses',
        builder: (context, state) => const ExpensePage(),
      ),
      GoRoute(
        path: '/documents',
        builder: (context, state) => const DocumentPage(),
      ),
      GoRoute(
        path: '/helpdesk',
        builder: (context, state) => const HelpdeskPage(),
      ),
      GoRoute(
        path: '/helpdesk/:ticketId',
        builder: (context, state) => HelpdeskDetailPage(
          ticketId: int.parse(state.pathParameters['ticketId']!),
        ),
      ),
    ],
  );
}
