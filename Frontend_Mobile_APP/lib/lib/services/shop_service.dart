import '../models/category.dart';
import '../models/plan.dart';
import '../models/shop.dart';
import 'api_client.dart';

/// Public shop / category / plan / self-serve registration endpoints.
class ShopService {
  final ApiClient _api = ApiClient.instance;

  /// GET /api/shops/{username} — public shop lookup.
  Future<Shop> getShop(String username) async {
    final data = await _api.get('/api/shops/${Uri.encodeComponent(username)}');
    return Shop.fromJson(data as Map<String, dynamic>);
  }

  /// GET /api/categories/public?shop_id=...
  Future<List<Category>> getCategories(int shopId) async {
    final data =
        await _api.get('/api/categories/public', query: {'shop_id': shopId});
    return (data as List)
        .whereType<Map<String, dynamic>>()
        .map(Category.fromJson)
        .toList();
  }

  /// GET /api/plans — available plans + free starter offer.
  Future<List<Plan>> getPlans() async {
    final data = await _api.get('/api/plans');
    return (data as List)
        .whereType<Map<String, dynamic>>()
        .map(Plan.fromJson)
        .toList();
  }

  /// POST /api/plans/register — create shop + owner, returns order + token.
  Future<Map<String, dynamic>> registerShop({
    required String username,
    required String shopName,
    required String email,
    required String phone,
    required String password,
    required String plan,
    String referralCode = '',
  }) async {
    final data = await _api.post('/api/plans/register', body: {
      'username': username.trim().toLowerCase(),
      'shop_name': shopName.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'plan': plan,
      'currency': 'USD',
      'referral_code': referralCode.trim(),
    });
    return data as Map<String, dynamic>;
  }

  /// POST /api/plans/confirm — activates the shop after (free) plan payment.
  Future<Map<String, dynamic>> confirmPlan({
    required int orderId,
    required int shopId,
    String transactionId = '',
  }) async {
    final data = await _api.post('/api/plans/confirm', body: {
      'order_id': orderId,
      'shop_id': shopId,
      'transaction_id': transactionId,
    });
    return data as Map<String, dynamic>;
  }
}
