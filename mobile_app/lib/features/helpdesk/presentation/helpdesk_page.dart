import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/utils/dio_error_utils.dart';
import '../../admin/presentation/admin_provider.dart';
import '../../../shared/providers/app_providers.dart';
import '../../../shared/widgets/app_background.dart';
import '../data/helpdesk_service.dart';
import 'helpdesk_provider.dart';

class HelpdeskPage extends ConsumerWidget {
  const HelpdeskPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketsAsync = ref.watch(helpdeskListProvider);
    final statusFilter = ref.watch(helpdeskStatusFilterProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: Text(context.tr('helpdesk_title')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateTicketSheet(context, ref),
        icon: const Icon(Icons.add_comment_rounded),
        label: Text(context.tr('new_ticket')),
      ),
      body: AppBackground(
        child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(helpdeskListProvider);
          await ref.read(helpdeskListProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
          children: [
            Text(
              context.tr('my_tickets'),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 12),
            ticketsAsync.when(
              data: (items) {
                final filteredItems = statusFilter == 'ALL'
                    ? items
                    : items
                        .where((item) => _normalizeTicketStatus(item['status']?.toString()) == statusFilter)
                        .toList();

                if (items.isEmpty) {
                  return _InfoCard(
                    icon: Icons.support_agent_rounded,
                    message: context.tr('no_support_tickets'),
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _HelpdeskFilterBar(
                      selected: statusFilter,
                      totalCount: items.length,
                      openCount: items
                          .where((item) => _normalizeTicketStatus(item['status']?.toString()) == 'OPEN')
                          .length,
                      inProgressCount: items
                          .where((item) => _normalizeTicketStatus(item['status']?.toString()) == 'IN_PROGRESS')
                          .length,
                      resolvedCount: items
                          .where((item) => _normalizeTicketStatus(item['status']?.toString()) == 'RESOLVED')
                          .length,
                      onChanged: (value) {
                        ref.read(helpdeskStatusFilterProvider.notifier).state = value;
                      },
                    ),
                    const SizedBox(height: 14),
                    if (filteredItems.isEmpty)
                      _InfoCard(
                        icon: Icons.filter_alt_off_rounded,
                        message: context.tr('no_tickets_for_filter'),
                      )
                    else
                      Column(
                        children: [
                          for (var index = 0; index < filteredItems.length; index++) ...[
                            _TicketCard(
                              item: filteredItems[index],
                              onTap: () => context.push('/helpdesk/${filteredItems[index]['id']}'),
                            ),
                            if (index != filteredItems.length - 1)
                              const SizedBox(height: 12),
                          ],
                        ],
                      ),
                  ],
                );
              },
              loading: () => const _LoadingCard(),
              error: (error, _) => _InfoCard(message: friendlyError(error)),
            ),
          ],
        ),
        ),
      ),
    );
  }

  Future<void> _openCreateTicketSheet(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateTicketSheet(
        onCreated: () {
          ref.invalidate(helpdeskListProvider);
        },
      ),
    );
  }
}

class HelpdeskDetailPage extends ConsumerWidget {
  const HelpdeskDetailPage({super.key, required this.ticketId});

  final int ticketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(helpdeskDetailProvider(ticketId));
    final authState = ref.watch(authControllerProvider);
    final canManage = _canManageTicket(authState.role);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/helpdesk'),
        ),
        title: Text(context.tr('ticket_detail')),
      ),
      body: AppBackground(
        child: detailAsync.when(
        data: (detail) {
          final messages = (detail['messages'] as List? ?? const [])
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList();

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    _TicketHeader(
                      detail: detail,
                      canManage: canManage,
                      onUpdateStatus: canManage
                          ? (status) async {
                              final result = await ref
                                  .read(helpdeskServiceProvider)
                                  .updateStatus(ticketId: ticketId, status: status);
                              ref.invalidate(helpdeskDetailProvider(ticketId));
                              ref.invalidate(helpdeskListProvider);
                              ref.invalidate(adminQueueProvider((queueType: 'helpdesk', status: null)));
                              ref.invalidate(adminDashboardProvider);
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(result)),
                              );
                            }
                          : null,
                    ),
                    const SizedBox(height: 16),
                    for (var index = 0; index < messages.length; index++) ...[
                      _MessageBubble(item: messages[index]),
                      if (index != messages.length - 1)
                        const SizedBox(height: 10),
                    ],
                  ],
                ),
              ),
              _MessageComposer(
                ticketId: ticketId,
                onSent: () => ref.invalidate(helpdeskDetailProvider(ticketId)),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('${context.tr('ticket_detail_load_failed')}\n$error'),
          ),
        ),
        ),
      ),
    );
  }
}

