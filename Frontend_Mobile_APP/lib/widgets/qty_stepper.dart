import 'package:flutter/material.dart';

/// Quantity stepper used on product detail + cart.
class QtyStepper extends StatelessWidget {
  final int quantity;
  final int maxQuantity;
  final ValueChanged<int> onChanged;

  const QtyStepper({
    super.key,
    required this.quantity,
    required this.onChanged,
    this.maxQuantity = 999,
  });

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _btn(Icons.remove, () {
          if (quantity > 1) onChanged(quantity - 1);
        }, primary),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            '$quantity',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        _btn(Icons.add, () {
          if (quantity < maxQuantity) onChanged(quantity + 1);
        }, primary),
      ],
    );
  }

  Widget _btn(IconData icon, VoidCallback onTap, Color primary) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 20, color: primary),
      ),
    );
  }
}
