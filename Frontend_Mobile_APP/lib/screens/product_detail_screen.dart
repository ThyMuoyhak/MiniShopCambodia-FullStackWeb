import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../widgets/qty_stepper.dart';
import 'cart_screen.dart';

/// Product detail with image gallery, variations, quantity and add-to-cart.
class ProductDetailScreen extends StatefulWidget {
  final Product product;

  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _page = 0;
  int _quantity = 1;
  final Map<String, dynamic> _selectedVariations = {};

  Product get product => widget.product;

  @override
  Widget build(BuildContext context) {
    final number = NumberFormat.currency(
      symbol: '\$',
      decimalDigits: 2,
    );

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 320,
            actions: [
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: _imageGallery(context),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product.categoryName != null) ...[
                    Text(
                      product.categoryName!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                  ],
                  Text(
                    product.name,
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        number.format(product.effectivePrice),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if (product.onSale) ...[
                        const SizedBox(width: 10),
                        Text(
                          number.format(product.price),
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 16,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.red.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '-${_discountPercent()}%',
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),

                  // Description
                  if (product.description.isNotEmpty) ...[
                    const Text('Description',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text(product.description,
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          height: 1.5,
                        )),
                    const SizedBox(height: 16),
                  ],

                  // Variations
                  if (product.variations.isNotEmpty) ...[
                    const Text('Options',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: product.variations.map((variation) {
                        final label =
                            (variation['name'] ?? 'Option').toString();
                        final price = (variation['price'] as num?)?.toDouble();
                        final selected = _selectedVariations['option'] == label;
                        return ChoiceChip(
                          label: Text(price != null
                              ? '$label (+$price)'
                              : label),
                          selected: selected,
                          onSelected: (_) => setState(() {
                            _selectedVariations['option'] = label;
                            _selectedVariations['price'] = price;
                          }),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Quantity
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Quantity',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                      QtyStepper(
                        quantity: _quantity,
                        maxQuantity: product.quantity,
                        onChanged: (value) =>
                            setState(() => _quantity = value),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: FilledButton.tonal(
                  onPressed: product.inStock
                      ? () => _addToCart(andCheckout: false)
                      : null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                  ),
                  child: const Text('Add to cart'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: product.inStock
                      ? () => _addToCart(andCheckout: true)
                      : null,
                  child: const Text('Buy now'),
                ),
              ),
            ],
          ),
        ),
      ),
    );

  Widget _imageGallery(BuildContext context) {
    final images = product.images;
    if (images.isEmpty) {
      return Container(
        color: Colors.grey.shade200,
        alignment: Alignment.center,
        child: Icon(Icons.image_not_supported_outlined,
            size: 64, color: Colors.grey.shade400),
      );
    }
    return Stack(
      children: [
        PageView.builder(
          itemCount: images.length,
          onPageChanged: (value) => setState(() => _page = value),
          itemBuilder: (context, index) => Image.network(
            AppConfig.fullUrl(images[index]),
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: Colors.grey.shade200,
              child: Icon(Icons.broken_image_outlined,
                  color: Colors.grey.shade400),
            ),
          ),
        ),
        if (images.length > 1)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(images.length, (i) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i == _page
                        ? Colors.white
                        : Colors.white.withValues(alpha: 0.4),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }

  int _discountPercent() {
    if (!product.onSale) return 0;
    final base = product.price;
    if (base <= 0) return 0;
    return (((base - product.effectivePrice) / base) * 100).round();
  }

  void _addToCart({required bool andCheckout}) {
    final cart = context.read<CartProvider>();
    cart.add(
      product,
      quantity: _quantity,
      variations: _selectedVariations,
    );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} added to cart ✓'),
        duration: const Duration(seconds: 1),
      ),
    );
    if (andCheckout) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const CartScreen()),
      );
    }
  }
}

  }

                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    product.inStock
                        ? 'In stock • ${product.quantity} available'
                        : 'Sold out',
                    style: TextStyle(
                      color: product.inStock
                          ? Colors.green.shade600
                          : Colors.red.shade400,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 16),
