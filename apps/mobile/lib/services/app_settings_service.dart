import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../models/app_settings.dart';

class AppSettingsService {
  AppSettingsService(this._secureStorage);

  final FlutterSecureStorage _secureStorage;

  static const _apiUrlKey = 'api_base_url';
  static const _authTokenKey = 'isp_api_token';

  AppSettings _settings = AppSettings(apiBaseUrl: AppConfig.defaultApiBaseUrl);
  bool _initialized = false;

  AppSettings get settings => _settings;
  String get apiBaseUrl => _settings.apiBaseUrl;

  Future<void> init() async {
    if (_initialized) return;

    final prefs = await SharedPreferences.getInstance();
    final storedUrl = prefs.getString(_apiUrlKey);
    final authToken = await _secureStorage.read(key: _authTokenKey);

    _settings = AppSettings(
      apiBaseUrl: normalizeApiBaseUrl(storedUrl ?? AppConfig.defaultApiBaseUrl),
      hasAuthToken: authToken != null && authToken.isNotEmpty,
    );
    _initialized = true;
  }

  Future<String?> readAuthToken() async {
    return _secureStorage.read(key: _authTokenKey);
  }

  Future<void> clearAuthToken() async {
    await _secureStorage.delete(key: _authTokenKey);
    _settings = _settings.copyWith(hasAuthToken: false);
  }

  Future<void> save({
    required String apiBaseUrl,
    required String authToken,
  }) async {
    await init();

    final prefs = await SharedPreferences.getInstance();
    final normalizedUrl = normalizeApiBaseUrl(apiBaseUrl);
    final trimmedToken = authToken.trim();

    await prefs.setString(_apiUrlKey, normalizedUrl);
    await _secureStorage.write(key: _authTokenKey, value: trimmedToken);

    _settings = AppSettings(
      apiBaseUrl: normalizedUrl,
      hasAuthToken: trimmedToken.isNotEmpty,
    );
  }

  Future<void> resetToDefault() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_apiUrlKey);
    await _secureStorage.delete(key: _authTokenKey);

    _settings = AppSettings(apiBaseUrl: AppConfig.defaultApiBaseUrl);
  }
}
