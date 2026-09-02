import 'package:flutter/foundation.dart';

import '../models/cart_item.dart';
import '../models/product.dart';

/// Shopping cart state for the current shop.
class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  bool get isEmpty => _items.isEmpty;

  int get count =>
      _items.fold(0, (sum, item) => sum + item.quantity);

  double get subtotal =>
      _items.fold(0.0, (sum, item) => sum + item.lineTotal);

  void add(
    Product product, {
    int quantity = 1,
    Map<String, dynamic> variations = const {},
  }) {
    final newItem = CartItem(
      product: product,
      quantity: quantity,
      variations: variations,
    );
    final index = _items.indexWhere((item) => item.key == newItem.key);
    if (index >= 0) {
      _items[index] =
          _items[index].copyWith(quantity: _items[index].quantity + quantity);
    } else {
      _items.add(newItem);
    }
    notifyListeners();
  }

  void increment(String key) {
    final index = _items.indexWhere((item) => item.key == key);
    if (index >= 0) {
      _items[index] =
          _items[index].copyWith(quantity: _items[index].quantity + 1);
      notifyListeners();
    }
  }

  void decrement(String key) {
    final index = _items.indexWhere((item) => item.key == key);
    if (index >= 0) {
      final current = _items[index].quantity;
      if (current <= 1) {
        _items.removeAt(index);
      } else {
        _items[index] =
            _items[index].copyWith(quantity: current - 1);
      }
      notifyListeners();
    }
  }

  void remove(String key) {
    _items.removeWhere((item) => item.key == key);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}
