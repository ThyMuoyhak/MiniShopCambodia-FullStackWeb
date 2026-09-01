import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';
import { CartProvider } from './contexts/CartContext';
import { ShopProvider } from './contexts/ShopContext';
import { OwnerProvider } from './contexts/OwnerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ShopLayout from './components/ShopLayout';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import CreateShop from './pages/CreateShop';
import ShopHome from './pages/ShopHome';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import About from './pages/About';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import { useLanguage } from './i18n';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CartProvider>
          <OwnerProvider>
            <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create-shop" element={<CreateShop />} />
          <Route
            path="/:username"
            element={
              <ShopProvider>
                <ShopLayout />
              </ShopProvider>
            }
          >
            <Route index element={<ShopHome />} />
            <Route path="products" element={<Products />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-success" element={<OrderSuccess />} />
            <Route path="my-orders" element={<MyOrders />} />
            <Route path="profile" element={<Profile />} />
            <Route path="about" element={<About />} />
          </Route>
          <Route path="*" element={<NotFound />} />
            </Routes>
          </OwnerProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <FiAlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
      <h1 className="text-4xl font-bold text-gray-800">404</h1>
      <p className="text-gray-500 mt-2">{t('notFound404')}</p>
      <a href="/" className="btn-primary mt-6 px-6 py-2 rounded-lg">{t('backHome')}</a>
    </div>
  );
}
