import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/collector_app_state.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'settings_screen.dart';
import 'sync_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pending = context.watch<CollectorAppState>().syncMeta.pendingEvents;

    final pages = [
      const HomeScreen(),
      const SyncScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        backgroundColor: Colors.white,
        indicatorColor: AppColors.violetLight,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.route_outlined),
            selectedIcon: Icon(Icons.route_rounded, color: AppColors.violetDark),
            label: 'Route',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: pending > 0,
              label: Text('$pending'),
              child: const Icon(Icons.payments_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: pending > 0,
              label: Text('$pending'),
              child: const Icon(Icons.payments_rounded, color: AppColors.violetDark),
            ),
            label: 'Payments',
          ),
          const NavigationDestination(
            icon: Icon(Icons.more_horiz_rounded),
            selectedIcon: Icon(Icons.more_horiz, color: AppColors.violetDark),
            label: 'More',
          ),
        ],
      ),
    );
  }
}
