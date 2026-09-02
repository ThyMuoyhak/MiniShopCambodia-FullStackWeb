import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/plan.dart';
import '../providers/shop_provider.dart';
import '../providers/theme_provider.dart';
import '../services/order_service.dart';
import '../services/shop_service.dart';
import '../widgets/loading_view.dart';
import 'create_shop_screen.dart';
import 'my_orders_screen.dart';
import 'shop_home_screen.dart';

/// Platform home: find a shop, create your own shop, see the plans.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();
  final ShopService _shopService = ShopService();
  final OrderService _orderService = OrderService();
  List<Plan> _plans = [];
  bool _loadingPlans = true;
  bool _openingShop = false;

  @override
  void initState() {
    super.initState();
    _loadPlans();
  }

  Future<void> _loadPlans() async {
    try {
      final plans = await _shopService.getPlans();
      if (mounted) setState(() => _plans = plans);
    } catch (_) {
      // Plans are decorative on the home screen — ignore errors here.
    } finally {
      if (mounted) setState(() => _loadingPlans = false);
    }
  }

  Future<void> _openShop(String username) async {
    final name = username.trim();
    if (name.isEmpty) return;
    setState(() => _openingShop = true);
    final provider = context.read<ShopProvider>();
    final ok = await provider.loadShop(name);
    if (!mounted) return;
    setState(() => _openingShop = false);
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'Shop not found or unavailable'),
          backgroundColor: Colors.red.shade400,
        ),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ShopHomeScreen()),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('MiniShop Cambodia'),
        actions: [
          IconButton(
            onPressed: themeProvider.toggle,
            icon: Icon(themeProvider.isDark
                ? Icons.light_mode_outlined
                : Icons.dark_mode_outlined),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MyOrdersScreen()),
            ),
            icon: const Icon(Icons.receipt_long_outlined),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [primary, Colors.deepPurple],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Shop anywhere in Cambodia 🇰🇭',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Browse local shops, pay with ABA Pay (KHQR),\nand order in seconds.',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Shop search
            const Text('Open a shop',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _openShop(_searchController.text),
                    decoration: InputDecoration(
                      hintText: 'e.g. demo',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: _openingShop
                      ? null
                      : () => _openShop(_searchController.text),
                  child: _openingShop
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Open'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Tip: try the demo shop — username "demo"',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),

            // Quick actions
            const Text('Quick actions',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Row(
              children: [
                _actionCard(
                  icon: Icons.add_business,
                  label: 'Create your shop',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CreateShopScreen()),
                  ),
                ),
                const SizedBox(width: 12),
                _actionCard(
                  icon: Icons.track_changes,
                  label: 'Track order',
                  onTap: () => _showTrackDialog(),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Plans
            const Text('Plans & pricing',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            if (_loadingPlans)
              const Padding(
                padding: EdgeInsets.all(20),
                child: LoadingView(),
              )
            else
              _buildPlans(),
          ],
        ),
      ),
    );
  }

  Widget _buildPlans() {
    final number = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    return Column(
      children: _plans.map((plan) {
        final isFree = plan.free;
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor:
                  Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
              child: Icon(
                plan.id == 'starter'
                    ? Icons.spa
                    : plan.id == 'growth'
                        ? Icons.trending_up
                        : Icons.diamond,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            title: Text(plan.name,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(
              isFree
                  ? 'FREE for ${plan.days} days • up to ${plan.maxProducts} products'
                  : '${number.format(plan.price)} / ${plan.days} days • up to ${plan.maxProducts} products',
            ),
            trailing: isFree
                ? const Chip(label: Text('FREE'), backgroundColor: Colors.green)
                : null,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CreateShopScreen()),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _actionCard({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    final primary = Theme.of(context).colorScheme.primary;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: primary.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              Icon(icon, size: 30, color: primary),
              const SizedBox(height: 8),
              Text(label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }

  void _showTrackDialog() {
    final controller = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Track your order'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Order number e.g. MS-000123',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                final order =
                    await _orderService.trackOrder(controller.text.trim());
                if (!mounted) return;
                showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Order status'),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Order: ${order.orderNumber}'),
                        const SizedBox(height: 8),
                        Text('Status: ${order.orderStatus}'),
                        Text('Payment: ${order.paymentStatus}'),
                        const SizedBox(height: 8),
                        Text('Total: ${order.total} ${order.currency}'),
                      ],
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('OK'),
                      ),
                    ],
                  ),
                );
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('$e'),
                    backgroundColor: Colors.red.shade400,
                  ),
                );
              }
            },
            child: const Text('Track'),
          ),
        ],
      ),
    );
  }
}

