import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiKey, FiSend } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useLanguage } from '../i18n';
import { requestTelegramCode } from '../api';

/**
 * Fallback Telegram login that works WITHOUT BotFather domain setup.
 * The customer enters their Telegram user ID, the shop's bot sends a 6-digit
 * verification code to that Telegram account, and the customer enters the code.
 */
export default function TelegramCodeLogin({ onSuccess }) {
  const { shop } = useShop();
  const { loginWithCode } = useCustomer();
  const { t } = useLanguage();
  const [telegramId, setTelegramId] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('id'); // id -> code -> done
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    const tgId = String(telegramId).trim();
    if (!/^\d+$/.test(tgId)) {
      toast.error(t('tgInvalidId'));
      return;
    }
    setBusy(true);
    try {
      await requestTelegramCode({ shop_id: shop.id, telegram_id: Number(tgId) });
      toast.success(t('tgCodeSent'));
      setStep('code');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send code');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(String(code).trim())) {
      toast.error(t('tgInvalidCode'));
      return;
    }
    setBusy(true);
    try {
      await loginWithCode(shop.id, Number(String(telegramId).trim()), String(code).trim());
      toast.success(t('tgLoginSuccess'));
      setStep('done');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') return null;

  const botLink = shop.telegram_bot_username
    ? `https://t.me/${shop.telegram_bot_username}`
    : null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 text-left">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
        <FiKey className="w-3.5 h-3.5" /> {t('tgFallbackTitle')}
      </div>

      {step === 'id' ? (
        <form onSubmit={sendCode} className="space-y-2">
          <p className="text-xs text-gray-400 leading-relaxed">
            {t('tgFallbackHow')}
            {botLink && (
              <>
                {' '}
                <a href={botLink} target="_blank" rel="noreferrer" className="text-sky-600 font-semibold hover:underline">
                  @{shop.telegram_bot_username}
                </a>
              </>
            )}{' '}
            {t('tgFallbackStart')}
          </p>
          <div className="flex gap-2">
            <input
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              placeholder={t('tgYourId')}
              inputMode="numeric"
            />
            <button type="submit" disabled={busy} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              <FiSend className="inline mr-1" /> {t('tgSendCode')}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-2">
          <p className="text-xs text-gray-400">{t('tgEnterCode')}</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm tracking-[0.3em] font-bold text-center"
              placeholder="••••••"
              inputMode="numeric"
              maxLength="6"
              autoFocus
            />
            <button type="submit" disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              {t('tgVerify')}
            </button>
          </div>
          <button type="button" onClick={() => setStep('id')} className="text-xs text-gray-400 hover:underline">
            ← {t('tgBack')}
          </button>
        </form>
      )}
    </div>
  );
}
