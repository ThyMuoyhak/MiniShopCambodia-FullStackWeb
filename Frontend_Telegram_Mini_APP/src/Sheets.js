import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { tr } from './i18n';

const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const variantText = (attrs) =>
  Object.entries(attrs || {}).map(([k, v]) => `${cap(k)}: ${v}`).join(' · ');

export function ProductSheet({ lang, product, currency, inCart, onClose, onAdd, onOpenCart }) {
  const T = (k, v) => tr(lang, k, v);
  const [qty, setQty] = useState(1);
  const [detail, setDetail] = useState(null);
  const [img, setImg] = useState(0);
  const [variant, setVariant] = useState(null);
  const [selections, setSelections] = useState({});

  // Load the FULL product data (all images, description, variations, attributes).
  useEffect(() => {
    let on = true;
    api.productDetail(product.id).then((d) => {
      if (!on) return;
      const full = { ...product, ...(d || {}) };
      setDetail(full);
      if (Array.isArray(full.variations) && full.variations.length) setVariant(full.variations[0]);
    }).catch(() => { if (on) setDetail(product); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const images = useMemo(() => {
    const list = (detail ? detail.images : product.images) || product.images || [];
    return Array.isArray(list) && list.length ? list : [];
  }, [detail, product]);

  const variations = Array.isArray(detail ? detail.variations : []) ? (detail ? detail.variations : []) : [];
  const attributes = Array.isArray(detail ? detail.custom_attributes : []) ? (detail ? detail.custom_attributes : []) : [];

  const onSale = (detail ? detail.sale_price != null && detail.sale_price < detail.price : false);
  const basePrice = detail ? (detail.sale_price != null ? detail.sale_price : detail.price) : (product.sale_price != null ? product.sale_price : product.price);
  const unitPrice = variant && variant.price != null ? variant.price : basePrice;
  const stockQty = variant && variant.quantity != null ? variant.quantity : (detail ? detail.quantity : product.quantity);
  const soldOut = Number(stockQty) <= 0;
  const desc = (detail ? detail.description : product.description) || '';

  const activeImg = images.length ? images[Math.min(img, images.length - 1)] : (product.images && product.images[0]) || '';

  const chooseAttr = (attrName, value) => {
    const next = { ...selections, [attrName]: value };
    setSelections(next);
    // auto-match a variant whose attrs fit the selections
    if (variations.length) {
      const match = variations.find((v) =>
        Object.keys(next).every((k) => String((v.attrs || {})[k] || '') === String(next[k])),
      );
      if (match) setVariant(match);
    }
  };

  const chosenVariations = useMemo(() => {
    const v = {};
    if (variant && variant.attrs) Object.assign(v, variant.attrs);
    Object.keys(selections).forEach((k) => { v[k] = selections[k]; });
    return v;
  }, [variant, selections]);

  return (
    <>
      <div className="sheetWrap" onClick={onClose} />
      <div className="sheet">
        <div className="row">
          <h2>{(detail ? detail.name : product.name)}</h2>
          <button className="btn ghost" style={{ width: 92 }} onClick={onClose}>{T('close')}</button>
        </div>

        {activeImg && <img src={api.mediaUrl(activeImg)} alt={product.name} className="p-main" />}
        {images.length > 1 && (
          <div className="thumbs">
            {images.map((im, i) => (
              <img key={i} src={api.mediaUrl(im)} alt="" className={i === Math.min(img, images.length - 1) ? 'th on' : 'th'} onClick={() => setImg(i)} />
            ))}
          </div>
        )}

        <p className="price">
          {unitPrice} {currency}
          {onSale && <span className="old"> {detail.price} {currency}</span>}
        </p>
        {onSale && <p className="saleinfo">{T('save', { pct: Math.round(((detail.price - (detail.sale_price != null ? detail.sale_price : detail.price)) / detail.price) * 100) })}</p>}
        <p className="stock">{soldOut ? T('soldOut') : `${T('available')}: ${stockQty}`}</p>

        {variations.length > 0 && (
          <>
            <h3>{T('chooseVariant')}</h3>
            {variations.map((v, i) => (
              <div key={i} className={'opt var' + (variant === v ? ' on' : '')} onClick={() => setVariant(v)}>
                <span className="vdot">{variant === v ? '✓' : ''}</span>
                <div style={{ flex: 1 }}>
                  <b>{variantText(v.attrs)}</b>
                  {v.sku && <div className="muted" style={{ fontSize: 11 }}>SKU: {v.sku}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>{v.price != null ? `${v.price} ${currency}` : ''}</b>
                  <div className="muted" style={{ fontSize: 11 }}>{T('available')}: {v.quantity != null ? v.quantity : '—'}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {attributes.length > 0 && (
          <>
            <h3>{T('details')}</h3>
            <div className="attrs">
              {attributes.map((a, i) => {
                const label = a.label || cap(a.name);
                const opts = String(a.options || '').split(',').map((s) => s.trim()).filter(Boolean);
                const isSelect = String(a.type) === 'select' && opts.length;
                return (
                  <div key={i} className="attr">
                    <span className="muted">{label}</span>
                    <div>
                      {a.value ? <b>{a.value}</b> : <span className="muted">—</span>}
                      {isSelect && (
                        <div className="optchips">
                          {opts.map((o) => (
                            <span key={o} className={selections[label] === o ? 'optchip on' : 'optchip'} onClick={() => chooseAttr(label, o)}>{o}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {desc && <p className="km" style={{ marginTop: 8 }}>{desc}</p>}

        <h3>{T('quantity')}</h3>
        <div className="qty">
          <button onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
          <b style={{ fontSize: 18 }}>{qty}</b>
          <button onClick={() => setQty(qty + 1)} disabled={soldOut || qty + 1 > stockQty}>+</button>
        </div>

        <button className="btn" disabled={soldOut} onClick={() => onAdd(product, qty, chosenVariations)}>
          {T('addToCart')}
        </button>
        {inCart > 0 && (
          <button className="btn green" onClick={onOpenCart}>
            {T('viewCart')} ({inCart})
          </button>
        )}
      </div>
    </>
  );
}

export function CartSheet({ lang, cart, currency, customer, money, onChangeQty, onClose, onCheckout }) {
  const T = (k, v) => tr(lang, k, v);
  const total = cart.reduce((s, i) => s + (i.product.sale_price != null ? i.product.sale_price : i.product.price) * i.qty, 0);
  const varText = (variations) =>
    variations && Object.keys(variations).length
      ? Object.entries(variations).map(([k, v]) => `${cap(k)}: ${v}`).join(' · ')
      : '';
  return (
    <>
      <div className="sheetWrap" onClick={onClose} />
      <div className="sheet">
        <div className="row">
          <h2>{T('yourCart')}</h2>
          <button className="btn ghost" style={{ width: 92 }} onClick={onClose}>{T('close')}</button>
        </div>
        {cart.length === 0 && <p className="muted">{T('cartEmpty')}</p>}
        {cart.map((i) => {
          const p = i.product;
          const price = p.sale_price != null ? p.sale_price : p.price;
          const image = p.images && p.images.length ? p.images[0] : '';
          const vt = varText(i.variations);
          return (
            <div key={p.id + ':' + (vt || '')} className="opt">
              <div className="img">{image ? <img src={api.mediaUrl(image)} alt="" /> : <span>box</span>}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
                {vt && <div className="muted" style={{ fontSize: 11 }}>{vt}</div>}
                <div className="muted" style={{ fontSize: 12 }}>{money(price * i.qty, currency)}</div>
              </div>
              <div className="qty">
                <button onClick={() => onChangeQty(p.id, -1, i.variations)}>-</button>
                <b>{i.qty}</b>
                <button onClick={() => onChangeQty(p.id, 1, i.variations)}>+</button>
              </div>
            </div>
          );
        })}
        {cart.length > 0 && (
          <>
            <p className="row" style={{ fontSize: 16, fontWeight: 800 }}>
              <span>{T('total')}</span>
              <span>{money(total, currency)}</span>
            </p>
            {customer
              ? <p className="muted">{T('loggedAs', { name: customer.name || customer.telegram || '' })}</p>
              : <p className="muted">{T('guestNote')}</p>}
            <button className="btn green" onClick={onCheckout}>{T('payWithAba')}</button>
          </>
        )}
      </div>
    </>
  );
}

export function CheckoutSheet({ lang, shop, cart, currency, customer, money, busy, onClose, placeOrder }) {
  const T = (k, v) => tr(lang, k, v);
  const [name, setName] = useState(customer ? customer.name || '' : '');
  const [phone, setPhone] = useState(customer ? customer.phone || '' : '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Phnom Penh');
  const total = cart.reduce((s, i) => s + (i.product.sale_price != null ? i.product.sale_price : i.product.price) * i.qty, 0);
  const canSubmit = name.trim() && phone.trim() && !busy;
  const varText = (variations) =>
    variations && Object.keys(variations).length
      ? Object.entries(variations).map(([k, v]) => `${cap(k)}: ${v}`).join(', ')
      : '';
  return (
    <>
      <div className="sheetWrap" onClick={onClose} />
      <div className="sheet">
        <div className="row">
          <h2>{T('checkout')}</h2>
          <button className="btn ghost" style={{ width: 92 }} onClick={onClose}>{T('close')}</button>
        </div>
        {!customer && <div className="notice">{T('loginNotice')}</div>}
        <h3>{T('customerInfo')}</h3>
        <input placeholder={T('fullName')} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder={T('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <h3>{T('address')}</h3>
        <input placeholder={T('address')} value={address} onChange={(e) => setAddress(e.target.value)} />
        <input placeholder={T('city')} value={city} onChange={(e) => setCity(e.target.value)} />
        <h3>{T('items')}</h3>
        {cart.map((i) => {
          const vt = varText(i.variations);
          return (
            <div key={i.product.id + vt} className="row muted" style={{ fontSize: 13, padding: '3px 0' }}>
              <span>{i.product.name}{vt ? ` (${vt})` : ''} x {i.qty}</span>
              <span>{money((i.product.sale_price != null ? i.product.sale_price : i.product.price) * i.qty, currency)}</span>
            </div>
          );
        })}
        <p className="row" style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>
          <span>{T('total')}</span>
          <span>{money(total, currency)}</span>
        </p>
        <button className="btn green" disabled={!canSubmit} onClick={() => placeOrder({ name, phone, address, city })}>
          {busy ? T('processing') : T('payWithAba')}
        </button>
        <p className="km" style={{ textAlign: 'center' }}>
          {T('shopNote', { shop: shop.shop_name || shop.username })}
        </p>
      </div>
    </>
  );
}

export function SuccessSheet({ lang, result, money, currency, onClose, verify }) {
  const T = (k, v) => tr(lang, k, v);
  const order = result.order;
  const pay = result.pay || {};
  const verified = result.verified;
  const [txn, setTxn] = useState('');
  const qrUrl = pay.qr_code_url || pay.qr_image || pay.qr || '';
  const checkoutUrl = pay.checkout_url || pay.payment_url || '';
  return (
    <>
      <div className="sheetWrap" onClick={onClose} />
      <div className="sheet">
        <h2>{T('orderPlaced')}</h2>
        <p className="muted">#{order.order_number || order.id} · {money(order.total, currency)}</p>
        <div className="notice">{T('payNote')}</div>
        {qrUrl && <div className="qr"><img src={qrUrl} alt="ABA KHQR" /></div>}
        {checkoutUrl && (
          <a className="btn" href={checkoutUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            {T('openAba')}
          </a>
        )}
        <h3>{T('verifyTitle')}</h3>
        <input placeholder={T('txnOpt')} value={txn} onChange={(e) => setTxn(e.target.value)} />
        <button className="btn" onClick={() => verify(txn)}>{T('verifyBtn')}</button>
        {verified && (
          <div className="notice" style={{ borderColor: 'rgba(22,163,74,.5)', color: 'var(--ink)', background: 'rgba(22,163,74,.12)' }}>
            {T('verifiedOk')} ✓
          </div>
        )}
        <button className="btn ghost" onClick={onClose} style={{ marginTop: 10 }}>{T('continueShopping')}</button>
      </div>
    </>
  );
}
