import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import { User, ShoppingBag, CreditCard, ChevronLeft, ChevronRight, Menu, LogOut } from 'lucide-react';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import SideMenu from '../components/home/SideMenu';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { useNavigate } from 'react-router-dom';

const BAR_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TARGET_SHOPS_PER_DAY = 25;

function getStartOfPeriod(period: string) {
  const now = new Date();
  if (period === 'Today') {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (period === 'This Week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
  if (period === 'This Month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return now;
}

const SalesPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate ? useNavigate() : () => {};
  const [period, setPeriod] = useState<'Today' | 'This Week' | 'This Month'>('Today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barData, setBarData] = useState<number[]>([0,0,0,0,0,0]);
  const [visitedCount, setVisitedCount] = useState(0);
  const [orderedCount, setOrderedCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [totalShops, setTotalShops] = useState(TARGET_SHOPS_PER_DAY);
  const [barLabels, setBarLabels] = useState<string[]>(BAR_LABELS);
  const [barDates, setBarDates] = useState<string[]>([]); // For mm/yy or dd/mm
  const [barWindow, setBarWindow] = useState(0); // For bar chart navigation
  const barsPerPage = 7;
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  // Touch state for swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  // Side menu and delete modal state
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const fetchStats = async () => {
      try {
        const start = getStartOfPeriod(period);
        const end = new Date();
        // Visits (for bar chart and shops visited)
        const { data: visits, error: visitsError } = await supabase
          .from('visits')
          .select('visit_id, shop_id, visit_time')
          .gte('visit_time', start.toISOString())
          .lte('visit_time', end.toISOString())
          .eq('is_deleted', false);
        // Orders (for shops ordered and revenue, and user filtering)
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('order_id, amount, created_at, visit_id, sales_officers_id')
          .eq('is_deleted', false)
          .eq('sales_officers_id', user.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false });
        if (visitsError || ordersError) throw visitsError || ordersError;

        // --- Bar Chart Data: shops visited per day/hour ---
        let bars: number[] = [];
        let labels: string[] = [];
        let dates: string[] = [];
        const now = new Date();
        if (period === 'Today') {
          bars = Array(24).fill(0);
          labels = Array(24).fill('').map((_, i) => `${i.toString().padStart(2, '0')}:00`);
          dates = Array(24).fill('');
          if (visits) {
            (visits as any[]).forEach((v: any) => {
              const d = new Date(v.visit_time);
              bars[d.getHours()] += 1;
            });
          }
        } else if (period === 'This Week') {
          bars = Array(7).fill(0);
          labels = [];
          dates = [];
          // Find the Monday of this week
          const monday = new Date(now);
          const day = monday.getDay();
          const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
          monday.setDate(diff);
          monday.setHours(0, 0, 0, 0);
          for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            dates.push(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`);
          }
          if (visits) {
            (visits as any[]).forEach((v: any) => {
              const d = new Date(v.visit_time);
              const idx = Math.floor((d.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
              if (idx >= 0 && idx < 7) bars[idx] += 1;
            });
          }
        } else if (period === 'This Month') {
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          bars = Array(daysInMonth).fill(0);
          labels = [];
          dates = [];
          for (let i = 0; i < daysInMonth; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            dates.push(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`);
          }
          if (visits) {
            (visits as any[]).forEach((v: any) => {
              const d = new Date(v.visit_time);
              bars[d.getDate() - 1] += 1;
            });
          }
        }
        setBarData(bars);
        setBarLabels(labels);
        setBarDates(dates);

        // --- Stats Cards ---
        // Shops Visited: unique shops from all visits in the selected period
        setVisitedCount(visits ? new Set((visits as any[]).map((v: any) => v.shop_id)).size : 0);
        // Shops Ordered: unique shop_ids from visits referenced by current user's orders
        let orderedShopIds = new Set();
        if (orders) {
          for (const o of orders as any[]) {
            if (o.visit_id) {
              const visit = (visits as any[]).find((v: any) => v.visit_id === o.visit_id);
              if (visit?.shop_id) orderedShopIds.add(visit.shop_id);
            }
          }
        }
        setOrderedCount(orderedShopIds.size);
        // Total Revenue: sum of amount from orders for user
        let totalRevenue = 0;
        if (orders) {
          for (const o of orders as any[]) {
            totalRevenue += Number(o.amount);
          }
        }
        setRevenue(totalRevenue);

        // --- Recent Orders: group by order_id, sum all product amounts, fetch shop name via visit_id -> shop_id -> shops ---
        const orderMap = new Map<string, { order_id: string; shopName: string; date: string; amount: number }>();
        if (orders) {
          for (const o of orders as any[]) {
            let shopName = 'Shop';
            let shop_id = null;
            if (o.visit_id) {
              const visit = (visits as any[]).find((v: any) => v.visit_id === o.visit_id);
              if (visit?.shop_id) {
                const { data: shopData } = await supabase
                  .from('shops')
                  .select('name')
                  .eq('shop_id', visit.shop_id)
                  .single();
                shopName = shopData?.name || shopName;
                shop_id = visit.shop_id;
              }
            } else {
              continue; // If no visit_id, skip
            }
            if (orderMap.has(o.order_id)) {
              const prev = orderMap.get(o.order_id)!;
              prev.amount += Number(o.amount);
            } else {
              orderMap.set(o.order_id, {
                order_id: o.order_id,
                shopName,
                date: o.created_at,
                amount: Number(o.amount),
              });
            }
          }
        }
        setRecentOrders(Array.from(orderMap.values()).slice(0, 3));
      } catch (err: any) {
        setError(err.message || 'Failed to load sales data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, period]);

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
  };
  const getMonthYear = () => {
    const now = new Date();
    return `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear().toString().slice(-2)}`;
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEndX(e.touches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStartX !== null && touchEndX !== null) {
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 40) { // Minimum swipe distance
        const totalBars = barData.length;
        const lastPageStart = totalBars % barsPerPage === 0
          ? totalBars - barsPerPage
          : totalBars - (totalBars % barsPerPage);
        if (diff > 0 && barWindow + barsPerPage < totalBars) {
          // Swiped left, next bars
          if (barWindow + 2 * barsPerPage >= totalBars) {
            setBarWindow(lastPageStart);
          } else {
            setBarWindow(w => w + barsPerPage);
          }
        } else if (diff < 0 && barWindow > 0) {
          // Swiped right, previous bars
          setBarWindow(w => Math.max(0, w - barsPerPage));
        }
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Handler for viewing order details
  const handleViewOrder = async (order: any) => {
    if (!order.order_id) {
      alert('Order ID is missing. Cannot view order details.');
      return;
    }
    try {
      // Fetch all order items for this order_id
      const { data: orderItems, error: orderError } = await supabase
        .from('orders')
        .select(`order_id, amount, quantity, product_id, free_qty, free_product_id, scheme_id, created_at, 
          main_product:products!orders_product_id_fkey(name, unit_of_measure),
          free_product:products!orders_free_product_id_fkey(name),
          schemes(scheme_text),
          visits!inner(visit_id, shop_id)
        `)
        .eq('order_id', order.order_id)
        .eq('is_deleted', false);
      if (orderError) throw orderError;
      // Group items by order_id (should be only one order)
      type OrderItemType = {
        product_id: string;
        quantity: number;
        amount: number;
        main_product?: { name?: string; unit_of_measure?: string };
        free_qty?: number;
        free_product_id?: string;
        free_product?: { name?: string };
        scheme_id?: number;
        schemes?: { scheme_text?: string };
        unit_of_measure?: string;
      };
      type OrderType = {
        order_id: string;
        date: string;
        amount: number;
        status: string;
        items: any[];
      };
      let orderObj: OrderType | null = null;
      if (orderItems && orderItems.length > 0) {
        orderObj = {
          order_id: order.order_id,
          date: order.date,
          amount: 0,
          status: 'placed',
          items: []
        };
        (orderItems as OrderItemType[]).forEach(item => {
          orderObj!.amount += Number(item.amount);
          orderObj!.items.push({
            product_id: item.product_id,
            product_name: item.main_product?.name || '',
            quantity: item.quantity,
            amount: Number(item.amount),
            unit_price: Number(item.amount) / item.quantity,
            free_qty: item.free_qty || 0,
            free_product_name: item.free_product_id ? item.free_product?.name : undefined,
            scheme_id: item.scheme_id,
            scheme_text: item.scheme_id ? item.schemes?.scheme_text : undefined,
            unit_of_measure: item.main_product?.unit_of_measure
          });
        });
      }
      // Fetch shop details
      let shop = null;
      let shopId: string | undefined = undefined;
      if (orderItems && orderItems[0]?.visits) {
        const visits = orderItems[0].visits;
        if (Array.isArray(visits)) {
          const firstVisit = visits[0] as any;
          if (firstVisit && typeof firstVisit === 'object' && 'shop_id' in firstVisit) {
            shopId = firstVisit.shop_id;
          }
        } else if (visits && typeof visits === 'object' && 'shop_id' in (visits as any)) {
          shopId = (visits as any).shop_id;
        }
      }
      if (shopId) {
        const { data: shopData } = await supabase
          .from('shops')
          .select('shop_id, name, phone_number, owner_name')
          .eq('shop_id', shopId)
          .single();
        shop = shopData;
      }
      setSelectedOrder(orderObj);
      setSelectedShop(shop);
      setIsOrderDetailsModalOpen(true);
    } catch (err) {
      alert('Failed to load order details');
    }
  };

  // Helper to get date/range string for the selected period
  const getPeriodDateString = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (period === 'Today') {
      return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    }
    if (period === 'This Week') {
      // Find Monday
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      // Find Sunday
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}/${monday.getFullYear()} - ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${sunday.getFullYear()}`;
    }
    if (period === 'This Month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${pad(first.getDate())}/${pad(first.getMonth() + 1)}/${first.getFullYear()} - ${pad(last.getDate())}/${pad(last.getMonth() + 1)}/${last.getFullYear()}`;
    }
    return '';
  };

  // Handlers for menu and logout
  const handleToggleMenu = () => setMenuOpen(prev => !prev);
  const handleOutsideClick = () => setMenuOpen(false);
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  const handleDeleteSuccess = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header with Hamburger, Title, Logout */}
      <header className="flex justify-between items-center py-4 px-4 bg-white shadow-sm relative">
        <button 
          className="text-gray-800 focus:outline-none"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={handleToggleMenu}
        >
          <Menu size={24} />
        </button>
        <h1 className="text-2xl font-bold absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 m-0">My Sales</h1>
        <button 
          onClick={handleSignOut}
          className="text-gray-800 focus:outline-none"
          aria-label="Logout"
        >
          <LogOut size={24} />
        </button>
      </header>
      {/* Side Menu */}
      <SideMenu
        isOpen={menuOpen}
        onClose={handleOutsideClick}
        onLogout={handleSignOut}
        onDeleteAccount={() => setIsDeleteModalOpen(true)}
      />
      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
      <main className="flex-grow p-4 pb-24">
        {/* Bar Chart and Date Filter */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center mb-2 relative" style={{ minHeight: 36 }}>
            <div className="flex-1 flex items-center">
              <select
                className="border rounded px-2 py-1 text-sm bg-gray-50"
                value={period}
                onChange={e => { setPeriod(e.target.value as any); setBarWindow(0); }}
              >
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
            <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
              <span className="text-sm text-gray-500 font-bold">{getPeriodDateString()}</span>
            </div>
          </div>
          {/* Bar Chart with Swipe Navigation */}
          <div>
            <div
              className="flex items-end gap-6 justify-start w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 snap-x snap-mandatory"
              style={{ minHeight: '7rem', paddingBottom: 8 }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {barData.slice(barWindow, barWindow + barsPerPage).map((val, idx) => (
                <div
                  key={barWindow + idx}
                  className="flex flex-col items-center w-7 min-w-[1.75rem]"
                >
                  <div className="w-full h-20 flex items-end relative">
                    {/* Gray bar (background, always max height) */}
                    <div className="w-full rounded-t-lg absolute bottom-0 left-0 right-0" style={{ height: '100%', background: '#e5e7eb' }}></div>
                    {/* Blue fill proportional to visits/25 */}
                    <div className="w-full rounded-t-lg absolute bottom-0 left-0 right-0" style={{ height: `${Math.min((val / 25) * 100, 100)}%`, background: '#2563eb', transition: 'height 0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{barLabels[barWindow + idx]}</span>
                  {(period === 'This Week' || period === 'This Month') &&
                    <span className="text-[10px] text-gray-400">{barDates[barWindow + idx]}</span>
                  }
                </div>
              ))}
            </div>
            {/* Dots for page indicator */}
            <div className="flex justify-center mt-2 gap-2">
              {Array.from({ length: Math.ceil(barData.length / barsPerPage) }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${i === Math.floor(barWindow / barsPerPage) ? 'bg-blue-600' : 'bg-gray-300'}`}
                  style={{ display: 'inline-block' }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <User className="w-7 h-7 text-blue-600" strokeWidth={2} />
            <div>
              <div className="text-xs text-gray-500">Shops Visited</div>
              <div className="text-xl font-bold text-gray-800">{visitedCount}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-blue-600" strokeWidth={2} />
            <div>
              <div className="text-xs text-gray-500">Shops Ordered</div>
              <div className="text-xl font-bold text-gray-800">{orderedCount}</div>
            </div>
          </div>
        </div>
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-blue-600" strokeWidth={2} />
          <div>
            <div className="text-xs text-gray-500">Total Revenue Generated</div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(revenue)}</div>
          </div>
        </div>
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-bold mb-2">Recent Orders</h2>
          <div>
            {recentOrders.length === 0 && <div className="text-gray-400 py-4 text-center">No orders found.</div>}
            {recentOrders.map((order, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div>
                  <div className="font-semibold text-gray-800">{order.shopName}</div>
                  <div className="text-xs text-gray-500">{formatDate(order.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{formatCurrency(order.amount)}</span>
                  <button className="border border-blue-600 text-blue-600 rounded px-3 py-1 text-sm font-medium" onClick={() => handleViewOrder(order)}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {loading && <div className="text-center py-4 text-blue-600">Loading...</div>}
        {error && <div className="text-center py-4 text-red-600">{error}</div>}
      </main>
      <BottomNavigation />
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={() => setIsOrderDetailsModalOpen(false)}
        order={selectedOrder}
        shop={selectedShop}
      />
    </div>
  );
};

export default SalesPage; 