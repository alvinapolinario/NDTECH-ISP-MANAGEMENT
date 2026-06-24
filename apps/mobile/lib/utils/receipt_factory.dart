import '../config/api_contract.dart';
import '../models/payment_receipt.dart';
import '../models/work_item.dart';

List<ReceiptLineItem> parseInvoiceLineItems(Map<String, dynamic> payload) {
  final raw = payload['invoiceItems'] as List<dynamic>? ?? [];

  return raw
      .map((item) {
        final map = Map<String, dynamic>.from(item as Map);
        return ReceiptLineItem(
          description: map['description']?.toString().trim() ?? '',
          itemType: map['itemType']?.toString() ?? 'other',
          quantity: readJsonDouble(map['quantity'], fallback: 1),
          unitPrice: readJsonDouble(map['unitPrice']),
          amount: readJsonDouble(map['amount']),
        );
      })
      .where((item) => item.description.isNotEmpty || item.amount != 0)
      .toList();
}

double readInvoiceTotal(Map<String, dynamic> payload) {
  final invoice = payload['invoice'];
  if (invoice is! Map) return 0;
  final map = Map<String, dynamic>.from(invoice);
  return readJsonDouble(map['total']);
}

String formatReceiptCycleLine(Map<String, dynamic> payload) {
  final invoice = Map<String, dynamic>.from(payload['invoice'] as Map);
  final billingCycleName = invoice['billingCycleName']?.toString().trim() ?? '';

  final subscription = payload['subscription'];
  final servicePlanName = subscription is Map
      ? subscription['servicePlanName']?.toString().trim() ?? ''
      : '';

  if (servicePlanName.isNotEmpty && billingCycleName.isNotEmpty) {
    return '$servicePlanName - $billingCycleName';
  }
  if (servicePlanName.isNotEmpty) return servicePlanName;
  if (billingCycleName.isNotEmpty) return billingCycleName;
  return '—';
}

PaymentReceipt buildPaymentReceipt({
  required WorkItem item,
  required String receiptNumber,
  required String collectorName,
  required double previousBalance,
  required double amountPaid,
  required DateTime paidAt,
  String paymentMethod = 'Cash',
}) {
  final payload = item.payload;
  final customer = Map<String, dynamic>.from(payload['customer'] as Map);
  final address = payload['installationAddress'] == null
      ? null
      : Map<String, dynamic>.from(payload['installationAddress'] as Map);

  final addressLine = address == null
      ? ''
      : '${address['street']}, ${address['barangay']}, ${address['municipality']}';

  return PaymentReceipt(
    receiptNumber: receiptNumber,
    paidAt: paidAt,
    collectorName: collectorName,
    customerName: item.customerName,
    accountNumber: item.accountNumber,
    mobileNumber: customer['mobileNumber']?.toString() ?? '',
    address: addressLine,
    invoiceNumber: item.invoiceNumber,
    billingCycleName: formatReceiptCycleLine(payload),
    dueDate: item.dueDate,
    previousBalance: previousBalance,
    amountPaid: amountPaid,
    remainingBalance: (previousBalance - amountPaid).clamp(0, double.infinity).toDouble(),
    paymentMethod: paymentMethod,
    lineItems: parseInvoiceLineItems(payload),
    invoiceTotal: readInvoiceTotal(payload),
  );
}

/// Sample receipt for printer setup and layout checks.
PaymentReceipt buildTestPaymentReceipt({
  String collectorName = 'Test Collector',
  DateTime? paidAt,
}) {
  final now = paidAt ?? DateTime.now();

  return PaymentReceipt(
    receiptNumber: 'TEST-${now.millisecondsSinceEpoch.remainder(100000).toString().padLeft(5, '0')}',
    paidAt: now,
    collectorName: collectorName,
    customerName: 'Juan Dela Cruz',
    accountNumber: 'CUST-0001',
    mobileNumber: '09171234567',
    address: '123 Rizal St, Poblacion, Sample City',
    invoiceNumber: 'INV-202606-0001',
    billingCycleName: 'FIBER 30-1000 - June 2026',
    dueDate: '2026-06-15',
    previousBalance: 1549,
    amountPaid: 1549,
    remainingBalance: 0,
    paymentMethod: 'Cash',
    invoiceTotal: 1549,
    lineItems: const [
      ReceiptLineItem(
        description: 'FIBER 30-1000 - June 2026',
        itemType: 'recurring_service',
        quantity: 1,
        unitPrice: 1299,
        amount: 1299,
      ),
      ReceiptLineItem(
        description: 'Repair service',
        itemType: 'repair',
        quantity: 1,
        unitPrice: 150,
        amount: 150,
      ),
      ReceiptLineItem(
        description: 'Connector replacement',
        itemType: 'connector',
        quantity: 1,
        unitPrice: 100,
        amount: 100,
      ),
    ],
  );
}
