import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../config.dart';
import '../models/product.dart';

/// Product grid card — mirrors the web ProductCard.
class ProductCard extends StatelessWidget {
  final Product product;
  final String currency;
  final VoidCallback? onTap;

  const ProductCard({
    super.key,
    required this.product,
    this.currency = 'USD',
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final image = product.images.isNotEmpty ? product.images.first : '';
    final number = NumberFormat.currency(
      symbol: currency == 'KHR' ? '៛' : '\$',
      decimalDigits: currency == 'KHR' ? 0 : 2,
    );

    return GestureDetector(
      onTap: onTap,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 120,
              width: double.infinity,
              child: image.isNotEmpty
                  ? Image.network(
                      AppConfig.fullUrl(image),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          _placeholder(Colors.grey.shade200),
                    )
                  : _placeholder(Colors.grey.shade200),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  if (product.onSale) ...[
                    Text(
                      number.format(product.effectivePrice),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      number.format(product.price),
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        decoration: TextDecoration.lineThrough,
                        fontSize: 12,
                      ),
                    ),
                  ] else
                    Text(
                      number.format(product.effectivePrice),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    product.inStock
                        ? '${product.quantity} in stock'
                        : 'Sold out',
                    style: TextStyle(
                      fontSize: 11,
                      color: product.inStock
                          ? Colors.green.shade600
                          : Colors.red.shade400,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder(Color color) => Container(
        color: color,
        alignment: Alignment.center,
        child: Icon(Icons.shopping_bag_outlined,
            size: 32, color: Colors.grey.shade400),
      );
}
