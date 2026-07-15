import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/providers/app_providers.dart';
import '../../../shared/widgets/app_background.dart';
import 'device_provider.dart';

class DevicesPage extends ConsumerWidget {
  const DevicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final devicesAsync = ref.watch(mobileDevicesProvider);
    final pushEnabledAsync = ref.watch(pushNotificationEnabledProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: Text(context.tr('registered_devices')),
      ),
      body: AppBackground(
        child: devicesAsync.when(
        data: (devices) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(mobileDevicesProvider);
              ref.invalidate(pushNotificationEnabledProvider);
              await Future.wait([
                ref.read(mobileDevicesProvider.future),
                ref.read(pushNotificationEnabledProvider.future),
              ]);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _SingleDevicePolicyCard(hasCurrentDevice: devices.isNotEmpty),
                const SizedBox(height: 12),
                _PushPreparationCard(
                  pushEnabledAsync: pushEnabledAsync,
                  onEnable: () async {
                    await ref
                        .read(mobileDeviceServiceProvider)
                        .enablePushNotifications();
                    ref.invalidate(mobileDevicesProvider);
                    ref.invalidate(pushNotificationEnabledProvider);
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(context.tr('notifications_enabled')),
                      ),
                    );
                  },
                  onDisable: () async {
                    await ref
                        .read(mobileDeviceServiceProvider)
                        .disablePushNotifications();
                    ref.invalidate(mobileDevicesProvider);
                    ref.invalidate(pushNotificationEnabledProvider);
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(context.tr('notifications_disabled')),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),
                if (devices.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      context.tr('devices_empty'),
                      textAlign: TextAlign.center,
                    ),
                  )
                else
                  ...List.generate(devices.length, (index) {
                    final device = devices[index];
                    final deviceName =
                        device['device_name']?.toString() ?? 'Unknown Device';
                    final platform = _platformLabel(
                      context,
                      device['device_platform']?.toString(),
                    );
                    final lastLogin = _formatLastLogin(
                      context,
                      device['last_login_at']?.toString(),
                    );
                    final pushRegistered = device['push_token_registered'] == true
                        ? context.tr('yes')
                        : context.tr('no');
                    final isCurrentDevice = device['is_current_device'] == true;
                    final isLocalFallback = device['is_local_fallback'] == true;

                    return Padding(
                      padding: EdgeInsets.only(
                        bottom: index == devices.length - 1 ? 0 : 12,
                      ),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      deviceName,
                                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                  ),
                                  if (isCurrentDevice)
                                    _DeviceBadge(
                                      label: context.tr('current_device'),
                                      backgroundColor: const Color(0xFFDCFCE7),
                                      foregroundColor: const Color(0xFF15803D),
                                    ),
                                  if (isCurrentDevice) ...[
                                    const SizedBox(width: 8),
                                    _DeviceBadge(
                                      label: context.tr('single_active_device'),
                                      backgroundColor: const Color(0xFFEDE9FE),
                                      foregroundColor: const Color(0xFF6D28D9),
                                    ),
                                  ],
                                  if (isLocalFallback) ...[
                                    const SizedBox(width: 8),
                                    _DeviceBadge(
                                      label: context.tr('this_session'),
                                      backgroundColor: const Color(0xFFE0F2FE),
                                      foregroundColor: const Color(0xFF0369A1),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _InfoPill(
                                    icon: Icons.devices_rounded,
                                    label: '${context.tr('platform')}: $platform',
                                  ),
                                  _InfoPill(
                                    icon: Icons.notifications_active_rounded,
                                    label: '${context.tr('push_registered')}: $pushRegistered',
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                '${context.tr('last_login')}: $lastLogin',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: const Color(0xFF475569),
                                    ),
                              ),
                              if (device['device_id'] != null) ...[
                                const SizedBox(height: 8),
                                SelectableText(
                                  '${context.tr('device_id')}: ${device['device_id']}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              '${context.tr('could_not_load_devices')}\n$error',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        ),
      ),
    );
  }
}

class _PushPreparationCard extends StatelessWidget {
  const _PushPreparationCard({
    required this.pushEnabledAsync,
    required this.onEnable,
    required this.onDisable,
  });

  final AsyncValue<bool> pushEnabledAsync;
  final Future<void> Function() onEnable;
  final Future<void> Function() onDisable;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: pushEnabledAsync.when(
        data: (enabled) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('notifications_center'),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              enabled
                  ? context.tr('push_setup_active')
                  : context.tr('push_setup_ready'),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: enabled ? onDisable : onEnable,
              icon: Icon(
                enabled
                    ? Icons.notifications_off_rounded
                    : Icons.notifications_active_rounded,
              ),
              label: Text(
                enabled
                    ? context.tr('disable_notifications')
                    : context.tr('enable_notifications'),
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Text(
          context.tr('notifications_summary_unavailable'),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF64748B),
              ),
        ),
      ),
    );
  }
}

