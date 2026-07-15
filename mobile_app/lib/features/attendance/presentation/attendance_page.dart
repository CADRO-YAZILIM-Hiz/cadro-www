import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/locale_formatters.dart';
import '../../../shared/utils/dio_error_utils.dart';
import '../../../shared/widgets/app_background.dart';
import 'attendance_provider.dart';

class AttendancePage extends ConsumerStatefulWidget {
  const AttendancePage({super.key});

  @override
  ConsumerState<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends ConsumerState<AttendancePage> {
  final MobileScannerController _scannerController = MobileScannerController(
    facing: CameraFacing.back,
    detectionSpeed: DetectionSpeed.noDuplicates,
    torchEnabled: false,
  );

  bool _scannerOpen = false;
  bool _processingScan = false;
  String? _scannerMessage;
  String? _pendingAction;
  final TextEditingController _manualQrController = TextEditingController();

  @override
  void dispose() {
    _manualQrController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final recordsAsync = ref.watch(attendanceRecordsProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: Text(context.tr('attendance_title')),
      ),
      body: AppBackground(
        child: Stack(
          children: [
            RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(attendanceRecordsProvider);
                await ref.read(attendanceRecordsProvider.future);
              },
              child: recordsAsync.when(
                data: (records) {
                  final latest = records.isNotEmpty ? records.first : null;
                  return ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
                    children: [
                      _AttendanceActionCard(
                        latest: latest,
                        onClockIn: () => _openScanner('IN'),
                        onClockOut: () => _openScanner('OUT'),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        context.tr('last_30_records'),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 12),
                      if (records.isEmpty)
                        _AttendanceInfoCard(
                          message: context.tr('no_attendance_records'),
                          icon: Icons.history_toggle_off_rounded,
                        )
                      else
                        Column(
                          children: [
                            for (var index = 0; index < records.length; index++) ...[
                              _AttendanceRecordCard(item: records[index]),
                              if (index != records.length - 1)
                                const SizedBox(height: 12),
                            ],
                          ],
                        ),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) {
                  return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  children: [
                    _AttendanceInfoCard(
                      message: friendlyError(error),
                      icon: Icons.error_outline_rounded,
                    ),
                  ],
                );
                },
              ),
            ),
            if (_scannerOpen)
              Positioned.fill(
                child: Material(
                  color: Colors.black.withValues(alpha: 0.86),
                  child: SafeArea(
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _pendingAction == 'OUT'
                                          ? context.tr('clock_out')
                                          : context.tr('clock_in'),
                                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _scannerMessage ?? context.tr('attendance_title'),
                                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                            color: Colors.white70,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: _closeScanner,
                                color: Colors.white,
                                icon: const Icon(Icons.close_rounded),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(28),
                                    child: MobileScanner(
                                      controller: _scannerController,
                                      onDetect: _handleDetection,
                                    ),
                                  ),
                                ),
                                if (kIsWeb) ...[
                                  const SizedBox(height: 16),
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: Colors.white24),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          context.tr('web_fallback'),
                                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w800,
                                              ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          context.tr('camera_black_help'),
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                color: Colors.white70,
                                              ),
                                        ),
                                        const SizedBox(height: 12),
                                        TextField(
                                          controller: _manualQrController,
                                          minLines: 2,
                                          maxLines: 3,
                                          style: const TextStyle(color: Colors.white),
                                          decoration: InputDecoration(
                                            hintText: 'LOC_ID:1|TOKEN:...',
                                            hintStyle: const TextStyle(color: Colors.white54),
                                            filled: true,
                                            fillColor: Colors.black.withValues(alpha: 0.18),
                                            border: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(16),
                                              borderSide: const BorderSide(color: Colors.white24),
                                            ),
                                            enabledBorder: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(16),
                                              borderSide: const BorderSide(color: Colors.white24),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        SizedBox(
                                          width: double.infinity,
                                          child: FilledButton.icon(
                                            onPressed: _processingScan ? null : _submitManualQr,
                                            style: FilledButton.styleFrom(
                                              backgroundColor: Colors.white,
                                              foregroundColor: const Color(0xFF111827),
                                              padding: const EdgeInsets.symmetric(vertical: 14),
                                            ),
                                            icon: const Icon(Icons.qr_code_2_rounded),
                                            label: Text(context.tr('use_qr_text')),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                          child: Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _processingScan ? null : _toggleTorch,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Colors.white38),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                  ),
                                  icon: const Icon(Icons.flashlight_on_rounded),
                                  label: Text(context.tr('torch')),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: FilledButton.icon(
                                  onPressed: _processingScan ? null : _closeScanner,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: const Color(0xFF111827),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                  ),
                                  icon: const Icon(Icons.cancel_outlined),
                                  label: Text(context.tr('cancel')),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openScanner(String action) async {
    _manualQrController.clear();
    setState(() {
      _pendingAction = action;
      _scannerMessage = null;
      _scannerOpen = true;
      _processingScan = false;
    });
  }

  Future<void> _closeScanner() async {
    try {
      await _scannerController.stop();
    } catch (_) {
      // Controller henuz initialize olmadan kapanmis olabilir.
    }
    if (!mounted) return;
    setState(() {
      _scannerOpen = false;
      _processingScan = false;
      _scannerMessage = null;
      _pendingAction = null;
    });
  }

  Future<void> _handleDetection(BarcodeCapture capture) async {
    if (_processingScan || _pendingAction == null) return;
    final qrData = capture.barcodes.firstOrNull?.rawValue;
    if (qrData == null || qrData.isEmpty) return;
    await _runAttendanceAction(qrData);
  }

  Future<void> _runAttendanceAction(String qrData) async {
    final actionFailedText = context.tr('attendance_action_failed');
    setState(() {
      _processingScan = true;
      _scannerMessage = context.tr('attendance_scan_validating');
    });

    try {
      final position = await _getCurrentLocation();
      final service = ref.read(attendanceServiceProvider);
      final message = _pendingAction == 'OUT'
          ? await service.clockOut(
              latitude: position.latitude,
              longitude: position.longitude,
              qrData: qrData,
            )
          : await service.clockIn(
              latitude: position.latitude,
              longitude: position.longitude,
              qrData: qrData,
            );

      ref.invalidate(attendanceRecordsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      await _closeScanner();
    } on DioException catch (error) {
      final data = error.response?.data;
      final detail = data is Map && data['detail'] != null
          ? data['detail'].toString()
          : actionFailedText;
      _showScanError(detail);
    } catch (error) {
      _showScanError(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _submitManualQr() async {
    final qrData = _manualQrController.text.trim();
    if (qrData.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('attendance_paste_qr_first'))),
      );
      return;
    }
    await _runAttendanceAction(qrData);
  }

  Future<Position> _getCurrentLocation() async {
    final locationDisabledText = context.tr('attendance_location_disabled');
    final locationRequiredText = context.tr('attendance_location_required');
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception(locationDisabledText);
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception(locationRequiredText);
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
  }

  void _showScanError(String message) {
    if (!mounted) return;
    setState(() {
      _processingScan = false;
      _scannerMessage = message;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _toggleTorch() async {
    try {
      await _scannerController.toggleTorch();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('camera_not_ready'))),
      );
    }
  }
}

class _AttendanceActionCard extends StatelessWidget {
  const _AttendanceActionCard({
    required this.latest,
    required this.onClockIn,
    required this.onClockOut,
  });

  final Map<String, dynamic>? latest;
  final VoidCallback onClockIn;
  final VoidCallback onClockOut;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF0F766E)],
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
              context.tr('secure_attendance'),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              context.tr('secure_attendance_desc'),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white70,
                  ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: _AttendanceMiniStat(
                    label: context.tr('status'),
                    value: _attendanceStatusLabel(context, latest?['status']?.toString()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _AttendanceMiniStat(
                    label: context.tr('today'),
                    value: _formatDate(context, latest?['date']?.toString()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onClockIn,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF0F172A),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: Text(context.tr('clock_in')),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onClockOut,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white38),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    icon: const Icon(Icons.stop_circle_outlined),
                    label: Text(context.tr('clock_out')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AttendanceMiniStat extends StatelessWidget {
  const _AttendanceMiniStat({required this.label, required this.value});

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
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
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

class _AttendanceRecordCard extends StatelessWidget {
  const _AttendanceRecordCard({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final status = item['status']?.toString() ?? 'PRESENT';
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => _showDetails(context),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _formatDate(context, item['date']?.toString()),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  Text(
                    _attendanceStatusLabel(context, status),
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: const Color(0xFF1D4ED8),
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _RecordMeta(
                      label: context.tr('check_in'),
                      value: localizeDigits(context, item['check_in']?.toString() ?? '-'),
                    ),
                  ),
                  Expanded(
                    child: _RecordMeta(
                      label: context.tr('check_out'),
                      value: localizeDigits(context, item['check_out']?.toString() ?? '-'),
                    ),
                  ),
                  Expanded(
                    child: _RecordMeta(
                      label: context.tr('work_hours'),
                      value: localizeDigits(context, item['total_work_hours']?.toString() ?? '0'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                context.tr('tap_to_view_details'),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showDetails(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AttendanceRecordDetailsSheet(item: item),
    );
  }
}

class _AttendanceRecordDetailsSheet extends StatelessWidget {
  const _AttendanceRecordDetailsSheet({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final status = item['status']?.toString() ?? 'PRESENT';
    final scheduleName = item['schedule_name']?.toString();
    final scheduledStart = item['scheduled_start']?.toString();
    final scheduledEnd = item['scheduled_end']?.toString();
    final scheduleType = item['schedule_type']?.toString();

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
                context.tr('attendance_record_details'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                _formatDate(context, item['date']?.toString()),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _DetailChip(
                    label: context.tr('status_present'),
                    value: _attendanceStatusLabel(context, status),
                  ),
                  _DetailChip(
                    label: context.tr('approval_status'),
                    value: _approvalStatusLabel(context, item['approval_status']?.toString()),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('check_in'),
                      value: localizeDigits(context, item['check_in']?.toString() ?? '-'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('check_out'),
                      value: localizeDigits(context, item['check_out']?.toString() ?? '-'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('work_hours'),
                      value: localizeDigits(context, item['total_work_hours']?.toString() ?? '0'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DetailMetric(
                      label: context.tr('overtime_minutes'),
                      value: _minutesText(context, item['overtime_minutes']),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _DetailLine(
                label: context.tr('schedule_name'),
                value: scheduleName?.isNotEmpty == true ? scheduleName! : context.tr('none'),
              ),
              _DetailLine(
                label: context.tr('schedule_type'),
                value: _scheduleTypeLabel(context, scheduleType),
              ),
              _DetailLine(
                label: context.tr('scheduled_hours'),
                value: (scheduledStart != null && scheduledEnd != null)
                    ? '$scheduledStart - $scheduledEnd'
                    : context.tr('none'),
              ),
              _DetailLine(
                label: context.tr('late_minutes'),
                value: _minutesText(context, item['late_minutes']),
              ),
              _DetailLine(
                label: context.tr('early_leave_minutes'),
                value: _minutesText(context, item['early_leave_minutes']),
              ),
              _DetailLine(
                label: context.tr('violation'),
                value: _violationLabel(context, item['violation_code']?.toString()),
              ),
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

class _RecordMeta extends StatelessWidget {
  const _RecordMeta({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
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
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
      ],
    );
  }
}

class _AttendanceInfoCard extends StatelessWidget {
  const _AttendanceInfoCard({
    required this.message,
    required this.icon,
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
  if (raw == null || raw.isEmpty) return context.tr('today');
  return formatLocalizedDateFromRaw(context, raw);
}

String _attendanceStatusLabel(BuildContext context, String? raw) {
  switch (raw?.toUpperCase()) {
    case 'PRESENT':
      return context.tr('status_present');
    case 'NOT_STARTED':
      return context.tr('status_not_started');
    case 'LATE':
      return context.tr('status_late');
    case 'EARLY_OUT':
      return context.tr('status_early_out');
    case 'LATE_EARLY_OUT':
      return context.tr('status_late_early_out');
    case 'ABSENT':
      return context.tr('status_absent');
    default:
      return raw ?? '-';
  }
}

String _approvalStatusLabel(BuildContext context, String? raw) {
  switch (raw?.toUpperCase()) {
    case 'APPROVED':
      return context.tr('status_approved');
    case 'REJECTED':
      return context.tr('status_rejected');
    case 'PENDING':
      return context.tr('status_pending');
    default:
      return raw ?? context.tr('none');
  }
}

String _scheduleTypeLabel(BuildContext context, String? raw) {
  switch (raw?.toUpperCase()) {
    case 'FIXED':
      return context.tr('schedule_type_fixed');
    case 'FLEX':
      return context.tr('schedule_type_flex');
    default:
      return raw ?? context.tr('none');
  }
}

String _violationLabel(BuildContext context, String? raw) {
  switch (raw?.toUpperCase()) {
    case 'NONE':
      return context.tr('violation_none');
    case 'LATE_IN':
      return context.tr('violation_late_in');
    case 'EARLY_OUT':
      return context.tr('violation_early_out');
    case 'LATE_IN_EARLY_OUT':
      return context.tr('violation_late_in_early_out');
    case 'MISSING_CLOCK_IN':
      return context.tr('violation_missing_clock_in');
    case 'MISSING_CLOCK_OUT':
      return context.tr('violation_missing_clock_out');
    default:
      return raw ?? context.tr('none');
  }
}

String _minutesText(BuildContext context, dynamic raw) {
  final value = raw is num ? raw.toInt() : int.tryParse(raw?.toString() ?? '') ?? 0;
  if (value <= 0) return context.tr('none');
  return '${formatLocalizedNumber(context, value)} ${context.tr('minutes_short')}';
}
