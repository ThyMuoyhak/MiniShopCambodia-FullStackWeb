/// Category model — mirrors `Category.to_dict()`.
class Category {
  final int id;
  final int shopId;
  final String name;
  final String slug;
  final int? parentId;
  final String image;
  final int sortOrder;

  const Category({
    required this.id,
    required this.shopId,
    required this.name,
    required this.slug,
    this.parentId,
    required this.image,
    required this.sortOrder,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: (json['id'] as num?)?.toInt() ?? 0,
      shopId: (json['shop_id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      slug: (json['slug'] as String?) ?? '',
      parentId: (json['parent_id'] as num?)?.toInt(),
      image: (json['image'] as String?) ?? '',
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
    );
  }
}