class _HelpdeskFilterBar extends StatelessWidget {
  const _HelpdeskFilterBar({
    required this.selected,
    required this.totalCount,
    required this.openCount,
    required this.inProgressCount,
    required this.resolvedCount,
    required this.onChanged,
  });

  final String selected;
  final int totalCount;
  final int openCount;
  final int inProgressCount;
  final int resolvedCount;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterChipButton(
            label: context.tr('all_tickets'),
            count: totalCount,
            isSelected: selected == 'ALL',
            onTap: () => onChanged('ALL'),
          ),
          const SizedBox(width: 8),
          _FilterChipButton(
            label: context.tr('status_open'),
            count: openCount,
            isSelected: selected == 'OPEN',
            onTap: () => onChanged('OPEN'),
          ),
          const SizedBox(width: 8),
          _FilterChipButton(
            label: context.tr('status_in_progress'),
            count: inProgressCount,
            isSelected: selected == 'IN_PROGRESS',
            onTap: () => onChanged('IN_PROGRESS'),
          ),
          const SizedBox(width: 8),
          _FilterChipButton(
            label: context.tr('status_resolved'),
            count: resolvedCount,
            isSelected: selected == 'RESOLVED',
            onTap: () => onChanged('RESOLVED'),
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
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.18)
                      : const Color(0xFFE2E8F0),
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

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.item, required this.onTap});

  final Map<String, dynamic> item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = item['status']?.toString() ?? 'AÇIK';
    final statusMeta = _ticketStatusMeta(status);
    final priorityMeta = _ticketPriorityMeta(item['priority']?.toString());

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item['subject']?.toString() ?? '-',
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
                      _ticketStatusLabel(context, status),
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: statusMeta.$2,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _InfoBadge(
                    icon: Icons.category_rounded,
                    label: _ticketCategoryLabel(context, item['category']?.toString()),
                    backgroundColor: const Color(0xFFF1F5F9),
                    foregroundColor: const Color(0xFF334155),
                  ),
                  _InfoBadge(
                    icon: Icons.flag_rounded,
                    label: _ticketPriorityLabel(context, item['priority']?.toString()),
                    backgroundColor: priorityMeta.$1,
                    foregroundColor: priorityMeta.$2,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                _formatDate(context, item['created_at']?.toString()),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF94A3B8),
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  const _InfoBadge({
    required this.icon,
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
  });

  final IconData icon;
  final String label;
  final Color backgroundColor;
  final Color foregroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: foregroundColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: foregroundColor,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class _TicketHeader extends StatelessWidget {
  const _TicketHeader({
    required this.detail,
    this.canManage = false,
    this.onUpdateStatus,
  });

  final Map<String, dynamic> detail;
  final bool canManage;
  final Future<void> Function(String status)? onUpdateStatus;

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
              detail['subject']?.toString() ?? '-',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            Text(
              '${_ticketCategoryLabel(context, detail['category']?.toString())} • ${_ticketPriorityLabel(context, detail['priority']?.toString())} • ${_ticketStatusLabel(context, detail['status']?.toString())}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
            ),
            if (canManage) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onUpdateStatus == null
                          ? null
                          : () => onUpdateStatus!('İŞLEMDE'),
                      icon: const Icon(Icons.pending_actions_rounded),
                      label: Text(context.tr('status_in_progress')),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onUpdateStatus == null
                          ? null
                          : () => onUpdateStatus!('ÇÖZÜLDÜ'),
                      icon: const Icon(Icons.task_alt_rounded),
                      label: Text(context.tr('status_resolved')),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

bool _canManageTicket(String? role) {
  final normalized = (role ?? '').toUpperCase();
  return normalized == 'MANAGER' ||
      normalized == 'HR' ||
      normalized == 'ADMIN' ||
      normalized == 'SUPERADMIN';
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item['sender_name']?.toString() ?? '-',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(item['message']?.toString() ?? '-'),
              if (item['file_url'] != null) ...[
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () => _openAttachment(item['file_url'].toString()),
                  icon: const Icon(Icons.attach_file_rounded),
                  label: Text(context.tr('open_attachment')),
                ),
              ],
              const SizedBox(height: 8),
              Text(
                _formatDate(context, item['created_at']?.toString()),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF94A3B8),
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openAttachment(String rawUrl) async {
    final uri = Uri.parse('http://127.0.0.1:8000$rawUrl');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _MessageComposer extends ConsumerStatefulWidget {
  const _MessageComposer({required this.ticketId, required this.onSent});

  final int ticketId;
  final VoidCallback onSent;

  @override
  ConsumerState<_MessageComposer> createState() => _MessageComposerState();
}

class _MessageComposerState extends ConsumerState<_MessageComposer> {
  final _controller = TextEditingController();
  HelpdeskAttachmentPayload? _attachment;
  String? _attachmentLabel;
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: context.tr('write_message'),
                    ),
                  ),
                  if (_attachmentLabel != null) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        _attachmentLabel!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: const Color(0xFF475569),
                            ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 12),
            IconButton(
              onPressed: _sending ? null : _pickAttachment,
              icon: const Icon(Icons.attach_file_rounded),
              tooltip: context.tr('attach_file'),
            ),
            FilledButton(
              onPressed: _sending ? null : _send,
              child: Text(_sending ? '...' : context.tr('send')),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _send() async {
    final message = _controller.text.trim();
    if (message.isEmpty && _attachment == null) return;

    setState(() => _sending = true);
    try {
      final result = await ref.read(helpdeskServiceProvider).sendMessage(
            ticketId: widget.ticketId,
            message: message.isEmpty ? context.tr('message_with_attachment') : message,
            attachment: _attachment,
          );
      _controller.clear();
      _attachment = null;
      _attachmentLabel = null;
      widget.onSent();
      ref.invalidate(adminQueueProvider((queueType: 'helpdesk', status: null)));
      ref.invalidate(adminDashboardProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result)),
      );
    } on DioException catch (error) {
      final data = error.response?.data;
      final detail = data is Map && data['detail'] != null
          ? data['detail'].toString()
          : context.tr('ticket_message_failed');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(detail)),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickAttachment() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpeg', 'jpg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
      withData: true,
    );
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    setState(() {
      _attachment = HelpdeskAttachmentPayload(bytes: file.bytes!, fileName: file.name);
      _attachmentLabel = file.name;
    });
  }
}

