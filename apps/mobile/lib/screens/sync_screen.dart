import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/api_contract.dart';
import '../models/work_item.dart';
import '../providers/collector_app_state.dart';
import '../services/connectivity_service.dart';
import '../services/local_database.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/common_widgets.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  List<OutboxEvent> _events = [];

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    final events = await LocalDatabase.instance.getAllOutboxEvents();
    if (!mounted) return;
    setState(() => _events = events);
  }

  Future<void> _upload() async {
    final state = context.read<CollectorAppState>();
    try {
      final results = await state.uploadPending();
      await _loadEvents();
      if (!mounted) return;

      final rejected =
          results.where((item) => item.status == ApiContract.resultRejected).length;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            rejected > 0
                ? 'Sync finished with $rejected rejected event(s)'
                : 'Sync completed successfully',
          ),
          backgroundColor: rejected > 0 ? AppColors.amber : AppColors.emerald,
        ),
      );
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(caught.toString()), backgroundColor: AppColors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<CollectorAppState>();
    final online = state.connectionMode == ConnectionMode.online;

    return Scaffold(
      appBar: AppBar(title: const Text('Sync status')),
      body: Column(
        children: [
          ConnectionBanner(mode: state.connectionMode),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Download package',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        _InfoRow('Last download', formatDate(state.syncMeta.lastDownloadAt)),
                        _InfoRow('Scope', titleCase(state.syncMeta.scope)),
                        _InfoRow('Accounts', '${state.workItems.length}'),
                        _InfoRow('Checksum', state.syncMeta.checksum.isEmpty
                            ? '—'
                            : state.syncMeta.checksum.substring(0, 12)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Pending upload',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        _InfoRow('Events waiting', '${state.syncMeta.pendingEvents}'),
                        _InfoRow('Last upload', formatDate(state.syncMeta.lastUploadAt)),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: state.busy || !online || state.syncMeta.pendingEvents == 0
                              ? null
                              : _upload,
                          icon: const Icon(Icons.cloud_upload_outlined),
                          label: const Text('Upload to server'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Event log',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 8),
                if (_events.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Text('No local events yet', style: TextStyle(color: AppColors.slate500)),
                  )
                else
                  ..._events.map((event) {
                    final tone = event.syncStatus == 'pending'
                        ? 'warning'
                        : event.syncStatus == 'synced'
                            ? 'success'
                            : 'danger';

                    return Card(
                      child: ListTile(
                        title: Text('${titleCase(event.type)} · ${titleCase(event.syncStatus)}'),
                        subtitle: Text(
                          event.resultMessage.isEmpty
                              ? formatDate(event.occurredAt)
                              : '${formatDate(event.occurredAt)}\n${event.resultMessage}',
                        ),
                        trailing: event.paymentNumber.isEmpty
                            ? null
                            : Text(event.paymentNumber,
                                style: const TextStyle(fontSize: 11)),
                        leading: StatusBadge(
                          label: titleCase(event.syncStatus),
                          tone: tone,
                        ),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.slate500)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
