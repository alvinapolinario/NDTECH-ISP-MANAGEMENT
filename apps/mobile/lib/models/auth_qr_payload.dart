import 'dart:convert';

import 'app_settings.dart';

class AuthQrPayload {
  const AuthQrPayload({
    required this.apiBaseUrl,
    required this.authToken,
  });

  final String apiBaseUrl;
  final String authToken;

  Map<String, dynamic> toJson() => {
        'v': 1,
        'apiUrl': apiBaseUrl,
        'token': authToken,
      };

  String toQrString() => jsonEncode(toJson());

  static AuthQrPayload? tryParse(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;

    if (trimmed.startsWith('{')) {
      return _fromJson(trimmed);
    }

    if (trimmed.startsWith('ndtech-collector://')) {
      return _fromUri(trimmed);
    }

    return null;
  }

  static AuthQrPayload? _fromJson(String raw) {
    try {
      final parsed = jsonDecode(raw);
      if (parsed is! Map) return null;

      final apiUrl = _readString(parsed, ['apiUrl', 'apiBaseUrl', 'url']);
      final token = _readString(parsed, ['token', 'authToken', 'accessToken']);

      if (apiUrl == null || token == null) return null;
      if (!_looksLikeToken(token)) return null;

      return AuthQrPayload(
        apiBaseUrl: normalizeApiBaseUrl(apiUrl),
        authToken: token.trim(),
      );
    } catch (_) {
      return null;
    }
  }

  static AuthQrPayload? _fromUri(String raw) {
    try {
      final uri = Uri.parse(raw);
      final apiUrl = uri.queryParameters['apiUrl'] ?? uri.queryParameters['apiBaseUrl'];
      final token = uri.queryParameters['token'] ?? uri.queryParameters['authToken'];

      if (apiUrl == null || token == null) return null;
      if (!_looksLikeToken(token)) return null;

      return AuthQrPayload(
        apiBaseUrl: normalizeApiBaseUrl(apiUrl),
        authToken: token.trim(),
      );
    } catch (_) {
      return null;
    }
  }

  static String? _readString(Map<dynamic, dynamic> map, List<String> keys) {
    for (final key in keys) {
      final value = map[key];
      if (value is String && value.trim().isNotEmpty) {
        return value.trim();
      }
    }
    return null;
  }

  static bool _looksLikeToken(String token) {
    return token.startsWith('ndt_') || token.length >= 16;
  }
}
