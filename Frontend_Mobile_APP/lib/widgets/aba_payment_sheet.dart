import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';

/// ABA Pay (KHQR) QR payment bottom sheet — slides up from the bottom.
///
/// Shows the QR image for the customer to scan with the ABA mobile app,
/// plus the amount, transaction id and a fallback "Open ABA Pay" button.
/// Polls [verify] every 3 seconds and pops with `true` when the payment
/// is confirmed by the backend.
Future<bool> showAbaPaymentSheet(
  BuildContext context, {
  required String title,
  required String description,
  required double amount,
  required String currency,
  required String transactionId,
  String? qrCodeUrl,
  String? checkoutUrl,
  required Future<bool> Function() verify,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (_) => _AbaPaymentSheet(
      title: title,
      description: description,
      amount: amount,
      currency: currency,
      transactionId: transactionId,
      qrCodeUrl: qrCodeUrl,
      checkoutUrl: checkoutUrl,
      verify: verify,
    ),
  ).then((value) => value ?? false);
}

class _AbaPaymentSheet extends StatefulWidget {
  final String title;
  final String description;
  final double amount;
  final String currency;
  final String transactionId;
  final String? qrCodeUrl;
  final String? checkoutUrl;
  final Future<bool> Function() verify;

  const _AbaPaymentSheet({
    required this.title,
    required this.description,
    required this.amount,
    required this.currency,
    required this.transactionId,
    this.qrCodeUrl,
    this.checkoutUrl,
    required this.verify,
  });

  @override
  State<_AbaPaymentSheet> createState() => _AbaPaymentSheetState();
}

class _AbaPaymentSheetState extends State<_AbaPaymentSheet> {
  Timer? _timer;
  int _attempts = 0;
  bool _verified = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  void _startPolling() {
    const maxAttempts = 60; // ~3 minutes
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      _attempts++;
      if (_attempts >= maxAttempts) {
        timer.cancel();
        if (mounted) {
          setState(() => _error = 'Payment not confirmed yet. '
              'You can pay again or check My Orders.');
        }
        return;
      }
      try {
        final ok = await widget.verify();
        if (!mounted) return;
        if (ok) {
          timer.cancel();
          _verified = true;
          Navigator.of(context).pop(true);
        } else {
          setState(() {
            _error = null;
          });
        }
      } catch (e) {
        if (!mounted) return;
        setState(() => _error = '$e');
      }
    });
  }

  Future<void> _openAbaApp() async {
    final url = widget.checkoutUrl;
    if (url == null || url.isEmpty) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final number = NumberFormat.currency(
      symbol: widget.currency == 'KHR' ? '៛' : '\$',
      decimalDigits: widget.currency == 'KHR' ? 0 : 2,
    );

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(24),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                width: 44,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text(widget.title,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(
                widget.description,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),

              // Amount
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    number.format(widget.amount),
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    widget.currency,
                    style: TextStyle(
                        fontSize: 14, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Transaction: ${widget.transactionId}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
              const SizedBox(height: 16),
              // QR code to scan with the ABA mobile app
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    if (widget.qrCodeUrl != null &&
                        widget.qrCodeUrl!.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          AppConfig.fullUrl(widget.qrCodeUrl!),
                          width: 200,
                          height: 200,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => _noQrFallback(theme),
                        ),
                      )
                    else
                      _noQrFallback(theme),
                    const SizedBox(height: 10),
                    Text(
                      'Scan with the ABA Mobile app',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Status while waiting
              if (_verified)
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle, color: Colors.green),
                    SizedBox(width: 6),
                    Text('Payment confirmed!'),
                  ],
                )
              else if (_error != null)
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.red.shade400),
                )
              else
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Waiting for payment… (auto-checks every 3s)',
                      style: TextStyle(
                          fontSize: 13, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              const SizedBox(height: 16),

              // Actions
              FilledButton.icon(
                onPressed: _openAbaApp,
                icon: const Icon(Icons.open_in_new),
                label: Text(widget.checkoutUrl == null ||
                        widget.checkoutUrl!.isEmpty
                    ? 'No checkout link'
                    : 'Open ABA Pay'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('I will pay later'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _noQrFallback(ThemeData theme) {
    return Container(
      width: 200,
      height: 200,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.qr_code_2, size: 56, color: Colors.grey.shade400),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'QR unavailable — use the ABA Pay button below',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ),
        ],
      ),
    );
  }
}

