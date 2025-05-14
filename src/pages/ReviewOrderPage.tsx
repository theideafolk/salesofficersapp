// Review Order page component for reviewing and confirming an order
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Minus, Plus, Gift, Loader2 } from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import { OrderItem, Product, Scheme } from '../types/products';
import { formatCurrency } from '../utils/formatHelpers';
import { useLanguage } from '../context/LanguageContext';

interface LocationState {
  orderItems: OrderItem[];
  shopId: string;
  visitId: string;
  shopName: string;
  totalValue: number;
  products: Product[];
  isEditing?: boolean;
  orderToEdit?: any;
}

const ReviewOrderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  const { 
    orderItems: initialOrderItems, 
    shopId, 
    visitId, 
    shopName, 
    products = [],
    isEditing = false,
    orderToEdit
  } = location.state as LocationState;
  
  // State variables
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  
  // Fetch schemes on component mount
  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const { data, error } = await supabase
          .from('schemes')
          .select('*')
          .eq('is_active', true);
          
        if (error) throw error;
        if (data) setSchemes(data);
      } catch (err) {
        console.error('Error fetching schemes:', err);
      }
    };
    
    fetchSchemes();
  }, []);
  
  // Get regular items and calculate totals
  const regularItems = orderItems.filter(item => !item.is_free);
  const totalItemsCount = regularItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = regularItems.reduce((sum, item) => sum + item.amount, 0);
  
  // Apply schemes based on current regular items
  const applySchemes = (items: OrderItem[]): OrderItem[] => {
    // First, filter to regular items only (non-free)
    const regularItems = items.filter(item => !item.is_free);
    let updatedItems = [...regularItems];
    
    // Process each regular item to apply schemes
    regularItems.forEach(item => {
      const product = products.find(p => p.product_id === item.product_id);
      if (!product || !product.product_scheme_id) return;
      
      const scheme = schemes.find(s => s.scheme_id === product.product_scheme_id);
      if (!scheme) return;
      
      // Skip if quantity doesn't meet the buy quantity
      if (!product.product_scheme_buy_qty || item.quantity < product.product_scheme_buy_qty) {
        return;
      }
      
      // Calculate how many sets of free items to give
      const setsCount = Math.floor(item.quantity / product.product_scheme_buy_qty!);
      
      switch(scheme.scheme_id) {
        case 1: // Buy X Get Y
          // Always add free quantity for scheme 1
          if (product.product_scheme_get_qty) {
            updatedItems.push({
              product_id: product.product_id,
              name: product.name,
              category: product.category,
              quantity: setsCount * product.product_scheme_get_qty,
              unit_price: 0, // Free items have zero price
              amount: 0,
              is_free: true,
              free_gift_for: product.product_id,
              scheme_id: 1,
              unit_of_measure: product.unit_of_measure,
              free_qty: setsCount * product.product_scheme_get_qty
            });
          }
          break;
          
        case 2: // Buy X Get Y OR product_id
          // For review page, we'll just use whatever choice was made in the place order page
          // Find the existing choice by checking if there's a free item of the same product or a free offer product
          const hasSameProductFree = orderItems.some(oi => 
            oi.is_free && oi.product_id === product.product_id && oi.free_gift_for === product.product_id
          );
          
          const hasOfferProductFree = product.product_item_offer_id && orderItems.some(oi => 
            oi.is_free && oi.product_id === product.product_item_offer_id && oi.free_gift_for === product.product_id
          );
          
          if ((hasSameProductFree || !hasOfferProductFree) && product.product_scheme_get_qty) {
            // Add free items of the same product
            updatedItems.push({
              product_id: product.product_id,
              name: product.name,
              category: product.category,
              quantity: setsCount * product.product_scheme_get_qty,
              unit_price: 0,
              amount: 0,
              is_free: true,
              free_gift_for: product.product_id,
              scheme_id: 2,
              unit_of_measure: product.unit_of_measure,
              free_qty: setsCount * product.product_scheme_get_qty
            });
          } else if (hasOfferProductFree && product.product_item_offer_id) {
            // Add offer product
            const offerProduct = products.find(p => p.product_id === product.product_item_offer_id);
            if (offerProduct) {
              updatedItems.push({
                product_id: offerProduct.product_id,
                name: offerProduct.name,
                category: offerProduct.category,
                quantity: setsCount, // One offer product per set
                unit_price: 0,
                amount: 0,
                is_free: true,
                free_gift_for: product.product_id,
                scheme_id: 2,
                unit_of_measure: offerProduct.unit_of_measure,
                free_product_id: offerProduct.product_id
              });
            }
          }
          break;
          
        case 3: // Buy X Get Y AND product_id
          // Add both free quantity and offer product
          if (product.product_scheme_get_qty) {
            // Add free items of the same product
            updatedItems.push({
              product_id: product.product_id,
              name: product.name,
              category: product.category,
              quantity: setsCount * product.product_scheme_get_qty,
              unit_price: 0,
              amount: 0,
              is_free: true,
              free_gift_for: product.product_id,
              scheme_id: 3,
              unit_of_measure: product.unit_of_measure,
              free_qty: setsCount * product.product_scheme_get_qty
            });
          }
          
          // Add offer product if it exists
          if (product.product_item_offer_id) {
            const offerProduct = products.find(p => p.product_id === product.product_item_offer_id);
            if (offerProduct) {
              updatedItems.push({
                product_id: offerProduct.product_id,
                name: offerProduct.name,
                category: offerProduct.category,
                quantity: setsCount, // One offer product per set
                unit_price: 0,
                amount: 0,
                is_free: true,
                free_gift_for: product.product_id,
                scheme_id: 3,
                unit_of_measure: offerProduct.unit_of_measure,
                free_product_id: offerProduct.product_id
              });
            }
          }
          break;
      }
    });
    
    // Check if order qualifies for order-level scheme (scheme_id 4)
    const orderScheme = schemes.find(s => s.scheme_id === 4);
    if (orderScheme && orderScheme.scheme_min_price) {
      const totalOrderValue = updatedItems
        .filter(item => !item.is_free)
        .reduce((sum, item) => sum + item.amount, 0);
      
      if (totalOrderValue >= orderScheme.scheme_min_price) {
        // Find if we already have a traveler bag in the order
        const existingBagItem = updatedItems.find(item => item.is_free && item.scheme_id === 4);
        
        if (!existingBagItem) {
          // Add the free traveler bag
          updatedItems.push({
            product_id: 'order-scheme-bag', // Special ID for the bag
            name: 'Traveler Bag',
            category: 'Accessories',
            quantity: 1,
            unit_price: 0,
            amount: 0,
            is_free: true,
            scheme_id: 4,
            unit_of_measure: 'Item',
            free_qty: 1
          });
        }
      } else {
        // Remove any existing bag if order no longer qualifies
        updatedItems = updatedItems.filter(item => !(item.is_free && item.scheme_id === 4));
      }
    }
    
    return updatedItems;
  };
  
  // Update quantity and recalculate amounts
  const handleQuantityChange = (productId: string, action: 'increase' | 'decrease') => {
    const updatedItems = [...orderItems];
    const itemIndex = updatedItems.findIndex(item => item.product_id === productId && !item.is_free);
    
    if (itemIndex === -1) return;
    
    const item = updatedItems[itemIndex];
    
    if (action === 'increase') {
      // Increase quantity
      updatedItems[itemIndex] = {
        ...item,
        quantity: item.quantity + 1,
        amount: (item.quantity + 1) * item.unit_price
      };
    } else {
      // Decrease quantity, remove if reaches 0
      if (item.quantity === 1) {
        updatedItems.splice(itemIndex, 1);
      } else {
        updatedItems[itemIndex] = {
          ...item,
          quantity: item.quantity - 1,
          amount: (item.quantity - 1) * item.unit_price
        };
      }
    }
    
    // Remove free items first to allow for recalculation
    const regularItems = updatedItems.filter(item => !item.is_free);
    
    // Update the order items
    setOrderItems(applySchemes(regularItems));
  };
  
  // Handle back button navigation
  const handleBack = () => {
    // Navigate back with current order items to preserve cart state
    navigate(`/shops/${shopId}/order`, { 
      state: { 
        visitId, 
        shopName,
        orderItems,
        isEditing,
        orderToEdit
      },
      replace: true 
    });
  };
  
  // Handle placing or updating the order
  const handlePlaceOrder = async () => {
    if (!shopId || regularItems.length === 0) {
      setError('Missing required information to place order');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Determine if we're creating a new order or updating an existing one
      const order_id = isEditing && orderToEdit ? orderToEdit.order_id : crypto.randomUUID();
      
      // Store the visit_id for use in new inserts
      let existingVisitId: string | undefined;
      
      // If editing an existing order, delete the existing items first
      if (isEditing && orderToEdit) {
        console.log('Updating existing order:', order_id);
        
        // Get the visit_id from the existing order before deleting
        const { data: existingOrders, error: fetchError } = await supabase
          .from('orders')
          .select('visit_id')
          .eq('order_id', order_id)
          .limit(1);
          
        if (fetchError) {
          console.error('Error fetching existing order:', fetchError);
          throw new Error(`Failed to fetch existing order: ${fetchError.message}`);
        }
        
        // Store the visit_id for use in new inserts
        existingVisitId = existingOrders?.[0]?.visit_id;
        
        // Delete existing order items
        const { error: deleteError } = await supabase
          .from('orders')
          .delete()
          .eq('order_id', order_id);
          
        if (deleteError) {
          console.error('Error deleting existing order items:', deleteError);
          throw new Error(`Failed to update order: ${deleteError.message}`);
        }
        
        // Add a delay to ensure the delete operation completes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Successfully deleted existing order items, now inserting new items');
      }

      // Ensure we have a valid visit_id
      // For existing orders, always use the existing visit_id
      // For new orders, use the current visitId
      const finalVisitId = isEditing ? existingVisitId : visitId;
      
      if (!finalVisitId || !user) {
        console.error('No valid visit_id or user available:', { 
          isEditing, 
          existingVisitId, 
          currentVisitId: visitId, 
          user 
        });
        throw new Error('No valid visit_id or user available for the order');
      }

      console.log('Using visit_id:', finalVisitId, 'for order:', order_id);

      // Prepare order items for insertion
      const orderInserts = regularItems.map(item => ({
        order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        amount: item.amount,
        visit_id: finalVisitId, // Use the validated visit_id
        currency: 'INR',
        created_at: new Date().toISOString(),
        is_deleted: false,
        free_qty: item.free_qty || 0,
        free_product_id: item.free_product_id || null,
        scheme_id: item.scheme_id || null,
        sales_officers_id: user.id // Add the sales_officers_id field
      }));
      
      console.log('Inserting order items:', orderInserts);
      
      // For editing orders, use UPSERT to avoid duplicate key violations
      if (isEditing) {
        // Use upsert with ON CONFLICT DO UPDATE to handle existing records
        const { data, error } = await supabase
          .from('orders')
          .upsert(orderInserts, { 
            onConflict: 'order_id,product_id',
            ignoreDuplicates: false
          })
          .select();
          
        if (error) {
          console.error('Error upserting order items:', error);
          throw error;
        }
      } else {
        // For new orders, process items one by one to avoid conflicts
        for (const item of orderInserts) {
          // Check if this order_id + product_id combination already exists
          const { data: existingOrder, error: checkError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', item.order_id)
            .eq('product_id', item.product_id)
            .single();
            
          if (checkError && checkError.code !== 'PGRST116') {
            // If error is not "no rows returned", it's a real error
            console.error('Error checking existing order:', checkError);
            throw checkError;
          }
          
          if (existingOrder) {
            // Update existing order
            const { error: updateError } = await supabase
              .from('orders')
              .update(item)
              .eq('order_id', item.order_id)
              .eq('product_id', item.product_id);
              
            if (updateError) {
              console.error('Error updating order item:', updateError);
              throw updateError;
            }
          } else {
            // Insert new order
            const { error: insertError } = await supabase
              .from('orders')
              .insert(item);
              
            if (insertError) {
              console.error('Error inserting order item:', insertError);
              throw insertError;
            }
          }
        }
      }

      // Order placed successfully
      setSuccess(true);
      console.log('Order ' + (isEditing ? 'updated' : 'placed') + ' successfully');
      
      // Show success for 2 seconds then navigate
      setTimeout(() => {
        navigate('/orders', { 
          state: { 
            success: true, 
            message: isEditing ? 'Order updated successfully' : 'Order placed successfully' 
          } 
        });
      }, 2000);
      
    } catch (err) {
      console.error('Error placing order:', err);
      setError(isEditing ? 'Failed to update order. Please try again.' : 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center p-4 relative border-b">
        <button 
          onClick={handleBack}
          className="absolute left-4 text-black"
          aria-label="Back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{t('cartSummary')}</h1>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20">
        {/* Error Message */}
        {error && (
          <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="my-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md text-center">
            <div className="font-bold">{isEditing ? 'Order updated successfully' : 'Order placed successfully'}</div>
            <p>Redirecting to orders page...</p>
          </div>
        )}
        
        {/* Cart Items Header */}
        <div className="flex justify-between items-center mt-4 mb-6">
          <h2 className="text-2xl font-bold">{t('cartItems')}</h2>
          <span className="text-lg">{shopName}</span>
        </div>
        
        {/* Product List */}
        <div className="space-y-4">
          {regularItems.map((item) => (
            <div key={item.product_id} className="border rounded-lg p-4">
              <div className="flex justify-between mb-1">
                <h3 className="text-lg font-bold">{item.name}</h3>
                <span className="text-lg font-bold">{formatCurrency(item.amount)}</span>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-700">
                    {item.unit_of_measure || `Box of ${item.quantity}`}
                  </p>
                  <p className="text-sm text-gray-700">
                    {formatCurrency(item.unit_price)} each
                  </p>
                  
                  {/* Display free items associated with this product */}
                  {orderItems.some(freeItem => 
                    freeItem.is_free && 
                    freeItem.free_gift_for === item.product_id &&
                    freeItem.product_id === item.product_id
                  ) && (
                    <div className="mt-1 text-xs text-green-600 flex items-center">
                      <Gift size={12} className="mr-1" />
                      <span>
                        {orderItems
                          .filter(freeItem => 
                            freeItem.is_free && 
                            freeItem.free_gift_for === item.product_id && 
                            freeItem.product_id === item.product_id
                          )
                          .reduce((sum, item) => sum + item.quantity, 0)
                        } free included
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => handleQuantityChange(item.product_id, 'decrease')} 
                    className="h-10 w-12 flex items-center justify-center text-2xl"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="h-10 w-12 flex items-center justify-center text-lg">
                    {item.quantity}
                  </div>
                  <button 
                    onClick={() => handleQuantityChange(item.product_id, 'increase')} 
                    className="h-10 w-12 flex items-center justify-center text-2xl"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Free items displayed separately if they're different products */}
        {orderItems.some(item => item.is_free && item.product_id !== item.free_gift_for) && (
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2">Free Items</h3>
            <div className="space-y-4">
              {orderItems
                .filter(item => item.is_free && item.product_id !== item.free_gift_for)
                .map((item, index) => (
                  <div key={`${item.product_id}-${index}`} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between mb-1">
                      <h3 className="text-md font-bold flex items-center">
                        <Gift size={16} className="mr-2 text-green-600" />
                        {item.name}
                      </h3>
                      <span className="text-md font-bold text-green-600">FREE</span>
                    </div>
                    <p className="text-sm text-gray-700">Quantity: {item.quantity}</p>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        {/* Notes Field */}
        <div className="mt-6 mb-6">
          <input
            type="text"
            placeholder={t('addNotes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg p-4 text-gray-700"
          />
        </div>
        
        {/* Order Summary */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-xl font-bold">{t('totalItems')}: {totalItemsCount}</span>
          <span className="text-xl font-bold">{t('subtotal')}: {formatCurrency(totalValue)}</span>
        </div>
        
        {/* Confirm Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading || regularItems.length === 0}
          className={`w-full py-5 rounded-lg text-white font-bold text-xl flex items-center justify-center ${
            loading || regularItems.length === 0 
              ? 'bg-green-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              {t('processing')}
            </>
          ) : (
            isEditing ? t('updateOrder') : t('confirmOrder')
          )}
        </button>
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ReviewOrderPage;