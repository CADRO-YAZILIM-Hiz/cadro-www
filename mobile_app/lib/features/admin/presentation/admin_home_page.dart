import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/providers/app_providers.dart';
import '../../../shared/widgets/app_background.dart';
import 'admin_provider.dart';

class AdminHomePage extends ConsumerWidget {
  const AdminHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(adminDashboardProvider);
    final authState = ref.watch(authControllerProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        title: Text(
          context.tr('app_title'),
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => ref.read(appLocaleProvider.notifier).state = Locale(value),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.language_rounded, size: 18),
                  const SizedBox(width: 6),
                  Text(context.tr('language')),
                ],
              ),
            ),
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'tr', child: Text('TR')),
              PopupMenuItem(value: 'en', child: Text('EN')),
              PopupMenuItem(value: 'de', child: Text('DE')),
              PopupMenuItem(value: 'ar', child: Text('AR')),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF0F172A),
                backgroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
              ),
              onPressed: () async {
                await ref.read(authControllerProvider.notifier).logout();
                if (!context.mounted) return;
                context.go('/login');
              },
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: Text(context.tr('logout')),
            ),
          ),
        ],
      ),
      body: AppBackground(
        child: dashboardAsync.when(
          data: (data) {
            final profile = Map<String, dynamic>.from(data['profile'] as Map? ?? const {});
            final profileData = Map<String, dynamic>.from(profile['profile'] as Map? ?? const {});
            final approvals = Map<String, dynamic>.from(data['approvals'] as Map? ?? const {});
            final notifications = Map<String, dynamic>.from(data['notifications'] as Map? ?? const {});
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(adminDashboardProvider);
                await ref.read(adminDashboardProvider.future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
                children: [
                  _AdminHeroCard(
                    name: authState.name ?? profileData['full_name']?.toString() ?? '-',
                    role: _roleLabel(context, authState.role ?? profileData['role']?.toString()),
                    department: profileData['department']?.toString() ?? '-',
                    position: profileData['position']?.toString() ?? '-',
                    totalApprovals: approvals['total']?.toString() ?? '0',
                  ),
                  const SizedBox(height: 18),
                  _SectionTitle(
                    title: context.tr('overview'),
                    subtitle:
                        '${context.tr('pending_leaves')} / ${context.tr('pending_expenses')}',
                  ),
                  const SizedBox(height: 12),
                  _AdminQuickAccessRow(
                    onOpenLeaves: () => context.push('/admin-queue/leaves'),
                    onOpenExpenses: () => context.push('/admin-queue/expenses'),
                    onOpenDocuments: () => context.push('/admin-queue/documents'),
                    onOpenHelpdesk: () => context.push('/admin-queue/helpdesk'),
                    onOpenDevices: () => context.push('/devices'),
                  ),
                  const SizedBox(height: 14),
                  const _WebReportsNotice(),
                  const SizedBox(height: 14),
                  _ApprovalsGrid(
                    approvals: approvals,
                    onOpenLeaves: () => context.push('/admin-queue/leaves'),
                    onOpenExpenses: () => context.push('/admin-queue/expenses'),
                    onOpenDocuments: () => context.push('/admin-queue/documents'),
                    onOpenHelpdesk: () => context.push('/admin-queue/helpdesk'),
                  ),
                  const SizedBox(height: 18),
                  _SectionTitle(
                    title: context.tr('notifications_center'),
                    subtitle: context.tr('notifications_summary'),
                  ),
                  const SizedBox(height: 12),
                  _AdminNotificationsCard(
                    notifications: notifications,
                    onOpenLeaves: () => context.push('/admin-queue/leaves'),
                    onOpenExpenses: () => context.push('/admin-queue/expenses'),
                    onOpenDocuments: () => context.push('/admin-queue/documents'),
                    onOpenHelpdesk: () => context.push('/admin-queue/helpdesk'),
                  ),
                ],
              ),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                '${context.tr('admin_dashboard_load_failed')}\n$error',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _WebReportsNotice extends StatelessWidget {
  const _WebReportsNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.web_asset_rounded,
              size: 18,
              color: Color(0xFFB45309),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('reports_web_only_title'),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF92400E),
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  context.tr('reports_web_only_desc'),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF78350F),
                        fontWeight: FontWeight.w600,
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

class _AdminNotificationsCard extends StatelessWidget {
  const _AdminNotificationsCard({
    required this.notifications,
    required this.onOpenLeaves,
    required this.onOpenExpenses,
    required this.onOpenDocuments,
    required this.onOpenHelpdesk,
  });

  final Map<String, dynamic> notifications;
  final VoidCallback onOpenLeaves;
  final VoidCallback onOpenExpenses;
  final VoidCallback onOpenDocuments;
  final VoidCallback onOpenHelpdesk;

  @override
  Widget build(BuildContext context) {
    final items = [
      (context.tr('pending_leaves'), notifications['pending_leaves'], Icons.event_note_rounded, onOpenLeaves),
      (context.tr('pending_expenses'), notifications['pending_expenses'], Icons.receipt_long_rounded, onOpenExpenses),
      (context.tr('pending_docs'), notifications['pending_documents'], Icons.folder_copy_rounded, onOpenDocuments),
      (context.tr('open_tickets'), notifications['open_tickets'], Icons.support_agent_rounded, onOpenHelpdesk),
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
                _localizedCount(context, items[index].$2),
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
  }
}

class _AdminHeroCard extends StatelessWidget {
  const _AdminHeroCard({
    required this.name,
    required this.role,
    required this.department,
    required this.position,
    required this.totalApprovals,
  });

  final String name;
  final String role;
  final String department;
  final String position;
  final String totalApprovals;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F0F172A),
            blurRadius: 24,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.admin_panel_settings_rounded, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$position • $department',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFFE2E8F0),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _HeroChip(label: role),
                _HeroChip(label: context.tr('admin_lite_title')),
                _HeroChip(
                  label:
                      '${context.tr('pending_total')}: ${_localizedCount(context, totalApprovals)}',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: theme.textTheme.bodySmall?.copyWith(
            color: const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }
}

class _ApprovalsGrid extends StatelessWidget {
  const _ApprovalsGrid({
    required this.approvals,
    required this.onOpenLeaves,
    required this.onOpenExpenses,
    required this.onOpenDocuments,
    required this.onOpenHelpdesk,
  });

  final Map<String, dynamic> approvals;
  final VoidCallback onOpenLeaves;
  final VoidCallback onOpenExpenses;
  final VoidCallback onOpenDocuments;
  final VoidCallback onOpenHelpdesk;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.1,
      children: [
        _MetricCard(
          title: context.tr('pending_leaves'),
          value: '${approvals['pending_leaves'] ?? 0}',
          icon: Icons.event_note_rounded,
          color: const Color(0xFF2563EB),
          onTap: onOpenLeaves,
        ),
        _MetricCard(
          title: context.tr('pending_expenses'),
          value: '${approvals['pending_expenses'] ?? 0}',
          icon: Icons.receipt_long_rounded,
          color: const Color(0xFF0F766E),
          onTap: onOpenExpenses,
        ),
        _MetricCard(
          title: context.tr('pending_docs'),
          value: '${approvals['pending_documents'] ?? 0}',
          icon: Icons.folder_open_rounded,
          color: const Color(0xFF7C3AED),
          onTap: onOpenDocuments,
        ),
        _MetricCard(
          title: context.tr('open_tickets'),
          value: '${approvals['open_tickets'] ?? 0}',
          icon: Icons.support_agent_rounded,
          color: const Color(0xFFEA580C),
          onTap: onOpenHelpdesk,
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color),
              ),
              const Spacer(),
              Text(
                _localizedCount(context, value),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF475569),
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                context.tr('open_module'),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: color,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdminQuickAccessRow extends StatelessWidget {
  const _AdminQuickAccessRow({
    required this.onOpenLeaves,
    required this.onOpenExpenses,
    required this.onOpenDocuments,
    required this.onOpenHelpdesk,
    required this.onOpenDevices,
  });

  final VoidCallback onOpenLeaves;
  final VoidCallback onOpenExpenses;
  final VoidCallback onOpenDocuments;
  final VoidCallback onOpenHelpdesk;
  final VoidCallback onOpenDevices;

  @override
  Widget build(BuildContext context) {
    final items = [
      (context.tr('pending_leaves'), Icons.event_note_rounded, const Color(0xFF7C3AED), onOpenLeaves),
      (context.tr('pending_expenses'), Icons.receipt_long_rounded, const Color(0xFFEA580C), onOpenExpenses),
      (context.tr('pending_docs'), Icons.folder_copy_rounded, const Color(0xFFBE185D), onOpenDocuments),
      (context.tr('open_tickets'), Icons.support_agent_rounded, const Color(0xFF2563EB), onOpenHelpdesk),
      (context.tr('registered_devices'), Icons.devices_rounded, const Color(0xFF0F766E), onOpenDevices),
    ];

    return SizedBox(
      height: 78,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final item = items[index];
          return _AdminQuickAccessChip(
            label: item.$1,
            icon: item.$2,
            color: item.$3,
            onTap: item.$4,
          );
        },
      ),
    );
  }
}

class _AdminQuickAccessChip extends StatelessWidget {
  const _AdminQuickAccessChip({
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
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
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

String _localizedCount(BuildContext context, Object? value) {
  return formatLocalizedNumber(context, value);
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
