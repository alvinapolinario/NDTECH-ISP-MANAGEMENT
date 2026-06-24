import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../models/app_settings.dart';
import '../models/auth_user.dart';
import '../models/work_item.dart';
import '../services/api_service.dart';
import '../services/app_settings_service.dart';
import '../services/connectivity_service.dart';
import '../services/local_database.dart';
import '../services/sync_service.dart';

class CollectorAppState extends ChangeNotifier {
  CollectorAppState({
    required ApiService api,
    required AppSettingsService settings,
    required LocalDatabase db,
    required ConnectivityService connectivity,
  })  : _api = api,
        _settings = settings,
        _db = db,
        _connectivity = connectivity,
        sync = SyncService(api: api, db: db, connectivity: connectivity) {
    _connectivity.stream.listen((_) => notifyListeners());
  }

  final ApiService _api;
  final AppSettingsService _settings;
  final LocalDatabase _db;
  final ConnectivityService _connectivity;
  final SyncService sync;

  AuthUser? user;
  bool bootstrapping = true;
  bool busy = false;
  String? error;
  List<WorkItem> workItems = [];
  SyncMeta syncMeta = const SyncMeta();
  double collectedToday = 0;
  int visitsToday = 0;
  String search = '';
  String filter = 'all';
  AppSettings settings = AppSettings(apiBaseUrl: AppConfig.defaultApiBaseUrl);

  ConnectionMode get connectionMode => _connectivity.mode;
  String get apiBaseUrl => _settings.apiBaseUrl;

  Future<void> loadSettings() async {
    await _settings.init();
    settings = _settings.settings;
    notifyListeners();
  }

  Future<String?> readAuthToken() => _settings.readAuthToken();

  Future<ConnectionTestResult> testConnection({
    required String apiBaseUrl,
    required String authToken,
  }) {
    return _api.testConnectionWithToken(
      apiBaseUrl: apiBaseUrl,
      authToken: authToken,
    );
  }

  Future<void> saveSettings({
    required String apiBaseUrl,
    required String authToken,
  }) async {
    final previousUrl = _settings.apiBaseUrl;
    await _settings.save(
      apiBaseUrl: apiBaseUrl,
      authToken: authToken,
    );
    settings = _settings.settings;

    if (previousUrl != _settings.apiBaseUrl && user != null) {
      await logout();
    } else if (authToken.trim().isNotEmpty) {
      try {
        user = await _api.me();
      } catch (_) {
        user = null;
      }
      notifyListeners();
    } else {
      notifyListeners();
    }
  }

  Future<void> resetSettings() async {
    await _settings.resetToDefault();
    settings = _settings.settings;
    notifyListeners();
  }

  Future<void> bootstrap() async {
    bootstrapping = true;
    notifyListeners();

    try {
      await _settings.init();
      settings = _settings.settings;
      await _connectivity.refresh();

      if (settings.hasAuthToken) {
        user = await _api.me();
      }
      await refreshLocalData();
    } catch (_) {
      user = null;
    } finally {
      bootstrapping = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _settings.clearAuthToken();
    settings = _settings.settings;
    user = null;
    workItems = [];
    notifyListeners();
  }

  Future<void> refreshLocalData() async {
    workItems = await _db.getWorkItems(
      search: search,
      filter: filter == 'all' ? null : filter,
    );
    syncMeta = await _db.getSyncMeta();
    collectedToday = await _db.getLocalCollectedToday();
    visitsToday = await _db.getVisitCountToday();
    notifyListeners();
  }

  Future<DownloadPackage> downloadRoute() async {
    busy = true;
    error = null;
    notifyListeners();

    try {
      final package = await sync.downloadAndStore();
      await refreshLocalData();
      return package;
    } catch (caught) {
      error = caught.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<List<UploadResultItem>> uploadPending() async {
    busy = true;
    error = null;
    notifyListeners();

    try {
      final results = await sync.uploadPending();
      await refreshLocalData();
      return results;
    } catch (caught) {
      error = caught.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void setSearch(String value) {
    search = value;
    refreshLocalData();
  }

  void setFilter(String value) {
    filter = value;
    refreshLocalData();
  }
}
