import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../services/permissions_service.dart';
import '../theme/app_theme.dart';
import '../widgets/template_widgets.dart';

class PermissionsGateScreen extends StatefulWidget {
  const PermissionsGateScreen({
    super.key,
    required this.onGranted,
    required this.onContinueAnyway,
  });

  final VoidCallback onGranted;
  final VoidCallback onContinueAnyway;

  @override
  State<PermissionsGateScreen> createState() => _PermissionsGateScreenState();
}

class _PermissionsGateScreenState extends State<PermissionsGateScreen>
    with WidgetsBindingObserver {
  bool _loading = true;
  bool _requesting = false;
  List<CollectorPermission> _permissions = [];
  Map<Permission, PermissionStatus> _statuses = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refresh();
    }
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    final permissions = await PermissionsService.requiredPermissions();
    final statuses = await PermissionsService.checkStatuses();
    if (!mounted) return;

    setState(() {
      _permissions = permissions;
      _statuses = statuses;
      _loading = false;
    });

    if (statuses.values.every(PermissionsService.isGranted)) {
      widget.onGranted();
    }
  }

  Future<void> _requestPermissions() async {
    setState(() => _requesting = true);
    final statuses = await PermissionsService.requestAll();
    if (!mounted) return;

    setState(() {
      _statuses = statuses;
      _requesting = false;
    });

    if (statuses.values.every(PermissionsService.isGranted)) {
      widget.onGranted();
    }
  }

  bool get _hasPermanentDenial => _statuses.values.any(
        (status) => status.isPermanentlyDenied || status.isRestricted,
      );

  IconData _iconFor(CollectorPermission permission) {
    switch (permission.permission) {
      case Permission.camera:
        return Icons.qr_code_scanner;
      case Permission.bluetoothScan:
        return Icons.bluetooth_searching;
      case Permission.bluetoothConnect:
        return Icons.print_outlined;
      case Permission.locationWhenInUse:
        return Icons.location_on_outlined;
      default:
        return Icons.shield_outlined;
    }
  }

  Color _statusColor(PermissionStatus status) {
    if (PermissionsService.isGranted(status)) return AppColors.emerald;
    if (status.isPermanentlyDenied || status.isRestricted) {
      return AppColors.red;
    }
    return AppColors.amber;
  }

  String _statusLabel(PermissionStatus status) {
    if (PermissionsService.isGranted(status)) return 'Allowed';
    if (status.isPermanentlyDenied) return 'Blocked';
    if (status.isRestricted) return 'Restricted';
    if (status.isDenied) return 'Not allowed';
    return 'Required';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const SizedBox(height: 12),
                  const Center(child: NdtechLogo(size: 96)),
                  const SizedBox(height: 20),
                  const Text(
                    'Allow app permissions',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'NDTECH Collector needs a few Android permissions to scan setup QR codes, '
                    'sync your route, and print payment receipts.',
                    style: TextStyle(color: AppColors.slate500, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  ..._permissions.map((permission) {
                    final status =
                        _statuses[permission.permission] ?? PermissionStatus.denied;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(_iconFor(permission), color: AppColors.violet),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    permission.title,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    permission.description,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.slate500,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              children: [
                                Icon(
                                  PermissionsService.isGranted(status)
                                      ? Icons.check_circle
                                      : Icons.error_outline,
                                  color: _statusColor(status),
                                  size: 20,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _statusLabel(status),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: _statusColor(status),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  if (_hasPermanentDenial) ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.amberLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text(
                        'One or more permissions are blocked. Tap Open settings, '
                        'then allow Camera, Nearby devices, Bluetooth, and Location.',
                        style: TextStyle(fontSize: 12, color: AppColors.amber),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: _requesting ? null : _requestPermissions,
                    icon: _requesting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.verified_user_outlined),
                    label: Text(
                      _requesting ? 'Requesting…' : 'Allow permissions',
                    ),
                  ),
                  if (_hasPermanentDenial) ...[
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: PermissionsService.openSettings,
                      icon: const Icon(Icons.settings_outlined),
                      label: const Text('Open settings'),
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: widget.onContinueAnyway,
                    child: const Text('Continue without all permissions'),
                  ),
                ],
              ),
      ),
    );
  }
}
