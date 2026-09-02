/// Order + OrderItem models — mirror `Order.to_dict()`.
class OrderItem {
  final int id;
  final int? orderId;
  final int? productId;
  final String productName;
  final double price;
  final int quantity;
  final Map<String, dynamic> variations;

  const OrderItem({
    required this.id,
    this.orderId,
    this.productId,
    required this.productName,
    required this.price,
    required this.quantity,
    required this.variations,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      orderId: (json['order_id'] as num?)?.toInt(),
      productId: (json['product_id'] as num?)?.toInt(),
      productName: (json['product_name'] as String?) ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      variations:
          (json['variations'] as Map<String, dynamic>?) ?? const {},
    );
  }
}

class Order {
  final int id;
  final int shopId;
  final int? customerId;
  final String orderNumber;
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final String customerCity;
  final double itemsTotal;
  final double shippingFee;
  final double discount;
  final double total;
  final String currency;
  final String paymentMethod;
  final String paymentStatus;
  final String orderStatus;
  final String? transactionId;
  final String receiptUrl;
  final String createdAt;
  final String? paidAt;
  final String? shopName;
  final String? shopUsername;
  final List<OrderItem> items;

  const Order({
    required this.id,
    required this.shopId,
    this.customerId,
    required this.orderNumber,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    required this.customerCity,
    required this.itemsTotal,
    required this.shippingFee,
    required this.discount,
    required this.total,
    required this.currency,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.orderStatus,
    this.transactionId,
    required this.receiptUrl,
    required this.createdAt,
    this.paidAt,
    this.shopName,
    this.shopUsername,
    required this.items,
  });

  bool get isPaid => paymentStatus == 'paid';

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: (json['id'] as num?)?.toInt() ?? 0,
      shopId: (json['shop_id'] as num?)?.toInt() ?? 0,
      customerId: (json['customer_id'] as num?)?.toInt(),
      orderNumber: (json['order_number'] as String?) ?? '',
      customerName: (json['customer_name'] as String?) ?? '',
      customerPhone: (json['customer_phone'] as String?) ?? '',
      customerAddress: (json['customer_address'] as String?) ?? '',
      customerCity: (json['customer_city'] as String?) ?? '',
      itemsTotal: (json['items_total'] as num?)?.toDouble() ?? 0,
      shippingFee: (json['shipping_fee'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      currency: (json['currency'] as String?) ?? 'USD',
      paymentMethod: (json['payment_method'] as String?) ?? '',
      paymentStatus: (json['payment_status'] as String?) ?? 'pending',
      orderStatus: (json['order_status'] as String?) ?? 'pending',
      transactionId: json['transaction_id'] as String?,
      receiptUrl: (json['receipt_url'] as String?) ?? '',
      createdAt: (json['created_at'] as String?) ?? '',
      paidAt: json['paid_at'] as String?,
      shopName: json['shop_name'] as String?,
      shopUsername: json['shop_username'] as String?,
      items: (json['items'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(OrderItem.fromJson)
          .toList(),
    );
  }
}
