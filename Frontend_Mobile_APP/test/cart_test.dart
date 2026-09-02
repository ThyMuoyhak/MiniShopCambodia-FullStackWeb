import 'package:flutter_test/flutter_test.dart';

import 'package:frontend_mobile_app/models/product.dart';
import 'package:frontend_mobile_app/providers/cart_provider.dart';

Product _product(int id, {double price = 10.0}) {
  return Product(
    id: id,
    shopId: 1,
    name: 'Product $id',
    description: '',
    price: price,
    quantity: 100,
    images: const [],
    customAttributes: const [],
    variations: const [],
    metadata: const {},
    featured: false,
    status: 'active',
    createdAt: '',
  );
}

void main() {
  test('add to cart, increment and totals', () {
    final cart = CartProvider();
    cart.add(_product(1, price: 10.0), quantity: 2);
    cart.add(_product(2, price: 5.0));

    expect(cart.count, 3);
    expect(cart.subtotal, 25.0);

    cart.increment(cart.items[0].key);
    expect(cart.count, 4);
    expect(cart.subtotal, 35.0);

    cart.decrement(cart.items[1].key);
    expect(cart.items.length, 1); // removed when quantity reaches 1
    expect(cart.items.first.product.id, 1);
  });

  test('merges same product+variation and removes', () {
    final cart = CartProvider();
    cart.add(_product(1), quantity: 1, variations: const {'size': 'M'});
    cart.add(_product(1), quantity: 2, variations: const {'size': 'M'});

    expect(cart.items.length, 1);
    expect(cart.items.first.quantity, 3);

    cart.remove(cart.items.first.key);
    expect(cart.isEmpty, true);
  });

  test('clear empties the cart', () {
    final cart = CartProvider();
    cart.add(_product(1));
    cart.add(_product(2));
    cart.clear();
    expect(cart.isEmpty, true);
    expect(cart.count, 0);
  });
}
