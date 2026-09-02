/// Customer model — mirrors `Customer.to_dict()`.
class Customer {
  final int id;
  final int shopId;
  final String firstName;
  final String lastName;
  final String gender;
  final String name;
  final String username;
  final String phone;
  final String email;
  final String telegram;
  final String address;
  final String city;
  final String country;
  final String createdAt;

  const Customer({
    required this.id,
    required this.shopId,
    required this.firstName,
    required this.lastName,
    required this.gender,
    required this.name,
    required this.username,
    required this.phone,
    required this.email,
    required this.telegram,
    required this.address,
    required this.city,
    required this.country,
    required this.createdAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: (json['id'] as num?)?.toInt() ?? 0,
      shopId: (json['shop_id'] as num?)?.toInt() ?? 0,
      firstName: (json['first_name'] as String?) ?? '',
      lastName: (json['last_name'] as String?) ?? '',
      gender: (json['gender'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      username: (json['username'] as String?) ?? '',
      phone: (json['phone'] as String?) ?? '',
      email: (json['email'] as String?) ?? '',
      telegram: (json['telegram'] as String?) ?? '',
      address: (json['address'] as String?) ?? '',
      city: (json['city'] as String?) ?? '',
      country: (json['country'] as String?) ?? '',
      createdAt: (json['created_at'] as String?) ?? '',
    );
  }
}
