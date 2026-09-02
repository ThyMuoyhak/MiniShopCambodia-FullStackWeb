/// Plan model — mirrors one entry of `GET /api/plans`.
class Plan {
  final String id;
  final String name;
  final double price;
  final int days;
  final int maxProducts;
  final int maxCategories;
  final bool free;
  final String? offerEnds;

  const Plan({
    required this.id,
    required this.name,
    required this.price,
    required this.days,
    required this.maxProducts,
    required this.maxCategories,
    this.free = false,
    this.offerEnds,
  });

  factory Plan.fromJson(Map<String, dynamic> json) {
    return Plan(
      id: (json['id'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      days: (json['days'] as num?)?.toInt() ?? 30,
      maxProducts: (json['max_products'] as num?)?.toInt() ?? 0,
      maxCategories: (json['max_categories'] as num?)?.toInt() ?? 0,
      free: (json['free'] as bool?) ?? false,
      offerEnds: json['offer_ends'] as String?,
    );
  }
}
