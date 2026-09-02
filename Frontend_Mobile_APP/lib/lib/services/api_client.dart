import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';

/// A friendly API exception carrying the backend's error message.
class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

/// Thin wrapper around `http` with:
///  - JSON encoding/decoding
///  - bearer-token support
///  - FastAPI `detail` error normalization (matches the web app behaviour:
///    422 validation errors return arrays — we flatten them to one string)
class ApiClient {
  static final ApiClient instance = ApiClient._();

  ApiClient._();

  String? _token;

  void setToken(String? token) => _token = token;

  String? get token => _token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null && _token!.isNotEmpty)
          'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final base = AppConfig.apiBaseUrl.replaceAll(RegExp(r'/+$'), '');
    final p = path.startsWith('/') ? path : '/$path';
    var uri = Uri.parse('$base$p');
    if (query != null && query.isNotEmpty) {
      uri = uri.replace(queryParameters: query.map(
        (k, v) => MapEntry(k, v?.toString() ?? ''),
      ));
    }
    return uri;
  }

  /// Flatten FastAPI 422 errors: `detail: [{msg: ...}, ...]`.
  String _errorMessage(dynamic body, int status) {
    if (body == null) return 'Request failed ($status)';
    if (body is Map<String, dynamic>) {
      final detail = body['detail'];
      if (detail != null) {
        if (detail is String) return detail;
        if (detail is List) {
          return detail
              .whereType<Map<String, dynamic>>()
              .map((d) => (d['msg'] as String?) ?? jsonEncode(d))
              .join('; ');
        }
        if (detail is Map<String, dynamic>) {
          return (detail['msg'] as String?) ?? jsonEncode(detail);
        }
        return jsonEncode(detail);
      }
    }
    return 'Request failed ($status)';
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final res = await http.get(_uri(path, query), headers: _headers);
    return _decode(res);
  }

  Future<dynamic> post(String path,
      {Map<String, dynamic>? query, Object? body}) async {
    final res = await http.post(_uri(path, query),
        headers: _headers, body: body == null ? null : jsonEncode(body));
    return _decode(res);
  }

  Future<dynamic> put(String path,
      {Map<String, dynamic>? query, Object? body}) async {
    final res = await http.put(_uri(path, query),
        headers: _headers, body: body == null ? null : jsonEncode(body));
    return _decode(res);
  }

  Future<dynamic> _decode(http.Response res) async {
    final text = utf8.decode(res.bodyBytes);
    dynamic body;
    try {
      body = text.isEmpty ? null : jsonDecode(text);
    } catch (_) {
      body = text;
    }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return body;
    }
    throw ApiException(res.statusCode, _errorMessage(body, res.statusCode));
  }
}
