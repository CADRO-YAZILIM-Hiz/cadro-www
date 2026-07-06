import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/utils/dio_error_utils.dart';
import '../../../shared/widgets/app_background.dart';
import 'leave_provider.dart';

class LeavePage extends ConsumerWidget {
  const LeavePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(leaveSummaryProvider);
    final listAsync = ref.watch(leaveListProvider);
    final statusFilter = ref.watch(leaveStatusFilterProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: Text(context.tr('leave_title')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateLeaveSheet(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('new_request')),
      ),
      body: AppBackground(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(leaveSummaryProvider);
            ref.invalidate(leaveListProvider);
            await Future.wait([
              ref.read(leaveSummaryProvider.future),
              ref.read(leaveListProvider.future),
            ]);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
            children: [
              summaryAsync.when(
                data: (summary) => _LeaveSummaryCard(summary: summary),
                loading: () => const _LoadingCard(height: 188),
                error: (error, _) => _ErrorCard(message: friendlyError(error)),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Text(
                    context.tr('my_leave_requests'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              listAsync.when(
                data: (items) {
                  final filteredItems = statusFilter == 'ALL'
                      ? items
                      : items.where((item) => (item['status']?.toString() ?? 'PENDING') == statusFilter).toList();

                  if (items.isEmpty) {
                    return _ErrorCard(
                      message: context.tr('no_leave_records'),
                      icon: Icons.event_busy_outlined,
                    );
                  }

                  return Column(
                    children: [
                      _StatusFilterBar(
                        selected: statusFilter,
                        allCount: items.length,
                        pendingCount: items.where((item) => (item['status']?.toString() ?? 'PENDING') == 'PENDING').length,
                        approvedCount: items.where((item) => (item['status']?.toString() ?? '') == 'APPROVED').length,
                        rejectedCount: items.where((item) => (item['status']?.toString() ?? '') == 'REJECTED').length,
                        onChanged: (value) => ref.read(leaveStatusFilterProvider.notifier).state = value,
                      ),
                      const SizedBox(height: 12),
                      if (filteredItems.isEmpty)
                        _ErrorCard(
                          message: context.tr('no_leave_for_filter'),
                          icon: Icons.filter_alt_off_rounded,
                        )
                      else
                        for (var index = 0; index < filteredItems.length; index++) ...[
                          _LeaveRequestCard(item: filteredItems[index]),
                          if (index != filteredItems.length - 1)
                            const SizedBox(height: 12),
                        ],
                    ],
                  );
                },
                loading: () => const _LoadingCard(height: 220),
                error: (error, _) => _ErrorCard(message: friendlyError(error)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openCreateLeaveSheet(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateLeaveSheet(
        onCreated: () {
          ref.invalidate(leaveSummaryProvider);
          ref.invalidate(leaveListProvider);
        },
      ),
    );
  }
}

class _StatusFilterBar extends StatelessWidget {
  const _StatusFilterBar({
    required this.selected,
    required this.allCount,
    required this.pendingCount,
    required this.approvedCount,
    required this.rejectedCount,
    required this.onChanged,
  });

  final String selected;
  final int allCount;
  final int pendingCount;
  final int approvedCount;
  final int rejectedCount;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChipButton(
            label: context.tr('all_records'),
            count: allCount,
            isSelected: selected == 'ALL',
            onTap: () => onChanged('ALL'),
          ),
          const SizedBox(width: 8),
          _FilterChipButton(
            label: context.tr('status_pending'),
            count: pendingCount,
            isSelected: selected == 'PENDING',
            onTap: () => onChanged('PENDING'),
          ),
          const SizedBox(width: 8),
          _FilterChipButton(
            label: context.tr('status_approved'),
            count: approvedCount,
            isSelected: selected == 'APPROVED',
            onTap: () => onChanged('APPROVED'),
          ),
          const SizedBox(width: 8),
          _FilterChipButton(
            label: context.tr('status_rejected'),
            count: rejectedCount,
            isSelected: selected == 'REJECTED',
            onTap: () => onChanged('REJECTED'),
          ),
        ],
      ),
    );
  }
}

class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({
    required this.label,
    required this.count,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? const Color(0xFF0F766E) : Colors.white,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: isSelected ? Colors.white : const Color(0xFF0F172A),
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withValues(alpha: 0.18) : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  formatLocalizedNumber(context, count),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: isSelected ? Colors.white : const Color(0xFF334155),
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LeaveSummaryCard extends StatelessWidget {
  const _LeaveSummaryCard({required this.summary});

  final Map<String, dynamic> summary;

  @override
  Widget build(BuildContext context) {
    final breakdown = Map<String, dynamic>.from(
      summary['breakdown'] as Map? ?? {},
    );

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF2563EB)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${context.tr('year_label')} ${formatLocalizedNumber(context, summary['year'] ?? DateTime.now().year)}',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _SummaryValue(
                    label: context.tr('used_days'),
                    value: formatLocalizedNumber(context, summary['total_used_days']),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SummaryValue(
                    label: context.tr('leave_types'),
                    value: formatLocalizedNumber(context, breakdown.length),
                  ),
                ),
              ],
            ),
            if (breakdown.isNotEmpty) ...[
              const SizedBox(height: 18),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: breakdown.entries
                    .map(
                      (entry) => Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '${_leaveTypeLabel(context, entry.key)}: ${formatLocalizedNumber(context, entry.value)}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SummaryValue extends StatelessWidget {
  const _SummaryValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.white70,
                ),
          ),
        ],
      ),
    );
  }
}

