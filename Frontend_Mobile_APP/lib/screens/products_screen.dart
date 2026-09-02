import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/shop_provider.dart';
import '../widgets/category_chip.dart';
import '../widgets/loading_view.dart';
import '../widgets/product_card.dart';
import 'product_detail_screen.dart';

/// Products listing with category filter, search and sort.
class ProductsScreen extends StatefulWidget {
  final int? initialCategoryId;

  const ProductsScreen({super.key, this.initialCategoryId});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _searchController = TextEditingController();
  int? _categoryId;
  String _sort = 'newest';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _categoryId = widget.initialCategoryId;
    _reload();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    await context.read<ShopProvider>().loadProducts(
          categoryId: _categoryId,
          search: _searchController.text.trim(),
          sort: _sort,
        );
    if (mounted) setState(() => _loading = false);
  }

  void _onSort(String value) {
    setState(() => _sort = value);
    _reload();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ShopProvider>();
    final shop = provider.shop;
    final products = provider.products;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          PopupMenuButton<String>(
            initialValue: _sort,
            onSelected: _onSort,
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'newest', child: Text('Newest')),
              PopupMenuItem(
                  value: 'price_asc', child: Text('Price: low to high')),
              PopupMenuItem(
                  value: 'price_desc', child: Text('Price: high to low')),
            ],
            icon: const Icon(Icons.sort),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _reload(),
              decoration: InputDecoration(
                hintText: 'Search products…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  onPressed: () {
                    _searchController.clear();
                    _reload();
                  },
                  icon: const Icon(Icons.close),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                isDense: true,
              ),
            ),
          ),
          // Category chips
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: provider.categories.length + 1,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return CategoryChip(
                    label: 'All',
                    selected: _categoryId == null,
                    onTap: () {
                      setState(() => _categoryId = null);
                      _reload();
                    },
                  );
                }
                final category = provider.categories[index - 1];
                return CategoryChip(
                  label: category.name,
                  selected: _categoryId == category.id,
                  onTap: () {
                    setState(() => _categoryId = category.id);
                    _reload();
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 4),
          // Grid
          Expanded(
            child: _loading
                ? const LoadingView()
                : products.isEmpty
                    ? Center(
                        child: Text('No products found',
                            style: TextStyle(color: Colors.grey.shade600)),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
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
                            currency: shop?.currency ?? 'USD',
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    ProductDetailScreen(product: product),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
