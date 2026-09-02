import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/customer_provider.dart';
import '../providers/shop_provider.dart';

/// Customer login/signup screen.
///
/// `embedded: true` renders only the forms (used inside Checkout);
/// otherwise it shows its own Scaffold.
class CustomerAuthScreen extends StatefulWidget {
  final bool embedded;
  final String prompt;

  const CustomerAuthScreen({
    super.key,
    this.embedded = false,
    this.prompt = '',
  });

  @override
  State<CustomerAuthScreen> createState() => _CustomerAuthScreenState();
}

class _CustomerAuthScreenState extends State<CustomerAuthScreen> {
  bool _signupMode = false;
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usernameController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _telegramController = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _usernameController.dispose();
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _telegramController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final provider = context.read<CustomerProvider>();
    final shopId = context.read<ShopProvider>().shop?.id ?? 0;
    if (shopId == 0) {
      setState(() {
        _busy = false;
        _error = 'Shop not loaded';
      });
      return;
    }

    bool ok;
    if (_signupMode) {
      ok = await provider.signup(
        shopId: shopId,
        username: _usernameController.text,
        fullName: _fullNameController.text,
        gender: '',
        email: _emailController.text,
        phone: _phoneController.text,
        telegramUsername: _telegramController.text,
        password: _passwordController.text,
      );
    } else {
      ok = await provider.signin(
        shopId: shopId,
        identifier: _identifierController.text,
        password: _passwordController.text,
      );
    }

    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = provider.error;
    });
    if (ok && !widget.embedded) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final form = widget.embedded
        ? _buildForm(context)
        : Scaffold(
            appBar: AppBar(title: const Text('Customer account')),
            body: _buildForm(context),
          );
    return form;
  }

  Widget _buildForm(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.prompt.isNotEmpty) ...[
            Text(
              widget.prompt,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
          ],
          // Mode toggle
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Login')),
              ButtonSegment(value: true, label: Text('Sign up')),
            ],
            selected: {_signupMode},
            onSelectionChanged: (selection) =>
                setState(() => _signupMode = selection.first),
          ),
          const SizedBox(height: 16),

          if (_signupMode) ...[
            TextField(
              controller: _fullNameController,
              decoration: _dec('Full name *'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: _dec('Phone *'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _usernameController,
              decoration: _dec('Username'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: _dec('Email (gmail)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _telegramController,
              decoration: _dec('Telegram @username'),
            ),
          ] else ...[
            TextField(
              controller: _identifierController,
              decoration: _dec('Username, email or phone'),
            ),
          ],
          const SizedBox(height: 10),
          TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: _dec('Password *'),
          ),
          const SizedBox(height: 8),

          if (_error != null) ...[
            Text(
              _error!,
              style: TextStyle(color: Colors.red.shade400, fontSize: 13),
            ),
            const SizedBox(height: 8),
          ],

          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : Text(_signupMode ? 'Create account' : 'Login'),
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