class _LeaveRequestCard extends StatelessWidget {
  const _LeaveRequestCard({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final status = item['status']?.toString() ?? 'PENDING';
    final start = _formatDate(context, item['start_date']?.toString());
    final end = _formatDate(context, item['end_date']?.toString());
    final reason = item['reason']?.toString() ?? '-';
    final totalDays = formatLocalizedNumber(context, item['total_days']);

    final statusMeta = switch (status) {
      'APPROVED' => (const Color(0xFFDCFCE7), const Color(0xFF15803D)),
      'REJECTED' => (const Color(0xFFFEE2E2), const Color(0xFFB91C1C)),
      _ => (const Color(0xFFDBEAFE), const Color(0xFF1D4ED8)),
    };

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => _showDetails(
          context,
          leaveType: _leaveTypeLabel(context, item['leave_type']?.toString() ?? '-'),
          status: _leaveStatusLabel(context, status),
          dateRange: '$start → $end',
          totalDays: totalDays,
          reason: reason,
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
                      _leaveTypeLabel(context, item['leave_type']?.toString() ?? '-'),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusMeta.$1,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      _leaveStatusLabel(context, status),
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: statusMeta.$2,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                '$start → $end',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                '${context.tr('total_days')}: $totalDays',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 10),
              Text(
                reason,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF334155),
                    ),
              ),
              const SizedBox(height: 10),
              Text(
                context.tr('tap_to_view_details'),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: const Color(0xFF0F766E),
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showDetails(
    BuildContext context, {
    required String leaveType,
    required String status,
    required String dateRange,
    required String totalDays,
    required String reason,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _LeaveDetailSheet(
        leaveType: leaveType,
        status: status,
        dateRange: dateRange,
        totalDays: totalDays,
        reason: reason,
      ),
    );
  }
}

class _LeaveDetailSheet extends StatelessWidget {
  const _LeaveDetailSheet({
    required this.leaveType,
    required this.status,
    required this.dateRange,
    required this.totalDays,
    required this.reason,
  });

