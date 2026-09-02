/// Shop model — mirrors `Shop.to_dict()` from the FastAPI backend.
class Shop {
  final int id;
  final String username;
  final String shopName;
  final String logo;
  final String banner;
  final String bio;
  final String description;
  final List<String> slideshow;
  final Map<String, dynamic> socialMedia;
  final Map<String, dynamic> theme;
  final String currency;
  final String status;
  final String plan;
  final double planPrice;
  final String contact;
  final String createdAt;
  final bool paymentConfigured;
  final bool telegramLoginEnabled;
  final String? telegramBotUsername;

  const Shop({
    required this.id,
    required this.username,
    required this.shopName,
    required this.logo,
    required this.banner,
    required this.bio,
    required this.description,
    required this.slideshow,
    required this.socialMedia,
    required this.theme,
    required this.currency,
    required this.status,
    required this.plan,
    required this.planPrice,
    required this.contact,
    required this.createdAt,
    this.paymentConfigured = false,
    this.telegramLoginEnabled = false,
    this.telegramBotUsername,
  });

  /// Primary color from the shop theme (used for headers/buttons).
  String get primaryColor =>
      (theme['primary'] as String?) ?? '#FF6B00';

  /// Secondary color from the shop theme.
  String get secondaryColor =>
      (theme['secondary'] as String?) ?? '#8E2DE2';

  factory Shop.fromJson(Map<String, dynamic> json) {
    List<String> listOrEmpty(List<dynamic>? raw) =>
        (raw ?? []).map((e) => e.toString()).toList();

    Map<String, dynamic> mapOrEmpty(Map<String, dynamic>? raw) =>
        raw ?? const {};

    return Shop(
      id: (json['id'] as num?)?.toInt() ?? 0,
      username: (json['username'] as String?) ?? '',
      shopName: (json['shop_name'] as String?) ?? '',
      logo: (json['logo'] as String?) ?? '',
      banner: (json['banner'] as String?) ?? '',
      bio: (json['bio'] as String?) ?? '',
      description: (json['description'] as String?) ?? '',
      slideshow: listOrEmpty((json['slideshow'] as List<dynamic>?)),
      socialMedia:
          mapOrEmpty((json['social_media'] as Map<String, dynamic>?)),
      theme: mapOrEmpty((json['theme'] as Map<String, dynamic>?)),
      currency: (json['currency'] as String?) ?? 'USD',
      status: (json['status'] as String?) ?? 'active',
      plan: (json['plan'] as String?) ?? '',
      planPrice: (json['plan_price'] as num?)?.toDouble() ?? 0,
      contact: (json['contact'] as String?) ?? '',
      createdAt: (json['created_at'] as String?) ?? '',
      paymentConfigured: (json['payment_configured'] as bool?) ?? false,
      telegramLoginEnabled: (json['telegram_login_enabled'] as bool?) ?? false,
      telegramBotUsername: json['telegram_bot_username'] as String?,
    );
  }
}
