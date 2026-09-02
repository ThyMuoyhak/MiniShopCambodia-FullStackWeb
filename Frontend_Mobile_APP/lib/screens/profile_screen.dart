import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/customer_provider.dart';
import 'customer_auth_screen.dart';
import 'my_orders_screen.dart';

/// Customer profile tab inside the shop shell.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final customerProvider = context.watch<CustomerProvider>();
    final customer = customerProvider.customer;

    if (!customerProvider.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: const CustomerAuthScreen(
          embedded: true,
          prompt: 'Login or create an account',
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor:
                Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
            child: Icon(
              Icons.person,
              size: 44,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            customer?.name ?? '',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          if (customer?.username != null && customer!.username.isNotEmpty)
            Text(
              '@${customer.username}',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
          const SizedBox(height: 24),
          Card(
            child: Column(
              children: [
                _infoTile(Icons.phone, 'Phone', customer?.phone ?? ''),
                _infoTile(Icons.email, 'Email', customer?.email ?? ''),
                _infoTile(Icons.telegram, 'Telegram', customer?.telegram ?? ''),
                _infoTile(Icons.place, 'Address', customer?.address ?? ''),
              ],
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MyOrdersScreen()),
            ),
            icon: const Icon(Icons.receipt_long),
            label: const Text('My orders'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: customerProvider.logout,
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            label: Text('Logout',
                style: TextStyle(color: Colors.red.shade400)),
          ),
        ],
      ),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) {
    return ListTile(
      leading: Icon(icon, size: 20, color: Colors.grey.shade600),
      title: Text(label,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
      subtitle: Text(value.isEmpty ? '—' : value),
      dense: true,
    );
  }
}
