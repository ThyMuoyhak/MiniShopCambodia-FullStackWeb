import '../models/product.dart';
import 'api_client.dart';

/// Public product endpoints.
class ProductService {
  final ApiClient _api = ApiClient.instance;

  /// GET /api/products/public?shop_id=&category_id=&search=&sort=&featured_only=
  Future<List<Product>> getProducts(
    int shopId, {
    int? categoryId,
    String search = '',
    String sort = 'newest',
    bool featuredOnly = false,
  }) async {
    final query = <String, dynamic>{
      'shop_id': shopId,
      'sort': sort,
    };
    if (categoryId != null) query['category_id'] = categoryId;
    if (search.isNotEmpty) query['search'] = search;
    if (featuredOnly) query['featured_only'] = true;

    final data = await _api.get('/api/products/public', query: query);
    return (data as List)
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }

  /// GET /api/products/{id}/public — single product detail.
  Future<Product> getProduct(int productId) async {
    final data = await _api.get('/api/products/$productId/public');
    return Product.fromJson(data as Map<String, dynamic>);
  }
}
