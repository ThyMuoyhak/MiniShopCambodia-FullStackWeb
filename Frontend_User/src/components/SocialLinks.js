import React from 'react';
import { FaFacebook, FaInstagram, FaTiktok, FaTwitter, FaWhatsapp, FaYoutube, FaTelegramPlane } from 'react-icons/fa';
import { useShop } from '../contexts/ShopContext';

export default function SocialLinks() {
  const { shop } = useShop();
  const social = shop.social_media || {};

  const links = [
    { key: 'facebook', icon: <FaFacebook />, color: '#1877f2' },
    { key: 'instagram', icon: <FaInstagram />, color: '#e4405f' },
    { key: 'telegram', icon: <FaTelegramPlane />, color: '#0088cc' },
    { key: 'whatsapp', icon: <FaWhatsapp />, color: '#25d366' },
    { key: 'tiktok', icon: <FaTiktok />, color: '#000000' },
    { key: 'twitter', icon: <FaTwitter />, color: '#1da1f2' },
    { key: 'youtube', icon: <FaYoutube />, color: '#ff0000' },
  ];

  const visible = links.filter((l) => social[l.key]);

  if (visible.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {visible.map((l) => (
        <a
          key={l.key}
          href={social[l.key]}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:scale-110 transition"
          style={{ backgroundColor: l.color }}
          aria-label={l.key}
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}
