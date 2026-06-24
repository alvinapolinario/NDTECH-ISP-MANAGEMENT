import 'dart:convert';

import '../config/api_contract.dart';

class WorkItem {
  const WorkItem({
    required this.id,
    required this.payloadJson,
    required this.downloadedAt,
    this.searchText = '',
    this.balance = 0,
    this.dueDate = '',
    this.customerName = '',
    this.accountNumber = '',
    this.invoiceNumber = '',
    this.barangay = '',
    this.status = '',
    this.collectionCaseStatus = '',
  });

  final int id;
  final String payloadJson;
  final String downloadedAt;
  final String searchText;
  final double balance;
  final String dueDate;
  final String customerName;
  final String accountNumber;
  final String invoiceNumber;
  final String barangay;
  final String status;
  final String collectionCaseStatus;

  Map<String, dynamic> get payload =>
      Map<String, dynamic>.from(jsonDecode(payloadJson) as Map);

  /// True when balance is outstanding and the due date is before today.
  bool get isOverdue {
    if (balance <= 0) return false;
    if (status == 'paid' || status == 'cancelled' || status == 'draft') {
      return false;
    }
    if (status == 'overdue') return true;
    return isPastDue(dueDate);
  }

  /// Status used for badges and filters (includes due-date overdue logic).
  String get effectiveStatus {
    if (balance <= 0) return 'paid';
    if (isOverdue) return 'overdue';
    return status;
  }

  static bool isPastDue(String? dueDate) {
    if (dueDate == null || dueDate.isEmpty) return false;
    try {
      final parsed = DateTime.parse(dueDate);
      final due = DateTime(parsed.year, parsed.month, parsed.day);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      return due.isBefore(today);
    } catch (_) {
      return false;
    }
  }

  static String normalizeInvoiceStatus({
    required String status,
    required double balance,
    required String dueDate,
  }) {
    if (balance <= 0) return status.isEmpty ? 'paid' : status;
    if (status == 'paid' || status == 'cancelled' || status == 'draft') {
      return status;
    }
    if (status == 'overdue' || isPastDue(dueDate)) return 'overdue';
    return status;
  }

  factory WorkItem.fromDownloadJson(Map<String, dynamic> json) {
    final invoice = json['invoice'] as Map<String, dynamic>;
    final customer = json['customer'] as Map<String, dynamic>;
    final address = json['installationAddress'] as Map<String, dynamic>?;
    final collectionCase = json['collectionCase'] as Map<String, dynamic>?;

    final customerName = customer['displayName'] as String? ?? '';
    final accountNumber = customer['accountNumber'] as String? ?? '';
    final barangay = address?['barangay'] as String? ?? '';

    final balance = readJsonDouble(invoice['balance']);
    final dueDate = readJsonString(invoice['dueDate']);
    final rawStatus = readJsonString(invoice['status']);

    return WorkItem(
      id: readJsonInt(invoice['id']),
      payloadJson: jsonEncode(json),
      downloadedAt: DateTime.now().toIso8601String(),
      searchText: '$customerName $accountNumber $barangay ${invoice['invoiceNumber']}'
          .toLowerCase(),
      balance: balance,
      dueDate: dueDate,
      customerName: customerName,
      accountNumber: accountNumber,
      invoiceNumber: readJsonString(invoice['invoiceNumber']),
      barangay: barangay,
      status: normalizeInvoiceStatus(
        status: rawStatus,
        balance: balance,
        dueDate: dueDate,
      ),
      collectionCaseStatus: readJsonString(collectionCase?['status']),
    );
  }

  WorkItem copyWith({
    String? payloadJson,
    double? balance,
    String? status,
    String? collectionCaseStatus,
  }) {
    return WorkItem(
      id: id,
      payloadJson: payloadJson ?? this.payloadJson,
      downloadedAt: downloadedAt,
      searchText: searchText,
      balance: balance ?? this.balance,
      dueDate: dueDate,
      customerName: customerName,
      accountNumber: accountNumber,
      invoiceNumber: invoiceNumber,
      barangay: barangay,
      status: status ?? this.status,
      collectionCaseStatus: collectionCaseStatus ?? this.collectionCaseStatus,
    );
  }
}

