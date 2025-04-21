// Hook for managing order items, quantities, and schemes
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Scheme, OrderItem, SchemeChoice } from '../types/products';

export const useOrderManagement = (shopId: string) => {
  // State variables
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Popular']);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [lastOrders, setLastOrders] = useState<Record<string, number>>({});
  const [schemeChoices, setSchemeChoices] = useState<SchemeChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if product has an active scheme
  const hasScheme = useCallback((product: Product): boolean => {
    return !!product.product_scheme_id && !!product.product_scheme_buy_qty;
  }, []);

  // Get scheme details for a product
  const getSchemeDetails = useCallback((product: Product): Scheme | undefined => {
    if (!product.product_scheme_id) return undefined;
    return schemes.find(scheme => scheme.scheme_id === product.product_scheme_id);
  }, [schemes]);

  // Get scheme text for display from the product properties
  const getSchemeDescription = useCallback((product: Product): string => {
    if (!product.product_scheme_id) return '';
    
    // Generate scheme text based on the scheme type
    switch(product.product_scheme_id) {
      case 1: // Buy X Get Y
        return `Buy ${product.product_scheme_buy_qty} Get ${product.product_scheme_get_qty}`;
      
      case 2: // Buy X Get Y OR product_id
        if (product.offer_product_name) {
          return `Buy ${product.product_scheme_buy_qty} Get ${product.product_scheme_get_qty} OR ${product.offer_product_name}`;
        }
        return `Buy ${product.product_scheme_buy_qty} Get ${product.product_scheme_get_qty} OR Free Product`;
      
      case 3: // Buy X Get Y AND product_id
        if (product.offer_product_name) {
          return `Buy ${product.product_scheme_buy_qty} Get ${product.product_scheme_get_qty} AND ${product.offer_product_name}`;
        }
        return `Buy ${product.product_scheme_buy_qty} Get ${product.product_scheme_get_qty} AND Free Product`;
      
      case 4: // Order-level scheme
        const scheme = schemes.find(s => s.scheme_id === 4);
        return scheme?.scheme_text || 'Order level scheme';
      
      default:
        return '';
    }
  }, [schemes]);

  // Get the current choice for a product
  const getSchemeChoice = useCallback((productId: string): 'freeQuantity' | 'offerProduct' | 'both' => {
    const choice = schemeChoices.find(c => c.productId === productId);
    return choice?.chosenOption || 'freeQuantity'; // Default to free quantity
  }, [schemeChoices]);

  // Apply scheme choices to order items - IMPORTANT: Define this before it's used
  const updateOrderWithChoices = useCallback((items: OrderItem[], choices: SchemeChoice[]): void => {
    // First, remove all free items to recalculate them based on current choices
    const regularItems = items.filter(item => !item.is_free);
    let updatedItems = [...regularItems];
    
    // Process each regular item to apply schemes
    regularItems.forEach(item => {
      const product = products.find(p => p.product_id === item.product_id);
      if (!product || !product.product_scheme_id) return;
      
      const scheme = schemes.find(s => s.scheme_id === product.product_scheme_id);
      if (!scheme) return;
      
      const schemeChoice = choices.find(c => c.productId === product.product_id);
      const chosenOption = schemeChoice?.chosenOption || 'freeQuantity';
      
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
              unit_of_measure: product.unit_of_measure
            });
          }
          break;
          
        case 2: // Buy X Get Y OR product_id
          if (chosenOption === 'freeQuantity' && product.product_scheme_get_qty) {
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
              unit_of_measure: product.unit_of_measure
            });
          } else if (chosenOption === 'offerProduct' && product.product_item_offer_id) {
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
                unit_of_measure: offerProduct.unit_of_measure
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
              unit_of_measure: product.unit_of_measure
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
                unit_of_measure: offerProduct.unit_of_measure
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
            unit_of_measure: 'Item'
          });
        }
      } else {
        // Remove any existing bag if order no longer qualifies
        updatedItems = updatedItems.filter(item => !(item.is_free && item.scheme_id === 4));
      }
    }
    
    // Update the order items
    setOrderItems(updatedItems);
  }, [products, schemes]);

  // Update order with offers based on schemes - IMPORTANT: Define this after updateOrderWithChoices
  const updateOrderWithOffers = useCallback((items: OrderItem[]): void => {
    // First, remove any existing free items
    const regularItems = items.filter(item => !item.is_free);
    
    // Apply scheme choices to order items
    updateOrderWithChoices(regularItems, schemeChoices);
  }, [schemeChoices, updateOrderWithChoices]);

  // Handle scheme choice for scheme type 2 (OR condition)
  const handleSchemeChoice = useCallback((productId: string, choice: 'freeQuantity' | 'offerProduct' | 'both') => {
    setSchemeChoices(prev => {
      // Remove any existing choice for this product
      const filtered = prev.filter(c => c.productId !== productId);
      // Add the new choice
      return [...filtered, { productId, chosenOption: choice }];
    });
    
    // Apply the choice by updating the order items
    updateOrderWithChoices([...orderItems], [...schemeChoices, { productId, chosenOption: choice }]);
  }, [orderItems, schemeChoices, updateOrderWithChoices]);

  // Get quantity for a product
  const getQuantity = useCallback((productId: string): number => {
    const item = orderItems.find(item => item.product_id === productId && !item.is_free);
    return item ? item.quantity : 0;
  }, [orderItems]);

  // Get free quantity for a product
  const getFreeQuantity = useCallback((productId: string): number => {
    const freeItems = orderItems.filter(item => item.product_id === productId && item.is_free);
    return freeItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  // Get offer product quantity for display
  const getOfferProductCount = useCallback((product: Product): number => {
    if (!product.product_item_offer_id) return 0;
    
    const offerItems = orderItems.filter(
      item => item.product_id === product.product_item_offer_id && 
      item.is_free && 
      item.free_gift_for === product.product_id
    );
    
    return offerItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  // Calculate if order qualifies for order-level scheme
  const orderQualifiesForOrderScheme = useCallback((): boolean => {
    const orderScheme = schemes.find(s => s.scheme_id === 4);
    if (!orderScheme || !orderScheme.scheme_min_price) return false;
    
    // Calculate total order value (excluding free items)
    const totalOrderValue = orderItems
      .filter(item => !item.is_free)
      .reduce((sum, item) => sum + item.amount, 0);
    
    return totalOrderValue >= orderScheme.scheme_min_price;
  }, [orderItems, schemes]);

  // Get order level scheme minimum price
  const getOrderSchemeMinPrice = useCallback((): number => {
    const orderScheme = schemes.find(s => s.scheme_id === 4);
    return orderScheme?.scheme_min_price || 0;
  }, [schemes]);

  // Increment item quantity
  const incrementQuantity = useCallback((product: Product) => {
    const existingItem = orderItems.find(item => item.product_id === product.product_id && !item.is_free);
    
    if (existingItem) {
      // Update existing item
      const updatedOrderItems = orderItems.map(item => 
        (item.product_id === product.product_id && !item.is_free)
          ? { 
              ...item, 
              quantity: item.quantity + 1, 
              amount: (item.quantity + 1) * item.unit_price 
            } 
          : item
      );
      
      // Apply offers to the updated items
      updateOrderWithOffers(updatedOrderItems);
    } else {
      // Add new item
      const newOrderItems = [
        ...orderItems.filter(item => !item.is_free), // Keep only non-free items
        {
          product_id: product.product_id,
          name: product.name,
          category: product.category,
          quantity: 1,
          unit_price: product.ptr || product.mrp, // Use PTR if available, otherwise fallback to MRP
          amount: product.ptr || product.mrp,
          unit_of_measure: product.unit_of_measure
        }
      ];
      
      // Apply offers
      updateOrderWithOffers(newOrderItems);
    }
  }, [orderItems, updateOrderWithOffers]);

  // Decrement item quantity
  const decrementQuantity = useCallback((product: Product) => {
    const existingItem = orderItems.find(item => item.product_id === product.product_id && !item.is_free);
    
    if (existingItem) {
      let updatedOrderItems;
      
      if (existingItem.quantity === 1) {
        // Remove item if quantity becomes zero
        updatedOrderItems = orderItems.filter(item => !(item.product_id === product.product_id && !item.is_free));
      } else {
        // Decrease quantity
        updatedOrderItems = orderItems.map(item => 
          (item.product_id === product.product_id && !item.is_free)
            ? { 
                ...item, 
                quantity: item.quantity - 1, 
                amount: (item.quantity - 1) * item.unit_price 
              } 
            : item
        );
      }
      
      // Apply offers to the updated items
      updateOrderWithOffers(updatedOrderItems);
    }
  }, [orderItems, updateOrderWithOffers]);

  // Initialize state from location if passed
  useEffect(() => {
    // Check if we have previous order items in location state
    const locationState = window.history.state?.usr?.orderItems;
    if (locationState && locationState.length > 0) {
      setOrderItems(locationState);
    }
  }, []);

  // Fetch products, schemes, and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch schemes first
        const { data: schemesData, error: schemesError } = await supabase
          .from('schemes')
          .select('*')
          .eq('is_active', true);
          
        if (schemesError) {
          throw schemesError;
        }
        
        if (schemesData) {
          setSchemes(schemesData);
        }
        
        // Fetch products with all related data
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            schemes(scheme_text, scheme_scope)
          `)
          .eq('is_active', true);
          
        if (error) {
          throw error;
        }
        
        if (data) {
          // Process products to add offer product names where applicable
          const enhancedProducts: Product[] = await Promise.all(
            data.map(async (product) => {
              // If product has an offer item, fetch its name
              if (product.product_item_offer_id) {
                const { data: offerProduct } = await supabase
                  .from('products')
                  .select('name')
                  .eq('product_id', product.product_item_offer_id)
                  .single();
                
                return {
                  ...product,
                  offer_product_name: offerProduct?.name
                };
              }
              
              return product;
            })
          );
          
          setProducts(enhancedProducts);
          
          // Extract unique categories from products
          const uniqueCategories = [...new Set(data.map(product => product.category))].filter(Boolean);
          setCategories(['Popular', ...uniqueCategories]);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setError('Error loading products');
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch last orders for this shop
    const fetchLastOrders = async () => {
      if (!shopId) return;
      
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            product_id,
            quantity,
            visits!inner(
              shop_id
            )
          `)
          .eq('visits.shop_id', shopId)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (error) {
          console.error('Error fetching last orders:', error);
          return;
        }
        
        if (data) {
          const lastOrdersMap: Record<string, number> = {};
          
          // Find the most recent order for each product
          data.forEach((order) => {
            if (!lastOrdersMap[order.product_id]) {
              lastOrdersMap[order.product_id] = order.quantity;
            }
          });
          
          setLastOrders(lastOrdersMap);
        }
      } catch (err) {
        console.error('Error processing last orders:', err);
      }
    };
    
    fetchData();
    fetchLastOrders();
  }, [shopId]);

  // Calculate total items and value
  const regularItemsCount = orderItems.filter(item => !item.is_free);
  const totalItems = regularItemsCount.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = regularItemsCount.reduce((sum, item) => sum + item.amount, 0);
  
  // Check if there are free items
  const hasFreeItems = orderItems.some(item => item.is_free);

  return {
    products,
    orderItems,
    categories,
    schemes,
    lastOrders,
    schemeChoices,
    loading,
    error,
    totalItems,
    totalValue,
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
  };
};

export default useOrderManagement;