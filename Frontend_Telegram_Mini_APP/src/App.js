import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, setToken, getToken } from './api';
import { initTelegram, resolveShopUsername, getInitData, getUnsafeUser, getTelegram } from './telegram';
import { ProductSheet, CartSheet, CheckoutSheet, SuccessSheet } from './Sheets';
import { tr } from './i18n';

const money = (v, cur) => {
  const sym = cur === 'KHR' ? '៛' : '$';
  return sym + Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: cur === 'KHR' ? 0 : 2,
    maximumFractionDigits: cur === 'KHR' ? 0 : 2,
  });
};

export default function App() {
  const [tg] = useState(() => initTelegram());
  const [shop, setShop] = useState(null);
  const [cats, setCats] = useState([]);
  const [prods, setProds] = useState([]);
  const [cat, setCat] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState([]); // [{ product, qty }]
  const [sheet, setSheet] = useState(null); // product | cart | checkout | success
  const [active, setActive] = useState(null); // selected product or order result
  const [busy, setBusy] = useState(false);

  // --- Theme: follow Telegram (light/dark) with a manual toggle ------------
  const [dark, setDark] = useState(() => {
    const tp = (tg && tg.themeParams) || {};
    const bg = String(tp.bg_color || '');
    if (/^#[0-9a-f]{6}$/i.test(bg)) {
      const n = parseInt(bg.slice(1), 16);
      const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      return lum < 0.5; // dark background -> dark mode
    }
    return true;
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (getTelegram() && getTelegram().setHeaderColor) {
      try { getTelegram().setHeaderColor(dark ? '#0b1220' : '#ffffff'); } catch (e) { /* ignore */ }
    }
  }, [dark]);

  // --- Shop theme colors (owner primary/secondary) -------------------------
  useEffect(() => {
    if (!shop) return;
    const t = shop.theme || {};
    const apply = (prop, val, fb) => {
      let c = (val || '').toString().trim();
      if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(c)) c = fb;
      document.documentElement.style.setProperty(prop, c);
    };
    apply('--brand', t.primary, '#2563eb');
    apply('--brand2', t.secondary, '#7c3aed');
  }, [shop]);

  // --- Language (Khmer/English) for main labels ----------------------------
  const [lang, setLang] = useState('km');
  const t = (key) => {
    const dict = {
      km: { loading: tr(lang, 'appLoading') },
      en: { loading: tr(lang, 'appLoading') },
    };
    return dict[lang][key];
  };
  const tgUser = getUnsafeUser();
  const userLabel = tgUser
    ? (tgUser.username ? '@' + tgUser.username : tgUser.first_name || 'Telegram user')
    : customer
      ? (customer.telegram || customer.name || 'Guest')
      : 'Guest';

  // Owner welcome text from the dashboard (stored in shop.mini).
  const [ownerKm, setOwnerKm] = useState('');
  const [ownerEn, setOwnerEn] = useState('');
  const welcomeFor = (name) => {
    if (lang === 'km') {
      return (ownerKm && ownerKm.trim())
        ? ownerKm.trim()
        : `សូមស្វាគមន៍មកកាន់ ${name} បើកមើលផលិតផល ហើយបញ្ជាទិញបានភ្លាមៗ។`;
    }
    return (ownerEn && ownerEn.trim())
      ? ownerEn.trim()
      : `Welcome to ${name}! Browse the products and order instantly.`;
  };

  const load = useCallback(async () => {
    const username = resolveShopUsername();
    try {
      const s = await api.shop(username);
      setShop(s);
      const mini = s.mini || {};
      setOwnerKm(mini.welcome_km || '');
      setOwnerEn(mini.welcome_en || '');
      setError('');
      const [c, p] = await Promise.all([api.categories(s.id), api.products(s.id)]);
      setCats(Array.isArray(c) ? c : []);
      setProds(Array.isArray(p) ? p : []);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'Shop not found');
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-login: backend verifies initData with the shop bot token.
  useEffect(() => {
    if (!shop || getToken()) return;
    const initData = getInitData();
    if (!initData) return;
    api.miniLogin(shop.id, initData)
      .then((res) => { setToken(res.access_token); setCustomer(res.customer); })
      .catch(() => {}); // guest browsing allowed; payment requires Telegram context
  }, [shop]);

  useEffect(() => {
    if (!shop) return;
    if (cat) {
      api.products(shop.id, cat).then((p) => setProds(Array.isArray(p) ? p : []));
    } else {
      api.products(shop.id).then((p) => setProds(Array.isArray(p) ? p : []));
    }
  }, [cat, shop]);

  const inCart = useCallback(
    (id) => cart.reduce((s, i) => s + (i.product.id === id ? i.qty : 0), 0),
    [cart],
  );

  const addItem = useCallback((product, qty = 1, variations = {}) => {
    setCart((prev) => {
      const key = `${product.id}|${JSON.stringify(variations || {})}`;
      const found = prev.find((i) => i.key === key);
      if (found) {
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { key, product, qty, variations: variations || {} }];
    });
    setSheet(null);
  }, []);

  const changeQty = useCallback((id, delta, variations) => {
    const key = `${id}|${JSON.stringify(variations || {})}`;
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + (i.product.sale_price ?? i.product.price) * i.qty, 0);
    const count = cart.reduce((s, i) => s + i.qty, 0);
    return { subtotal, count };
  }, [cart]);

  const filtered = useMemo(() => (cat ? prods.filter((p) => Number(p.category_id) === Number(cat)) : prods), [cat, prods]);
  const currency = shop ? shop.currency || 'USD' : 'USD';

  return (
    <div className={'app' + (loading ? ' isloading' : '')}>
      {loading && (
        <div className="ldwrap">
          <div className="spin" />
          <b className="km">{tr(lang, 'appLoading')}</b>
        </div>
      )}
      <div className="content">
      {/* Hero banner first - owner uploads it in the dashboard */}
      <div className="hero">
        {shop && shop.banner ? <img src={api.mediaUrl(shop.banner)} alt={shop.shop_name} /> : <div className="fallback">Store</div>}
      </div>

      <div className="head">
        <div className="logo">{shop && shop.logo ? <img src={api.mediaUrl(shop.logo)} alt="logo" /> : <span>Store</span>}</div>
        <div className="hname">
          <h1>{shop ? shop.shop_name || shop.username : t('loading')}</h1>
          <div className="at">@{shop ? (shop.telegram_bot_username || shop.username) : ''}</div>
        </div>
        <div className="tools">
          <button className="tbtn" title="Dark / Light" onClick={() => setDark(!dark)}>{dark ? '☀️' : '🌙'}</button>
          <button className="tbtn" title="ខ្មែរ / English" onClick={() => setLang(lang === 'km' ? 'en' : 'km')}>{lang === 'km' ? 'EN' : 'KH'}</button>
        </div>
      </div>

      {/* Auto-detected Telegram account */}
      {userLabel !== 'Guest' && (
        <div className="userchip">
          {tgUser && tgUser.photo_url ? (
            <img src={tgUser.photo_url} alt="" />
          ) : (
            <span className="av">
              {(userLabel || 'T').replace('@', '').slice(0, 1).toUpperCase()}
            </span>
          )}
          <b>{userLabel}</b>
        </div>
      )}

      {/* Welcome text - Khmer or English */}
      <p className="welcome km">
        {welcomeFor(shop ? shop.shop_name || shop.username : '...')}
      </p>

      {/* Full shop info - bio, description, contact, social links (like web About) */}
      {shop && (shop.bio || shop.description || shop.contact) && (
        <div className="about">
          <b className="abouth">{tr(lang, 'aboutShop')}</b>
          {shop.bio && <p>{shop.bio}</p>}
          {shop.description && shop.description !== shop.bio && <p className="muted">{shop.description}</p>}
          {shop.contact && <p className="muted">📍 {shop.contact}</p>}
          {shop.social_media && (
            <div className="soc">
              {Object.entries(shop.social_media)
                .filter(([, v]) => v && String(v).trim().startsWith('http'))
                .map(([k, v]) => (
                  <a key={k} href={String(v).trim()} target="_blank" rel="noreferrer" className="socb">
                    {k}
                  </a>
                ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="km" style={{ padding: '0 16px' }}>Notice: {error}</p>}

            {cats.length > 0 && (
        <div className="chips sticky">
          <div className={'chip' + (Number(cat) === 0 ? ' on' : '')} onClick={() => setCat(0)}>{tr(lang, 'all')}</div>
          {cats.map((c) => (
            <div key={c.id} className={'chip' + (Number(cat) === Number(c.id) ? ' on' : '')} onClick={() => setCat((prev) => (Number(prev) === Number(c.id) ? 0 : c.id))}>{c.name}</div>
          ))}
        </div>
      )}

<div className="grid">
        {filtered.map((p) => {
          const onSale = p.sale_price != null && p.sale_price < p.price;
          const image = p.images && p.images.length ? p.images[0] : '';
          return (
            <div key={p.id} className="card" onClick={() => { setActive(p); setSheet('product'); }}>
              <div className="img">{image ? <img src={api.mediaUrl(image)} alt={p.name} /> : <span>box</span>}</div>
              {onSale && <div className="sale">SALE</div>}
              <div className="b">
                <div className="n">{p.name}</div>
                <div className="p">
                  {money(onSale ? p.sale_price : p.price, currency)}
                  {onSale && <span className="old">{money(p.price, currency)}</span>}
                </div>
                {Number(p.quantity) <= 0 && <div className="out">{tr(lang, 'soldOut')}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* bottom cart bar */}
      {totals.count > 0 && (
        <div className="cartbar" onClick={() => setSheet('cart')}>
          <span>{tr(lang, 'cartBar')}: {totals.count} {tr(lang, 'items')} · {money(totals.subtotal, currency)}</span>
          <span>{tr(lang, 'checkout')} →</span>
        </div>
      )}

      {sheet === 'product' && active && (
        <ProductSheet
          lang={lang}
          product={active}
          currency={currency}
          inCart={inCart(active.id)}
          onClose={() => setSheet(null)}
          onAdd={(p, q) => addItem(p, q)}
          onOpenCart={() => setSheet('cart')}
        />
      )}

      {sheet === 'cart' && shop && (
        <CartSheet
          lang={lang}
          cart={cart}
          currency={currency}
          customer={customer}
          money={money}
          onChangeQty={changeQty}
          onClose={() => setSheet(null)}
          onCheckout={() => setSheet('checkout')}
        />
      )}

      {sheet === 'checkout' && shop && (
        <CheckoutSheet
          lang={lang}
          shop={shop}
          cart={cart}
          currency={currency}
          customer={customer}
          money={money}
          busy={busy}
          onClose={() => setSheet(null)}
          placeOrder={async (form) => {
            setBusy(true);
            try {
              // 1. Auto-login (must run inside Telegram)
              if (!getToken()) {
                const initData = getInitData();
                if (!initData) {
                  throw new Error('Please open this shop from the Telegram bot to pay (auto login).');
                }
                const res = await api.miniLogin(shop.id, initData);
                setToken(res.access_token);
                setCustomer(res.customer);
              }
              const u = getUnsafeUser();
              // 2. Create the order (customer JWT required)
              const order = await api.createOrder({
                shop_id: shop.id,
                customer_name: form.name,
                customer_phone: form.phone,
                customer_telegram: u && u.username ? u.username : '',
                customer_address: form.address,
                customer_city: form.city,
                customer_country: 'Cambodia',
                currency,
                shipping_fee: 0,
                discount: 0,
                items: cart.map((i) => ({
                  product_id: i.product.id,
                  name: i.product.name,
                  price: i.product.sale_price != null ? i.product.sale_price : i.product.price,
                  quantity: i.qty,
                  variations: i.variations || {},
                  image: i.product.images && i.product.images[0] ? i.product.images[0] : '',
                })),
              });
              // 3. Create the ABA KHQR payment
              const pay = await api.abaCreate(order.id);
              setCart([]);
              setActive({ order, pay });
              setSheet('success');
            } catch (e) {
              window.alert(e.message || 'Order failed');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {sheet === 'success' && active && (
        <SuccessSheet
          lang={lang}
          result={active}
          money={money}
          currency={currency}
          onClose={() => setSheet(null)}
          verify={async (txn) => {
            setBusy(true);
            try {
              const r = await api.abaVerify(active.order.id, txn);
              setActive({ order: active.order, pay: active.pay, verified: r });
            } catch (e) {
              window.alert(e.message || 'Not verified yet');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      </div>
    </div>
  );
}
