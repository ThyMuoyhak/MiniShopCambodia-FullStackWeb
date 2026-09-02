import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/plan.dart';
import '../providers/shop_provider.dart';
import '../services/shop_service.dart';
import '../widgets/loading_view.dart';
import 'shop_home_screen.dart';

/// Self-serve shop registration — mirrors `/create-shop` on the web storefront.
class CreateShopScreen extends StatefulWidget {
  const CreateShopScreen({super.key});

  @override
  State<CreateShopScreen> createState() => _CreateShopScreenState();
}

class _CreateShopScreenState extends State<CreateShopScreen> {
  final ShopService _shopService = ShopService();
  final _usernameController = TextEditingController();
  final _shopNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _referralController = TextEditingController();

  List<Plan> _plans = [];
  String _selectedPlan = 'starter';
  bool _loadingPlans = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPlans();
  }

  Future<void> _loadPlans() async {
    try {
      final plans = await _shopService.getPlans();
      if (mounted) {
        setState(() {
          _plans = plans;
          _selectedPlan = plans.isNotEmpty ? plans.first.id : 'starter';
        });
      }
    } catch (_) {
      if (mounted) setState(() => _selectedPlan = 'starter');
    } finally {
      if (mounted) setState(() => _loadingPlans = false);
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _shopNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    if (_usernameController.text.trim().isEmpty ||
        _shopNameController.text.trim().isEmpty ||
        _passwordController.text.length < 4) {
      setState(() =>
          _error = 'Username, shop name and a password (4+ chars) are required');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      // 1. Register shop + owner + plan order.
      final result = await _shopService.registerShop(
        username: _usernameController.text,
        shopName: _shopNameController.text,
        email: _emailController.text,
        phone: _phoneController.text,
        password: _passwordController.text,
        plan: _selectedPlan,
        referralCode: _referralController.text,
      );

      final orderId = (result['order_id'] as num?)?.toInt();
      final shopId = (result['shop_id'] as num?)?.toInt();

      // 2. Free plans activate immediately via /api/plans/confirm.
      if (result['free'] == true && orderId != null && shopId != null) {
        await _shopService.confirmPlan(orderId: orderId, shopId: shopId);
      }

      // 3. Open the brand-new shop in the app.
      final username = (result['username'] as String?) ??
          _usernameController.text.trim();
      final provider = context.read<ShopProvider>();
      await provider.loadShop(username);

      if (!mounted) return;
      setState(() => _submitting = false);
      if (provider.shop != null) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const ShopHomeScreen()),
          (route) => route.isFirst,
        );
      } else {
        setState(() =>
            _error = 'Shop created! Open it with username "$username"');
      }
    } on Exception catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = '$e';
      });
    }
  }



          // Plan picker
          const Text('Choose a plan',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          if (_loadingPlans)
            const Padding(
              padding: EdgeInsets.all(12),
              child: LoadingView(),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _plans.map((plan) {
                final selected = plan.id == _selectedPlan;
                final isFree = plan.free;
                return ChoiceChip(
                  label: Text(isFree
                      ? '${plan.name} — FREE'
                      : '${plan.name} — \$${plan.price.toStringAsFixed(2)}'),
                  selected: selected,
                  onSelected: (_) =>
                      setState(() => _selectedPlan = plan.id),
                );
              }).toList(),
            ),
          const SizedBox(height: 20),

          if (_error != null) ...[
            Text(
              _error!,
              style: TextStyle(color: Colors.red.shade400),
            ),
            const SizedBox(height: 10),
          ],

          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : const Text('Create my shop'),
          ),
          const SizedBox(height: 8),
          Text(
            'Free plan activates instantly • Paid plans pay with ABA Pay (KHQR)',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  InputDecoration _dec(String label, {String? prefix}) {
    return InputDecoration(
      labelText: label,
      prefixText: prefix,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      isDense: true,
    );
  }
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create your shop')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Start selling online in minutes 🚀',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Create your own storefront. The Starter plan is FREE for 30 days.',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20),

          TextField(
            controller: _usernameController,
            decoration: _dec('Shop username * (storefront link)',
                prefix: '@'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _shopNameController,
            decoration: _dec('Shop name *'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: _dec('Email'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: _dec('Phone'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: _dec('Password * (min 4 characters)'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _referralController,
            decoration: _dec('Referral code (optional)'),
          ),
          const SizedBox(height: 20),
