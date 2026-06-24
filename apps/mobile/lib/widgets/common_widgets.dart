import 'package:flutter/material.dart';

import '../services/connectivity_service.dart';
import '../theme/app_theme.dart';

class ConnectionBanner extends StatelessWidget {
  const ConnectionBanner({super.key, required this.mode});

  final ConnectionMode mode;

  @override
  Widget build(BuildContext context) {
    if (mode == ConnectionMode.checking) {
      return const SizedBox.shrink();
    }

    final online = mode == ConnectionMode.online;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: online ? AppColors.emeraldLight : AppColors.amberLight,
      child: Row(
        children: [
          Icon(
            online ? Icons.wifi : Icons.wifi_off,
            size: 16,
            color: online ? AppColors.emerald : AppColors.amber,
          ),
          const SizedBox(width: 8),
          Text(
            online
                ? 'Online — sync available'
                : 'Offline mode — collections saved locally',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: online ? AppColors.emerald : AppColors.amber,
            ),
          ),
        ],
      ),
    );
  }
}

class StatChip extends StatelessWidget {
  const StatChip({
    super.key,
    required this.label,
    required this.value,
    this.color = AppColors.violet,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.18)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 11, color: color)),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.slate700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, required this.tone});

  final String label;
  final String tone;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    switch (tone) {
      case 'danger':
        bg = AppColors.redLight;
        fg = AppColors.red;
      case 'warning':
        bg = AppColors.amberLight;
        fg = AppColors.amber;
      case 'success':
        bg = AppColors.emeraldLight;
        fg = AppColors.emerald;
      default:
        bg = AppColors.violetLight;
        fg = AppColors.violet;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }
}
