import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCreditCard, FiMinus, FiPlus, FiSearch, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { createPosOrder, createPayment, listProducts, verifyPayment, fullUrl } from '../api';

export default function POS() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('POS Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [picker, setPicker] = useState(null);
  const [pickVar, setPickVar] = useState(null);
  const [pickQty, setPickQty] = useState(1);
  const [payModal, setPayModal] = useState(null);
  const payTimer = useRef(null);

  const loadProducts = useCallback(() => {
    setLoading(true);
    listProducts(user.shop_id).then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, [user.shop_id]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => () => clearInterval(payTimer.current), []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => p.name.toLowerCase().includes(s));
  }, [products, search]);

  const variationLabel = (attrs) => Object.entries(attrs || {}).map(([k, v]) => `${k}: ${v}`).join(' | ');

  const openPicker = (product) => {
    setPicker(product);
    const vs = product.variations || [];
    setPickVar(vs.length > 0 ? vs[0] : null);
    setPickQty(1);
  };

  const addToCart = () => {
    const product = picker;
    if (!product) return;
    const vs = product.variations || [];
    const variation = vs.length > 0 ? pickVar : null;
    const price = variation?.price ?? product.sale_price ?? product.price ?? 0;
    setCart((prev) => {
      const key = JSON.stringify(variation?.attrs || {});
      const found = prev.find((i) => i.product_id === product.id && JSON.stringify(i.variations) === key);
      if (found) return prev.map((i) => (i === found ? { ...i, quantity: i.quantity + pickQty } : i));
      return [...prev, {
        product_id: product.id, name: product.name, price,
        quantity: pickQty, variations: variation?.attrs || {},
        variationLabel: variation ? variationLabel(variation.attrs) : '',
      }];
    });
    setPicker(null); setPickVar(null); setPickQty(1);
  };

  const updateQty = (idx, qty) => setCart((prev) => prev.map((i, n) => (n === idx ? { ...i, quantity: Math.max(1, qty) } : i)));
  const removeLine = (idx) => setCart((prev) => prev.filter((_, n) => n !== idx));
  const total = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);

  const buildPayload = () => ({
    shop_id: user.shop_id,
    customer_name: customerName || 'POS Customer',
    customer_phone: customerPhone,
    items: cart.map((i) => ({
      product_id: i.product_id, name: i.name, price: i.price,
      quantity: i.quantity, variations: i.variations,
    })),
  });

  const payCash = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    try {
      const res = await createPosOrder({ ...buildPayload(), payment_method: 'cash' });
      toast.success('បានលក់ជោគជ័យ! Order #' + res.order.order_number + ' — paid');
      setCart([]); setCustomerName('POS Customer'); setCustomerPhone(''); loadProducts();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Sale failed');
    }
  };

  const payKHQR = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    try {
      const res = await createPosOrder({ ...buildPayload(), payment_method: 'khqr' });
      const payment = await createPayment({
        order_id: res.order.id,
        success_url: `${window.location.origin}/api/payments/aba/success?order_id=${res.order.id}`,
        error_url: `${window.location.origin}/api/payments/aba/error?order_id=${res.order.id}`,
      });
      setPayModal({ order: res.order, payment, verified: false });
      startPolling(res.order.id, payment.transaction_id || '');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to start KHQR payment');
    }
  };

  const startPolling = (orderId, transactionId) => {
    let attempts = 0;
    payTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const r = await verifyPayment({ order_id: orderId, transaction_id: transactionId });
        if (r.verified) {
          clearInterval(payTimer.current);
          toast.success('KHQR payment confirmed! Stock updated');
          setPayModal((m) => (m ? { ...m, verified: true } : m));
          setCart([]); loadProducts();
        } else if (attempts >= 60) {
          clearInterval(payTimer.current);
        }
      } catch (e) { /* transient */ }
    }, 3000);
  };

  if (loading && products.length === 0) {
    return (
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
          <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><FiCreditCard /></span>
          POS Sale
        </h1>
        <span className="text-sm text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          {filtered.length} products
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product list */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-4 focus-within:ring-2 ring-indigo-200">
            <FiSearch className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 text-sm focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600"><FiX /></button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-white rounded-xl shadow-sm">No products</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((p) => {
                const stock = p.quantity || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => openPicker(p)}
                    disabled={stock <= 0}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 ring-indigo-300 transition disabled:opacity-50"
                  >
                    {p.images?.[0] ? (
                      <img src={fullUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><FiShoppingCart className="w-10 h-10" /></div>
                    )}

                    {/* Stock badge */}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${stock <= 0 ? 'bg-red-500 text-white' : 'bg-white/90 text-emerald-700'}`}>
                      {stock <= 0 ? 'Out' : `${stock} left`}
                    </span>

                    {/* Price badge */}
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm bg-white/90 text-indigo-600">
                      ${(p.sale_price ?? p.price ?? 0).toFixed(2)}
                    </span>

                    {/* Name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2.5 pb-2 pt-7">
                      <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                    </div>

                    {/* Out of stock overlay */}
                    {stock <= 0 && (
                      <span className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">Out of stock</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-fit sticky top-4">
          <h2 className="font-bold flex items-center gap-2 mb-4 text-gray-800"><FiShoppingCart className="text-indigo-600" /> Cart ({cart.length})</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Add products to start a sale.</p>
            ) : (
              cart.map((i, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{i.name}</p>
                    {i.variationLabel && <p className="text-xs text-gray-400 truncate">{i.variationLabel}</p>}
                    <p className="text-xs text-gray-500">${i.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center bg-white border rounded-lg">
                    <button onClick={() => updateQty(idx, i.quantity - 1)} className="px-1.5 py-1 text-gray-500 hover:text-indigo-600"><FiMinus /></button>
                    <span className="w-5 text-center text-sm font-semibold">{i.quantity}</span>
                    <button onClick={() => updateQty(idx, i.quantity + 1)} className="px-1.5 py-1 text-gray-500 hover:text-indigo-600"><FiPlus /></button>
                  </div>
                  <span className="text-sm font-bold w-16 text-right">${(i.price * i.quantity).toFixed(2)}</span>
                  <button onClick={() => removeLine(idx)} className="p-1 text-red-400 hover:text-red-600"><FiTrash2 /></button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 text-sm mb-4">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Customer name" />
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phone (optional)" />
          </div>

          <div className="flex justify-between items-center font-bold text-xl border-t pt-3 mb-4">
            <span className="text-gray-700">Total</span>
            <span className="text-indigo-600">${total.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <button onClick={payCash} disabled={cart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 shadow-sm transition">
              បង់ប្រាក់ផ្ទាល់ (Cash)
            </button>
            <button onClick={payKHQR} disabled={cart.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 shadow-sm transition">
              KHQR (ABA Pay)
            </button>
          </div>
        </div>
      </div>

      {/* Variation picker modal */}
      {picker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPicker(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <div className="aspect-video bg-gray-100">
                {picker.images?.[0] ? (
                  <img src={fullUrl(picker.images[0])} alt={picker.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><FiShoppingCart className="w-14 h-14" /></div>
                )}
              </div>
              <button onClick={() => setPicker(null)} className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-600 rounded-full p-1.5 shadow">
                <FiX className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-2 pt-8">
                <p className="text-white font-bold truncate">{picker.name}</p>
              </div>
            </div>

            <div className="p-5">
              {(picker.variations || []).length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Choose option</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {picker.variations.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setPickVar(v)}
                        className={`w-full flex items-center justify-between border-2 rounded-lg px-3 py-2.5 text-sm transition ${pickVar === v ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-400'}`}
                      >
                        <span className="font-medium">{variationLabel(v.attrs)}</span>
                        <span className="text-gray-500">
                          {v.price ? `$${v.price.toFixed(2)}` : ''}
                          <span className={`ml-2 text-xs font-semibold ${(v.quantity ?? 0) <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {(v.quantity ?? 0) <= 0 ? 'Out' : `${v.quantity} left`}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Price: <span className="font-bold text-indigo-600">${(picker.sale_price ?? picker.price ?? 0).toFixed(2)}</span>
                </p>
              )}

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm font-semibold text-gray-700">Quantity</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setPickQty(Math.max(1, pickQty - 1))} className="px-4 py-2 text-gray-500 hover:bg-gray-100 font-bold"><FiMinus /></button>
                  <span className="w-10 text-center font-bold">{pickQty}</span>
                  <button onClick={() => setPickQty(pickQty + 1)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 font-bold"><FiPlus /></button>
                </div>
              </div>

              <button
                onClick={addToCart}
                disabled={(pickVar?.quantity ?? picker.quantity ?? 0) <= 0}
                className="mt-4 w-full btn-primary py-3 rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <FiShoppingCart /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KHQR payment modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Scan to pay (ABA KHQR)</h3>
            <p className="text-sm text-gray-500 mb-4">Order #{payModal.order.order_number} · {payModal.order.total.toFixed(2)}</p>
            {payModal.payment.qr_code_url ? (
              <img src={fullUrl(payModal.payment.qr_code_url)} alt="KHQR" className="w-56 h-56 mx-auto rounded-xl border" />
            ) : (
              <p className="text-sm text-gray-400 py-10">QR unavailable. Use the checkout link below.</p>
            )}
            <p className="text-sm text-gray-600 mt-3">
              {payModal.verified ? 'Payment confirmed!' : 'Waiting for payment...'}
            </p>
            {payModal.payment.checkout_url && (
              <a href={payModal.payment.checkout_url} target="_blank" rel="noreferrer"
                 className="inline-block mt-3 text-indigo-600 font-semibold hover:underline">
                Open ABA checkout
              </a>
            )}
            <div className="mt-4">
              <button
                onClick={() => { clearInterval(payTimer.current); setPayModal(null); loadProducts(); }}
                className="w-full px-4 py-2.5 rounded-xl border text-gray-600 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
