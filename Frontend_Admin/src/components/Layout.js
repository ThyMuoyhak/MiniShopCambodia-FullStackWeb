import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiActivity, FiDatabase, FiHome, FiLogOut, FiPercent, FiSettings, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <FiHome />, end: true },
  { to: '/shops', label: 'Shops', icon: <FiShoppingBag /> },
  { to: '/users', label: 'Users', icon: <FiUsers /> },
  { to: '/resellers', label: 'Resellers', icon: <FiPercent /> },
  { to: '/backup', label: 'Backup', icon: <FiDatabase /> },
  { to: '/activity', label: 'Activity Logs', icon: <FiActivity /> },
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
            <FiShoppingBag className="w-5 h-5" /> Mini Shop
          </h1>
          <p className="text-xs text-slate-400">Platform Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
              title="Logout"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 p-8">
        <Outlet />
      </main>
    </div>
  );
}
