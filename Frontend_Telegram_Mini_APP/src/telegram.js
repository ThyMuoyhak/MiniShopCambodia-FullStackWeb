// Telegram WebApp helpers for the Mini App.
// Works in Telegram, and degrades gracefully when opened in a normal browser
// (useful for local development).

export function getTelegram() {
  return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
}

export function initTelegram() {
  const tg = getTelegram();
  if (tg) {
    tg.ready && tg.ready();
    tg.expand && tg.expand();
    try {
      if (tg.setHeaderColor) tg.setHeaderColor('#0b1220');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#0f172a');
      if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
    } catch (e) {
      /* ignore */
    }
  }
  return tg;
}

// Raw signed initData - sent to the backend and verified with the shop bot token.
export function getInitData() {
  const tg = getTelegram();
  return (tg && tg.initData) || '';
}

// Unsigned user object Telegram exposes locally (name/photo for the UI only).
export function getUnsafeUser() {
  const tg = getTelegram();
  return (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || null;
}

// Which shop to open: Telegram start_param (t.me/<bot>?startapp=<shop>)
// or the ?shop=<username> query param (browser testing).
export function resolveShopUsername() {
  const tg = getTelegram();
  const sp =
    (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || '';
  const qs = new URLSearchParams(window.location.search).get('shop');
  return (sp || qs || 'demo').trim();
}

// Main button (bottom button inside Telegram) used for "Add to cart" / "Pay".
export function mainButton(tg, { text = '', show = false, enabled = true, color = '#2563eb', onClick = null }) {
  if (!tg || !tg.MainButton) return;
  tg.MainButton.setText(text);
  tg.MainButton.color = color;
  tg.MainButton.textColor = '#ffffff';
  tg.MainButton.isEnabled = enabled;
  if (onClick) {
    tg.MainButton.onClick(onClick);
  }
  if (show) tg.MainButton.show();
  else tg.MainButton.hide();
}

export function showAlert(tg, message) {
  if (tg && tg.showAlert) tg.showAlert(message);
  else window.alert(message);
}
