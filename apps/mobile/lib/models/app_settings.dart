import '../config/app_config.dart';

class AppSettings {
  const AppSettings({
    required this.apiBaseUrl,
    this.hasAuthToken = false,
  });

  final String apiBaseUrl;
  final bool hasAuthToken;

  AppSettings copyWith({
    String? apiBaseUrl,
    bool? hasAuthToken,
  }) {
    return AppSettings(
      apiBaseUrl: apiBaseUrl ?? this.apiBaseUrl,
      hasAuthToken: hasAuthToken ?? this.hasAuthToken,
    );
  }
}

String normalizeApiBaseUrl(String raw) {
  var url = raw.trim();
  if (url.isEmpty) {
    return AppConfig.defaultApiBaseUrl;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://$url';
  }
  while (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return url;
}
