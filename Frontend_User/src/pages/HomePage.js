import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArchive, FiArrowRight, FiCheck, FiCreditCard, FiFileText, FiLayers,
  FiMail, FiMessageCircle, FiSend, FiShoppingBag, FiSliders, FiSmartphone,
  FiTruck, FiUsers,
} from 'react-icons/fi';
import { useLanguage } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

const NAVY = '#011F46';
const ORANGE = '#FB6E08';

// Animated counter for the "500+ shops" social proof.
function CountUp({ to, suffix = '', duration = 1400 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setN(Math.floor(p * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{n.toLocaleString()}{suffix}</span>;
}

function BrandMark({ size = 'w-10 h-10', light = false }) {
  return (
    <div className="relative flex items-center gap-2">
      <img
        src={`${process.env.PUBLIC_URL}/logo.svg`}
        alt="Mini Shop"
        className={`${size} drop-shadow-lg shrink-0`}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <span className="font-extrabold text-xl tracking-tight">
        <span style={{ color: light ? '#FFFFFF' : NAVY }}>Mini</span>
        <span style={{ color: ORANGE }}>Shop</span>
      </span>
    </div>
  );
}

// Live countdown for the "FREE 1 MONTH" Starter offer (ends 07/09/2026).
function OfferCountdown() {
  const [end] = useState(new Date(2026, 8, 7, 23, 59, 59).getTime());
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [end]);
  const pad = (x) => String(x).padStart(2, '0');
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return <span className="font-mono font-bold tracking-wider">{d}d {pad(h)}:{pad(m)}:{pad(s)}</span>;
}

export default function HomePage() {
  const { t, lang } = useLanguage();

  const features = [
    { icon: <FiLayers className="w-6 h-6" />, title: t('featureMultiShop'), desc: t('featureMultiShopDesc'), color: 'bg-[#011F46] text-white' },
    { icon: <FiSliders className="w-6 h-6" />, title: t('featureCustom'), desc: t('featureCustomDesc'), color: 'bg-[#FB6E08] text-white' },
    { icon: <FiCreditCard className="w-6 h-6" />, title: t('featureAbapay'), desc: t('featureAbapayDesc'), color: 'bg-[#011F46] text-white' },
    { icon: <FiFileText className="w-6 h-6" />, title: t('featureReceipts'), desc: t('featureReceiptsDesc'), color: 'bg-[#FB6E08] text-white' },
    { icon: <FiArchive className="w-6 h-6" />, title: t('featureBackup'), desc: t('featureBackupDesc'), color: 'bg-[#011F46] text-white' },
    { icon: <FiMail className="w-6 h-6" />, title: t('featureTelegram'), desc: t('featureTelegramDesc'), color: 'bg-[#FB6E08] text-white' },
  ];

  const stats = [
    { to: 500, suffix: '+', label: t('statShops') },
    { to: 10000, suffix: '+', label: t('statProducts') },
    { to: 1000, suffix: '+', label: t('statCustomers') },
    { to: 24, suffix: '/7', label: t('statSupport') },
  ];

  const aboutPoints = [
    { icon: <FiCheck className="w-4 h-4" />, text: t('aboutPoint1') },
    { icon: <FiCheck className="w-4 h-4" />, text: t('aboutPoint2') },
    { icon: <FiCheck className="w-4 h-4" />, text: t('aboutPoint3') },
    { icon: <FiCheck className="w-4 h-4" />, text: t('aboutPoint4') },
  ];

  const values = [
    { icon: <FiShoppingBag className="w-6 h-6" />, title: t('value500'), desc: t('value500Desc') },
    { icon: <FiCreditCard className="w-6 h-6" />, title: t('valueAba'), desc: t('valueAbaDesc') },
    { icon: <FiFileText className="w-6 h-6" />, title: t('valueInv'), desc: t('valueInvDesc') },
    { icon: <FiTruck className="w-6 h-6" />, title: t('valueDel'), desc: t('valueDelDesc') },
  ];

  const steps = [
    { n: '01', title: t('step1Title'), desc: t('step1Desc') },
    { n: '02', title: t('step2Title'), desc: t('step2Desc') },
    { n: '03', title: t('step3Title'), desc: t('step3Desc') },
  ];

  const testimonials = [
    { name: t('testi1Name'), shop: t('testi1Shop'), text: t('testi1Text') },
    { name: t('testi2Name'), shop: t('testi2Shop'), text: t('testi2Text') },
    { name: t('testi3Name'), shop: t('testi3Shop'), text: t('testi3Text') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ===== Nav ===== */}
      <header className="bg-white/90 backdrop-blur sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><BrandMark /></Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-600">
            <a href="#about" className="hover:text-[#FB6E08] transition">{t('about')}</a>
            <a href="#features" className="hover:text-[#FB6E08] transition">{t('featuresLabel')}</a>
            <a href="#pricing" className="hover:text-[#FB6E08] transition">{t('pricingLabel')}</a>
            <a href="#steps" className="hover:text-[#FB6E08] transition">{t('howItWorks')}</a>
            <a href="#contact" className="hover:text-[#FB6E08] transition">{t('contactFooter')}</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <a href="/demo" className="hidden sm:inline-flex text-sm font-semibold text-[#011F46] hover:text-[#FB6E08] transition">{t('browseDemo')}</a>
            <Link to="/create-shop"
                  className="inline-flex items-center gap-1.5 bg-[#FB6E08] hover:bg-[#e05f03] text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-[#FB6E08]/25 transition">
              {t('startYourShop')} <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #FB6E08 0, transparent 40%), radial-gradient(circle at 80% 70%, #FB6E08 0, transparent 35%)' }} />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-14 items-center relative">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm font-semibold text-orange-100">
              {t('heroBadge')}
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold leading-[1.1] text-white">
              {t('heroTitleMain')} <br className="hidden md:block" />
              <span style={{ color: ORANGE }}>{t('heroTitleMain2')}</span>
            </h1>
            <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-lg text-blue-100 leading-relaxed">
              {t('heroDesc')}
            </p>
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
              <a href="/demo"
                 className="inline-flex items-center gap-2 bg-white text-[#011F46] px-7 py-3.5 rounded-xl font-bold hover:bg-orange-50 shadow-xl transition">
                <FiSmartphone className="w-5 h-5" /> {t('browseDemo2')}
              </a>
              <Link to="/create-shop"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white shadow-xl transition hover:brightness-110"
                    style={{ backgroundColor: ORANGE }}>
                {t('startMyShop')} <FiArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="mt-5 text-sm text-blue-200">
              {t('needHelp')} <a className="font-semibold underline hover:text-white" href="https://t.me/your_telegram" target="_blank" rel="noreferrer">@your_telegram</a>
            </p>
          </div>

          {/* Phone frame: live demo shop */}
          <div className="flex justify-center">
            <div className="phone-frame shadow-2xl" style={{ width: 300, height: 620 }}>
              <iframe src={`${window.location.origin}/demo`} title="Mini Shop demo" className="w-full h-full rounded-[38px] bg-white" />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold" style={{ color: ORANGE }}><CountUp to={s.to} suffix={s.suffix} /></p>
                <p className="mt-1 text-sm text-blue-100">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ===== About Mini Shop Cambodia ===== */}
      <section id="about" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest" style={{ color: ORANGE }}>
                {t('aboutLabel')}
              </span>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#011F46] leading-tight">
                {t('aboutTitle')}
              </h2>
              <p className="mt-5 text-gray-600 leading-relaxed">
                {t('aboutP1')}
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('aboutP2')}
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aboutPoints.map((it) => (
                  <div key={it.text} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-[#FB6E08] text-white flex items-center justify-center shrink-0">{it.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{it.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/create-shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition hover:brightness-110"
                      style={{ backgroundColor: NAVY }}>
                  {t('startMyShop')} <FiArrowRight className="w-4 h-4" />
                </Link>
                <a href="https://t.me/your_telegram" target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2 border-2 border-[#FB6E08] text-[#FB6E08] px-6 py-3 rounded-xl font-bold hover:bg-[#FB6E08] hover:text-white transition">
                  <FiMessageCircle className="w-4 h-4" /> {t('talkToUs')}
                </a>
              </div>
            </div>

            {/* Value cards */}
            <div className="grid grid-cols-2 gap-4">
              {values.map((c) => (
                <div key={c.title} className="rounded-2xl p-6 border transition hover:shadow-xl hover:-translate-y-1"
                     style={{ backgroundColor: '#011F46', borderColor: '#011F46' }}>
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4">{c.icon}</div>
                  <h3 className="font-bold text-white">{c.title}</h3>
                  <p className="text-sm text-blue-100 mt-1">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="py-20" style={{ backgroundColor: '#F6F8FB' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: ORANGE }}>{t('featuresLabel')}</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#011F46]">{t('featuresTitle')}</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="group bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>{f.icon}</div>
                <h3 className="font-bold text-[#011F46]">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ===== How it works ===== */}
      <section id="steps" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: ORANGE }}>{t('howItWorks')}</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#011F46]">{t('stepsTitle')}</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl p-7 border-2 border-gray-100 hover:border-[#FB6E08] transition">
                <span className="absolute -top-5 left-6 w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg"
                      style={{ backgroundColor: ORANGE }}>{s.n}</span>
                <h3 className="mt-4 text-lg font-bold text-[#011F46]">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="pricing" className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: ORANGE }}>{t('pricingLabel')}</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-white">{t('pricingTitle')}</h2>
            <p className="mt-3 text-blue-200">{t('pricingSubtitle')}</p>
          </div>
          <div className="mt-8 max-w-xl mx-auto rounded-xl px-4 py-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-bold bg-white/10 border border-white/15 text-orange-100">
            <span>🔥 {t('free7Days')} · {t('free7DaysDesc')}</span>
            <span className="text-orange-300">{t('offerEndsIn')}: <OfferCountdown /> · {t('offerEndsDate')}</span>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: t('planStarter'), price: t('planStarterPrice'), period: t('planStarterPeriod'), feat: t('planStarterFeat'), highlight: false, free: true },
              { name: t('planGrowth'), price: t('planGrowthPrice'), period: t('planGrowthPeriod'), feat: t('planGrowthFeat'), highlight: false },
              { name: t('planPremium'), price: t('planPremiumPrice'), period: t('planPremiumPeriod'), feat: t('planPremiumFeat'), highlight: true, tag: t('popularTag') },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-2xl p-7 flex flex-col ${p.highlight ? 'bg-[#FB6E08] text-white shadow-2xl ring-4 ring-[#FB6E08]/30 scale-105' : 'bg-white text-[#011F46] border border-white/10'}`}>
                {p.tag && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#FB6E08] text-xs font-extrabold px-3 py-1 rounded-full shadow">{p.tag}</span>
                )}
                <h3 className={`font-bold text-lg ${p.highlight ? 'text-white' : 'text-[#FB6E08]'}`}>{p.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  <span className={`text-sm pb-1 ${p.highlight ? 'text-white/80' : 'text-gray-400'}`}>{p.period}</span>
                </div>
                {p.free && (
                  <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-block bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">{t('free7Days')}</span>
                    <span className="text-sm font-bold text-emerald-600">{t('planStarterFree')} {t('for7Days')}</span>
                    <span className="text-xs text-gray-400 line-through font-semibold">{t('planStarterWas')}</span>
                  </div>
                )}
                <ul className="mt-6 space-y-2.5 text-sm flex-1">
                  {p.feat.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <FiCheck className={`w-4 h-4 shrink-0 ${p.highlight ? 'text-white' : 'text-[#FB6E08]'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <div className={`mt-4 pt-3 border-t text-xs font-bold uppercase tracking-wide ${p.highlight ? 'border-white/30 text-white/90' : 'border-gray-200 text-gray-400'}`}>
                  {t('everythingIncluded')}
                </div>
                <ul className="mt-2 space-y-1.5 text-sm flex-1">
                  {t('planIncludes').map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <FiCheck className={`w-4 h-4 shrink-0 ${p.highlight ? 'text-white' : 'text-[#FB6E08]'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/create-shop"
                      className={`mt-6 block text-center py-3 rounded-xl font-bold transition ${p.highlight ? 'bg-white text-[#FB6E08] hover:bg-orange-50' : 'text-white hover:brightness-110'}`}
                      style={p.highlight ? {} : p.free ? { backgroundColor: '#10B981' } : { backgroundColor: NAVY }}>
                  {p.free ? t('openShopFree') : t('openShop')} <FiArrowRight className="inline w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl mx-auto text-center text-sm text-blue-200">
            <strong>{t('upgradeNote')}</strong>
          </p>
        </div>
      </section>


      {/* ===== Testimonials ===== */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: ORANGE }}>{t('testiLabel')}</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#011F46]">{t('testiTitle')}</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((tm) => (
              <div key={tm.name} className="rounded-2xl p-6 bg-[#F6F8FB] border border-gray-100 hover:shadow-xl transition">
                <div className="flex text-[#FB6E08] text-lg mb-4">★★★★★</div>
                <p className="text-sm text-gray-600 leading-relaxed">"{tm.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#011F46] text-white flex items-center justify-center font-bold">{tm.name[0]}</div>
                  <div>
                    <p className="text-sm font-bold text-[#011F46]">{tm.name}</p>
                    <p className="text-xs text-gray-400">{tm.shop}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section id="contact" className="py-20 relative overflow-hidden" style={{ backgroundColor: ORANGE }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">{t('ctaTitle')}</h2>
          <p className="mt-3 text-orange-50 text-lg">{t('ctaDesc')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/create-shop" className="inline-flex items-center gap-2 bg-white text-[#FB6E08] px-8 py-3.5 rounded-xl font-bold shadow-xl hover:bg-orange-50 transition">
              {t('startFree')} <FiArrowRight className="w-5 h-5" />
            </Link>
            <a href="https://t.me/your_telegram" target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-3.5 rounded-xl font-bold hover:bg-white hover:text-[#FB6E08] transition">
              <FiSend className="w-5 h-5" /> @your_telegram
            </a>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="text-gray-300" style={{ backgroundColor: NAVY }}>
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <BrandMark light />
            <p className="mt-4 text-sm text-blue-100 leading-relaxed">
              {t('footerAbout')}
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">{t('quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-[#FB6E08] transition">{t('aboutMiniShop')}</a></li>
              <li><a href="#features" className="hover:text-[#FB6E08] transition">{t('featuresLabel')}</a></li>
              <li><a href="#pricing" className="hover:text-[#FB6E08] transition">{t('pricingLabel')}</a></li>
              <li><Link to="/create-shop" className="hover:text-[#FB6E08] transition">{t('startYourShop')}</Link></li>
              <li><Link to="/demo" className="hover:text-[#FB6E08] transition">{t('browseDemo2')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">{t('contactFooter')}</h4>
            <ul className="space-y-2 text-sm">
              <li>📱 Telegram: <a className="font-semibold hover:text-[#FB6E08] transition" href="https://t.me/your_telegram" target="_blank" rel="noreferrer">@your_telegram</a></li>
              <li>🏪 {t('contactShops')}</li>
              <li>🕒 {t('contactSupport')}</li>
            </ul>
            <div className="mt-4">
              <LanguageSwitcher dark />
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-blue-200">
            <span>{t('poweredText')} · {lang === 'kh' ? 'ខ្មែរ' : 'English'}</span>
            <span>{t('copyright').replace('{year}', new Date().getFullYear())}</span>
          </div>
        </div>
      </footer>

      {/* Floating Telegram channel button — home page only */}
      <a
        href="https://t.me/your_telegram"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-20 md:bottom-6 right-4 z-[60] inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1d8cc1] text-white font-bold text-xs md:text-sm px-4 py-3 rounded-full shadow-2xl transition"
      >
        <FiSend className="w-4 h-4" /> {t('joinTelegram')}
      </a>
    </div>
  );
}

