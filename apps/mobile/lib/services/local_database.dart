import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;

import '../models/work_item.dart';

class LocalDatabase {
  LocalDatabase._();
  static final LocalDatabase instance = LocalDatabase._();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _open();
    return _db!;
  }

  Future<Database> _open() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'ndtech_collector.db');

    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE work_items (
            id INTEGER PRIMARY KEY,
            payload_json TEXT NOT NULL,
            downloaded_at TEXT NOT NULL,
            search_text TEXT NOT NULL,
            balance REAL NOT NULL,
            due_date TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            account_number TEXT NOT NULL,
            invoice_number TEXT NOT NULL,
            barangay TEXT NOT NULL,
            status TEXT NOT NULL,
            collection_case_status TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE outbox_events (
            local_id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            occurred_at TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            sync_status TEXT NOT NULL,
            result_message TEXT NOT NULL,
            payment_number TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE sync_meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            package_version INTEGER NOT NULL,
            checksum TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            scope TEXT NOT NULL,
            last_download_at TEXT NOT NULL,
            last_upload_at TEXT NOT NULL,
            pending_events INTEGER NOT NULL
          )
        ''');

        await db.insert('sync_meta', {
          'id': 1,
          'package_version': 1,
          'checksum': '',
          'generated_at': '',
          'scope': 'all_collectible',
          'last_download_at': '',
          'last_upload_at': '',
          'pending_events': 0,
        });
      },
    );
  }

  Future<void> replaceWorkItems(List<WorkItem> items) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('work_items');
      for (final item in items) {
        await txn.insert('work_items', _workItemToMap(item));
      }
    });
  }

  Future<List<WorkItem>> getWorkItems({String? search, String? filter}) async {
    final db = await database;
    final where = <String>[];
    final args = <Object?>[];

    if (search != null && search.trim().isNotEmpty) {
      where.add('search_text LIKE ?');
      args.add('%${search.trim().toLowerCase()}%');
    }

    if (filter == 'overdue') {
      final today = DateTime.now();
      final todayStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      where.add(
        "(status = 'overdue' OR (balance > 0 AND due_date < ? AND status NOT IN ('paid', 'cancelled', 'draft')))",
      );
      args.add(todayStr);
    } else if (filter == 'promised') {
      where.add("collection_case_status = 'promised_to_pay'");
    }

    final rows = await db.query(
      'work_items',
      where: where.isEmpty ? null : where.join(' AND '),
      whereArgs: args.isEmpty ? null : args,
      orderBy: 'due_date ASC, customer_name ASC',
    );

    return rows.map(_workItemFromMap).toList();
  }

  Future<WorkItem?> getWorkItem(int invoiceId) async {
    final db = await database;
    final rows = await db.query(
      'work_items',
      where: 'id = ?',
      whereArgs: [invoiceId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return _workItemFromMap(rows.first);
  }

  Future<void> upsertWorkItem(WorkItem item) async {
    final db = await database;
    await db.insert(
      'work_items',
      _workItemToMap(item),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> addOutboxEvent(OutboxEvent event) async {
    final db = await database;
    await db.insert(
      'outbox_events',
      _outboxToMap(event),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    await _refreshPendingCount(db);
  }

  Future<List<OutboxEvent>> getPendingOutboxEvents() async {
    final db = await database;
    final rows = await db.query(
      'outbox_events',
      where: "sync_status = 'pending'",
      orderBy: 'occurred_at ASC',
    );
    return rows.map(_outboxFromMap).toList();
  }

  Future<List<OutboxEvent>> getAllOutboxEvents() async {
    final db = await database;
    final rows = await db.query('outbox_events', orderBy: 'occurred_at DESC');
    return rows.map(_outboxFromMap).toList();
  }

  Future<void> updateOutboxEvent(OutboxEvent event) async {
    final db = await database;
    await db.update(
      'outbox_events',
      _outboxToMap(event),
      where: 'local_id = ?',
      whereArgs: [event.localId],
    );
    await _refreshPendingCount(db);
  }

  Future<SyncMeta> getSyncMeta() async {
    final db = await database;
    final rows = await db.query('sync_meta', where: 'id = 1', limit: 1);
    if (rows.isEmpty) return const SyncMeta();
    return _syncMetaFromMap(rows.first);
  }

  Future<void> saveSyncMeta(SyncMeta meta) async {
    final db = await database;
    await db.update(
      'sync_meta',
      {
        'package_version': meta.packageVersion,
        'checksum': meta.checksum,
        'generated_at': meta.generatedAt,
        'scope': meta.scope,
        'last_download_at': meta.lastDownloadAt,
        'last_upload_at': meta.lastUploadAt,
        'pending_events': meta.pendingEvents,
      },
      where: 'id = 1',
    );
  }

  Future<double> getLocalCollectedToday() async {
    final db = await database;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final rows = await db.query(
      'outbox_events',
      where: "type = 'payment' AND occurred_at LIKE ?",
      whereArgs: ['$today%'],
    );

    var total = 0.0;
    for (final row in rows) {
      final event = _outboxFromMap(row);
      final amount = event.payload['amount'];
      if (amount is num) total += amount.toDouble();
    }
    return total;
  }

  Future<int> getVisitCountToday() async {
    final db = await database;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final rows = await db.query(
      'outbox_events',
      where: 'occurred_at LIKE ?',
      whereArgs: ['$today%'],
    );
    return rows.length;
  }

  Future<void> _refreshPendingCount(Database db) async {
    final count = Sqflite.firstIntValue(
          await db.rawQuery(
            "SELECT COUNT(*) FROM outbox_events WHERE sync_status = 'pending'",
          ),
        ) ??
        0;

    await db.update(
      'sync_meta',
      {'pending_events': count},
      where: 'id = 1',
    );
  }

  Map<String, Object?> _workItemToMap(WorkItem item) => {
        'id': item.id,
        'payload_json': item.payloadJson,
        'downloaded_at': item.downloadedAt,
        'search_text': item.searchText,
        'balance': item.balance,
        'due_date': item.dueDate,
        'customer_name': item.customerName,
        'account_number': item.accountNumber,
        'invoice_number': item.invoiceNumber,
        'barangay': item.barangay,
        'status': item.status,
        'collection_case_status': item.collectionCaseStatus,
      };

  WorkItem _workItemFromMap(Map<String, Object?> row) {
    final balance = (row['balance'] as num).toDouble();
    final dueDate = row['due_date'] as String;
    final rawStatus = row['status'] as String;

    return WorkItem(
      id: row['id'] as int,
      payloadJson: row['payload_json'] as String,
      downloadedAt: row['downloaded_at'] as String,
      searchText: row['search_text'] as String,
      balance: balance,
      dueDate: dueDate,
      customerName: row['customer_name'] as String,
      accountNumber: row['account_number'] as String,
      invoiceNumber: row['invoice_number'] as String,
      barangay: row['barangay'] as String,
      status: WorkItem.normalizeInvoiceStatus(
        status: rawStatus,
        balance: balance,
        dueDate: dueDate,
      ),
      collectionCaseStatus: row['collection_case_status'] as String,
    );
  }

  Map<String, Object?> _outboxToMap(OutboxEvent event) => {
        'local_id': event.localId,
        'type': event.type,
        'occurred_at': event.occurredAt,
        'payload_json': event.payloadJson,
        'sync_status': event.syncStatus,
        'result_message': event.resultMessage,
        'payment_number': event.paymentNumber,
      };

  OutboxEvent _outboxFromMap(Map<String, Object?> row) => OutboxEvent(
        localId: row['local_id'] as String,
        type: row['type'] as String,
        occurredAt: row['occurred_at'] as String,
        payloadJson: row['payload_json'] as String,
        syncStatus: row['sync_status'] as String,
        resultMessage: row['result_message'] as String,
        paymentNumber: row['payment_number'] as String,
      );

  SyncMeta _syncMetaFromMap(Map<String, Object?> row) => SyncMeta(
        packageVersion: row['package_version'] as int,
        checksum: row['checksum'] as String,
        generatedAt: row['generated_at'] as String,
        scope: row['scope'] as String,
        lastDownloadAt: row['last_download_at'] as String,
        lastUploadAt: row['last_upload_at'] as String,
        pendingEvents: row['pending_events'] as int,
      );
}
