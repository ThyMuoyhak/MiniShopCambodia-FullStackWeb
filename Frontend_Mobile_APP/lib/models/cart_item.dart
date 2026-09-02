import 'product.dart';

/// A product added to the shopping cart with a chosen quantity
/// and (optionally) selected variations.
class CartItem {
  final Product product;
  final int quantity;
  final Map<String, dynamic> variations;

  const CartItem({
    required this.product,
    this.quantity = 1,
    this.variations = const {},
  });

  double get unitPrice => product.effectivePrice;

  double get lineTotal => unitPrice * quantity;

  /// Key that identifies a unique product+variation combo.
  String get key =>
      '${product.id}-${variations.values.join('/')}';

  CartItem copyWith({int? quantity, Map<String, dynamic>? variations}) {
    return CartItem(
      product: product,
      quantity: quantity ?? this.quantity,
      variations: variations ?? this.variations,
    );
  }
}
