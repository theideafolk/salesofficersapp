// Main App component with routing
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ShopsPage from './pages/ShopsPage';
import ShopVisitPage from './pages/ShopVisitPage';
import AddShopPage from './pages/AddShopPage';
import PlaceOrderPage from './pages/PlaceOrderPage';
import ReviewOrderPage from './pages/ReviewOrderPage';
import OrdersPage from './pages/OrdersPage';
import SalesPage from './pages/SalesPage';
import ProfilePage from './pages/ProfilePage';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public route - redirects to home if already logged in
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />
      <Route path="/shops" element={
        <ProtectedRoute>
          <ShopsPage />
        </ProtectedRoute>
      } />
      <Route path="/shops/new" element={
        <ProtectedRoute>
          <AddShopPage />
        </ProtectedRoute>
      } />
      <Route path="/shops/:shopId/visit" element={
        <ProtectedRoute>
          <ShopVisitPage />
        </ProtectedRoute>
      } />
      <Route path="/shops/:shopId/order" element={
        <ProtectedRoute>
          <PlaceOrderPage />
        </ProtectedRoute>
      } />
      <Route path="/review-order" element={
        <ProtectedRoute>
          <ReviewOrderPage />
        </ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute>
          <OrdersPage />
        </ProtectedRoute>
      } />
      <Route path="/sales" element={
        <ProtectedRoute>
          <SalesPage />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;