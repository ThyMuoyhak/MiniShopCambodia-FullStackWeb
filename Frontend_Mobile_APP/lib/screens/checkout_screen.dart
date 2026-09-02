import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../models/order.dart';
import '../providers/cart_provider.dart';
import '../providers/customer_provider.dart';
import '../providers/shop_provider.dart';
import '../services/order_service.dart';
import 'customer_auth_screen.dart';
import 'order_success_screen.dart';

/// Checkout: requires a logged-in customer (like the web storefront),
/// collects shipping info, creates the order and starts ABA Pay (KHQR).
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final OrderService _orderService = OrderService();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _telegramController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _countryController = TextEditingController();
  final _noteController = TextEditingController();

  bool _submitting = false;
  bool _checking = false;
  String? _statusMessage;
  bool _pollingDone = false;

  @override
  void initState() {
    super.initState();
    final customer = context.read<CustomerProvider>().customer;
    if (customer != null) {
      _nameController.text = customer.name;
      _emailController.text = customer.email;
      _phoneController.text = customer.phone;
      _telegramController.text = customer.telegram;
      _cityController.text = customer.city;
      _addressController.text = customer.address;
      _countryController.text = customer.country;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _telegramController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    if (_submitting) return;
    final cart = context.read<CartProvider>();
    final shop = context.read<ShopProvider>().shop;
    if (shop == null || cart.isEmpty) return;

    if (_nameController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty ||
        _addressController.text.trim().isEmpty ||
        _cityController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please fill name, phone, address and city')),
      );
      return;
    }

    setState(() {
      _submitting = true;
      _statusMessage = 'Placing order…';
    });

    try {
      // 1. Create the order (requires the customer JWT).
      final order = await _orderService.createOrder(
        shopId: shop.id,
        items: cart.items,
        customerName: _nameController.text.trim(),
        customerEmail: _emailController.text.trim(),
        customerPhone: _phoneController.text.trim(),
        customerTelegram: _telegramController.text.trim(),
        customerAddress: _addressController.text.trim(),
        customerCity: _cityController.text.trim(),
        customerCountry: _countryController.text.trim(),
        customerNote: _noteController.text.trim(),
        currency: shop.currency,
      );

      if (!shop.paymentConfigured) {
        _finishWithoutPayment(order);
        return;
      }

      // 2. Create the ABA Pay (KHQR) checkout.
      setState(() => _statusMessage = 'Preparing ABA Pay…');
      final payment = await _orderService.createPayment(
        orderId: order.id,
        successUrl:
            '${AppConfig.apiBaseUrl}/api/payments/aba/success?order_id=${order.id}',
        errorUrl:
            '${AppConfig.apiBaseUrl}/api/payments/aba/error?order_id=${order.id}',
      );

      if (!mounted) return;
      setState(() => _statusMessage = 'Open ABA Pay to complete payment…');
      _startPolling(order, payment['transaction_id']?.toString() ?? '');

      // 3. Open the checkout page in the device browser.
      final checkoutUrl = payment['checkout_url'] as String?;
      if (checkoutUrl != null && checkoutUrl.isNotEmpty) {
        final uri = Uri.parse(checkoutUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }
    } on Exception catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e'), backgroundColor: Colors.red.shade400),
      );
    }
  }


  /// Poll /api/payments/aba/verify every 3 seconds (like the web storefront).
  void _startPolling(Order order, String transactionId) {
    if (_pollingDone) return;
    _pollingDone = true;
    var attempts = 0;
    const maxAttempts = 60; // ~3 minutes

    Timer.periodic(const Duration(seconds: 3), (timer) async {
      attempts++;
      if (attempts >= maxAttempts) {
        timer.cancel();
        if (mounted) {
          setState(() {
            _checking = false;
            _submitting = false;
            _statusMessage =
                'Payment not confirmed yet. You can check My Orders.';
          });
        }
        return;
      }
      try {
        final result = await _orderService.verifyPayment(
          orderId: order.id,
          transactionId: transactionId,
        );
        if (!mounted) {
          timer.cancel();
          return;
        }
        if (result['verified'] == true) {
          timer.cancel();
          _goToSuccess(order);
        } else {
          setState(() {
            _checking = true;
            _statusMessage = 'Waiting for payment…';
          });
        }
      } catch (_) {
        // Keep polling on transient errors.
      }
    });
  }

  void _finishWithoutPayment(Order order) {
    context.read<CartProvider>().clear();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => OrderSuccessScreen(
          order: order,
          paymentPending: true,
        ),
      ),
    );
  }

  void _goToSuccess(Order order) {
    context.read<CartProvider>().clear();

          // Shipping form
          Text('Contact & shipping',
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          TextField(controller: _nameController, decoration: _dec('Full name *')),
          const SizedBox(height: 10),
          TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: _dec('Phone *')),
          const SizedBox(height: 10),
          TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: _dec('Email')),
          const SizedBox(height: 10),
          TextField(
              controller: _telegramController,
              decoration: _dec('Telegram @username')),
          const SizedBox(height: 10),
          TextField(
              controller: _addressController, decoration: _dec('Address *')),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                    controller: _cityController, decoration: _dec('City *')),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                    controller: _countryController,
                    decoration: _dec('Country')),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _noteController,
            maxLines: 2,
            decoration: _dec('Note (optional)'),
          ),
          const SizedBox(height: 20),

          // Summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${cart.count} items'),
                      Text(number.format(cart.subtotal)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [Text('Shipping'), Text('Free')],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total',
                          style: TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 16)),
                      Text(
                        number.format(cart.subtotal),
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          FilledButton(
            onPressed: _submitting ? null : _placeOrder,
            child: _submitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : Text(
                    'Pay ${number.format(cart.subtotal)} ${shop?.currency ?? 'USD'}'),
          ),
          const SizedBox(height: 8),
          Text(
            '🔒 Secured by ABA Pay (KHQR)',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  InputDecoration _dec(String label) {
    return InputDecoration(
      labelText: label,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      isDense: true,
    );
  }
}

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final shop = context.watch<ShopProvider>().shop;
    final customerProvider = context.watch<CustomerProvider>();
    final number = NumberFormat.currency(
      symbol: shop?.currency == 'KHR' ? '៛' : '\$',
      decimalDigits: 2,
    );

    // Customers must be logged in — same rule as the web storefront.
    if (!customerProvider.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: const CustomerAuthScreen(
          embedded: true,
          prompt: 'Please login or create an account to checkout',
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_statusMessage != null) ...[
            Card(
              color:
                  Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
              child: ListTile(
                leading: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(Icons.info_outline,
                        color: Theme.of(context).colorScheme.primary),
                title: Text(_statusMessage!),
              ),
            ),
            const SizedBox(height: 16),
          ],

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => OrderSuccessScreen(
          order: order,
          paymentPending: false,
        ),
      ),
    );
  }
