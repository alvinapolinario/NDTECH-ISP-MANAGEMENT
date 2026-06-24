import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config/api_contract.dart';
import '../models/app_settings.dart';
import '../models/auth_user.dart';
import '../models/work_item.dart';
import 'app_settings_service.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ConnectionTestResult {
  const ConnectionTestResult({
    required this.success,
    required this.message,
    this.userName,
  });

  final bool success;
  final String message;
  final String? userName;
}

class ApiService {
  ApiService(this._storage, this._settings);

  final FlutterSecureStorage _storage;
  final AppSettingsService _settings;

  Future<String> get baseUrl async {
    await _settings.init();
    return _settings.apiBaseUrl;
  }

  Future<String?> getAuthToken() => _settings.readAuthToken();

  Future<Map<String, String>> _headers() async {
    final token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> _decodeResponse(http.Response response) async {
    final body = response.body.trim();
    if (response.statusCode == 401) {
      throw ApiException(
        'Invalid or expired auth token. Update it in Settings.',
        statusCode: 401,
      );
    }

    if (!response.statusCode.toString().startsWith('2')) {
      throw ApiException(
        parseApiErrorMessage(
          body.isEmpty ? null : body,
          fallback: 'Request failed (${response.statusCode})',
        ),
        statusCode: response.statusCode,
      );
    }

    if (body.isEmpty) return {};
    return Map<String, dynamic>.from(jsonDecode(body) as Map);
  }

  Future<ConnectionTestResult> testConnectionWithToken({
    required String apiBaseUrl,
    required String authToken,
  }) async {
    final url = normalizeApiBaseUrl(apiBaseUrl);
    final token = authToken.trim();

    if (token.isEmpty) {
      return const ConnectionTestResult(
        success: false,
        message: 'Auth token is required',
      );
    }

    try {
      final response = await http
          .get(
            Uri.parse('$url${ApiContract.authMe}'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (!response.statusCode.toString().startsWith('2')) {
        return ConnectionTestResult(
          success: false,
          message: parseApiErrorMessage(
            response.body.trim(),
            fallback: 'Connection failed (${response.statusCode})',
          ),
        );
      }

      final json = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
      final name = readJsonString(json['name']);

      return ConnectionTestResult(
        success: true,
        message: 'Connected to $url',
        userName: name.isEmpty ? null : name,
      );
    } catch (caught) {
      return ConnectionTestResult(
        success: false,
        message: caught.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<AuthUser> me() async {
    final root = await baseUrl;
    final response = await http.get(
      Uri.parse('$root${ApiContract.authMe}'),
      headers: await _headers(),
    );
    final json = await _decodeResponse(response);
    return AuthUser.fromJson(json);
  }

  Future<DownloadPackage> downloadPackage({
    String scope = ApiContract.scopeAllCollectible,
  }) async {
    final root = await baseUrl;
    final uri = Uri.parse('$root${ApiContract.syncDownload}').replace(
      queryParameters: {'scope': scope},
    );

    final response = await http.get(uri, headers: await _headers());
    final json = await _decodeResponse(response);
    return DownloadPackage.fromJson(json);
  }

  Future<List<UploadResultItem>> uploadBatch({
    required String deviceId,
    required String? downloadChecksum,
    required List<OutboxEvent> events,
  }) async {
    final root = await baseUrl;
    final response = await http.post(
      Uri.parse('$root${ApiContract.syncUpload}'),
      headers: await _headers(),
      body: jsonEncode({
        'packageVersion': ApiContract.syncPackageVersion,
        'deviceId': deviceId,
        'uploadedAt': DateTime.now().toUtc().toIso8601String(),
        if (downloadChecksum != null && downloadChecksum.isNotEmpty)
          'downloadChecksum': downloadChecksum,
        'events': events.map((event) => event.toUploadJson()).toList(),
      }),
    );

    final json = await _decodeResponse(response);
    final results = (json['results'] as List<dynamic>? ?? [])
        .map((item) => UploadResultItem.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
    return results;
  }

  Future<bool> ping() async {
    try {
      final root = await baseUrl;
      final response = await http
          .get(
            Uri.parse('$root${ApiContract.authMe}'),
            headers: await _headers(),
          )
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
