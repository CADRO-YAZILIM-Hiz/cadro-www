import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/providers/app_providers.dart';
import '../../../shared/utils/dio_error_utils.dart';
import '../../device/presentation/device_provider.dart';
import 'home_provider.dart';

String _greetingKey() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'good_morning';
  if (hour < 18) return 'good_afternoon';
  return 'good_evening';
}

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeData = ref.watch(homeDataProvider);
    final devicesData = ref.watch(mobileDevicesProvider);
    final notificationsData = ref.watch(notificationSummaryProvider);
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // Background
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFF0F4FF), Color(0xFFF7FBFD), Color(0xFFFBFCFE)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          // Decorative orbs
          Positioned(
            top: -size.width * 0.25,
            right: -size.width * 0.15,
            child: IgnorePointer(
              child: Container(
                width: size.width * 0.6,
                height: size.width * 0.6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF1D4ED8).withValues(alpha: 0.08),
                      const Color(0xFF0EA5E9).withValues(alpha: 0.04),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -size.width * 0.2,
            left: -size.width * 0.1,
            child: IgnorePointer(
              child: Container(
                width: size.width * 0.5,
                height: size.width * 0.5,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF0F766E).withValues(alpha: 0.06),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          // Content
          SafeArea(
            child: Column(
              children: [
                // Custom AppBar
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 12, 0),
                  child: Row(
                    children: [
                      // Logo mark
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(11),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1D4ED8), Color(0xFF0F766E)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: const Center(
                          child: Text(
                            'C',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        context.tr('app_title'),
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.5,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const Spacer(),
                      PopupMenuButton<String>(
                        onSelected: (value) =>
                            ref.read(appLocaleProvider.notifier).state = Locale(value),
                        offset: const Offset(0, 42),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.language_rounded, size: 16, color: Color(0xFF475569)),
                              const SizedBox(width: 4),
                              Text(
                                context.tr('language'),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                              ),
                            ],
                          ),
                        ),
                        itemBuilder: (context) => const [
                          PopupMenuItem(value: 'tr', child: Text('Türkçe')),
                          PopupMenuItem(value: 'en', child: Text('English')),
                          PopupMenuItem(value: 'de', child: Text('Deutsch')),
                          PopupMenuItem(value: 'ar', child: Text('العربية')),
                        ],
                      ),
                      const SizedBox(width: 6),
                      Material(
                        color: Colors.white.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(999),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(999),
                          onTap: () async {
                            await ref.read(authControllerProvider.notifier).logout();
                            if (!context.mounted) return;
                            context.go('/login');
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.logout_rounded, size: 16, color: Color(0xFF475569)),
                                const SizedBox(width: 4),
                                Text(
                                  context.tr('logout'),
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                // Body
                Expanded(
                  child: homeData.when(
                    data: (data) {
          final profile = Map<String, dynamic>.from(data['profile'] as Map? ?? {});
          final summary = Map<String, dynamic>.from(data['summary'] as Map? ?? {});
          final attendance = Map<String, dynamic>.from(
            data['attendance'] as Map? ?? {},
          );
          final trainings = (data['upcoming_trainings'] as List? ?? const [])
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList();

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                sliver: SliverList(
                  delegate: SliverChildListDelegate(
                    [
                      _HeroCard(
                        fullName: _displayProfileValue(
                          context,
                          profile['full_name']?.toString() ?? '-',
                        ),
                        role: _roleLabel(context, profile['role']?.toString()),
                        department: _displayProfileValue(
                          context,
                          profile['department']?.toString() ?? '-',
                        ),
                        position: _displayProfileValue(
                          context,
                          profile['position']?.toString() ?? '-',
                        ),
                        status: _attendanceStatusLabel(context, attendance['status']?.toString()),
                        checkIn: attendance['check_in']?.toString(),
                      ),
                      const SizedBox(height: 18),
                      _SectionTitle(
                        title: context.tr('today'),
                        subtitle: context.tr('attendance_title'),
                      ),
                      const SizedBox(height: 12),
                      _AttendanceHighlightCard(
                        attendance: attendance,
                        onOpenAttendance: () => context.push('/attendance'),
                      ),
                      const SizedBox(height: 18),
                      _SectionTitle(
                        title: context.tr('overview'),
                        subtitle: '${context.tr('pending_leaves')} / ${context.tr('pending_expenses')}',
                      ),
                      const SizedBox(height: 12),
                      _QuickAccessRow(
                        onOpenAttendance: () => context.push('/attendance'),
                        onOpenLeave: () => context.push('/leave'),
                        onOpenExpenses: () => context.push('/expenses'),
                        onOpenHelpdesk: () => context.push('/helpdesk'),
                        onOpenDocuments: () => context.push('/documents'),
                      ),
                      const SizedBox(height: 14),
                      _MetricsGrid(
                        summary: summary,
                        onOpenLeave: () => context.push('/leave'),
                        onOpenExpenses: () => context.push('/expenses'),
                        onOpenHelpdesk: () => context.push('/helpdesk'),
                        onOpenDocuments: () => context.push('/documents'),
                      ),
                      const SizedBox(height: 18),
                      _SectionTitle(
                        title: context.tr('notifications_center'),
                        subtitle: context.tr('notifications_summary'),
                      ),
                      const SizedBox(height: 12),
                      _NotificationsCard(
                        notificationsData: notificationsData,
                        onOpenLeave: () => context.push('/leave'),
                        onOpenExpenses: () => context.push('/expenses'),
                        onOpenHelpdesk: () => context.push('/helpdesk'),
                        onOpenDocuments: () => context.push('/documents'),
                      ),
                      const SizedBox(height: 18),
                      _SectionTitle(
                        title: context.tr('upcoming_trainings'),
                        subtitle: context.tr('trainings'),
                      ),
                      const SizedBox(height: 12),
                      _UpcomingTrainingsCard(trainings: trainings),
                      const SizedBox(height: 18),
                      _SectionTitle(
                        title: context.tr('security'),
                        subtitle: context.tr('registered_devices'),
                      ),
                      const SizedBox(height: 12),
                      _DevicesCard(
                        devicesData: devicesData,
                        onTap: () => context.push('/devices'),
                      ),
                      const SizedBox(height: 18),
                      _QuickProfileCard(profile: profile),
                    ],
                  ),
                ),
              ),
            ],
          );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.cloud_off_rounded,
                  size: 48,
                  color: Color(0xFF64748B),
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('home_load_failed'),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  friendlyError(error),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          ),
              ),
            ),
          ],
        ),
      ),
    ],
  ),
);
  }
}

