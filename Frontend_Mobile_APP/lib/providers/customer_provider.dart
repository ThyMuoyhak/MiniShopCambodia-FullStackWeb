import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/customer.dart';
import '../services/api_client.dart';
import '../services/customer_service.dart';

/// Customer authentication state for the current shop.
class CustomerProvider extends ChangeNotifier {
  static const _tokenKey = 'customer_access_token';
  static const _shopKey = 'customer_shop_id';

  final CustomerService _service = CustomerService();

  Customer? _customer;
  String? _token;
  int? _shopId;
  bool _loading = false;
  String? _error;

  Customer? get customer => _customer;
  String? get token => _token;
  int? get shopId => _shopId;
  bool get isLoading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _token != null && _token!.isNotEmpty;

  /// Restore the saved session at app start.
  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = prefs.getString(_tokenKey);
    final savedShop = prefs.getInt(_shopKey);
    if (savedToken != null && savedToken.isNotEmpty) {
      _token = savedToken;
      _shopId = savedShop;
      ApiClient.instance.setToken(savedToken);
      notifyListeners();
      try {
        _customer = await _service.me();
      } catch (_) {
        // Token expired or backend unreachable — keep session but ignore.
      }
      notifyListeners();
    }
  }

  Future<bool> signin({
    required int shopId,
    required String identifier,
    required String password,
  }) async {
    return _run(() => _service.signin(
        shopId: shopId, identifier: identifier, password: password));
  }

  Future<bool> signup({
    required int shopId,
    required String username,
    required String fullName,
    required String gender,
    required String email,
    required String phone,
    required String telegramUsername,
    required String password,
  }) async {
    return _run(() => _service.signup(
          shopId: shopId,
          username: username,
          fullName: fullName,
          gender: gender,
          email: email,
          phone: phone,
          telegramUsername: telegramUsername,
          password: password,
        ));
  }

  Future<bool> _run(
      Future<({String accessToken, Customer customer})> Function() fn) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await fn();
      _token = result.accessToken;
      _customer = result.customer;
      _shopId = result.customer.shopId;
      ApiClient.instance.setToken(result.accessToken);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, result.accessToken);
      await prefs.setInt(_shopKey, result.customer.shopId);
      _loading = false;
      notifyListeners();
      return true;
    } on Exception catch (e) {
      _error = e.toString();
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _customer = null;
    _shopId = null;
    ApiClient.instance.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_shopKey);
    notifyListeners();
  }
}
