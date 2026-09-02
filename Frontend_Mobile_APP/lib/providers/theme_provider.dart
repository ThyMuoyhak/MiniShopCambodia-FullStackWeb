import 'package:flutter/material.dart';

/// App-wide light/dark mode toggle (storefront supports both themes).
class ThemeProvider extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.light;

  ThemeMode get mode => _mode;

  bool get isDark => _mode == ThemeMode.dark;

  void toggle() {
    _mode = _mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
  }

  void setMode(ThemeMode mode) {
    _mode = mode;
    notifyListeners();
  }
}

/// Theme + app colors derived from the shop's theme JSON (primary/secondary),
/// falling back to the MiniShop brand orange → purple gradient.
class ShopTheme {
  static Color parseHex(String hex, {Color fallback = const Color(0xFFFF6B00)}) {
    if (hex == null || hex.isEmpty) return fallback;
    final cleaned = hex.replaceFirst('#', '');
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return fallback;
    return cleaned.length == 6
        ? Color(0xFF000000 | value)
        : Color(value);
  }

  static ThemeData build({
    required String primaryHex,
    required String secondaryHex,
    required bool dark,
  }) {
    final primary = parseHex(primaryHex);
    final secondary = parseHex(secondaryHex,
        fallback: const Color(0xFF8E2DE2));
    final brightness = dark ? Brightness.dark : Brightness.light;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: brightness,
      ),
      scaffoldBackgroundColor:
          dark ? const Color(0xFF0F1115) : const Color(0xFFF8F9FB),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        backgroundColor:
            dark ? const Color(0xFF0F1115) : Colors.white,
        foregroundColor: dark ? Colors.white : const Color(0xFF1F2430),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(50),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: primary.withValues(alpha: 0.1),
        selectedColor: primary,
        labelStyle: TextStyle(
          color: dark ? Colors.white : const Color(0xFF1F2430),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor:
            dark ? const Color(0xFF15171C) : Colors.white,
        selectedItemColor: primary,
        unselectedItemColor: Colors.grey,
      ),
    );
  }
}
