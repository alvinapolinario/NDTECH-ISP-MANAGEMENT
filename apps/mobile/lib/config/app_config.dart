class AppConfig {
  /// Fallback when no custom URL is saved in Settings.
  /// Android emulator → `http://10.0.2.2:4000`
  /// Physical device on LAN → e.g. `http://192.168.1.10:4000`
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  static const String appName = 'NDTECH Collector';
}