class _NotificationsCard extends StatelessWidget {
  const _NotificationsCard({
    required this.notificationsData,
    required this.onOpenLeave,
    required this.onOpenExpenses,
    required this.onOpenHelpdesk,
    required this.onOpenDocuments,
  });

  final AsyncValue<Map<String, dynamic>> notificationsData;
  final VoidCallback onOpenLeave;
  final VoidCallback onOpenExpenses;
  final VoidCallback onOpenHelpdesk;
  final VoidCallback onOpenDocuments;

  @override
  Widget build(BuildContext context) {
    return notificationsData.when(
      data: (data) {
        final items = [
          (
            context.tr('pending_leaves'),
            data['pending_leaves'],
            Icons.event_note_rounded,
            onOpenLeave,
          ),
          (
            context.tr('pending_expenses'),
            data['pending_expenses'],
            Icons.receipt_long_rounded,
            onOpenExpenses,
          ),
          (
            context.tr('pending_docs'),
            data['pending_documents'],
            Icons.folder_copy_rounded,
            onOpenDocuments,
          ),
          (
            context.tr('open_tickets'),
            data['open_tickets'],
            Icons.support_agent_rounded,
            onOpenHelpdesk,
          ),
        ];

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              for (var index = 0; index < items.length; index++) ...[
                ListTile(
                  onTap: items[index].$4,
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFFE0F2FE),
                    foregroundColor: const Color(0xFF0369A1),
                    child: Icon(items[index].$3, size: 18),
                  ),
                  title: Text(items[index].$1),
                  subtitle: Text(context.tr('tap_to_open_module')),
                  trailing: Text(
                    formatLocalizedNumber(context, items[index].$2),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                if (index != items.length - 1)
                  const Divider(height: 1, indent: 20, endIndent: 20),
              ],
            ],
          ),
        );
      },
      loading: () => const SizedBox(
        height: 220,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Text(
          context.tr('notifications_summary_unavailable'),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF64748B),
              ),
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.fullName,
    required this.role,
    required this.department,
    required this.position,
    required this.status,
    required this.checkIn,
  });

  final String fullName;
  final String role;
  final String department;
  final String position;
  final String status;
  final String? checkIn;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E3A8A),
            Color(0xFF1D4ED8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1D4ED8).withValues(alpha: 0.25),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Subtle pattern overlay
          Positioned(
            top: -30,
            right: -20,
            child: IgnorePointer(
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.white.withValues(alpha: 0.06),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -20,
            left: -10,
            child: IgnorePointer(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.white.withValues(alpha: 0.04),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting
                Text(
                  context.tr(_greetingKey()),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF93C5FD),
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    // Avatar
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        gradient: LinearGradient(
                          colors: [
                            Colors.white.withValues(alpha: 0.20),
                            Colors.white.withValues(alpha: 0.08),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                      ),
                      child: Center(
                        child: Text(
                          fullName.isNotEmpty ? fullName[0].toUpperCase() : '?',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fullName,
                            style: theme.textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$position • $department',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFFBFDBFE),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                // Chips row
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _HeroChip(
                      label: role.toUpperCase(),
                      gradient: const [Color(0xFF3B82F6), Color(0xFF2563EB)],
                    ),
                    _HeroChip(label: status),
                    if (checkIn != null && checkIn!.isNotEmpty)
                      _HeroChip(label: '${context.tr('check_in')} ${_formatDateTime(checkIn, context)}'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label, this.gradient});

  final String label;
  final List<Color>? gradient;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        gradient: gradient != null
            ? LinearGradient(colors: gradient!)
            : null,
        color: gradient == null ? Colors.white.withValues(alpha: 0.12) : null,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 11,
            ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.subtitle,
    this.icon,
  });

  final String title;
  final String subtitle;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        if (icon != null) ...[
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF1D4ED8).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: const Color(0xFF1D4ED8)),
          ),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AttendanceHighlightCard extends StatelessWidget {
  const _AttendanceHighlightCard({
    required this.attendance,
    required this.onOpenAttendance,
  });

  final Map<String, dynamic> attendance;
  final VoidCallback onOpenAttendance;

  @override
  Widget build(BuildContext context) {
    final checkIn = attendance['check_in']?.toString();
    final checkOut = attendance['check_out']?.toString();
    final totalHours = localizeDigits(
      context,
      attendance['total_work_hours']?.toString() ?? '0',
    );
    final status = attendance['status']?.toString() ?? 'NOT_STARTED';

    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: InkWell(
        onTap: onOpenAttendance,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.6)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _InfoStat(
                      label: context.tr('status'),
                      value: _attendanceStatusLabel(context, status),
                      icon: Icons.verified_user_rounded,
                      accent: const Color(0xFF1D4ED8),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _InfoStat(
                      label: context.tr('work_hours'),
                      value: totalHours,
                      icon: Icons.schedule_rounded,
                      accent: const Color(0xFF0F766E),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _TimelineItem(
                      label: context.tr('check_in'),
                      value: _formatDateTime(checkIn, context),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _TimelineItem(
                      label: context.tr('check_out'),
                      value: _formatDateTime(checkOut, context),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Align(
                alignment: Alignment.centerRight,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F766E).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        context.tr('open_attendance'),
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: const Color(0xFF0F766E),
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward_rounded, size: 16, color: Color(0xFF0F766E)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        ),
      ),
    );
  }
}

class _InfoStat extends StatelessWidget {
  const _InfoStat({
    required this.label,
    required this.value,
    required this.icon,
    required this.accent,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: accent),
          const SizedBox(height: 10),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({
    required this.summary,
    required this.onOpenLeave,
    required this.onOpenExpenses,
    required this.onOpenHelpdesk,
    required this.onOpenDocuments,
  });

  final Map<String, dynamic> summary;
  final VoidCallback onOpenLeave;
  final VoidCallback onOpenExpenses;
  final VoidCallback onOpenHelpdesk;
  final VoidCallback onOpenDocuments;

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        context.tr('pending_leaves'),
        formatLocalizedNumber(context, summary['pending_leaves']),
        Icons.event_note_rounded,
        const Color(0xFF7C3AED),
        onOpenLeave,
      ),
      (
        context.tr('pending_expenses'),
        formatLocalizedNumber(context, summary['pending_expenses']),
        Icons.receipt_long_rounded,
        const Color(0xFFEA580C),
        onOpenExpenses,
      ),
      (
        context.tr('open_tickets'),
        formatLocalizedNumber(context, summary['open_tickets']),
        Icons.support_agent_rounded,
        const Color(0xFF2563EB),
        onOpenHelpdesk,
      ),
      (
        context.tr('assets'),
        formatLocalizedNumber(context, summary['assigned_assets']),
        Icons.inventory_2_rounded,
        const Color(0xFF0F766E),
        null,
      ),
      (
        context.tr('pending_docs'),
        formatLocalizedNumber(context, summary['pending_documents']),
        Icons.folder_copy_rounded,
        const Color(0xFFBE185D),
        onOpenDocuments,
      ),
      (
        context.tr('trainings'),
        formatLocalizedNumber(context, summary['upcoming_trainings']),
        Icons.school_rounded,
        const Color(0xFF4338CA),
        null,
      ),
    ];

    return GridView.builder(
      itemCount: items.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.2,
      ),
      itemBuilder: (context, index) {
        final item = items[index];
        return _MetricTile(
          label: item.$1,
          value: item.$2,
          icon: item.$3,
          color: item.$4,
          onTap: item.$5,
        );
      },
    );
  }
}

