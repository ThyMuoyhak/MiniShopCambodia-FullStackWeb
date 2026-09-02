/// Product model — mirrors `Product.to_dict()`.
class Product {
  final int id;
  final int shopId;
  final int? categoryId;
  final String name;
  final String description;
  final double price;
  final double? salePrice;
  final int quantity;
  final List<String> images;
  final List<Map<String, dynamic>> customAttributes;
  final List<Map<String, dynamic>> variations;
  final Map<String, dynamic> metadata;
  final bool featured;
  final String status;
  final String createdAt;
  final String? categoryName;

  const Product({
    required this.id,
    required this.shopId,
    this.categoryId,
    required this.name,
    required this.description,
    required this.price,
    this.salePrice,
    required this.quantity,
    required this.images,
    required this.customAttributes,
    required this.variations,
    required this.metadata,
    required this.featured,
    required this.status,
    required this.createdAt,
    this.categoryName,
  });

  /// The price actually charged (sale price wins over base price).
  double get effectivePrice => salePrice ?? price;

  bool get onSale => salePrice != null && salePrice! < price;

  bool get inStock => quantity > 0;

  factory Product.fromJson(Map<String, dynamic> json) {
    List<String> listOrEmpty(List<dynamic>? raw) =>
        (raw ?? []).map((e) => e.toString()).toList();

    List<Map<String, dynamic>> mapsOrEmpty(List<dynamic>? raw) =>
        (raw ?? [])
            .whereType<Map<String, dynamic>>()
            .toList();

    Map<String, dynamic> mapOrEmpty(Map<String, dynamic>? raw) =>
        raw ?? const {};

    return Product(
      id: (json['id'] as num?)?.toInt() ?? 0,
      shopId: (json['shop_id'] as num?)?.toInt() ?? 0,
      categoryId: (json['category_id'] as num?)?.toInt(),
      name: (json['name'] as String?) ?? '',
      description: (json['description'] as String?) ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      salePrice: (json['sale_price'] as num?)?.toDouble(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      images: listOrEmpty((json['images'] as List<dynamic>?)),
      customAttributes: mapsOrEmpty(
          (json['custom_attributes'] as List<dynamic>?)),
      variations: mapsOrEmpty((json['variations'] as List<dynamic>?)),
      metadata: mapOrEmpty((json['metadata'] as Map<String, dynamic>?)),
      featured: (json['featured'] as bool?) ?? false,
      status: (json['status'] as String?) ?? 'active',
      createdAt: (json['created_at'] as String?) ?? '',
      categoryName: json['category_name'] as String?,
    );
  }
}
