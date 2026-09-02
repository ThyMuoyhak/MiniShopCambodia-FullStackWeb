import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/cart_provider.dart';
import 'providers/customer_provider.dart';
import 'providers/shop_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MiniShopApp());
}

class MiniShopApp extends StatelessWidget {
  const MiniShopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => ShopProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => CustomerProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          final shopProvider = context.read<ShopProvider>();
          final shop = shopProvider.shop;
          return MaterialApp(
            title: 'MiniShop Cambodia',
            debugShowCheckedModeBanner: false,
            theme: ShopTheme.build(
              primaryHex: shop?.primaryColor ?? '#FF6B00',
              secondaryHex: shop?.secondaryColor ?? '#8E2DE2',
              dark: false,
            ),
            darkTheme: ShopTheme.build(
              primaryHex: shop?.primaryColor ?? '#FF6B00',
              secondaryHex: shop?.secondaryColor ?? '#8E2DE2',
              dark: true,
            ),
            themeMode: themeProvider.mode,
            home: const SplashScreen(),
          );
        },
      ),
    );
  }
}