class _QuickAccessRow extends StatelessWidget {
  const _QuickAccessRow({
    required this.onOpenAttendance,
    required this.onOpenLeave,
    required this.onOpenExpenses,
    required this.onOpenHelpdesk,
    required this.onOpenDocuments,
  });

  final VoidCallback onOpenAttendance;
  final VoidCallback onOpenLeave;
  final VoidCallback onOpenExpenses;
  final VoidCallback onOpenHelpdesk;
  final VoidCallback onOpenDocuments;

  @override
  Widget build(BuildContext context) {
    final items = [
      (context.tr('attendance_title'), Icons.qr_code_scanner_rounded, const Color(0xFF0F766E), onOpenAttendance),
      (context.tr('leave_title'), Icons.event_note_rounded, const Color(0xFF7C3AED), onOpenLeave),
      (context.tr('expense_title'), Icons.receipt_long_rounded, const Color(0xFFEA580C), onOpenExpenses),
      (context.tr('helpdesk_title'), Icons.support_agent_rounded, const Color(0xFF2563EB), onOpenHelpdesk),
      (context.tr('dossier_title'), Icons.folder_copy_rounded, const Color(0xFFBE185D), onOpenDocuments),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('quick_access'),
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 78,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final item = items[index];
              return _QuickAccessChip(
                label: item.$1,
                icon: item.$2,
                color: item.$3,
                onTap: item.$4,
              );
            },
          ),
        ),
      ],
    );
  }
}