class _SingleDevicePolicyCard extends StatelessWidget {
  const _SingleDevicePolicyCard({required this.hasCurrentDevice});

  final bool hasCurrentDevice;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.verified_user_rounded,
                  color: Color(0xFF4338CA),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  context.tr('single_device_policy_title'),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            context.tr('single_device_policy_desc'),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF64748B),
                ),
          ),
          if (hasCurrentDevice) ...[
            const SizedBox(height: 12),
            _InfoPill(
              icon: Icons.shield_rounded,
              label: context.tr('single_device_policy_active_state'),
            ),
          ],
        ],
      ),
    );
  }
}

class AdminDevicesPage extends ConsumerWidget {
  const AdminDevicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final devicesAsync = ref.watch(adminDevicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('company_device_sessions')),
      ),
      body: AppBackground(
        child: devicesAsync.when(
          data: (devices) {
            if (devices.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                child: Text(
                  context.tr('admin_devices_empty'),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(adminDevicesProvider);
                await ref.read(adminDevicesProvider.future);
              },
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      context.tr('company_device_sessions_desc'),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFF475569),
                          ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (var index = 0; index < devices.length; index++) ...[
                    Builder(
                      builder: (context) {
                  final device = devices[index];
                  final deviceName =
                      device['device_name']?.toString() ?? 'Unknown Device';
                  final employeeName =
                      device['employee_name']?.toString() ?? '-';
                  final platform = _platformLabel(
                    context,
                    device['device_platform']?.toString(),
                  );
                  final lastLogin = _formatLastLogin(
                    context,
                    device['last_login_at']?.toString(),
                  );
                  final pushRegistered =
                      device['push_token_registered'] == true ? context.tr('yes') : context.tr('no');

                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            deviceName,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            employeeName,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: const Color(0xFF475569),
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _InfoPill(
                                icon: Icons.devices_rounded,
                                label: '${context.tr('platform')}: $platform',
                              ),
                              _InfoPill(
                                icon: Icons.notifications_active_rounded,
                                label: '${context.tr('push_registered')}: $pushRegistered',
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            '${context.tr('last_login')}: $lastLogin',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: const Color(0xFF475569),
                                ),
                          ),
                          if (device['device_id'] != null) ...[
                            const SizedBox(height: 8),
                            SelectableText(
                              '${context.tr('device_id')}: ${device['device_id']}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                      },
                    ),
                    if (index != devices.length - 1) const SizedBox(height: 12),
                  ],
                ],
              ),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                '${context.tr('could_not_load_devices')}\n$error',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DeviceBadge extends StatelessWidget {
  const _DeviceBadge({
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
  });

  final String label;
  final Color backgroundColor;
  final Color foregroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: foregroundColor,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF475569)),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: const Color(0xFF334155),
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

String _platformLabel(BuildContext context, String? raw) {
  switch ((raw ?? '').toLowerCase()) {
    case 'web':
      return context.tr('platform_web');
    case 'android':
      return context.tr('platform_android');
    case 'ios':
      return context.tr('platform_ios');
    case 'macos':
      return context.tr('platform_macos');
    default:
      return raw?.toUpperCase() ?? '-';
  }
}

String _formatLastLogin(BuildContext context, String? raw) {
  if (raw == null || raw.isEmpty) return context.tr('not_available');
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  return formatLocalizedDate(
    context,
    parsed,
    pattern: 'dd MMM yyyy • HH:mm',
  );
}
