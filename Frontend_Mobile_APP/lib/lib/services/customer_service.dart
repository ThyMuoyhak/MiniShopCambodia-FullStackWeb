import '../models/customer.dart';
import '../models/order.dart';
import 'api_client.dart';

/// Customer account endpoints (mirrors `Frontend_User/src/api.js`).
class CustomerService {
  final ApiClient _api = ApiClient.instance;

  /// POST /api/customers/auth/signup — returns {access_token, customer}.
  Future<({String accessToken, Customer customer})> signup({
    required int shopId,
    required String username,
    required String fullName,
    required String gender,
    required String email,
    required String phone,
    required String telegramUsername,
    required String password,
  }) async {
    final data = await _api.post('/api/customers/auth/signup', body: {
      'shop_id': shopId,
      'username': username.trim(),
      'full_name': fullName.trim(),
      'gender': gender,
      'email': email.trim(),
      'phone': phone.trim(),
      'telegram_username': telegramUsername.trim(),
      'password': password,
    });
    return _parseAuth(data as Map<String, dynamic>);
  }

  /// POST /api/customers/auth/signin — identifier = username | email | phone.
  Future<({String accessToken, Customer customer})> signin({
    required int shopId,
    required String identifier,
    required String password,
  }) async {
    final data = await _api.post('/api/customers/auth/signin', body: {
      'shop_id': shopId,
      'identifier': identifier.trim(),
      'password': password,
    });
    return _parseAuth(data as Map<String, dynamic>);
  }

  /// GET /api/customers/auth/me — current profile (needs token).
  Future<Customer> me() async {
    final data = await _api.get('/api/customers/auth/me');
    return Customer.fromJson(data as Map<String, dynamic>);
  }

  /// PUT /api/customers/auth/me — update own profile.
  Future<Customer> updateMe(Map<String, dynamic> body) async {
    final data = await _api.put('/api/customers/auth/me', body: body);
    return Customer.fromJson(data as Map<String, dynamic>);
  }

  /// GET /api/customers/auth/orders — my orders across this shop.
  Future<List<Order>> myOrders() async {
    final data = await _api.get('/api/customers/auth/orders');
    final raw = data as Map<String, dynamic>;
    final orders = raw['orders'] ?? (raw['count'] != null ? raw['orders'] : data);
    if (orders is List) {
      return orders
          .whereType<Map<String, dynamic>>()
          .map(Order.fromJson)
          .toList();
    }
    return [];
  }

  ({String accessToken, Customer customer}) _parseAuth(
      Map<String, dynamic> data) {
    return (
      accessToken: (data['access_token'] as String?) ?? '',
      customer:
          Customer.fromJson((data['customer'] as Map<String, dynamic>?) ?? {}),
    );
  }
}