class _QuickAccessChip extends StatelessWidget {
  const _QuickAccessChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          width: 176,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: color.withValues(alpha: 0.12)),
            gradient: LinearGradient(
              colors: [
                Colors.white,
                color.withValues(alpha: 0.05),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      context.tr('open_module'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF64748B),
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.onTap,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0F0F172A),
                blurRadius: 16,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const Spacer(),
                Text(
                  value,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UpcomingTrainingsCard extends StatelessWidget {
  const _UpcomingTrainingsCard({required this.trainings});

  final List<Map<String, dynamic>> trainings;

  @override
  Widget build(BuildContext context) {
    if (trainings.isEmpty) {
      return _EmptyCard(
        icon: Icons.school_outlined,
        title: context.tr('no_upcoming_training'),
        subtitle: context.tr('assigned_sessions_here'),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            for (var index = 0; index < trainings.length; index++) ...[
              _TrainingRow(training: trainings[index]),
              if (index != trainings.length - 1)
                const Divider(height: 24, color: Color(0xFFE2E8F0)),
            ],
          ],
        ),
      ),
    );
  }
}

class _TrainingRow extends StatelessWidget {
  const _TrainingRow({required this.training});

  final Map<String, dynamic> training;

  @override
  Widget build(BuildContext context) {
    final title = training['title']?.toString() ?? '-';
    final date = _formatDate(training['date']?.toString(), context);
    final time = training['time']?.toString() ?? '-';
    final location = training['location']?.toString() ?? context.tr('to_be_announced');

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFFDBEAFE),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Icon(
            Icons.menu_book_rounded,
            color: Color(0xFF1D4ED8),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                '$date • $time',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 3),
              Text(
                location,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF94A3B8),
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DevicesCard extends StatelessWidget {
  const _DevicesCard({
    required this.devicesData,
    required this.onTap,
  });

  final AsyncValue<List<Map<String, dynamic>>> devicesData;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: devicesData.when(
        data: (devices) => ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 6,
          ),
          onTap: onTap,
          leading: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFEDE9FE),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.phonelink_lock_rounded,
              color: Color(0xFF6D28D9),
            ),
          ),
          title: Text(context.tr('registered_devices')),
          subtitle: Text(
            devices.isEmpty
                ? context.tr('devices_empty')
                : '${devices.length} ${context.tr('registered_devices')}',
          ),
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
        loading: () => ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
          leading: const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          title: Text(context.tr('registered_devices')),
          subtitle: Text(context.tr('loading')),
        ),
        error: (_, __) => ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
          onTap: onTap,
          leading: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.warning_amber_rounded,
              color: Color(0xFFDC2626),
            ),
          ),
          title: Text(context.tr('registered_devices')),
          subtitle: Text(context.tr('could_not_load_devices')),
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
      ),
    );
  }
}

