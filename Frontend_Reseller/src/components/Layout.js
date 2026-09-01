import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiCopy, FiHome, FiLogOut, FiPercent, FiShoppingBag, FiSettings } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <FiHome />, end: true },
  { to: '/shops', label: 'Shops', icon: <FiShoppingBag /> },
  { to: '/commissions', label: 'Commissions', icon: <FiBarChart2 /> },
  { to: '/promo', label: 'Promo Code', icon: <FiPercent /> },
  { to: '/backup', label: 'Backup', icon: <FiCopy /> },
  { to: '/settings', label: 'Settings', icon: <FiSettings /> },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col fixed inset-y-0">
        <div className="p-5 border-b border-slate-700">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <FiPercent className="w-5 h-5 text-emerald-400" /> Mini Shop
          </h1>
          <p className="text-xs text-slate-400">Reseller · {user?.username}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 p-6">
        <Outlet />
      </main>
    </div>
  );
}
