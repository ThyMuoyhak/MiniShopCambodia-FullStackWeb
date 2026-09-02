import 'package:flutter/material.dart';

import '../config.dart';
import '../models/shop.dart';

/// Shop header with banner, logo and name — mirrors the web ShopHeader.
class ShopHeader extends StatelessWidget {
  final Shop shop;

  const ShopHeader({super.key, required this.shop});

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Column(
      children: [
        // Banner
        SizedBox(
          height: 150,
          width: double.infinity,
          child: shop.banner.isNotEmpty
              ? Image.network(
                  AppConfig.fullUrl(shop.banner),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) =>
                      Container(color: primary.withValues(alpha: 0.25)),
                )
              : Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        primary.withValues(alpha: 0.9),
                        Color.lerp(primary, Colors.deepPurple, 0.6)!,
                      ],
                    ),
                  ),
                ),
        ),
        // Logo + name
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: Colors.white,
                child: shop.logo.isNotEmpty
                    ? ClipOval(
                        child: Image.network(
                          AppConfig.fullUrl(shop.logo),
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(
                              Icons.storefront,
                              color: primary,
                              size: 30),
                        ),
                      )
                    : Icon(Icons.storefront, color: primary, size: 30),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      shop.shopName.isNotEmpty ? shop.shopName : shop.username,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (shop.bio.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        shop.bio,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(Icons.tag, size: 13, color: Colors.grey.shade500),
                        const SizedBox(width: 4),
                        Text(
                          '@${shop.username}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