class _QuickProfileCard extends StatelessWidget {
  const _QuickProfileCard({required this.profile});

  final Map<String, dynamic> profile;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('quick_profile'),
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 14),
            _ProfileLine(label: context.tr('email'), value: profile['email']?.toString() ?? '-'),
            _ProfileLine(label: context.tr('phone'), value: profile['phone']?.toString() ?? '-'),
            _ProfileLine(
              label: context.tr('department'),
              value: _displayProfileValue(
                context,
                profile['department']?.toString() ?? '-',
              ),
            ),
            _ProfileLine(
              label: context.tr('position'),
              value: _displayProfileValue(
                context,
                profile['position']?.toString() ?? '-',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileLine extends StatelessWidget {
  const _ProfileLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(icon, size: 34, color: const Color(0xFF94A3B8)),
            const SizedBox(height: 12),
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

String _formatDateTime(String? raw, [BuildContext? context]) {
  if (raw == null || raw.isEmpty) return context?.tr('not_available') ?? 'Not available';
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  if (context == null) return parsed.toLocal().toIso8601String();
  return formatLocalizedDate(
    context,
    parsed,
    pattern: 'dd MMM • HH:mm',
  );
}

String _formatDate(String? raw, [BuildContext? context]) {
  if (raw == null || raw.isEmpty) return context?.tr('to_be_announced') ?? 'TBA';
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  if (context == null) return parsed.toLocal().toIso8601String();
  return formatLocalizedDate(context, parsed);
}

String _roleLabel(BuildContext context, String? raw) {
  switch (raw?.toUpperCase()) {
    case 'EMPLOYEE':
      return context.tr('employee_role');
    case 'MANAGER':
      return context.tr('manager_role');
    case 'ADMIN':
      return context.tr('admin_role');
    case 'SUPERADMIN':
      return context.tr('superadmin_role');
    default:
      return raw ?? '-';
  }
}

String _displayProfileValue(BuildContext context, String raw) {
  if (raw.isEmpty || raw == '-') return raw;
  if (Localizations.localeOf(context).languageCode != 'tr') return raw;

  const tokenMap = {
    'asli': 'Aslı',
    'ayse': 'Ayşe',
    'yigit': 'Yiğit',
    'nazli': 'Nazlı',
    'ates': 'Ateş',
    'koc': 'Koç',
    'guner': 'Güner',
    'akin': 'Akın',
    'ozdemir': 'Özdemir',
    'sari': 'Sarı',
    'gok': 'Gök',
    'ik': 'İK',
    'uzmani': 'Uzmanı',
    'muduru': 'Müdürü',
    'yonetici': 'Yönetici',
    'yardimci': 'Yardımcı',
    'muhendis': 'Mühendis',
    'idari': 'İdari',
    'isler': 'İşler',
    'egitim': 'Eğitim',
    'gelisim': 'Gelişim',
    'kazanimi': 'Kazanımı',
    'insan': 'İnsan',
    'santiye': 'Şantiye',
    'soforu': 'Şoförü',
    'teknisyeni': 'Teknisyeni',
    'uzmanligi': 'Uzmanlığı',
  };

  final parts = raw.split(RegExp(r'(\s+|/|-)'));
  return parts.map((part) {
    if (part.trim().isEmpty || part == '/' || part == '-') return part;

    final normalized = part.toLowerCase();
    final mapped = tokenMap[normalized];
    if (mapped != null) return mapped;

    final isAllCaps = part == part.toUpperCase() && RegExp(r'^[A-Z]+$').hasMatch(part);
    if (isAllCaps) {
      return _titleCaseAsciiToken(part);
    }
    return part;
  }).join();
}

String _titleCaseAsciiToken(String raw) {
  if (raw.isEmpty) return raw;
  final lower = raw.toLowerCase();
  return '${lower[0].toUpperCase()}${lower.substring(1)}';
}

String _attendanceStatusLabel(BuildContext context, String? rawStatus) {
  switch (rawStatus?.toUpperCase()) {
    case 'PRESENT':
      return context.tr('status_on_time');
    case 'LATE':
      return context.tr('status_late');
    case 'ABSENT':
      return context.tr('status_absent');
    case 'NOT_STARTED':
      return context.tr('status_not_started');
    default:
      return rawStatus?.replaceAll('_', ' ') ?? '-';
  }
}
