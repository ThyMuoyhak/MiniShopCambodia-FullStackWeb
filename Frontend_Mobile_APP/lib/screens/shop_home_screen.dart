import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/cart_provider.dart';
import '../providers/shop_provider.dart';
import '../widgets/product_card.dart';
import '../widgets/shop_header.dart';
import 'cart_screen.dart';
import 'product_detail_screen.dart';
import 'profile_screen.dart';
import 'products_screen.dart';

/// Storefront shell for one shop — bottom navigation with
/// Shop / Products / Cart / Profile (mirrors the web storefront).
class ShopHomeScreen extends StatefulWidget {
  const ShopHomeScreen({super.key});

  @override
  State<ShopHomeScreen> createState() => _ShopHomeScreenState();
}

class _ShopHomeScreenState extends State<ShopHomeScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ShopProvider>();
    final cart = context.watch<CartProvider>();
    final shop = provider.shop;

    if (shop == null) {
      return const Scaffold(body: Center(child: Text('No shop loaded')));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(shop.shopName.isNotEmpty ? shop.shopName : shop.username),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CartScreen()),
            ),
            icon: Badge(
              label: Text('${cart.count}'),
              isLabelVisible: cart.count > 0,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          _ShopOverviewTab(),
          ProductsScreen(),
          CartScreen(),
          ProfileScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (value) => setState(() => _index = value),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined), label: 'Shop'),
          BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined), label: 'Products'),
          BottomNavigationBarItem(
              icon: Icon(Icons.shopping_cart_outlined), label: 'Cart'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}

/// Shop landing: header, categories, featured products, all products.
class _ShopOverviewTab extends StatelessWidget {
  const _ShopOverviewTab();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ShopProvider>();
    final shop = provider.shop!;
    final featured = provider.featuredProducts;
    final products = provider.products;

    return RefreshIndicator(
      onRefresh: () => provider.loadProducts(),
      child: ListView(
        children: [
          ShopHeader(shop: shop),
          const SizedBox(height: 8),

          // Categories horizontal chips
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: provider.categories.length + 1,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _CategoryAction(
                    label: 'All',
                    onTap: () => _openProducts(context),
                  );
                }
                final category = provider.categories[index - 1];
                return _CategoryAction(
                  label: category.name,
                  onTap: () => _openProducts(context, categoryId: category.id),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          if (featured.isNotEmpty) ...[
            _sectionTitle(context, 'Featured ⭐'),
            SizedBox(
              height: 220,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: featured.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final product = featured[index];
                  return SizedBox(
                    width: 150,
                    child: ProductCard(
                      product: product,
                      currency: shop.currency,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ProductDetailScreen(product: product),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],

          _sectionTitle(context, 'All products'),
          _productsGrid(context, products, shop.currency),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _sectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w700)),
          TextButton(
            onPressed: () => _openProducts(context),
            child: const Text('See all →'),
          ),
        ],
      ),
    );
  }

  Widget _productsGrid(
      BuildContext context, List products, String currency) {
    if (products.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Text('No products yet',
              style: TextStyle(color: Colors.grey.shade600)),
        ),
      );
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.66,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return ProductCard(
          product: product,
          currency: currency,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ProductDetailScreen(product: product),
            ),
          ),
        );
      },
    );
  }

  void _openProducts(BuildContext context, {int? categoryId}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProductsScreen(initialCategoryId: categoryId),
      ),
    );
  }
}

class _CategoryAction extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _CategoryAction({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: primary.withValues(alpha: 0.3)),
        ),
        child: Text(label,
            style: TextStyle(
                color: primary, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

