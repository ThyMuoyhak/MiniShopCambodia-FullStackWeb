import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/order.dart';
import '../screens/shop_home_screen.dart';

/// Order confirmation shown after placing an order / payment success.
class OrderSuccessScreen extends StatelessWidget {
  final Order order;
  final bool paymentPending;

  const OrderSuccessScreen({
    super.key,
    required this.order,
    this.paymentPending = false,
  });

  @override
  Widget build(BuildContext context) {
    final number = NumberFormat.currency(
      symbol: order.currency == 'KHR' ? '៛' : '\$',
      decimalDigits: order.currency == 'KHR' ? 0 : 2,
    );

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                paymentPending ? Icons.hourglass_top : Icons.check_circle,
                size: 80,
                color: paymentPending
                    ? Colors.orange.shade400
                    : Colors.green.shade600,
              ),
              const SizedBox(height: 16),
              Text(
                paymentPending ? 'Order placed!' : 'Payment confirmed!',
                style: const TextStyle(
                    fontSize: 22, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                'Order #${order.orderNumber}',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                'Total: ${number.format(order.total)} ${order.currency}',
                style: TextStyle(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 24),
              Text(
                paymentPending
                    ? 'The shop will contact you to arrange delivery. '
                        'You can check your order status anytime in My Orders.'
                    : 'Your payment was verified. The shop has been notified and '
                        'your order is being prepared.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: Colors.grey.shade600, height: 1.5),
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () => Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const ShopHomeScreen()),
                  (route) => route.isFirst,
                ),
                child: const Text('Back to shop'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
