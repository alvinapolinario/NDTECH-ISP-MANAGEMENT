import 'dart:convert';
import 'dart:io';

import 'package:uuid/uuid.dart';

import '../config/api_contract.dart';
import '../models/work_item.dart';
import 'api_service.dart';
import 'connectivity_service.dart';
import 'local_database.dart';

class SyncService {
  SyncService({
    required ApiService api,
    required LocalDatabase db,
    required ConnectivityService connectivity,
  })  : _api = api,
        _db = db,
        _connectivity = connectivity;

  final ApiService _api;
  final LocalDatabase _db;
  final ConnectivityService _connectivity;
  final _uuid = const Uuid();

  String get deviceId {
    final host = Platform.localHostname;
    return 'COL-$host';
  }

  Future<DownloadPackage> downloadAndStore({
    String scope = ApiContract.scopeAllCollectible,
  }) async {
    final online = await _isReachable();
    if (!online) {
      throw Exception('No connection. Download requires office Wi-Fi or mobile data.');
    }

    final package = await _api.downloadPackage(scope: scope);
    final items = package.workItems.map(WorkItem.fromDownloadJson).toList();
    await _db.replaceWorkItems(items);

    final meta = SyncMeta(
      packageVersion: package.packageVersion,
      checksum: package.checksum,
      generatedAt: package.generatedAt,
      scope: package.scope,
      lastDownloadAt: DateTime.now().toIso8601String(),
      pendingEvents: (await _db.getPendingOutboxEvents()).length,
    );
    await _db.saveSyncMeta(meta);
    return package;
  }

  Future<List<UploadResultItem>> uploadPending() async {
    final online = await _isReachable();
    if (!online) {
      throw Exception('No connection. Upload requires office Wi-Fi or mobile data.');
    }

    final pending = await _db.getPendingOutboxEvents();
    if (pending.isEmpty) return [];

    final meta = await _db.getSyncMeta();
    final results = await _api.uploadBatch(
      deviceId: deviceId,
      downloadChecksum: meta.checksum.isEmpty ? null : meta.checksum,
      events: pending,
    );

    for (final result in results) {
      OutboxEvent? existing;
      for (final event in pending) {
        if (event.localId == result.localId) {
          existing = event;
          break;
        }
      }
      if (existing == null) continue;

      final keepPending = result.status == ApiContract.resultRejected;
      await _db.updateOutboxEvent(
        existing.copyWith(
          syncStatus: keepPending ? 'pending' : 'synced',
          resultMessage: result.message,
          paymentNumber: result.paymentNumber,
        ),
      );

      if (existing.type == ApiContract.eventPayment &&
          result.adjustedAmount != null &&
          result.status == ApiContract.resultAdjusted) {
        await _applyAdjustedPayment(existing, result.adjustedAmount!);
      }
    }

    final refreshedMeta = (await _db.getSyncMeta()).copyWith(
      lastUploadAt: DateTime.now().toIso8601String(),
      pendingEvents: (await _db.getPendingOutboxEvents()).length,
    );
    await _db.saveSyncMeta(refreshedMeta);
    return results;
  }

  Future<String> recordPayment({
    required WorkItem item,
    required double amount,
    String paymentMethod = ApiContract.paymentMethodCash,
    String? referenceNumber,
    String? notes,
  }) async {
    final localId = _uuid.v4();
    final receiptNumber = _localReceiptNumber();
    final now = DateTime.now().toIso8601String();

    final payload = {
      'invoiceId': item.id,
      'amount': amount,
      'paymentDate': now.substring(0, 10),
      'paymentMethod': paymentMethod,
      'localReceiptNumber': receiptNumber,
      if (referenceNumber != null && referenceNumber.isNotEmpty)
        'referenceNumber': referenceNumber,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };

    await _db.addOutboxEvent(
      OutboxEvent(
        localId: localId,
        type: ApiContract.eventPayment,
        occurredAt: now,
        payloadJson: jsonEncode(payload),
      ),
    );

    final newBalance = (item.balance - amount).clamp(0, double.infinity);
    final nextStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
    await _db.upsertWorkItem(
      item.copyWith(
        balance: newBalance.toDouble(),
        status: nextStatus,
        collectionCaseStatus: newBalance <= 0 ? 'resolved' : 'contacted',
      ),
    );

    return receiptNumber;
  }

  Future<void> recordVisit({
    required WorkItem item,
    required String visitOutcome,
    String? note,
  }) async {
    final now = DateTime.now().toIso8601String();
    final payload = {
      'invoiceId': item.id,
      'visitOutcome': visitOutcome,
      'visitedAt': now,
      if (note != null && note.isNotEmpty) 'note': note,
    };

    await _db.addOutboxEvent(
      OutboxEvent(
        localId: _uuid.v4(),
        type: ApiContract.eventVisitNote,
        occurredAt: now,
        payloadJson: jsonEncode(payload),
      ),
    );

    final caseStatus = switch (visitOutcome) {
      ApiContract.visitPromised => 'promised_to_pay',
      ApiContract.visitEscalated => 'escalated',
      ApiContract.visitPaid => 'resolved',
      _ => 'contacted',
    };

    await _db.upsertWorkItem(
      item.copyWith(collectionCaseStatus: caseStatus),
    );
  }

  Future<void> _applyAdjustedPayment(OutboxEvent event, double adjustedAmount) async {
    final invoiceId = readJsonInt(event.payload['invoiceId']);
    if (invoiceId <= 0) return;

    final items = await _db.getWorkItems();
    for (final item in items) {
      if (item.id != invoiceId) continue;
      final newBalance = (item.balance - adjustedAmount).clamp(0, double.infinity);
      await _db.upsertWorkItem(
        item.copyWith(
          balance: newBalance.toDouble(),
          status: newBalance <= 0 ? 'paid' : 'partially_paid',
          collectionCaseStatus: newBalance <= 0 ? 'resolved' : 'contacted',
        ),
      );
      break;
    }
  }

  Future<bool> _isReachable() async {
    final mode = await _connectivity.refresh();
    if (mode != ConnectionMode.online) return false;
    return _api.ping();
  }

  String previewReceiptNumber() {
    final now = DateTime.now();
    final date =
        '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
    final suffix = now.millisecondsSinceEpoch.toString().substring(7);
    return 'COL-$deviceId-$date-$suffix';
  }

  String _localReceiptNumber() => previewReceiptNumber();
}
