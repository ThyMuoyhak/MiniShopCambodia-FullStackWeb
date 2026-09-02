import 'package:flutter/foundation.dart' hide Category;

import '../models/category.dart';
import '../models/product.dart';
import '../models/shop.dart';
import '../services/product_service.dart';
import '../services/shop_service.dart';

/// State for the currently-open shop (header, categories, products).
class ShopProvider extends ChangeNotifier {
  final ShopService _shopService = ShopService();
  final ProductService _productService = ProductService();

  Shop? _shop;
  List<Category> _categories = [];
  List<Product> _products = [];
  bool _loading = false;
  String? _error;

  Shop? get shop => _shop;
  List<Category> get categories => _categories;
  List<Product> get products => _products;
  bool get isLoading => _loading;
  String? get error => _error;

  List<Product> get featuredProducts =>
      _products.where((p) => p.featured).toList();

  /// Load the shop, then its categories + products.
  Future<bool> loadShop(String username) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      // 1. Fetch the shop first — categories/products need its id.
      _shop = await _shopService.getShop(username);
      // 2. Then fetch categories and products together.
      final results = await Future.wait([
        _shopService.getCategories(_shop!.id),
        _productService.getProducts(_shop!.id),
      ]);
      _categories = results[0] as List<Category>;
      _products = results[1] as List<Product>;
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

  Future<void> loadProducts({
    int? categoryId,
    String search = '',
    String sort = 'newest',
  }) async {
    final shop = _shop;
    if (shop == null) return;
    _products = await _productService.getProducts(
      shop.id,
      categoryId: categoryId,
      search: search,
      sort: sort,
    );
    notifyListeners();
  }

  void clear() {
    _shop = null;
    _categories = [];
    _products = [];
    notifyListeners();
  }
}
