import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/payment_receipt.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';

class ReceiptPreviewCard extends StatelessWidget {
  const ReceiptPreviewCard({super.key, required this.receipt});

  final PaymentReceipt receipt;

  @override
  Widget build(BuildContext context) {
    final dateTime = DateFormat('MMM d, yyyy · h:mm a').format(receipt.paidAt);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
      child: Column(
        children: [
          const Text(
            'NDTECH',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const Text(
            'ISP BILLING',
            style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.violet),
          ),
          const SizedBox(height: 8),
          const _ReceiptDivider(char: '═'),
          const Text(
            'OFFICIAL COLLECTION RECEIPT',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
          ),
          const Text(
            '(PROVISIONAL)',
            style: TextStyle(fontSize: 11, color: AppColors.slate500),
          ),
          const _ReceiptDivider(),
          _ReceiptRow(label: 'Receipt No.', value: receipt.receiptNumber, bold: true),
          _ReceiptRow(label: 'Date/Time', value: dateTime),
          _ReceiptRow(label: 'Collector', value: receipt.collectorName),
          const _ReceiptDivider(),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('CUSTOMER', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
          _ReceiptRow(label: 'Name', value: receipt.customerName),
          _ReceiptRow(label: 'Account', value: receipt.accountNumber),
          if (receipt.mobileNumber.isNotEmpty)
            _ReceiptRow(label: 'Mobile', value: receipt.mobileNumber),
          if (receipt.address.isNotEmpty)
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(receipt.address, style: const TextStyle(fontSize: 12)),
              ),
            ),
          const _ReceiptDivider(),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('PAYMENT DETAILS', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
          _ReceiptRow(label: 'Invoice', value: receipt.invoiceNumber),
          _ReceiptRow(label: 'Cycle', value: receipt.billingCycleName),
          _ReceiptRow(label: 'Due Date', value: formatDate(receipt.dueDate)),
          if (receipt.hasLineItems) ...[
            const _ReceiptDivider(char: '─'),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('INVOICE CHARGES', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            ...receipt.lineItems.map(
              (item) => _ReceiptRow(
                label: item.description,
                value: formatMoney(item.amount),
              ),
            ),
            _ReceiptRow(
              label: 'Invoice Total',
              value: formatMoney(
                receipt.invoiceTotal > 0
                    ? receipt.invoiceTotal
                    : receipt.lineItems.fold<double>(0, (sum, item) => sum + item.amount),
              ),
              bold: true,
            ),
          ],
          const _ReceiptDivider(char: '─'),
          _ReceiptRow(label: 'Previous Bal.', value: formatMoney(receipt.previousBalance)),
          _ReceiptRow(
            label: 'Amount Paid',
            value: formatMoney(receipt.amountPaid),
            bold: true,
          ),
          _ReceiptRow(
            label: 'Remaining',
            value: formatMoney(receipt.remainingBalance),
            bold: true,
          ),
          _ReceiptRow(label: 'Method', value: receipt.paymentMethod),
          const SizedBox(height: 8),
          Text(
            receipt.statusLabel,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: AppColors.emerald,
            ),
          ),
          const _ReceiptDivider(),
          const Text(
            'Note: Valid upon office sync.\nOfficial receipt no. assigned after evening upload.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: AppColors.slate500),
          ),
          const SizedBox(height: 8),
          const Text(
            'Thank you for your payment!',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          const Text('— NDTECH —', style: TextStyle(color: AppColors.slate500)),
        ],
      ),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  const _ReceiptRow({
    required this.label,
    required this.value,
    this.bold = false,
  });

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
          ),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 12,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptDivider extends StatelessWidget {
  const _ReceiptDivider({this.char = '─'});

  final String char;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(char * 28, maxLines: 1, overflow: TextOverflow.clip, style: const TextStyle(fontSize: 10)),
    );
  }
}
