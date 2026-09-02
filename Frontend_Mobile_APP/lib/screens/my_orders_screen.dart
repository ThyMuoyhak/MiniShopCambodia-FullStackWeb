import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/order.dart';
import '../providers/customer_provider.dart';
import '../providers/shop_provider.dart';
import '../services/customer_service.dart';
import '../services/order_service.dart';
import '../widgets/loading_view.dart';
import 'customer_auth_screen.dart';

/// Customer order history (GET /api/customers/auth/orders).
class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  final CustomerService _customerService = CustomerService();
  final OrderService _orderService = OrderService();
  List<Order> _orders = [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final customerProvider = context.read<CustomerProvider>();
    if (!customerProvider.isLoggedIn) {
      setState(() => _error = 'Please login to see your orders');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final orders = await _customerService.myOrders();
      if (mounted) setState(() => _orders = orders);
    } on Exception catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customerProvider = context.watch<CustomerProvider>();
    final shop = context.watch<ShopProvider>().shop;

    if (!customerProvider.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Orders')),
        body: CustomerAuthScreen(
          embedded: true,
          prompt: 'Login to see your orders at ${shop?.username ?? 'this shop'}',
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? Center(
                  child: Text(_error!,
                      style: TextStyle(color: Colors.red.shade400)),
                )
              : _orders.isEmpty
                  ? Center(
                      child: Text('No orders yet',
                          style: TextStyle(color: Colors.grey.shade600)),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 10),
                        itemBuilder: (context, index) =>
                            _OrderTile(order: _orders[index]),
                      ),
                    ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  final Order order;

  const _OrderTile({required this.order});

  @override
  Widget build(BuildContext context) {
    final number = NumberFormat.currency(
      symbol: order.currency == 'KHR' ? '៛' : '\$',
      decimalDigits: order.currency == 'KHR' ? 0 : 2,
    );

    return Card(
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: order.isPaid
              ? Colors.green.withValues(alpha: 0.15)
              : Colors.orange.withValues(alpha: 0.15),
          child: Icon(
            order.isPaid ? Icons.check : Icons.schedule,
            color: order.isPaid ? Colors.green.shade700 : Colors.orange.shade700,
          ),
        ),
        title: Text('#${order.orderNumber}',
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(
          '${order.orderStatus} • ${order.paymentStatus} • '
          '${number.format(order.total)} ${order.currency}',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: order.items
                  .map((item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          mainAxisAlignment:
                              MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${item.productName} × ${item.quantity}',
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(number.format(item.price * item.quantity)),
                          ],
                        ),
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}
