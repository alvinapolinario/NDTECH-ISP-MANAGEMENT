import 'package:esc_pos_utils/esc_pos_utils.dart';
import 'package:intl/intl.dart';

import '../models/payment_receipt.dart';
import '../utils/formatters.dart';

/// Builds ESC/POS bytes for PT210 and similar 58mm Bluetooth printers.
class ReceiptBuilder {
  ReceiptBuilder._();

  static final _dateTimeFormat = DateFormat('MMM d, yyyy | h:mm a');

  /// Thermal printers only accept a limited character set (ASCII).
  static String escPosText(String value) {
    return value
        .replaceAll('\u2014', '-') // em dash
        .replaceAll('\u2013', '-') // en dash
        .replaceAll('\u00B7', '|') // middle dot
        .replaceAll('\u20B1', 'PHP ') // peso sign
        .replaceAll(RegExp(r'[^\x20-\x7E]'), '');
  }

  static Future<List<int>> buildEscPosBytes(PaymentReceipt receipt) async {
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm58, profile);
    final bytes = <int>[];

    void add(List<int> chunk) => bytes.addAll(chunk);

    void text(String value, {PosStyles styles = const PosStyles()}) {
      add(generator.text(escPosText(value), styles: styles));
    }

    void row(List<PosColumn> columns) {
      add(generator.row(
        columns
            .map(
              (column) => PosColumn(
                text: escPosText(column.text),
                width: column.width,
                styles: column.styles,
              ),
            )
            .toList(),
      ));
    }

    add(generator.reset());

    text(
      'NDTECH',
      styles: const PosStyles(
        align: PosAlign.center,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
        bold: true,
      ),
    );
    text(
      'ISP BILLING',
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );
    add(generator.hr(ch: '='));
    text(
      'OFFICIAL COLLECTION RECEIPT',
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );
    text(
      '(PROVISIONAL)',
      styles: const PosStyles(align: PosAlign.center),
    );
    add(generator.hr());

    row([
      PosColumn(text: 'Receipt No.', width: 5),
      PosColumn(
        text: receipt.receiptNumber,
        width: 7,
        styles: const PosStyles(align: PosAlign.right, bold: true),
      ),
    ]);
    row([
      PosColumn(text: 'Date/Time', width: 5),
      PosColumn(
        text: _dateTimeFormat.format(receipt.paidAt),
        width: 7,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    row([
      PosColumn(text: 'Collector', width: 5),
      PosColumn(
        text: receipt.collectorName,
        width: 7,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    add(generator.hr());

    text('CUSTOMER', styles: const PosStyles(bold: true));
    row([
      PosColumn(text: 'Name', width: 4),
      PosColumn(
        text: receipt.customerName,
        width: 8,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    row([
      PosColumn(text: 'Account', width: 4),
      PosColumn(
        text: receipt.accountNumber,
        width: 8,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    if (receipt.mobileNumber.isNotEmpty) {
      row([
        PosColumn(text: 'Mobile', width: 4),
        PosColumn(
          text: receipt.mobileNumber,
          width: 8,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    if (receipt.address.isNotEmpty) {
      text(receipt.address, styles: const PosStyles(align: PosAlign.left));
    }
    add(generator.hr());

    text('PAYMENT DETAILS', styles: const PosStyles(bold: true));
    row([
      PosColumn(text: 'Invoice', width: 4),
      PosColumn(
        text: receipt.invoiceNumber,
        width: 8,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    row([
      PosColumn(text: 'Cycle', width: 4),
      PosColumn(
        text: receipt.billingCycleName,
        width: 8,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    row([
      PosColumn(text: 'Due Date', width: 4),
      PosColumn(
        text: formatDate(receipt.dueDate),
        width: 8,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    if (receipt.hasLineItems) {
      add(generator.hr(ch: '-'));
      text('INVOICE CHARGES', styles: const PosStyles(bold: true));
      for (final item in receipt.lineItems) {
        _printLineItem(row, text, item);
      }
      row([
        PosColumn(text: 'Invoice Total', width: 6),
        PosColumn(
          text: formatMoney(
            receipt.invoiceTotal > 0
                ? receipt.invoiceTotal
                : receipt.lineItems.fold<double>(0, (sum, item) => sum + item.amount),
          ),
          width: 6,
          styles: const PosStyles(align: PosAlign.right, bold: true),
        ),
      ]);
    }
    add(generator.hr(ch: '-'));

    row([
      PosColumn(text: 'Previous Bal.', width: 6),
      PosColumn(
        text: formatMoney(receipt.previousBalance),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    row([
      PosColumn(text: 'Amount Paid', width: 6),
      PosColumn(
        text: formatMoney(receipt.amountPaid),
        width: 6,
        styles: const PosStyles(align: PosAlign.right, bold: true),
      ),
    ]);
    row([
      PosColumn(text: 'Remaining', width: 6),
      PosColumn(
        text: formatMoney(receipt.remainingBalance),
        width: 6,
        styles: const PosStyles(align: PosAlign.right, bold: true),
      ),
    ]);
    row([
      PosColumn(text: 'Method', width: 6),
      PosColumn(
        text: receipt.paymentMethod,
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    add(generator.feed(1));
    text(
      receipt.statusLabel,
      styles: const PosStyles(
        align: PosAlign.center,
        bold: true,
        height: PosTextSize.size2,
      ),
    );
    add(generator.hr());

    text(
      'Note: Valid upon office sync.',
      styles: const PosStyles(align: PosAlign.center),
    );
    text(
      'Official receipt no. assigned',
      styles: const PosStyles(align: PosAlign.center),
    );
    text(
      'after evening upload.',
      styles: const PosStyles(align: PosAlign.center),
    );
    add(generator.feed(1));
    text(
      'Thank you for your payment!',
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );
    text(
      '- NDTECH -',
      styles: const PosStyles(align: PosAlign.center),
    );
    add(generator.feed(3));
    add(generator.cut());

    return bytes;
  }

  static void _printLineItem(
    void Function(List<PosColumn>) row,
    void Function(String, {PosStyles styles}) text,
    ReceiptLineItem item,
  ) {
    final description = escPosText(item.description);
    final amount = formatMoney(item.amount);

    if (description.length <= 20) {
      row([
        PosColumn(text: description, width: 8),
        PosColumn(
          text: amount,
          width: 4,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
      return;
    }

    text(description);
    row([
      PosColumn(text: '', width: 8),
      PosColumn(
        text: amount,
        width: 4,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
  }
}