class SyncMeta {
  const SyncMeta({
    this.packageVersion = 1,
    this.checksum = '',
    this.generatedAt = '',
    this.scope = 'all_collectible',
    this.lastDownloadAt = '',
    this.lastUploadAt = '',
    this.pendingEvents = 0,
  });

  final int packageVersion;
  final String checksum;
  final String generatedAt;
  final String scope;
  final String lastDownloadAt;
  final String lastUploadAt;
  final int pendingEvents;

  SyncMeta copyWith({
    String? checksum,
    String? generatedAt,
    String? scope,
    String? lastDownloadAt,
    String? lastUploadAt,
    int? pendingEvents,
  }) {
    return SyncMeta(
      packageVersion: packageVersion,
      checksum: checksum ?? this.checksum,
      generatedAt: generatedAt ?? this.generatedAt,
      scope: scope ?? this.scope,
      lastDownloadAt: lastDownloadAt ?? this.lastDownloadAt,
      lastUploadAt: lastUploadAt ?? this.lastUploadAt,
      pendingEvents: pendingEvents ?? this.pendingEvents,
    );
  }
}

class OutboxEvent {
  const OutboxEvent({
    required this.localId,
    required this.type,
    required this.occurredAt,
    required this.payloadJson,
    this.syncStatus = 'pending',
    this.resultMessage = '',
    this.paymentNumber = '',
  });

  final String localId;
  final String type;
  final String occurredAt;
  final String payloadJson;
  final String syncStatus;
  final String resultMessage;
  final String paymentNumber;

  Map<String, dynamic> get payload =>
      Map<String, dynamic>.from(jsonDecode(payloadJson) as Map);

  Map<String, dynamic> toUploadJson() => {
        'localId': localId,
        'type': type,
        'occurredAt': occurredAt,
        'payload': payload,
      };

  OutboxEvent copyWith({
    String? syncStatus,
    String? resultMessage,
    String? paymentNumber,
  }) {
    return OutboxEvent(
      localId: localId,
      type: type,
      occurredAt: occurredAt,
      payloadJson: payloadJson,
      syncStatus: syncStatus ?? this.syncStatus,
      resultMessage: resultMessage ?? this.resultMessage,
      paymentNumber: paymentNumber ?? this.paymentNumber,
    );
  }
}

class DownloadPackage {
  const DownloadPackage({
    required this.packageVersion,
    required this.generatedAt,
    required this.checksum,
    required this.scope,
    required this.workItems,
    required this.collectorName,
    this.hasMore,
  });

  final int packageVersion;
  final String generatedAt;
  final String checksum;
  final String scope;
  final List<Map<String, dynamic>> workItems;
  final String collectorName;
  final bool? hasMore;

  factory DownloadPackage.fromJson(Map<String, dynamic> json) {
    final meta = json['meta'] as Map<String, dynamic>?;

    return DownloadPackage(
      packageVersion: readJsonInt(json['packageVersion'], fallback: ApiContract.syncPackageVersion),
      generatedAt: readJsonString(json['generatedAt']),
      checksum: readJsonString(json['checksum']),
      scope: readJsonString(json['scope'], fallback: ApiContract.scopeAllCollectible),
      workItems: (json['workItems'] as List<dynamic>? ?? [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList(),
      collectorName: readJsonString((json['collector'] as Map<String, dynamic>?)?['name']),
      hasMore: meta?['hasMore'] as bool?,
    );
  }
}

class UploadResultItem {
  const UploadResultItem({
    required this.localId,
    required this.status,
    required this.message,
    this.paymentNumber = '',
    this.adjustedAmount,
  });

  final String localId;
  final String status;
  final String message;
  final String paymentNumber;
  final double? adjustedAmount;

  factory UploadResultItem.fromJson(Map<String, dynamic> json) {
    return UploadResultItem(
      localId: readJsonString(json['localId']),
      status: readJsonString(json['status'], fallback: ApiContract.resultRejected),
      message: readJsonString(json['message']),
      paymentNumber: readJsonString(json['paymentNumber']),
      adjustedAmount: json['adjustedAmount'] == null
          ? null
          : readJsonDouble(json['adjustedAmount']),
    );
  }
}
