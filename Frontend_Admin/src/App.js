import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Shops from './pages/Shops';
import ShopDetail from './pages/ShopDetail';
import Users from './pages/Users';
import Resellers from './pages/Resellers';
import ResellerDetail from './pages/ResellerDetail';
import Backup from './pages/Backup';
import ActivityLogs from './pages/ActivityLogs';
import Settings from './pages/Settings';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="shops" element={<Shops />} />
          <Route path="shops/:id" element={<ShopDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="resellers" element={<Resellers />} />
          <Route path="resellers/:id" element={<ResellerDetail />} />
          <Route path="backup" element={<Backup />} />
          <Route path="activity" element={<ActivityLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
