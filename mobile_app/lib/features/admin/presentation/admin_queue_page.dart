import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/widgets/app_background.dart';
import 'admin_provider.dart';

class AdminQueuePage extends ConsumerWidget {
  const AdminQueuePage({
    super.key,
    required this.queueType,
  });

  final String queueType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedStatus = ref.watch(adminQueueStatusFilterProvider(queueType));
    final queueRequest = (queueType: queueType, status: selectedStatus);
    final queueAsync = ref.watch(adminQueueProvider(queueRequest));
    final summaryAsync = ref.watch(adminQueueStatusSummaryProvider(queueType));

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () => context.go('/admin-home'),
        ),
        title: Text(_queueTitle(context, queueType)),
      ),
      body: AppBackground(
        child: queueAsync.when(
          data: (data) {
            final items = (data['items'] as List? ?? const [])
                .whereType<Map<String, dynamic>>()
                .toList();
            final total = data['total'] as int? ?? items.length;

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(adminQueueProvider(queueRequest));
                ref.invalidate(adminQueueStatusSummaryProvider(queueType));
                await ref.read(adminQueueProvider(queueRequest).future);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
                children: [
                  _AdminQueueHero(
                    title: _queueTitle(context, queueType),
                    total: total,
                    summaryAsync: summaryAsync,
                    queueType: queueType,
                    selectedStatus: selectedStatus,
                    onStatusSelected: (status) =>
                        ref.read(adminQueueStatusFilterProvider(queueType).notifier).state = status,
                  ),
                  const SizedBox(height: 18),
                  if (items.isEmpty)
                    _AdminQueueEmpty(queueType: queueType, selectedStatus: selectedStatus)
                  else
                    ...[
                      for (var index = 0; index < items.length; index++) ...[
                        _AdminQueueCard(
                          queueType: queueType,
                          item: items[index],
                          onStatusAction: _supportsApproval(queueType)
                                  && items[index]['status']?.toString() == 'PENDING'
                              ? (status) => _handleStatusAction(
                                    context,
                                    ref,
                                    queueType,
                                    items[index]['id'] as int,
                                    status,
                                  )
                              : null,
                          onOpenDetail: queueType == 'helpdesk'
                              ? () async {
                                  await context.push('/helpdesk/${items[index]['id']}');
                                  ref.invalidate(adminQueueProvider(queueRequest));
                                  ref.invalidate(adminQueueStatusSummaryProvider(queueType));
                                  ref.invalidate(adminDashboardProvider);
                                }
                              : null,
                        ),
                        if (index != items.length - 1) const SizedBox(height: 12),
                      ],
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
                '${context.tr('admin_dashboard_load_failed')}\n$error',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleStatusAction(
    BuildContext context,
    WidgetRef ref,
    String queueType,
    int id,
    String status,
  ) async {
    try {
      final message = await ref.read(adminServiceProvider).updateQueueStatus(
            queueType: queueType,
            id: id,
            status: status,
          );
      final selectedStatus = ref.read(adminQueueStatusFilterProvider(queueType));
      ref.invalidate(adminQueueProvider((queueType: queueType, status: selectedStatus)));
      ref.invalidate(adminQueueStatusSummaryProvider(queueType));
      ref.invalidate(adminDashboardProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }
}

class _AdminQueueHero extends StatelessWidget {
  const _AdminQueueHero({
    required this.title,
    required this.total,
    required this.summaryAsync,
    required this.queueType,
    required this.selectedStatus,
    this.onStatusSelected,
  });

  final String title;
  final int total;
  final AsyncValue<Map<String, dynamic>> summaryAsync;
  final String queueType;
  final String? selectedStatus;
  final ValueChanged<String?>? onStatusSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        context.tr('admin_pending_queue'),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFFE2E8F0),
                            ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    children: [
                      Text(
                        _localizedCount(context, total),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _summaryTotalLabel(context, queueType, selectedStatus),
                        style: Theme.of(context).textTheme.labelMedium?.copyWith(
                              color: Colors.white,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            summaryAsync.when(
              data: (summary) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _summaryChips(
                  context,
                  queueType,
                  summary,
                  selectedStatus,
                  onStatusSelected,
                ),
              ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({
    required this.label,
    required this.value,
    this.onTap,
    this.selected = false,
  });

  final String label;
  final String value;
  final VoidCallback? onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final backgroundColor = selected
        ? Colors.white.withValues(alpha: 0.22)
        : Colors.white.withValues(alpha: 0.12);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
        border: selected ? Border.all(color: Colors.white.withValues(alpha: 0.26)) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: selected ? Colors.white : Colors.white70,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    ));
  }
}

class _AdminQueueEmpty extends StatelessWidget {
  const _AdminQueueEmpty({
    required this.queueType,
    required this.selectedStatus,
  });

  final String queueType;
  final String? selectedStatus;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          const Icon(Icons.inbox_rounded, size: 40, color: Color(0xFF94A3B8)),
          const SizedBox(height: 10),
          Text(
            _emptyText(context, queueType, selectedStatus),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: const Color(0xFF475569),
                ),
          ),
        ],
      ),
    );
  }
}

class _AdminQueueCard extends StatelessWidget {
  const _AdminQueueCard({
    required this.queueType,
    required this.item,
    this.onStatusAction,
    this.onOpenDetail,
  });

  final String queueType;
  final Map<String, dynamic> item;
  final Future<void> Function(String status)? onStatusAction;
  final Future<void> Function()? onOpenDetail;

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
            Row(
              children: [
                Expanded(
                  child: Text(
                    item['employee_name']?.toString() ?? '-',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                _StatusPill(
                  label: _statusLabel(
                    context,
                    item['status']?.toString(),
                  ),
                  status: item['status']?.toString(),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MetaChip(
                  icon: _queueIcon(queueType),
                  label: _queueTitle(context, queueType),
                ),
                if (_dateValueForQueue(queueType, item) != null)
                  _MetaChip(
                    icon: Icons.calendar_today_rounded,
                    label: _formatDate(context, _dateValueForQueue(queueType, item)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            ..._details(context, queueType, item),
            if (onStatusAction != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => onStatusAction!('REJECTED'),
                      icon: const Icon(Icons.close_rounded),
                      label: Text(context.tr('status_rejected')),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => onStatusAction!('APPROVED'),
                      icon: const Icon(Icons.check_rounded),
                      label: Text(context.tr('status_approved')),
                    ),
                  ),
                ],
              ),
            ],
            if (queueType == 'helpdesk') ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onOpenDetail,
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: Text(context.tr('open_ticket')),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.label,
    required this.status,
  });

  final String label;
  final String? status;

  @override
  Widget build(BuildContext context) {
    final meta = _statusMeta(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: meta.$1,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: meta.$2,
            ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
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

List<Widget> _details(
  BuildContext context,
  String queueType,
  Map<String, dynamic> item,
) {
  switch (queueType) {
    case 'leaves':
      return [
        _DetailLine(
          label: context.tr('leave_type'),
          value: _leaveTypeLabel(context, item['leave_type']?.toString()),
        ),
        _DetailLine(
          label: context.tr('date_range'),
          value:
              '${_formatDate(context, item['start_date'])} - ${_formatDate(context, item['end_date'])}',
        ),
        _DetailLine(
          label: context.tr('total_days'),
          value: _localizedCount(context, item['total_days']),
        ),
        _DetailLine(
          label: context.tr('reason'),
          value: item['reason']?.toString().trim().isNotEmpty == true
              ? item['reason'].toString()
              : context.tr('not_available'),
        ),
      ];
    case 'expenses':
      return [
        _DetailLine(
          label: context.tr('category'),
          value: _expenseCategoryLabel(context, item['category']?.toString()),
        ),
        _DetailLine(
          label: context.tr('total_amount'),
          value:
              '${_localizedCount(context, item['amount'])} ${item['currency'] ?? ''}'
                  .trim(),
        ),
        _DetailLine(
          label: context.tr('date'),
          value: _formatDate(context, item['expense_date']),
        ),
        _DetailLine(
          label: context.tr('description'),
          value: item['description']?.toString().trim().isNotEmpty == true
              ? item['description'].toString()
              : context.tr('not_available'),
        ),
      ];
    case 'documents':
      return [
        _DetailLine(
          label: context.tr('document_type'),
          value: _documentTypeLabel(context, item['document_type']?.toString()),
        ),
        _DetailLine(
          label: context.tr('category'),
          value: item['category']?.toString() ?? context.tr('not_available'),
        ),
        _DetailLine(
          label: context.tr('file_name'),
          value: item['file_name']?.toString() ?? '-',
        ),
        _DetailLine(
          label: context.tr('uploaded_on'),
          value: _formatDate(context, item['upload_date']),
        ),
      ];
    case 'helpdesk':
      return [
        _DetailLine(
          label: context.tr('category'),
          value: _helpdeskCategoryLabel(context, item['category']?.toString()),
        ),
        _DetailLine(
          label: context.tr('priority'),
          value: _priorityLabel(context, item['priority']?.toString()),
        ),
        _DetailLine(
          label: context.tr('subject'),
          value: item['subject']?.toString() ?? '-',
        ),
        _DetailLine(
          label: context.tr('date'),
          value: _formatDate(context, item['updated_at'] ?? item['created_at']),
        ),
      ];
    default:
      return const [];
  }
}

class _DetailLine extends StatelessWidget {
  const _DetailLine({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: RichText(
        text: TextSpan(
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF334155),
              ),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}

String _queueTitle(BuildContext context, String queueType) {
  switch (queueType) {
    case 'leaves':
      return context.tr('admin_leave_queue_title');
    case 'expenses':
      return context.tr('admin_expense_queue_title');
    case 'documents':
      return context.tr('admin_document_queue_title');
    case 'helpdesk':
      return context.tr('admin_helpdesk_queue_title');
    default:
      return context.tr('admin_lite_title');
  }
}

bool _supportsApproval(String queueType) =>
    queueType == 'leaves' || queueType == 'expenses' || queueType == 'documents';

String _emptyText(BuildContext context, String queueType, String? selectedStatus) {
  switch (queueType) {
    case 'leaves':
      return selectedStatus == 'APPROVED' || selectedStatus == 'REJECTED'
          ? context.tr('no_leave_for_filter')
          : context.tr('admin_no_pending_leaves');
    case 'expenses':
      return selectedStatus == 'APPROVED' || selectedStatus == 'REJECTED' || selectedStatus == 'PAID'
          ? context.tr('no_expense_for_filter')
          : context.tr('admin_no_pending_expenses');
    case 'documents':
      return selectedStatus == 'APPROVED' || selectedStatus == 'REJECTED'
          ? context.tr('no_documents_for_filter')
          : context.tr('admin_no_pending_documents');
    case 'helpdesk':
      return context.tr('admin_no_open_tickets');
    default:
      return context.tr('not_available');
  }
}

String _summaryTotalLabel(BuildContext context, String queueType, String? selectedStatus) {
  if (queueType == 'helpdesk') {
    return _statusLabel(context, selectedStatus);
  }
  if (selectedStatus == null || selectedStatus == 'PENDING') {
    return context.tr('pending_total');
  }
  return _statusLabel(context, selectedStatus);
}

List<Widget> _summaryChips(
  BuildContext context,
  String queueType,
  Map<String, dynamic> summary,
  String? selectedStatus,
  ValueChanged<String?>? onStatusSelected,
) {
  if (queueType == 'helpdesk') {
    return [
      _SummaryChip(
        selected: selectedStatus == 'OPEN',
        label: context.tr('status_open'),
        value: _localizedCount(context, summary['open_count']),
        onTap: onStatusSelected == null ? null : () => onStatusSelected('OPEN'),
      ),
      _SummaryChip(
        selected: selectedStatus == 'IN_PROGRESS',
        label: context.tr('status_in_progress'),
        value: _localizedCount(context, summary['in_progress_count']),
        onTap: onStatusSelected == null ? null : () => onStatusSelected('IN_PROGRESS'),
      ),
      _SummaryChip(
        selected: selectedStatus == 'RESOLVED',
        label: context.tr('status_resolved'),
        value: _localizedCount(context, summary['resolved_count']),
        onTap: onStatusSelected == null ? null : () => onStatusSelected('RESOLVED'),
      ),
    ];
  }

  return [
    _SummaryChip(
      selected: selectedStatus == 'PENDING',
      label: context.tr('status_pending'),
      value: _localizedCount(context, summary['pending_count']),
      onTap: onStatusSelected == null ? null : () => onStatusSelected('PENDING'),
    ),
    _SummaryChip(
      selected: selectedStatus == 'APPROVED',
      label: context.tr('status_approved'),
      value: _localizedCount(context, summary['approved_count']),
      onTap: onStatusSelected == null ? null : () => onStatusSelected('APPROVED'),
    ),
    _SummaryChip(
      selected: selectedStatus == 'REJECTED',
      label: context.tr('status_rejected'),
      value: _localizedCount(context, summary['rejected_count']),
      onTap: onStatusSelected == null ? null : () => onStatusSelected('REJECTED'),
    ),
    if (queueType == 'expenses')
      _SummaryChip(
        selected: selectedStatus == 'PAID',
        label: context.tr('status_paid'),
        value: _localizedCount(context, summary['paid_count']),
        onTap: onStatusSelected == null ? null : () => onStatusSelected('PAID'),
      ),
  ];
}

String _formatDate(BuildContext context, dynamic value) {
  final raw = value?.toString();
  if (raw == null || raw.isEmpty) return '-';
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  return formatLocalizedDate(context, parsed, pattern: 'dd.MM.yyyy');
}

String _localizedCount(BuildContext context, Object? value) {
  return formatLocalizedNumber(context, value);
}

(Color, Color) _statusMeta(String? status) {
  switch (status) {
    case 'PENDING':
      return (const Color(0xFFFEF3C7), const Color(0xFF92400E));
    case 'APPROVED':
      return (const Color(0xFFDCFCE7), const Color(0xFF166534));
    case 'REJECTED':
      return (const Color(0xFFFEE2E2), const Color(0xFF991B1B));
    case 'PAID':
      return (const Color(0xFFDBEAFE), const Color(0xFF1D4ED8));
    case 'AÇIK':
    case 'OPEN':
      return (const Color(0xFFE0F2FE), const Color(0xFF0369A1));
    case 'İŞLEMDE':
    case 'IN_PROGRESS':
      return (const Color(0xFFFAE8FF), const Color(0xFFA21CAF));
    case 'ÇÖZÜLDÜ':
    case 'RESOLVED':
      return (const Color(0xFFDCFCE7), const Color(0xFF166534));
    default:
      return (const Color(0xFFE2E8F0), const Color(0xFF334155));
  }
}

IconData _queueIcon(String queueType) {
  switch (queueType) {
    case 'leaves':
      return Icons.event_note_rounded;
    case 'expenses':
      return Icons.receipt_long_rounded;
    case 'documents':
      return Icons.folder_open_rounded;
    case 'helpdesk':
      return Icons.support_agent_rounded;
    default:
      return Icons.inbox_rounded;
  }
}

dynamic _dateValueForQueue(String queueType, Map<String, dynamic> item) {
  switch (queueType) {
    case 'leaves':
      return item['created_at'] ?? item['start_date'];
    case 'expenses':
      return item['expense_date'];
    case 'documents':
      return item['upload_date'];
    case 'helpdesk':
      return item['updated_at'] ?? item['created_at'];
    default:
      return null;
  }
}

String _statusLabel(BuildContext context, String? status) {
  switch (status) {
    case 'PENDING':
      return context.tr('status_pending');
    case 'APPROVED':
      return context.tr('status_approved');
    case 'REJECTED':
      return context.tr('status_rejected');
    case 'PAID':
      return context.tr('status_paid');
    case 'AÇIK':
    case 'OPEN':
      return context.tr('status_open');
    case 'İŞLEMDE':
    case 'IN_PROGRESS':
      return context.tr('status_in_progress');
    case 'ÇÖZÜLDÜ':
    case 'RESOLVED':
      return context.tr('status_resolved');
    default:
      return status ?? '-';
  }
}

String _leaveTypeLabel(BuildContext context, String? value) {
  switch (value) {
    case 'ANNUAL':
      return context.tr('annual_leave');
    case 'SICK':
      return context.tr('sick_leave');
    case 'UNPAID':
      return context.tr('unpaid_leave');
    case 'MATERNITY':
      return context.tr('maternity');
    default:
      return value ?? context.tr('other_leave');
  }
}

String _expenseCategoryLabel(BuildContext context, String? value) {
  switch (value) {
    case 'MEAL':
    case 'YEMEK':
      return context.tr('meal');
    case 'TRANSPORT':
    case 'ULASIM':
    case 'ULAŞIM':
      return context.tr('transport');
    case 'OFFICE':
    case 'OFIS':
    case 'OFİS':
      return context.tr('office');
    case 'FUEL':
    case 'YAKIT':
      return context.tr('fuel');
    case 'ACCOMMODATION':
    case 'KONAKLAMA':
      return context.tr('accommodation');
    default:
      return value ?? context.tr('other');
  }
}

String _documentTypeLabel(BuildContext context, String? value) {
  switch (value) {
    case 'IDENTITY_COPY':
      return context.tr('identity_copy');
    case 'PASSPORT_COPY':
      return context.tr('passport_copy');
    case 'CONTRACT':
      return context.tr('contract');
    case 'CERTIFICATE':
      return context.tr('certificate');
    case 'PAYROLL_DOCUMENT':
      return context.tr('payroll_document');
    default:
      return value ?? '-';
  }
}

String _helpdeskCategoryLabel(BuildContext context, String? value) {
  switch (value) {
    case 'IT_DESTEK':
    case 'IT_SUPPORT':
      return context.tr('it_support');
    case 'IK_TALEBI':
    case 'HR_REQUEST':
      return context.tr('hr_request');
    case 'IDARI_TALEP':
    case 'ADMINISTRATIVE':
      return context.tr('administrative');
    case 'BORDRO':
    case 'PAYROLL':
      return context.tr('payroll');
    default:
      return value ?? context.tr('other');
  }
}

String _priorityLabel(BuildContext context, String? value) {
  switch (value) {
    case 'LOW':
    case 'DÜŞÜK':
      return context.tr('low');
    case 'NORMAL':
      return context.tr('normal');
    case 'URGENT':
    case 'ACİL':
      return context.tr('urgent');
    default:
      return value ?? '-';
  }
}
