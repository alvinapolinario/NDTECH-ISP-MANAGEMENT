import 'dart:convert';

/// Mirrors NestJS collector-sync and auth API contracts.
class ApiContract {
  ApiContract._();

  static const int syncPackageVersion = 1;

  // Auth
  static const String authMe = '/auth/me';

  // Collector sync
  static const String syncDownload = '/collector-sync/download';
  static const String syncUpload = '/collector-sync/upload';

  static const String scopeAllCollectible = 'all_collectible';
  static const String scopeAssigned = 'assigned';

  static const String eventPayment = 'payment';
  static const String eventCollectionUpdate = 'collection_update';
  static const String eventVisitNote = 'visit_note';

  static const String paymentMethodCash = 'cash';
  static const String paymentMethodGcash = 'gcash';
  static const String paymentMethodBankTransfer = 'bank_transfer';
  static const String paymentMethodCheck = 'check';
  static const String paymentMethodCard = 'card';
  static const String paymentMethodOther = 'other';

  static const List<PaymentMethodOption> paymentMethodOptions = [
    PaymentMethodOption(paymentMethodCash, 'Cash'),
    PaymentMethodOption(paymentMethodGcash, 'GCash'),
    PaymentMethodOption(paymentMethodBankTransfer, 'Bank Transfer'),
    PaymentMethodOption(paymentMethodCheck, 'Check'),
    PaymentMethodOption(paymentMethodCard, 'Card'),
    PaymentMethodOption(paymentMethodOther, 'Other'),
  ];

  static String paymentMethodLabel(String value) {
    for (final option in paymentMethodOptions) {
      if (option.value == value) return option.label;
    }
    return value.replaceAll('_', ' ');
  }

  static bool requiresGcashDetails(String method) =>
      method == paymentMethodGcash;

  static bool requiresPaymentNotes(String method) =>
      method == paymentMethodBankTransfer ||
      method == paymentMethodCheck ||
      method == paymentMethodCard ||
      method == paymentMethodOther;

  static const String visitNotHome = 'not_home';
  static const String visitContacted = 'contacted';
  static const String visitPromised = 'promised';
  static const String visitPaid = 'paid';
  static const String visitEscalated = 'escalated';

  static const String resultAccepted = 'accepted';
  static const String resultAdjusted = 'adjusted';
  static const String resultRejected = 'rejected';
  static const String resultDuplicate = 'duplicate';
}

String parseApiErrorMessage(dynamic body, {String fallback = 'Request failed'}) {
  if (body == null) return fallback;

  if (body is String) {
    final trimmed = body.trim();
    if (trimmed.isEmpty) return fallback;
    try {
      final parsed = jsonDecode(trimmed);
      return parseApiErrorMessage(parsed, fallback: trimmed);
    } catch (_) {
      return trimmed;
    }
  }

  if (body is Map) {
    final message = body['message'];
    if (message is List) {
      return message.map((item) => item.toString()).join(', ');
    }
    if (message != null) {
      return message.toString();
    }
  }

  return fallback;
}

class PaymentMethodOption {
  const PaymentMethodOption(this.value, this.label);

  final String value;
  final String label;
}

int readJsonInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

double readJsonDouble(dynamic value, {double fallback = 0}) {
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

String readJsonString(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  return value.toString();
}
