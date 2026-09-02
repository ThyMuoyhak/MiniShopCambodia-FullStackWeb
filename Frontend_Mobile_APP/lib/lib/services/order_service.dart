import '../models/cart_item.dart';
import '../models/order.dart';
import 'api_client.dart';

/// Order + ABA Pay (KHQR) endpoints for the customer checkout flow.
class OrderService {
  final ApiClient _api = ApiClient.instance;

  /// POST /api/orders — create an order (requires a customer bearer token).
  ///
  /// The backend REQUIRES a valid customer JWT for this shop, exactly like the
  /// web storefront (checkout is blocked until the customer signs in/signs up).
  Future<Order> createOrder({
    required int shopId,
    required List<CartItem> items,
    required String customerName,
    required String customerEmail,
    required String customerPhone,
    required String customerTelegram,
    required String customerAddress,
    required String customerCity,
    required String customerCountry,
    required String customerNote,
    String currency = 'USD',
  }) async {
    final data = await _api.post('/api/orders', body: {
      'shop_id': shopId,
      'customer_name': customerName,
      'customer_email': customerEmail,
      'customer_phone': customerPhone,
      'customer_telegram': customerTelegram,
      'customer_address': customerAddress,
      'customer_city': customerCity,
      'customer_country': customerCountry,
      'customer_note': customerNote,
      'currency': currency,
      'shipping_fee': 0,
      'discount': 0,
      'items': items.map((item) {
        return {
          'product_id': item.product.id,
          'name': item.product.name,
          'price': item.unitPrice,
          'quantity': item.quantity,
          'variations': item.variations,
        };
      }).toList(),
    });
    return Order.fromJson(data as Map<String, dynamic>);
  }

  /// POST /api/payments/aba/create — returns checkout_url, transaction_id, qr_code_url.
  Future<Map<String, dynamic>> createPayment({
    required int orderId,
    required String successUrl,
    required String errorUrl,
  }) async {
    final data = await _api.post('/api/payments/aba/create', body: {
      'order_id': orderId,
      'success_url': successUrl,
      'error_url': errorUrl,
      'cancel_url': errorUrl,
    });
    return data as Map<String, dynamic>;
  }

  /// POST /api/payments/aba/verify — poll until verified == true.
  Future<Map<String, dynamic>> verifyPayment({
    required int orderId,
    required String transactionId,
  }) async {
    final data = await _api.post('/api/payments/aba/verify', body: {
      'order_id': orderId,
      'transaction_id': transactionId,
    });
    return data as Map<String, dynamic>;
  }

  /// GET /api/orders/public/track?order_number=...
  Future<Order> trackOrder(String orderNumber) async {
    final data = await _api.get('/api/orders/public/track',
        query: {'order_number': orderNumber});
    return Order.fromJson(data as Map<String, dynamic>);
  }
}
