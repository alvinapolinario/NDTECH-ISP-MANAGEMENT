import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';

class CollectorPermission {
  const CollectorPermission({
    required this.permission,
    required this.title,
    required this.description,
  });

  final Permission permission;
  final String title;
  final String description;
}

class PermissionsService {
  PermissionsService._();

  static List<CollectorPermission>? _cachedPermissions;

  static Future<List<CollectorPermission>> requiredPermissions() async {
    if (_cachedPermissions != null) return _cachedPermissions!;

    final permissions = <CollectorPermission>[
      const CollectorPermission(
        permission: Permission.camera,
        title: 'Camera',
        description:
            'Scan the collector setup QR code from your admin portal.',
      ),
      const CollectorPermission(
        permission: Permission.bluetoothScan,
        title: 'Nearby devices',
        description:
            'Find your PT210 Bluetooth printer when pairing or printing.',
      ),
      const CollectorPermission(
        permission: Permission.bluetoothConnect,
        title: 'Bluetooth',
        description: 'Connect to the receipt printer and send collections.',
      ),
    ];

    if (await _androidNeedsLocationPermission()) {
      permissions.add(
        const CollectorPermission(
          permission: Permission.locationWhenInUse,
          title: 'Location',
          description:
              'Required on this Android version to pair Bluetooth printers. '
              'We do not track your location.',
        ),
      );
    }

    _cachedPermissions = permissions;
    return permissions;
  }

  static Future<bool> _androidNeedsLocationPermission() async {
    if (!Platform.isAndroid) return false;
    final info = await DeviceInfoPlugin().androidInfo;
    return info.version.sdkInt <= 30;
  }

  static bool isGranted(PermissionStatus status) {
    return status.isGranted || status.isLimited;
  }

  static Future<Map<Permission, PermissionStatus>> checkStatuses() async {
    final statuses = <Permission, PermissionStatus>{};
    for (final item in await requiredPermissions()) {
      statuses[item.permission] = await item.permission.status;
    }
    return statuses;
  }

  static Future<bool> allGranted() async {
    final statuses = await checkStatuses();
    return statuses.values.every(isGranted);
  }

  static Future<Map<Permission, PermissionStatus>> requestAll() async {
    final permissions =
        (await requiredPermissions()).map((item) => item.permission).toList();
    return permissions.request();
  }

  static Future<bool> openSettings() => openAppSettings();
}