class _CreateTicketSheet extends ConsumerStatefulWidget {
  const _CreateTicketSheet({required this.onCreated});

  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateTicketSheet> createState() => _CreateTicketSheetState();
}

class _CreateTicketSheetState extends ConsumerState<_CreateTicketSheet> {
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String _category = 'IT_DESTEK';
  String _priority = 'NORMAL';
  HelpdeskAttachmentPayload? _attachment;
  String? _attachmentLabel;
  bool _saving = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
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
                context.tr('new_ticket_title'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 18),
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: InputDecoration(labelText: context.tr('category')),
                items: [
                  DropdownMenuItem(value: 'IT_DESTEK', child: Text(context.tr('it_support'))),
                  DropdownMenuItem(value: 'IK_TALEBI', child: Text(context.tr('hr_request'))),
                  DropdownMenuItem(value: 'IDARI_TALEP', child: Text(context.tr('administrative'))),
                  DropdownMenuItem(value: 'BORDRO', child: Text(context.tr('payroll'))),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _category = value);
                },
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: _priority,
                decoration: InputDecoration(labelText: context.tr('priority')),
                items: [
                  DropdownMenuItem(value: 'DÜŞÜK', child: Text(context.tr('low'))),
                  DropdownMenuItem(value: 'NORMAL', child: Text(context.tr('normal'))),
                  DropdownMenuItem(value: 'ACİL', child: Text(context.tr('urgent'))),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _priority = value);
                },
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _subjectController,
                decoration: InputDecoration(labelText: context.tr('subject')),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _messageController,
                minLines: 4,
                maxLines: 6,
                decoration: InputDecoration(
                  labelText: context.tr('message'),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: _saving ? null : _pickAttachment,
                icon: const Icon(Icons.attach_file_rounded),
                label: Text(context.tr('add_file')),
              ),
              if (_attachmentLabel != null) ...[
                const SizedBox(height: 8),
                Text(
                  _attachmentLabel!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF475569),
                      ),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _submit,
                  child: Text(_saving ? context.tr('submitting') : context.tr('submit')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final subject = _subjectController.text.trim();
    final message = _messageController.text.trim();

    if (subject.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('submit_required_fields'))),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final result = await ref.read(helpdeskServiceProvider).createTicket(
            category: _category,
            priority: _priority,
            subject: subject,
            message: message,
            attachment: _attachment,
          );
      widget.onCreated();
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result)),
      );
    } on DioException catch (error) {
      final data = error.response?.data;
      final detail = data is Map && data['detail'] != null
          ? data['detail'].toString()
          : context.tr('ticket_create_failed');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(detail)),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickAttachment() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpeg', 'jpg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
      withData: true,
    );
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    setState(() {
      _attachment = HelpdeskAttachmentPayload(bytes: file.bytes!, fileName: file.name);
      _attachmentLabel = file.name;
    });
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 220,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
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

