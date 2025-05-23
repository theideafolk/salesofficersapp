// Place Order page component for ordering products after a shop visit
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, LogOut, Minus, Plus } from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import ProductSearch from '../components/order/ProductSearch';
import CategoryList from '../components/order/CategoryList';
import PopularProducts from '../components/order/PopularProducts';
import ProductList from '../components/order/ProductList';
import OrderSummary from '../components/order/OrderSummary';
import useOrderManagement from '../hooks/useOrderManagement';
import { OrderItem, Product } from '../types/products';
import useShopTopProducts from '../hooks/useShopTopProducts';
import { formatCurrency } from '../utils/formatHelpers';
import { useLanguage } from '../context/LanguageContext';

const PlaceOrderPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { shopId } = useParams<{ shopId: string }>();
  const location = useLocation();
  const { t } = useLanguage();
  
  const visitId = location.state?.visitId as string;
  const shopName = location.state?.shopName as string;
  const savedOrderItems = location.state?.orderItems as OrderItem[] | undefined;
  const orderToEdit = location.state?.orderToEdit;
  const isEditing = location.state?.isEditing || false;
  
  // State variables
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Popular');
  
  // Use custom hook for order management
  const {
    products,
    orderItems,
    categories,
    loading,
    error,
    totalItems,
    totalValue,
    lastOrders,
    hasScheme,
    getSchemeDetails,
    getSchemeDescription,
    handleSchemeChoice,
    getSchemeChoice,
    getQuantity,
    getFreeQuantity,
    getOfferProductCount,
    incrementQuantity,
    decrementQuantity,
    orderQualifiesForOrderScheme,
    getOrderSchemeMinPrice,
    hasFreeItems,
    setOrderItems
  } = useOrderManagement(shopId || '');

  // Use custom hook to get top products for the shop
  const { productsWithDetails: topShopProducts, loading: topProductsLoading } = useShopTopProducts(shopId);

  // Initialize orderItems if returning from review page or editing an order
  useEffect(() => {
    if (savedOrderItems && savedOrderItems.length > 0) {
      setOrderItems(savedOrderItems);
    } else if (isEditing && orderToEdit && orderToEdit.items) {
      // Convert order items to the format expected by the order management hook
      const editItems = orderToEdit.items.map(item => ({
        product_id: item.product_id,
        name: item.product_name,
        category: item.category || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        unit_of_measure: item.unit_of_measure,
        is_free: false // Regular items are not free
      }));
      
      setOrderItems(editItems);
    }
  }, [savedOrderItems, orderToEdit, isEditing, setOrderItems]);

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  
  // Handle back button
  const handleBack = () => {
    navigate('/shops');
  };
  
  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle category selection
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesCategory = 
        activeCategory === 'Popular' || 
        product.category === activeCategory;
        
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);
  
  // Get popular products from top ordered products for this shop, or fallback to first 5
  const popularProducts = useMemo(() => {
    if (topShopProducts && topShopProducts.length > 0) {
      return topShopProducts;
    } else {
      return products.length > 0 ? products.slice(0, 5) : [];
    }
  }, [topShopProducts, products]);

  // Handle review order button
  const handleReviewOrder = () => {
    if (orderItems.filter(item => !item.is_free).length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    
    // Navigate to review order page with the order details
    navigate('/review-order', { 
      state: { 
        orderItems,
        shopId,
        visitId, // This can be undefined for editing without a visit
        shopName,
        totalValue,
        products,
        isEditing,
        orderToEdit
      } 
    });
  };
  
  // JSX for free items list
  const freeItemsList = useMemo(() => (
    <ul className="text-green-700 text-sm pl-6">
      {orderItems
        .filter(item => item.is_free)
        .map((item, idx) => (
          <li key={`${item.product_id}-${idx}`}>
            {item.quantity} x {item.name}
          </li>
        ))}
    </ul>
  ), [orderItems]);

  // Get current order items for editing
  const currentOrderItems = useMemo(() => {
    return orderItems.filter(item => !item.is_free);
  }, [orderItems]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white shadow-sm">
        <button 
          onClick={handleBack}
          className="text-gray-800 focus:outline-none"
          aria-label="Back"
        >
          <ArrowLeft size={24} />
        </button>
        
        <h1 className="text-xl font-bold">{isEditing ? t('editOrder') : t('placeOrder')}</h1>
        
        <button 
          onClick={handleLogout}
          className="text-gray-800 focus:outline-none"
          aria-label="Logout"
        >
          <LogOut size={24} />
        </button>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow p-4 pb-20">
        {/* Search Bar */}
        <ProductSearch 
          searchTerm={searchTerm}
          onSearch={handleSearch}
          placeholder={t('searchProduct')}
        />
        
        {/* Current Order Items (when editing) - Horizontal scroll */}
        {isEditing && (
          <>
            <h2 className="text-xl font-bold mb-4">
              {t('editOrder')} {shopName || 'Shop'}
            </h2>
            
            {currentOrderItems.length > 0 ? (
              <div className="mb-6 overflow-x-auto pb-4 -mx-4 px-4">
                <div className="flex space-x-3 min-w-max">
                  {currentOrderItems.map((item) => {
                    const product = products.find(p => p.product_id === item.product_id);
                    if (!product) return null;
                    
                    return (
                      <div 
                        key={item.product_id} 
                        className="border rounded-lg p-3 relative min-w-[180px] max-w-[200px]"
                      >
                        <h3 className="font-bold">{item.name}</h3>
                        <p className="text-sm text-gray-700">
                          {item.unit_of_measure || 'Standard pack'}
                        </p>
                        
                        <div className="flex items-center bg-gray-100 rounded-full p-1 my-2">
                          <button 
                            onClick={() => decrementQuantity(product)} 
                            className="h-8 w-8 flex items-center justify-center"
                          >
                            <Minus size={18} />
                          </button>
                          <span className="font-medium px-3">{item.quantity}</span>
                          <button 
                            onClick={() => incrementQuantity(product)} 
                            className="h-8 w-8 flex items-center justify-center"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        
                        <p className="text-xl font-bold">
                          {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-yellow-50 rounded-lg mb-6">
                <p className="text-yellow-700">No products in this order. Add products below.</p>
              </div>
            )}
            
            <h2 className="text-xl font-bold mb-4">{t('addMoreProducts')}</h2>
          </>
        )}
        
        {/* Popular Products Title */}
        {!isEditing && (
          <h2 className="text-xl font-bold mb-4">
            {t('popularProducts')} - {shopName || 'Shop'}
          </h2>
        )}
        
        {/* Loading state */}
        {(loading || topProductsLoading) && !isEditing && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {!loading && !topProductsLoading && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {products.length === 0 && !loading && !error && (
              <div className="text-center py-6 text-gray-500">
                {t('noProductsAvailable')}
              </div>
            )}
            
            {/* Popular Products Horizontal Scroll */}
            <PopularProducts
              products={popularProducts}
              getQuantity={getQuantity}
              getFreeQuantity={getFreeQuantity}
              getOfferProductCount={getOfferProductCount}
              lastOrders={lastOrders}
              getSchemeChoice={getSchemeChoice}
              hasScheme={hasScheme}
              getSchemeDescription={getSchemeDescription}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onSchemeChoiceChange={handleSchemeChoice}
            />
            
            {/* Categories */}
            <CategoryList
              categories={categories}
              activeCategory={activeCategory}
              onChange={handleCategoryChange}
            />
            
            {/* Product List */}
            <ProductList
              products={filteredProducts}
              getQuantity={getQuantity}
              getFreeQuantity={getFreeQuantity}
              getOfferProductCount={getOfferProductCount}
              lastOrders={lastOrders}
              getSchemeChoice={getSchemeChoice}
              hasScheme={hasScheme}
              getSchemeDescription={getSchemeDescription}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onSchemeChoiceChange={handleSchemeChoice}
            />
          </>
        )}
        
        {/* Order Summary */}
        <OrderSummary
          totalItems={totalItems}
          totalValue={totalValue}
          hasOrderLevelScheme={true}
          qualifiesForOrderScheme={orderQualifiesForOrderScheme()}
          orderSchemeMinPrice={getOrderSchemeMinPrice()}
          orderSchemeText="free Traveler Bag worth ₹600.00"
          hasFreeItems={hasFreeItems}
          freeItems={freeItemsList}
          onReview={handleReviewOrder}
          disableReview={orderItems.filter(item => !item.is_free).length === 0}
        />
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default PlaceOrderPage;