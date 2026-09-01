import React, { useEffect, useRef } from 'react';
import { FiSend } from 'react-icons/fi';

/**
 * Official Telegram "Login with Telegram" widget (data-onauth flow).
 * Loads https://telegram.org/js/telegram-widget.js and renders the real
 * Telegram login button. On success it calls props.onAuth(user) with the
 * signed user object {id, first_name, last_name, username, auth_date, hash}.
 */
export default function TelegramLogin({ botUsername, onAuth, size = 'large', label }) {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || !botUsername) return undefined;

    // Reset container each render of a new bot
    container.innerHTML = '';

    // The widget calls this global function with the signed auth payload
    window.onTelegramAuthCallback = (user) => {
      if (onAuth) onAuth(user);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', size);
    script.setAttribute('data-onauth', 'onTelegramAuthCallback');
    script.setAttribute('data-request-access', 'write');
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botUsername, size]);

  if (!botUsername) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
        <FiSend className="w-6 h-6 mx-auto mb-2" />
        {label || 'Telegram login is not enabled for this shop yet.'}
      </div>
    );
  }

  return <div ref={ref} className="telegram-login-widget" />;
}
