import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/api_contract.dart';
import '../models/work_item.dart';
import '../providers/collector_app_state.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/common_widgets.dart';
import 'collect_payment_screen.dart';

class CustomerDetailScreen extends StatelessWidget {
  const CustomerDetailScreen({super.key, required this.item});

  final WorkItem item;

  @override
  Widget build(BuildContext context) {
    final payload = item.payload;
    final customer = Map<String, dynamic>.from(payload['customer'] as Map);
    final invoice = Map<String, dynamic>.from(payload['invoice'] as Map);
    final address = payload['installationAddress'] == null
        ? null
        : Map<String, dynamic>.from(payload['installationAddress'] as Map);
    final recentPayments = (payload['recentPayments'] as List<dynamic>? ?? [])
        .map((payment) => Map<String, dynamic>.from(payment as Map))
        .toList();

    return Scaffold(
      appBar: AppBar(title: Text(item.customerName)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.customerName,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text('${item.accountNumber} · ${customer['mobileNumber'] ?? ''}'),
                  if (address != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 18, color: AppColors.violet),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${address['street']}, ${address['barangay']}, ${address['municipality']}',
                          ),
                        ),
                      ],
                    ),
                  ],
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
                  const Text('Invoice',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 10),
                  _DetailRow('Number', item.invoiceNumber),
                  _DetailRow('Cycle', invoice['billingCycleName']?.toString() ?? '—'),
                  _DetailRow('Due date', formatDate(item.dueDate)),
                  _DetailRow('Balance', formatMoney(item.balance)),
                  const SizedBox(height: 8),
                  StatusBadge(
                    label: titleCase(item.status),
                    tone: item.isOverdue ? 'danger' : 'default',
                  ),
                ],
              ),
            ),
          ),
          if (recentPayments.isNotEmpty) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Recent payments',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 10),
                    ...recentPayments.map(
                      (payment) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          '${payment['paymentNumber']} · ${formatMoney((payment['amount'] as num).toDouble())} · ${formatDate(payment['paymentDate'] as String?)}',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: item.balance <= 0
                ? null
                : () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => CollectPaymentScreen(item: item),
                      ),
                    ),
            icon: const Icon(Icons.payments_outlined),
            label: const Text('Collect payment'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => _recordVisit(context, ApiContract.visitNotHome),
            icon: const Icon(Icons.home_outlined),
            label: const Text('Not home'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => _recordVisit(context, ApiContract.visitPromised),
            icon: const Icon(Icons.event_available_outlined),
            label: const Text('Promise to pay'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => _recordVisit(context, ApiContract.visitEscalated),
            icon: const Icon(Icons.report_outlined),
            label: const Text('Escalate'),
          ),
        ],
      ),
    );
  }

  Future<void> _recordVisit(BuildContext context, String outcome) async {
    final state = context.read<CollectorAppState>();
    await state.sync.recordVisit(item: item, visitOutcome: outcome);
    await state.refreshLocalData();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Visit recorded (${titleCase(outcome)})')),
    );
    Navigator.of(context).pop();
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value);

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
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
