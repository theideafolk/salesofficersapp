// Type definitions for products and orders

// Product type with scheme fields
export interface Product {
  product_id: string;
  name: string;
  category: string;
  mrp: number;
  ptr: number; // Price to retailer
  unit_of_measure?: string;
  // Scheme related fields
  product_scheme_buy_qty?: number;
  product_scheme_get_qty?: number;
  product_item_offer_id?: string;
  product_scheme_id?: number;
  scheme_type?: string;
  // Offer product details (joined data)
  offer_product_name?: string; 
}

// Scheme type for product and order level schemes
export interface Scheme {
  scheme_id: number;
  scheme_text: string;
  scheme_scope: 'product' | 'order';
  scheme_min_price?: number;
}

// Order item for tracking items in the order
export interface OrderItem {
  product_id: string;
  quantity: number;
  amount: number;
  name: string;
  category: string;
  unit_price: number;
  unit_of_measure?: string;
  is_free?: boolean; // Flag to indicate if this is a free item
  free_gift_for?: string; // Product ID for which this is a free gift
  scheme_id?: number; // The scheme ID that generated this item
}

// Schema choice for tracking user selections for schemes
export interface SchemeChoice {
  productId: string;
  chosenOption: 'freeQuantity' | 'offerProduct' | 'both';
}

// Last order info for displaying previously ordered quantities
export interface LastOrderInfo {
  product_id: string;
  quantity: number;
}