String _formatDate(BuildContext context, String? raw) {
  if (raw == null || raw.isEmpty) return '-';
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  return formatLocalizedDate(
    context,
    parsed,
    pattern: 'dd MMM yyyy • HH:mm',
  );
}

String _ticketCategoryLabel(BuildContext context, String? raw) {
  switch (raw) {
    case 'IT_DESTEK':
      return context.tr('it_support');
    case 'IK_TALEBI':
      return context.tr('hr_request');
    case 'IDARI_TALEP':
      return context.tr('administrative');
    case 'BORDRO':
      return context.tr('payroll');
    default:
      return raw ?? '-';
  }
}

String _ticketPriorityLabel(BuildContext context, String? raw) {
  switch (raw) {
    case 'DÜŞÜK':
      return context.tr('low');
    case 'NORMAL':
      return context.tr('normal');
    case 'ACİL':
      return context.tr('urgent');
    default:
      return raw ?? '-';
  }
}

String _ticketStatusLabel(BuildContext context, String? raw) {
  switch (_normalizeTicketStatus(raw)) {
    case 'OPEN':
      return context.tr('status_open');
    case 'IN_PROGRESS':
      return context.tr('status_in_progress');
    case 'RESOLVED':
      return context.tr('status_resolved');
    default:
      return raw ?? '-';
  }
}

String _normalizeTicketStatus(String? raw) {
  switch (raw) {
    case 'AÇIK':
    case 'OPEN':
      return 'OPEN';
    case 'İŞLEMDE':
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'ÇÖZÜLDÜ':
    case 'RESOLVED':
      return 'RESOLVED';
    default:
      return raw ?? 'OPEN';
  }
}

(Color, Color) _ticketStatusMeta(String? raw) {
  switch (_normalizeTicketStatus(raw)) {
    case 'RESOLVED':
      return (const Color(0xFFDCFCE7), const Color(0xFF15803D));
    case 'IN_PROGRESS':
      return (const Color(0xFFDBEAFE), const Color(0xFF1D4ED8));
    default:
      return (const Color(0xFFFFEDD5), const Color(0xFFEA580C));
  }
}

(Color, Color) _ticketPriorityMeta(String? raw) {
  switch (raw) {
    case 'ACİL':
    case 'URGENT':
      return (const Color(0xFFFEE2E2), const Color(0xFFB91C1C));
    case 'DÜŞÜK':
    case 'LOW':
      return (const Color(0xFFE0F2FE), const Color(0xFF0369A1));
    default:
      return (const Color(0xFFEDE9FE), const Color(0xFF6D28D9));
  }
}
