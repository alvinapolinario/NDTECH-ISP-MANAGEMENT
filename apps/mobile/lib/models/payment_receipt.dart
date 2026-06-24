class ReceiptLineItem {
  const ReceiptLineItem({
    required this.description,
    required this.itemType,
    required this.quantity,
    required this.unitPrice,
    required this.amount,
  });

  final String description;
  final String itemType;
  final double quantity;
  final double unitPrice;
  final double amount;
}

class PaymentReceipt {
  const PaymentReceipt({
    required this.receiptNumber,
    required this.paidAt,
    required this.collectorName,
    required this.customerName,
    required this.accountNumber,
    required this.mobileNumber,
    required this.address,
    required this.invoiceNumber,
    required this.billingCycleName,
    required this.dueDate,
    required this.previousBalance,
    required this.amountPaid,
    required this.remainingBalance,
    this.paymentMethod = 'Cash',
    this.lineItems = const [],
    this.invoiceTotal = 0,
  });

  final String receiptNumber;
  final DateTime paidAt;
  final String collectorName;
  final String customerName;
  final String accountNumber;
  final String mobileNumber;
  final String address;
  final String invoiceNumber;
  final String billingCycleName;
  final String dueDate;
  final double previousBalance;
  final double amountPaid;
  final double remainingBalance;
  final String paymentMethod;
  final List<ReceiptLineItem> lineItems;
  final double invoiceTotal;

  bool get paidInFull => remainingBalance <= 0;

  bool get hasLineItems => lineItems.isNotEmpty;

  String get statusLabel => paidInFull ? 'PAID IN FULL' : 'PARTIAL PAYMENT';
}
