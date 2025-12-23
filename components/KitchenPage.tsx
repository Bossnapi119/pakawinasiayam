import { useState } from "react";
import { RefreshCw, Clock, List, ShoppingBag, UtensilsCrossed, AlertTriangle, Filter } from "lucide-react";

export type OrderStatus = "new" | "preparing" | "completed";

export interface Order {
  id: string;
  items: string[];
  status: OrderStatus;
  orderType?: string;
  tableNumber?: string;
  specialRequest?: string;
}

interface KitchenPageProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onLogout: () => void;
  onRefresh: () => void;
  error?: string;
}

export default function KitchenPage({ orders, onUpdateStatus, onLogout, onRefresh, error }: KitchenPageProps) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [filterSpecial, setFilterSpecial] = useState(false);

  const advanceOrderStatus = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      if (order.status === "new") onUpdateStatus(orderId, "preparing");
      else if (order.status === "preparing") onUpdateStatus(orderId, "completed");
    }
  };

  const filteredOrders = filterSpecial 
    ? orders.filter(o => o.specialRequest && o.specialRequest.trim().length > 0) 
    : orders;

  const activeOrders = filteredOrders.filter((order) => order.status !== "completed");
  // Show newest completed orders first
  const historyOrders = filteredOrders.filter((order) => order.status === "completed").reverse();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-white">Kitchen Display System</h1>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw size={20} />
          </button>
          <button 
            onClick={onLogout} 
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-700">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("active")}
            className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors relative ${
              tab === "active" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <List size={18} />
            Active Orders ({activeOrders.length})
            {tab === "active" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 rounded-full" />}
          </button>
          <button
            onClick={() => setTab("history")}
            className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors relative ${
              tab === "history" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock size={18} />
            History
            {tab === "history" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 rounded-full" />}
          </button>
        </div>

        <button
          onClick={() => setFilterSpecial(!filterSpecial)}
          className={`mb-2 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
            filterSpecial
              ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/50"
              : "bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700 hover:text-slate-200"
          }`}
        >
          <Filter size={14} />
          {filterSpecial ? "Special Only" : "Filter Special"}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {error && (
          <div className="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {tab === "active" && activeOrders.length === 0 && !error && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
            <p className="text-lg font-medium">No active orders</p>
            <p className="text-sm">New orders will appear here automatically.</p>
          </div>
        )}

        {tab === "history" && historyOrders.length === 0 && !error && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
            <p className="text-lg font-medium">No history yet</p>
            <p className="text-sm">Completed orders will appear here.</p>
          </div>
        )}

        {tab === "active" 
          ? activeOrders.map((order) => (
            <div key={order.id} className="border border-slate-200 rounded-lg bg-white p-4 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
                      order.status === "new"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.status === "new" ? "NEW ORDER" : "PREPARING"}
                  </span>
                  
                  {/* ORDER TYPE BADGE */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit flex items-center gap-1.5 ${
                    order.orderType === 'take-away' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {order.orderType === 'take-away' ? <ShoppingBag size={12}/> : <UtensilsCrossed size={12}/>}
                    {order.orderType === 'take-away' ? 'TAKEAWAY' : 'DINE-IN'}
                  </span>
                  {order.tableNumber && order.orderType !== 'take-away' && (
                    <span className="text-xs font-semibold text-slate-600 ml-1">Table: {order.tableNumber}</span>
                  )}
                </div>
                <span className="text-slate-500 font-mono text-sm">#{order.id}</span>
              </div>
              <div className="space-y-3 mb-6">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-800 font-medium border-b border-slate-100 pb-2">
                    <span>{item}</span>
                  </div>
                ))}
                {order.specialRequest && (
                  <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded-lg flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <span className="block text-[10px] font-bold text-red-400 uppercase tracking-wider">Special Request</span>
                      <p className="text-red-700 font-bold text-sm italic">"{order.specialRequest}"</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => advanceOrderStatus(order.id)}
                className={`w-full py-3 font-medium rounded-lg transition-colors shadow-sm ${
                  order.status === "new"
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {order.status === "new" ? "Start Preparation" : "Mark as Completed"}
              </button>
            </div>
          )) 
          : historyOrders.map((order) => (
            <div key={order.id} className="border border-slate-700 rounded-lg bg-slate-800 p-4 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full w-fit">
                    COMPLETED
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    {order.orderType === 'take-away' ? <ShoppingBag size={10}/> : <UtensilsCrossed size={10}/>}
                    {order.orderType === 'take-away' ? 'Takeaway' : 'Dine-in'}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-sm">#{order.id}</span>
              </div>
              <div className="space-y-3 mb-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300 font-medium border-b border-slate-700 pb-2">
                    <span>{item}</span>
                  </div>
                ))}
                {order.specialRequest && (
                  <div className="mt-2 text-xs text-red-300 italic border-t border-slate-700 pt-2">
                    <span className="font-bold uppercase not-italic text-red-400 mr-1">Note:</span> 
                    {order.specialRequest}
                  </div>
                )}
              </div>
              <div className="mt-4 text-right">
                 <span className="text-xs text-slate-500">Order Completed</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}