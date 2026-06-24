import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/work_item.dart';
import '../providers/collector_app_state.dart';
import '../services/connectivity_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/common_widgets.dart';
import '../widgets/template_widgets.dart';
import 'customer_detail_screen.dart';
import 'settings_screen.dart';
import 'sync_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _download() async {
    final state = context.read<CollectorAppState>();
    try {
      final package = await state.downloadRoute();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Downloaded ${package.workItems.length} accounts'),
          backgroundColor: AppColors.emerald,
        ),
      );
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(caught.toString()), backgroundColor: AppColors.red),
      );
    }
  }

  void _openDrawerActions(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final state = context.read<CollectorAppState>();
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.download_rounded, color: AppColors.violet),
                  title: const Text('Download route'),
                  subtitle: Text(
                    state.connectionMode == ConnectionMode.online
                        ? 'Load today\'s collectible invoices'
                        : 'Connect to office Wi-Fi first',
                  ),
                  onTap: state.busy || state.connectionMode != ConnectionMode.online
                      ? null
                      : () {
                          Navigator.pop(context);
                          _download();
                        },
                ),
                ListTile(
                  leading: const Icon(Icons.sync_rounded, color: AppColors.violet),
                  title: const Text('Sync payments'),
                  trailing: state.syncMeta.pendingEvents > 0
                      ? CircleAvatar(
                          radius: 12,
                          backgroundColor: AppColors.amber,
                          child: Text(
                            '${state.syncMeta.pendingEvents}',
                            style: const TextStyle(color: Colors.white, fontSize: 11),
                          ),
                        )
                      : null,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const SyncScreen()),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.settings_outlined, color: AppColors.violet),
                  title: const Text('Settings'),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const SettingsScreen()),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.logout_rounded, color: AppColors.red),
                  title: const Text('Sign out'),
                  onTap: () async {
                    Navigator.pop(context);
                    await state.logout();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openFilters(BuildContext context) {
    final state = context.read<CollectorAppState>();
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Filter route',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _FilterChip(
                    label: 'All',
                    selected: state.filter == 'all',
                    onTap: () {
                      state.setFilter('all');
                      Navigator.pop(context);
                    },
                  ),
                  _FilterChip(
                    label: 'Overdue',
                    selected: state.filter == 'overdue',
                    onTap: () {
                      state.setFilter('overdue');
                      Navigator.pop(context);
                    },
                  ),
                  _FilterChip(
                    label: 'Promised',
                    selected: state.filter == 'promised',
                    onTap: () {
                      state.setFilter('promised');
                      Navigator.pop(context);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<CollectorAppState>();
    final online = state.connectionMode == ConnectionMode.online;

    return Scaffold(
      appBar: CollectorPurpleHeader(
        profileName: state.user?.name ?? 'Collector',
        profileRole: 'Collector',
        routeTitle: "Today's Route",
        routeDate: formatLongDate(DateTime.now()),
        online: online,
        onMenuTap: () => _openDrawerActions(context),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ConnectionBanner(mode: state.connectionMode),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              children: [
                SummaryStatCard(
                  label: 'Collected',
                  value: formatMoney(state.collectedToday),
                  valueColor: AppColors.emerald,
                  icon: Icons.account_balance_wallet_outlined,
                  iconColor: AppColors.emerald,
                  iconBg: AppColors.emeraldLight,
                ),
                const SizedBox(width: 12),
                SummaryStatCard(
                  label: 'Total Visits',
                  value: '${state.visitsToday}',
                  icon: Icons.people_outline_rounded,
                  iconColor: AppColors.violet,
                  iconBg: AppColors.violetLight,
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: state.setSearch,
                    decoration: InputDecoration(
                      hintText: 'Search customers',
                      prefixIcon: const Icon(Icons.search, color: AppColors.slate500),
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  onPressed: () => _openFilters(context),
                  icon: const Icon(Icons.tune_rounded),
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.violetLight,
                    foregroundColor: AppColors.violetDark,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: state.workItems.isEmpty
                ? _EmptyRoute(
                    onDownload: _download,
                    isOnline: online,
                    busy: state.busy,
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: state.workItems.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = state.workItems[index];
                      return _WorkItemCard(
                        item: item,
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CustomerDetailScreen(item: item),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _WorkItemCard extends StatelessWidget {
  const _WorkItemCard({
    required this.item,
    required this.onTap,
  });

  final WorkItem item;
  final VoidCallback onTap;

  ({String label, String tone}) get _status {
    if (item.balance <= 0) return (label: 'PAID', tone: 'success');
    if (item.status == 'overdue' || item.isOverdue) return (label: 'OVERDUE', tone: 'danger');
    if (item.collectionCaseStatus == 'promised_to_pay') {
      return (label: 'PROMISED', tone: 'warning');
    }
    return (label: titleCase(item.status).toUpperCase(), tone: 'default');
  }

  String get _addressLine {
    final address = item.payload['installationAddress'];
    if (address is! Map) return item.barangay;
    final street = address['street']?.toString() ?? '';
    final barangay = address['barangay']?.toString() ?? item.barangay;
    if (street.isEmpty) return barangay;
    return '$street, $barangay';
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              CustomerAvatar(name: item.customerName),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.customerName,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.accountNumber,
                      style: const TextStyle(
                        color: AppColors.violet,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.location_on_outlined,
                          size: 14,
                          color: AppColors.slate500,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            _addressLine,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppColors.slate500, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'Balance',
                    style: TextStyle(fontSize: 11, color: AppColors.slate500),
                  ),
                  Text(
                    formatMoney(item.balance),
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: item.balance > 0 ? AppColors.slate900 : AppColors.emerald,
                    ),
                  ),
                  const SizedBox(height: 6),
                  StatusBadge(label: status.label, tone: status.tone),
                ],
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, color: AppColors.slate500, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.violetLight,
      labelStyle: TextStyle(
        color: selected ? AppColors.violetDark : AppColors.slate500,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _EmptyRoute extends StatelessWidget {
  const _EmptyRoute({
    required this.onDownload,
    required this.isOnline,
    required this.busy,
  });

  final VoidCallback onDownload;
  final bool isOnline;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.violetLight,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.route_rounded, size: 36, color: AppColors.violet),
            ),
            const SizedBox(height: 16),
            const Text(
              'No route downloaded yet',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              isOnline
                  ? 'Open the menu and tap Download route to load today\'s accounts.'
                  : 'Connect to office Wi-Fi to download your route.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.slate500),
            ),
            const SizedBox(height: 20),
            GreenActionButton(
              label: 'Download route',
              icon: Icons.download_rounded,
              loading: busy,
              onPressed: busy || !isOnline ? null : onDownload,
            ),
          ],
        ),
      ),
    );
  }
}
