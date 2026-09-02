import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../models/cart_item.dart';
import '../providers/cart_provider.dart';
import '../providers/shop_provider.dart';
import '../widgets/qty_stepper.dart';
import 'checkout_screen.dart';

/// Shopping cart with quantity controls and totals.
class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final shop = context.watch<ShopProvider>().shop;
    final currency = shop?.currency ?? 'USD';
    final number = NumberFormat.currency(
      symbol: currency == 'KHR' ? '៛' : '\$',
      decimalDigits: currency == 'KHR' ? 0 : 2,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: cart.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shopping_cart_outlined,
                      size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 12),
                  Text('Your cart is empty',
                      style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = cart.items[index];
                      return _CartRow(
                        item: item,
                        currency: currency,
                        onIncrement: () => cart.increment(item.key),
                        onDecrement: () => cart.decrement(item.key),
                        onRemove: () => cart.remove(item.key),
                      );
                    },
                  ),
                ),
                // Totals bar
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    border: Border(
                      top: BorderSide(color: Colors.grey.shade300),
                    ),
                  ),
                  child: SafeArea(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${cart.count} items',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600)),
                              Text(
                                number.format(cart.subtotal),
                                style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ),
                        FilledButton(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(
                                builder: (_) => const CheckoutScreen()),
                          ),
                          child: const Text('Checkout →'),
                        ),
                      ],
                    ),
                  ),
                ),

class _CartRow extends StatelessWidget {
  final CartItem item;
  final String currency;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onRemove;

  const _CartRow({
    required this.item,
    required this.currency,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final number = NumberFormat.currency(
      symbol: currency == 'KHR' ? '៛' : '\$',
      decimalDigits: currency == 'KHR' ? 0 : 2,
    );
    final image = item.product.images.isNotEmpty
        ? item.product.images.first
        : '';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            SizedBox(
              width: 64,
              height: 64,
              child: image.isNotEmpty
                  ? Image.network(
                      AppConfig.fullUrl(image),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                          color: Colors.grey.shade200,
                          child: const Icon(Icons.shopping_bag_outlined)),
                    )
                  : Container(
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.shopping_bag_outlined)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  if (item.variations.isNotEmpty)
                    Text(
                      item.variations.entries
                          .map((e) => '${e.key}: ${e.value}')
                          .join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade600),
                    ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        number.format(item.lineTotal),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      QtyStepper(
                        quantity: item.quantity,
                        onChanged: (value) => value > item.quantity
                            ? onIncrement()
                            : onDecrement(),
                      ),
                      IconButton(
                        onPressed: onRemove,
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(Icons.delete_outline,
                            size: 20, color: Colors.redAccent),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

              ],
            ),
    );
  }
}
