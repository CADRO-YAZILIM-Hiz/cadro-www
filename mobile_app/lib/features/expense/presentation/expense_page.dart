import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/files/image_compression_service.dart';
import '../../../shared/utils/dio_error_utils.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/widgets/app_background.dart';
import '../data/expense_service.dart';
import 'expense_provider.dart';

const _currencyOptions = [
  ('TRY', '₺ TRY'),
  ('USD', '\$ USD'),
  ('EUR', '€ EUR'),
  ('GBP', '£ GBP'),
  ('AED', 'د.إ AED'),
  ('SAR', '﷼ SAR'),
  ('QAR', '﷼ QAR'),
  ('KWD', 'د.ك KWD'),
  ('BHD', '.د.ب BHD'),
  ('OMR', 'ر.ع OMR'),
  ('JOD', 'د.ا JOD'),
  ('EGP', '£ EGP'),
];

class ExpensePage extends ConsumerWidget {
  const ExpensePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(expenseSummaryProvider);
    final listAsync = ref.watch(expenseListProvider);
    final statusFilter = ref.watch(expenseStatusFilterProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: Text(context.tr('expense_title')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateExpenseSheet(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: Text(context.tr('new_expense')),
      ),
      body: AppBackground(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(expenseSummaryProvider);
            ref.invalidate(expenseListProvider);
            await Future.wait([
              ref.read(expenseSummaryProvider.future),
              ref.read(expenseListProvider.future),
            ]);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
            children: [
              summaryAsync.when(
                data: (summary) => _ExpenseSummaryCard(summary: summary),
                loading: () => const _LoadingCard(height: 188),
                error: (error, _) => _ErrorCard(message: friendlyError(error)),
              ),
              const SizedBox(height: 18),
              Text(
                context.tr('my_expense_claims'),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 12),
              listAsync.when(
                data: (items) {
                  final filteredItems = statusFilter == 'ALL'
                      ? items
                      : items.where((item) => _expenseFilterStatus(item) == statusFilter).toList();

                  if (items.isEmpty) {
                    return _ErrorCard(
                      message: context.tr('no_expense_records'),
                      icon: Icons.receipt_long_outlined,
                    );
                  }

                  return Column(
                    children: [
                      _StatusFilterBar(
                        selected: statusFilter,
                        allCount: items.length,
                        pendingCount: items.where((item) => _expenseFilterStatus(item) == 'PENDING').length,
                        approvedCount: items.where((item) => _expenseFilterStatus(item) == 'APPROVED').length,
                        paidCount: items.where((item) => _expenseFilterStatus(item) == 'PAID').length,
                        rejectedCount: items.where((item) => _expenseFilterStatus(item) == 'REJECTED').length,
                        onChanged: (value) => ref.read(expenseStatusFilterProvider.notifier).state = value,
                      ),
                      const SizedBox(height: 12),
                      if (filteredItems.isEmpty)
                        _ErrorCard(
                          message: context.tr('no_expenses_for_filter'),
                          icon: Icons.filter_alt_off_rounded,
                        )
                      else
                        for (var index = 0; index < filteredItems.length; index++) ...[
                          _ExpenseCard(item: filteredItems[index]),
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

  Future<void> _openCreateExpenseSheet(
    BuildContext context,
    WidgetRef ref,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateExpenseSheet(
        onCreated: () {
          ref.invalidate(expenseSummaryProvider);
          ref.invalidate(expenseListProvider);
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
    required this.paidCount,
    required this.rejectedCount,
    required this.onChanged,
  });

  final String selected;
  final int allCount;
  final int pendingCount;
  final int approvedCount;
  final int paidCount;
  final int rejectedCount;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChipButton(label: context.tr('all_records'), count: allCount, isSelected: selected == 'ALL', onTap: () => onChanged('ALL')),
          const SizedBox(width: 8),
          _FilterChipButton(label: context.tr('status_pending'), count: pendingCount, isSelected: selected == 'PENDING', onTap: () => onChanged('PENDING')),
          const SizedBox(width: 8),
          _FilterChipButton(label: context.tr('status_approved'), count: approvedCount, isSelected: selected == 'APPROVED', onTap: () => onChanged('APPROVED')),
          const SizedBox(width: 8),
          _FilterChipButton(label: context.tr('status_paid'), count: paidCount, isSelected: selected == 'PAID', onTap: () => onChanged('PAID')),
          const SizedBox(width: 8),
          _FilterChipButton(label: context.tr('status_rejected'), count: rejectedCount, isSelected: selected == 'REJECTED', onTap: () => onChanged('REJECTED')),
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

class _ExpenseSummaryCard extends StatelessWidget {
  const _ExpenseSummaryCard({required this.summary});

  final Map<String, dynamic> summary;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF111827), Color(0xFF0F766E)],
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
              context.tr('expense_overview'),
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
                    label: context.tr('pending'),
                    value: formatLocalizedNumber(context, summary['pending_count']),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SummaryValue(
                    label: context.tr('approved'),
                    value: formatLocalizedNumber(context, summary['approved_count']),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _SummaryValue(
                    label: context.tr('paid'),
                    value: formatLocalizedNumber(context, summary['paid_count']),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SummaryValue(
                    label: context.tr('total_claims'),
                    value: formatLocalizedNumber(context, summary['total_items']),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '${context.tr('total_amount')}: ${formatLocalizedNumber(context, summary['total_amount'])}',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
            ),
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

class _ExpenseCard extends StatelessWidget {
  const _ExpenseCard({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final status = item['status']?.toString() ?? 'PENDING';
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
          category: _expenseCategoryLabel(context, item['category']?.toString()),
          status: _expenseStatusLabel(context, status),
          amount: localizeDigits(context, '${item['amount'] ?? 0} ${item['currency'] ?? ''}'),
          expenseDate: _formatDate(context, item['expense_date']?.toString()),
          description: item['description']?.toString() ?? '-',
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
                      _expenseCategoryLabel(context, item['category']?.toString()),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusMeta.$1,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      _expenseStatusLabel(context, status),
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: statusMeta.$2,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                localizeDigits(context, '${item['amount'] ?? 0} ${item['currency'] ?? ''}'),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                _formatDate(context, item['expense_date']?.toString()),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 10),
              Text(
                item['description']?.toString() ?? '-',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF334155),
                    ),
              ),
              if (item['is_paid'] == true) ...[
                const SizedBox(height: 10),
                Text(
                  context.tr('status_paid'),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: const Color(0xFF15803D),
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
              if (item['receipt_url'] != null &&
                  item['receipt_url'].toString().isNotEmpty) ...[
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: () => _openReceipt(item['receipt_url'].toString()),
                  icon: const Icon(Icons.receipt_long_outlined),
                  label: Text(context.tr('open_receipt')),
                ),
              ],
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

  Future<void> _openReceipt(String rawUrl) async {
    final uri = Uri.parse('http://127.0.0.1:8000$rawUrl');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _showDetails(
    BuildContext context, {
    required String category,
    required String status,
    required String amount,
    required String expenseDate,
    required String description,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _ExpenseDetailSheet(
        category: category,
        status: status,
        amount: amount,
        expenseDate: expenseDate,
        description: description,
      ),
    );
  }
}

class _ExpenseDetailSheet extends StatelessWidget {
  const _ExpenseDetailSheet({
    required this.category,
    required this.status,
    required this.amount,
    required this.expenseDate,
    required this.description,
  });

  final String category;
  final String status;
  final String amount;
  final String expenseDate;
  final String description;

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
                context.tr('expense_details'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                expenseDate,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _DetailChip(label: context.tr('category'), value: category),
                  _DetailChip(label: context.tr('status'), value: status),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('total_amount'),
                      value: amount,
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
              _DetailLine(label: context.tr('category'), value: category),
              _DetailLine(label: context.tr('date'), value: expenseDate),
              _DetailLine(label: context.tr('description'), value: description),
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

class _CreateExpenseSheet extends ConsumerStatefulWidget {
  const _CreateExpenseSheet({required this.onCreated});

  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateExpenseSheet> createState() => _CreateExpenseSheetState();
}

class _CreateExpenseSheetState extends ConsumerState<_CreateExpenseSheet> {
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _imagePicker = ImagePicker();
  final _compressionService = ImageCompressionService();
  String _category = 'MEAL';
  String _currency = 'TRY';
  DateTime _expenseDate = DateTime.now();
  bool _isSaving = false;
  ExpenseAttachmentPayload? _attachment;
  String? _attachmentLabel;
  String? _attachmentHint;

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
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
                context.tr('new_expense'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 18),
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: InputDecoration(labelText: context.tr('category')),
                items: [
                  DropdownMenuItem(value: 'MEAL', child: Text(context.tr('meal'))),
                  DropdownMenuItem(value: 'TRANSPORT', child: Text(context.tr('transport'))),
                  DropdownMenuItem(value: 'OFFICE', child: Text(context.tr('office'))),
                  DropdownMenuItem(value: 'FUEL', child: Text(context.tr('fuel'))),
                  DropdownMenuItem(value: 'ACCOMMODATION', child: Text(context.tr('accommodation'))),
                  DropdownMenuItem(value: 'OTHER', child: Text(context.tr('other'))),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _category = value);
                  }
                },
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(labelText: context.tr('total_amount')),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _currency,
                      decoration: InputDecoration(labelText: context.tr('currency')),
                      items: _currencyOptions
                          .map(
                            (item) => DropdownMenuItem<String>(
                              value: item.$1,
                              child: Text(item.$2),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _currency = value);
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(14),
                child: InputDecorator(
                  decoration: InputDecoration(labelText: context.tr('start_date')),
                  child: Text(formatLocalizedDate(context, _expenseDate)),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _descriptionController,
                minLines: 3,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: context.tr('description'),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('receipt_invoice'),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _attachmentLabel ?? context.tr('no_file_selected'),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFF475569),
                          ),
                    ),
                    if (_attachmentHint != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        _attachmentHint!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: const Color(0xFF0F766E),
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isSaving ? null : _pickReceiptFile,
                            icon: const Icon(Icons.attach_file_rounded),
                            label: Text(context.tr('choose_file')),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isSaving ? null : _captureReceiptPhoto,
                            icon: const Icon(Icons.photo_camera_back_rounded),
                            label: Text(context.tr('take_photo')),
                          ),
                        ),
                      ],
                    ),
                  ],
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

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expenseDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (picked != null) {
      setState(() => _expenseDate = picked);
    }
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text.trim());
    final description = _descriptionController.text.trim();

    if (amount == null || amount <= 0 || _currency.isEmpty || description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('form_validation_error'))),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final message = await ref.read(expenseServiceProvider).createExpense(
            amount: amount,
            currency: _currency,
            category: _category,
            description: description,
            expenseDate: _expenseDate,
            attachment: _attachment,
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
          : context.tr('expense_submit_failed');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(detail)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('expense_submit_failed'))),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _pickReceiptFile() async {
    final sourceLabel = context.tr('selected_file');
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'pdf'],
      withData: true,
    );
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    await _setAttachment(bytes: file.bytes!, fileName: file.name, sourceLabel: sourceLabel);
  }

  Future<void> _captureReceiptPhoto() async {
    final sourceLabel = context.tr('captured_photo');
    final photo = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 92,
      maxWidth: 2200,
    );
    if (photo == null) return;
    final bytes = await photo.readAsBytes();
    await _setAttachment(bytes: bytes, fileName: photo.name, sourceLabel: sourceLabel);
  }

  Future<void> _setAttachment({
    required List<int> bytes,
    required String fileName,
    required String sourceLabel,
  }) async {
    final originalSize = bytes.length;
    final compressed = await _compressionService.compressIfNeeded(
      bytes: Uint8List.fromList(bytes),
      fileName: fileName,
    );
    final finalSize = compressed.bytes.lengthInBytes;

    if (!mounted) return;
    setState(() {
      _attachment = ExpenseAttachmentPayload(
        bytes: compressed.bytes,
        fileName: compressed.fileName,
        mimeType: compressed.mimeType,
      );
      _attachmentLabel = compressed.fileName;
      _attachmentHint =
          '$sourceLabel ${context.tr('optimized_file')}: ${_formatBytes(originalSize)} -> ${_formatBytes(finalSize)}';
    });
  }

  String _formatBytes(int bytes) {
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
    }
    if (bytes >= 1024) {
      return '${(bytes / 1024).toStringAsFixed(0)} KB';
    }
    return '$bytes B';
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

String _expenseCategoryLabel(BuildContext context, String? raw) {
  switch (raw) {
    case 'MEAL':
      return context.tr('meal');
    case 'TRANSPORT':
      return context.tr('transport');
    case 'OFFICE':
      return context.tr('office');
    case 'FUEL':
      return context.tr('fuel');
    case 'ACCOMMODATION':
      return context.tr('accommodation');
    case 'OTHER':
      return context.tr('other');
    default:
      return raw ?? '-';
  }
}

String _expenseStatusLabel(BuildContext context, String raw) {
  switch (raw) {
    case 'APPROVED':
      return context.tr('status_approved');
    case 'REJECTED':
      return context.tr('status_rejected');
    case 'PENDING':
      return context.tr('status_pending');
    case 'PAID':
      return context.tr('status_paid');
    default:
      return raw;
  }
}

String _expenseFilterStatus(Map<String, dynamic> item) {
  if (item['is_paid'] == true) return 'PAID';
  return item['status']?.toString() ?? 'PENDING';
}