  final String leaveType;
  final String status;
  final String dateRange;
  final String totalDays;
  final String reason;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 32,
      ),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('leave_request_details'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                dateRange,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _DetailChip(label: context.tr('leave_type'), value: leaveType),
                  _DetailChip(label: context.tr('status'), value: status),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('total_days'),
                      value: totalDays,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('status'),
                      value: status,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _DetailLine(label: context.tr('leave_type'), value: leaveType),
              _DetailLine(label: context.tr('date_range'), value: dateRange),
              _DetailLine(label: context.tr('reason'), value: reason),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.check_rounded),
                  label: Text(context.tr('close')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CreateLeaveSheet extends ConsumerStatefulWidget {
  const _CreateLeaveSheet({required this.onCreated});

  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateLeaveSheet> createState() => _CreateLeaveSheetState();
}

class _CreateLeaveSheetState extends ConsumerState<_CreateLeaveSheet> {
  final _reasonController = TextEditingController();
  final _dayController = TextEditingController(text: '1');
  String _leaveType = 'ANNUAL';
  String? _leaveCountry;
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _syncTotalDays();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _dayController.dispose();
    super.dispose();
  }

  double get _calculatedTotalDays {
    final start = DateTime(_startDate.year, _startDate.month, _startDate.day);
    final end = DateTime(_endDate.year, _endDate.month, _endDate.day);
    final diff = end.difference(start).inDays + 1;
    return diff < 1 ? 1 : diff.toDouble();
  }

  void _syncTotalDays() {
    _dayController.text = _calculatedTotalDays.toStringAsFixed(
      _calculatedTotalDays.truncateToDouble() == _calculatedTotalDays ? 0 : 1,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 32,
      ),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('new_request'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 18),
              _buildLeaveTypeDropdown(context),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _DateField(
                      label: context.tr('start_date'),
                      value: _startDate,
                      onTap: () async {
                        final picked = await _pickDate(_startDate);
                        if (picked != null) {
                          setState(() {
                            _startDate = picked;
                            if (_endDate.isBefore(_startDate)) {
                              _endDate = _startDate;
                            }
                            _syncTotalDays();
                          });
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DateField(
                      label: context.tr('end_date'),
                      value: _endDate,
                      onTap: () async {
                        final picked = await _pickDate(_endDate);
                        if (picked != null) {
                          setState(() {
                            _endDate = picked.isBefore(_startDate)
                                ? _startDate
                                : picked;
                            _syncTotalDays();
                          });
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _dayController,
                readOnly: true,
                decoration: InputDecoration(
                  labelText: context.tr('total_days'),
                  helperText: context.tr('total_days'),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _reasonController,
                minLines: 3,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: context.tr('reason'),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isSaving ? null : _submit,
                  child: Text(_isSaving ? context.tr('submitting') : context.tr('submit')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<DateTime?> _pickDate(DateTime initialDate) {
    return showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
  }

  Future<void> _submit() async {
    final reason = _reasonController.text.trim();
    final totalDays = double.tryParse(_dayController.text.trim());

    if (reason.isEmpty || totalDays == null || totalDays <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('form_validation_error'))),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final message = await ref.read(leaveServiceProvider).createLeave(
            leaveType: _leaveType,
            startDate: _startDate,
            endDate: _endDate,
            totalDays: totalDays,
            reason: reason,
            leaveCountry: _leaveCountry,
          );

      if (!mounted) return;
      widget.onCreated();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } on DioException catch (error) {
      final data = error.response?.data;
      final detail = data is Map && data['detail'] != null
          ? data['detail'].toString()
          : context.tr('leave_submit_failed');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(detail)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('leave_submit_failed'))),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  static const _fallbackLeaveTypes = [
    {'code': 'ANNUAL', 'label_key': 'annual_leave'},
    {'code': 'SICK', 'label_key': 'sick_leave'},
    {'code': 'UNPAID', 'label_key': 'unpaid_leave'},
    {'code': 'MATERNITY', 'label_key': 'maternity'},
    {'code': 'OTHER', 'label_key': 'other_leave'},
  ];

  Widget _buildLeaveTypeDropdown(BuildContext context) {
    final catalogAsync = ref.watch(leaveCatalogProvider);

    final items = catalogAsync.when(
      data: (catalogs) {
        if (catalogs.isEmpty) return _fallbackItems(context);
        return catalogs.map<DropdownMenuItem<String>>((catalog) {
          final code = catalog['leave_type']?.toString() ?? '';
          final name = catalog['name']?.toString() ?? code;
          final country = catalog['country']?.toString();
          return DropdownMenuItem(
            value: code,
            onTap: () => _leaveCountry = country,
            child: Text(name),
          );
        }).toList();
      },
      loading: () => _fallbackItems(context),
      error: (_, __) => _fallbackItems(context),
    );

    if (!items.any((i) => i.value == _leaveType) && items.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _leaveType = items.first.value ?? 'ANNUAL');
      });
    }

    return DropdownButtonFormField<String>(
      value: _leaveType,
      decoration: InputDecoration(labelText: context.tr('leave_type')),
      items: items,
      onChanged: (value) {
        if (value != null) setState(() => _leaveType = value);
      },
    );
  }

  List<DropdownMenuItem<String>> _fallbackItems(BuildContext context) {
    return _fallbackLeaveTypes.map((e) {
      return DropdownMenuItem(
        value: e['code'] as String,
        child: Text(context.tr(e['label_key'] as String)),
      );
    }).toList();
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final DateTime value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: Text(formatLocalizedDate(context, value)),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({
    required this.message,
    this.icon = Icons.info_outline_rounded,
  });

  final String message;
  final IconData icon;

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
            Icon(icon, size: 36, color: const Color(0xFF94A3B8)),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF475569),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailLine extends StatelessWidget {
  const _DetailLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label: $value',
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: const Color(0xFF1D4ED8),
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _DetailMetric extends StatelessWidget {
  const _DetailMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF64748B),
                ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

String _formatDate(BuildContext context, String? raw) {
  return formatLocalizedDateFromRaw(context, raw);
}

String _leaveTypeLabel(BuildContext context, String raw) {
  switch (raw) {
    case 'ANNUAL':
      return context.tr('annual_leave');
    case 'SICK':
      return context.tr('sick_leave');
    case 'UNPAID':
      return context.tr('unpaid_leave');
    case 'MATERNITY':
      return context.tr('maternity');
    case 'OTHER':
      return context.tr('other_leave');
    default:
      return raw;
  }
}

String _leaveStatusLabel(BuildContext context, String raw) {
  switch (raw) {
    case 'APPROVED':
      return context.tr('status_approved');
    case 'REJECTED':
      return context.tr('status_rejected');
    case 'PENDING':
      return context.tr('status_pending');
    default:
      return raw;
  }
}
