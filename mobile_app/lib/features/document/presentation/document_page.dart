import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/files/image_compression_service.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/utils/dio_error_utils.dart';
import '../../../shared/widgets/app_background.dart';
import '../data/document_service.dart';
import 'document_provider.dart';

const _documentTypeOptions = [
  ('ID_COPY', 'Identity Copy'),
  ('PASSPORT_COPY', 'Passport Copy'),
  ('CONTRACT', 'Contract'),
  ('CERTIFICATE', 'Certificate'),
  ('PAYROLL_DOC', 'Payroll Document'),
  ('OTHER', 'Other'),
];

class DocumentPage extends ConsumerWidget {
  const DocumentPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final documentsAsync = ref.watch(documentListProvider);
    final statusFilter = ref.watch(documentStatusFilterProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: Text(context.tr('dossier_title')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openUploadSheet(context, ref),
        icon: const Icon(Icons.upload_file_rounded),
        label: Text(context.tr('upload_document')),
      ),
      body: AppBackground(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(documentListProvider);
            await ref.read(documentListProvider.future);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
            children: [
              Text(
                context.tr('my_documents'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                context.tr('upload_new_files'),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 16),
              documentsAsync.when(
                data: (items) {
                  final filteredItems = statusFilter == 'ALL'
                      ? items
                      : items.where((item) => (item['status']?.toString() ?? 'PENDING') == statusFilter).toList();

                  if (items.isEmpty) {
                    return const _DocEmptyState();
                  }
                  return Column(
                    children: [
                      _StatusFilterBar(
                        selected: statusFilter,
                        allCount: items.length,
                        pendingCount: items.where((item) => (item['status']?.toString() ?? 'PENDING') == 'PENDING').length,
                        approvedCount: items.where((item) => (item['status']?.toString() ?? '') == 'APPROVED').length,
                        rejectedCount: items.where((item) => (item['status']?.toString() ?? '') == 'REJECTED').length,
                        onChanged: (value) => ref.read(documentStatusFilterProvider.notifier).state = value,
                      ),
                      const SizedBox(height: 12),
                      if (filteredItems.isEmpty)
                        _DocErrorCard(
                          message: context.tr('no_documents_for_filter'),
                          icon: Icons.filter_alt_off_rounded,
                        )
                      else
                        for (var index = 0; index < filteredItems.length; index++) ...[
                          _DocumentCard(item: filteredItems[index]),
                          if (index != filteredItems.length - 1)
                            const SizedBox(height: 12),
                        ],
                    ],
                  );
                },
                loading: () => const _DocLoadingCard(height: 220),
                error: (error, _) => _DocErrorCard(message: friendlyError(error)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openUploadSheet(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UploadDocumentSheet(
        onUploaded: () => ref.invalidate(documentListProvider),
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
          _FilterChipButton(label: context.tr('all_records'), count: allCount, isSelected: selected == 'ALL', onTap: () => onChanged('ALL')),
          const SizedBox(width: 8),
          _FilterChipButton(label: context.tr('status_pending'), count: pendingCount, isSelected: selected == 'PENDING', onTap: () => onChanged('PENDING')),
          const SizedBox(width: 8),
          _FilterChipButton(label: context.tr('status_approved'), count: approvedCount, isSelected: selected == 'APPROVED', onTap: () => onChanged('APPROVED')),
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

class _DocumentCard extends ConsumerWidget {
  const _DocumentCard({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = item['status']?.toString() ?? 'PENDING';
    final canDelete = status == 'PENDING';
    final statusMeta = switch (status) {
      'APPROVED' => (const Color(0xFFDCFCE7), const Color(0xFF15803D)),
      'REJECTED' => (const Color(0xFFFEE2E2), const Color(0xFFB91C1C)),
      _ => (const Color(0xFFFEF3C7), const Color(0xFFB45309)),
    };

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => _showDetails(
          context,
          documentType: _documentTypeLabel(context, item['document_type']?.toString()),
          status: _documentStatusLabel(context, status),
          fileName: item['file_name']?.toString() ?? '-',
          uploadedOn: _formatDate(context, item['upload_date']?.toString()),
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
                      _documentTypeLabel(context, item['document_type']?.toString()),
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
                      _documentStatusLabel(context, status),
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
                item['file_name']?.toString() ?? '-',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                '${context.tr('uploaded_on')}: ${_formatDate(context, item['upload_date']?.toString())}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: item['file_url'] == null
                        ? null
                        : () => _openDocument(item['file_url']!.toString()),
                    icon: const Icon(Icons.open_in_new_rounded),
                    label: Text(context.tr('open')),
                  ),
                  if (canDelete) ...[
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: () => _deleteDocument(context, ref, item['id'] as int),
                      icon: const Icon(Icons.delete_outline_rounded),
                      label: Text(context.tr('delete')),
                    ),
                  ],
                ],
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

  Future<void> _openDocument(String rawUrl) async {
    final uri = Uri.parse('http://127.0.0.1:8000$rawUrl');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _deleteDocument(BuildContext context, WidgetRef ref, int documentId) async {
    try {
      final message = await ref.read(documentServiceProvider).deleteDocument(documentId);
      ref.invalidate(documentListProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    } on DioException catch (error) {
      final data = error.response?.data;
      final detail = data is Map && data['detail'] != null
          ? data['detail'].toString()
          : context.tr('document_delete_failed');
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(detail)));
    }
  }

  Future<void> _showDetails(
    BuildContext context, {
    required String documentType,
    required String status,
    required String fileName,
    required String uploadedOn,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _DocumentDetailSheet(
        documentType: documentType,
        status: status,
        fileName: fileName,
        uploadedOn: uploadedOn,
      ),
    );
  }
}

class _DocumentDetailSheet extends StatelessWidget {
  const _DocumentDetailSheet({
    required this.documentType,
    required this.status,
    required this.fileName,
    required this.uploadedOn,
  });

  final String documentType;
  final String status;
  final String fileName;
  final String uploadedOn;

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
                context.tr('document_details'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                uploadedOn,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _DetailChip(label: context.tr('document_type'), value: documentType),
                  _DetailChip(label: context.tr('status'), value: status),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('file_name'),
                      value: fileName,
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
              _DetailLine(label: context.tr('document_type'), value: documentType),
              _DetailLine(label: context.tr('uploaded_on'), value: uploadedOn),
              _DetailLine(label: context.tr('file_name'), value: fileName),
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

class _UploadDocumentSheet extends ConsumerStatefulWidget {
  const _UploadDocumentSheet({required this.onUploaded});

  final VoidCallback onUploaded;

  @override
  ConsumerState<_UploadDocumentSheet> createState() => _UploadDocumentSheetState();
}

class _UploadDocumentSheetState extends ConsumerState<_UploadDocumentSheet> {
  final _imagePicker = ImagePicker();
  final _compressionService = ImageCompressionService();
  String _documentType = _documentTypeOptions.first.$1;
  MobileDocumentAttachment? _attachment;
  String? _attachmentLabel;
  String? _attachmentHint;
  bool _isSaving = false;

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
                context.tr('upload_document_title'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 18),
              DropdownButtonFormField<String>(
                initialValue: _documentType,
                decoration: InputDecoration(labelText: context.tr('document_type')),
                items: _documentTypeOptions
                    .map((item) => DropdownMenuItem<String>(
                          value: item.$1,
                          child: Text(_documentTypeLabel(context, item.$1)),
                        ))
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _documentType = value);
                  }
                },
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
                            onPressed: _isSaving ? null : _pickDocument,
                            icon: const Icon(Icons.attach_file_rounded),
                            label: Text(context.tr('choose_file')),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isSaving ? null : _captureDocumentPhoto,
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
                  child: Text(_isSaving ? context.tr('uploading') : context.tr('upload_document')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickDocument() async {
    final sourceLabel = context.tr('selected_file');
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpeg', 'jpg', 'png', 'doc', 'docx'],
      withData: true,
    );
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    await _setAttachment(bytes: file.bytes!, fileName: file.name, sourceLabel: sourceLabel);
  }

  Future<void> _captureDocumentPhoto() async {
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
      _attachment = MobileDocumentAttachment(bytes: compressed.bytes, fileName: compressed.fileName);
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

  Future<void> _submit() async {
    if (_attachment == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('choose_document_first'))),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final message = await ref.read(documentServiceProvider).uploadDocument(
            documentType: _documentType,
            category: _documentType,
            file: _attachment!,
          );
      if (!mounted) return;
      widget.onUploaded();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    } on DioException catch (error) {
      final data = error.response?.data;
      final detail = data is Map && data['detail'] != null
          ? data['detail'].toString()
          : context.tr('document_upload_failed');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(detail)));
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }
}

class _DocEmptyState extends StatelessWidget {
  const _DocEmptyState();

  @override
  Widget build(BuildContext context) {
    return _DocErrorCard(
      message: context.tr('no_documents_found'),
      icon: Icons.folder_copy_outlined,
    );
  }
}

class _DocLoadingCard extends StatelessWidget {
  const _DocLoadingCard({required this.height});

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

class _DocErrorCard extends StatelessWidget {
  const _DocErrorCard({
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

String _documentTypeLabel(BuildContext context, String? raw) {
  switch (raw) {
    case 'ID_COPY':
      return context.tr('identity_copy');
    case 'PASSPORT_COPY':
      return context.tr('passport_copy');
    case 'CONTRACT':
      return context.tr('contract');
    case 'CERTIFICATE':
      return context.tr('certificate');
    case 'PAYROLL_DOC':
      return context.tr('payroll_document');
    case 'OTHER':
      return context.tr('other');
    default:
      return raw ?? '-';
  }
}

String _documentStatusLabel(BuildContext context, String? raw) {
  switch (raw) {
    case 'APPROVED':
      return context.tr('status_approved');
    case 'REJECTED':
      return context.tr('status_rejected');
    case 'PENDING':
      return context.tr('status_pending');
    default:
      return raw ?? '-';
  }
}
