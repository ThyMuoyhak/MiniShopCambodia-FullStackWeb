/// App configuration.
///
/// The default points at the deployed MiniShop backend (Render). Override it
/// at build/run time for local development:
///   flutter run --dart-define=API_URL=http://localhost:8000
///   (Android emulator → http://10.0.2.2:8000)
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://minishop-backend-api.onrender.com',
  );

  /// The storefront web URL (used for referral / "open in browser" links).
  static const String storeUrl = String.fromEnvironment(
    'STORE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Convert a backend-relative path (e.g. "/uploads/products/x.png")
  /// into an absolute URL the app can load.
  static String fullUrl(String path) {
    if (path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) return '$apiBaseUrl$path';
    return '$apiBaseUrl/$path';
  }
}
