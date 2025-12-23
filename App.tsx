import { useEffect, useMemo, useState, useCallback } from "react";
import { UtensilsCrossed, X, MapPin, Phone, Clock, Printer, CheckCircle } from "lucide-react";

import LandingPage from "./components/LandingPage";
import MenuPage from "./components/MenuPage";
import AdminLogin from "./components/AdminLogin";
import AdminPage from "./components/AdminPage";
import DeveloperPage from "./components/DeveloperPage";
import DeveloperLogin from "./components/DeveloperLogin";
import KitchenPage, { Order as KitchenOrder, OrderStatus } from "./components/KitchenPage";
import KitchenLogin from "./components/KitchenLogin";
import PaymentStatusPage from "./components/PaymentStatusPage";

import {
  MenuItem,
  CartItem,
  OrderType,
  AboutConfig,
  PaymentConfig,
} from "./types";

import { INITIAL_MENU, INITIAL_ABOUT_CONFIG, API_BASE } from "./constants";
import { TRANSLATIONS, Language } from "./translations";

type Page =
  | "landing"
  | "menu"
  | "admin"
  | "admin-login"
  | "developer-login"
  | "developer"
  | "kitchen-login"
  | "kitchen"
  | "payment-status";

function pageFromPath(pathname: string): Page {
  if (pathname.startsWith("/admin-login")) return "admin-login";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/dev-login")) return "developer-login";
  if (pathname.startsWith("/dev")) return "developer";
  if (pathname.startsWith("/kitchen-login")) return "kitchen-login";
  if (pathname.startsWith("/kitchen")) return "kitchen";
  if (pathname.startsWith("/payment/status")) return "payment-status";
  if (pathname.startsWith("/menu")) return "menu";
  return "landing";
}

function pathFromPage(page: Page): string {
  if (page === "admin-login") return "/admin-login";
  if (page === "admin") return "/admin";
  if (page === "developer-login") return "/dev-login";
  if (page === "developer") return "/dev";
  if (page === "kitchen-login") return "/kitchen-login";
  if (page === "kitchen") return "/kitchen";
  if (page === "payment-status") return "/payment/status";
  if (page === "menu") return "/menu";
  return "/";
}

export default function App() {
  const [page, setPage] = useState<Page>(() =>
    pageFromPath(window.location.pathname)
  );
  const [orderType, setOrderType] = useState<OrderType | null>(null);

  // 🌐 LANGUAGE (SINGLE SOURCE OF TRUTH)
  const [language, setLanguage] = useState<Language>("en");
  const t = useMemo(() => TRANSLATIONS[language], [language]);

  // 🏪 SITE DATA
  const [brandName, setBrandName] = useState("Pak Awi Nasi Ayam");
  const [dailySpecial, setDailySpecial] = useState("");
  const [landingImage, setLandingImage] = useState<string | null>(null);
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  const [bannerAspectRatio] =
    useState<"16:9" | "9:16">("16:9");
  const [aboutConfig, setAboutConfig] =
    useState<AboutConfig>(INITIAL_ABOUT_CONFIG);

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    bankName: "Maybank",
    accountNumber: "1234567890", // ✅ Added default so 'Proceed' button is enabled
    beneficiaryName: brandName,
    qrImage: "https://placehold.co/200", // ✅ Added placeholder to ensure button enables
  });

  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU as any);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("shopping_cart");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [receipt, setReceipt] = useState<any | null>(null); // ✅ Store receipt data
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [kitchenError, setKitchenError] = useState<string>("");

  // ADMIN AUTH
  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(() => {
    return !!sessionStorage.getItem("adminToken");
  });

  // KITCHEN AUTH
  const [kitchenLoggedIn, setKitchenLoggedIn] = useState<boolean>(() => {
    return !!sessionStorage.getItem("kitchenToken");
  });

  // ✅ Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("shopping_cart", JSON.stringify(cart));
  }, [cart]);

  // ✅ FETCH KITCHEN ORDERS FUNCTION
  const fetchKitchenOrders = useCallback(async () => {
      if (!adminLoggedIn && !kitchenLoggedIn) return;
      
      try {
        const adminToken = sessionStorage.getItem("adminToken");
        const kitchenToken = sessionStorage.getItem("kitchenToken");
        const token = adminToken || kitchenToken;

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // ✅ Use the correct endpoint based on role
        // Admin can see all orders (/api/orders)
        // Kitchen staff uses specific endpoint (/api/kitchen/orders)
        const endpoint = adminToken ? `${API_BASE}/api/orders` : `${API_BASE}/api/kitchen/orders`;

        // console.log("Fetching kitchen orders...");
        const res = await fetch(endpoint, { headers });
        
        if (res.status === 401 || res.status === 403) {
          setKitchenError("Access denied. Please log in again.");
          // Stop auto-logout so you can see the error message instead of looping
          // if (kitchenLoggedIn) {
          //   sessionStorage.removeItem("kitchenToken");
          //   setKitchenLoggedIn(false);
          //   setPage("kitchen-login");
          // }
          return;
        }

        if (!res.ok) {
          setKitchenError(`Failed to load orders: ${res.status} ${res.statusText}`);
          return;
        }

        const data = await res.json();
        setKitchenError(""); // Clear error on success
        
        // Filter for active orders and map to Kitchen format
        const activeOrders = data
          .filter((o: any) => {
            const s = o.status?.toUpperCase();
            return s === "NEW" || s === "PREPARING" || s === "COMPLETED" || s === "READY";
          })
          .map((o: any) => ({
            id: o.id || o._id,
            items: Array.isArray(o.items) 
              ? o.items.map((i: any) => typeof i === 'string' ? i : `${i.quantity}x ${i.name}`)
              : [],
            status: o.status.toLowerCase(),
            orderType: o.orderType,
            tableNumber: o.tableNumber,
            specialRequest: o.specialRequest || o.specialrequest
          }));
          
        setKitchenOrders(activeOrders);
      } catch (err) {
        console.error("Kitchen fetch error:", err);
        setKitchenError("Connection failed. Is the backend running?");
      }
  }, [adminLoggedIn, kitchenLoggedIn]);

  // ✅ POLL BACKEND FOR KITCHEN ORDERS (Syncs across devices)
  useEffect(() => {
    if (page !== "kitchen") return; // Only poll on kitchen page to avoid rate limits
    fetchKitchenOrders(); // Initial fetch
    const interval = setInterval(fetchKitchenOrders, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [page, fetchKitchenOrders]);

  const [showInfoModal, setShowInfoModal] = useState(false);

  const [developerLoggedIn, setDeveloperLoggedIn] = useState(() => {
    return !!sessionStorage.getItem("developerToken");
  });

  // LOAD PUBLIC DATA
  async function loadPublicData() {
    try {
      // Change from /api/site to /api/public/site
      const siteRes = await fetch(`${API_BASE}/api/public/site`);
      const siteData = await siteRes.json();
      setBrandName(siteData.brandName || "");
      setDailySpecial(siteData.dailySpecial || "");
      setLandingImage(siteData.landingPosterPath || "");
      setShopLogo(siteData.logoPath || "");
      
      setAboutConfig(prev => ({
        ...prev,
        location: siteData.address || prev.location,
        phone: siteData.phone || prev.phone,
        operatingHours: siteData.operatingHours || prev.operatingHours
      }));

      // ✅ Sync payment settings from backend
      setPaymentConfig(prev => ({
        ...prev,
        bankName: siteData.bankName || prev.bankName,
        accountNumber: siteData.accountNumber || prev.accountNumber,
        beneficiaryName: siteData.beneficiaryName || siteData.brandName || prev.beneficiaryName,
        qrImage: siteData.qrImagePath || prev.qrImage
      }));

      // Fetch Menu
      const menuRes = await fetch(`${API_BASE}/api/menu`);
      const menuData = await menuRes.json();
      if (Array.isArray(menuData)) setMenu(menuData);

    } catch (err) {
      console.error("Load public data failed:", err);
    }
  }

  useEffect(() => {
    setPaymentConfig((p) => ({ ...p, beneficiaryName: brandName }));
  }, [brandName]);

  // ROUTING
  useEffect(() => {
    const url = pathFromPage(page);
    if (window.location.pathname !== url)
      window.history.pushState({}, "", url);
  }, [page]);

  useEffect(() => {
  const onPop = () => {
    setPage(pageFromPath(window.location.pathname));
  };

  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}, []);

useEffect(() => {
  if (page === "admin" && !adminLoggedIn) {
    setPage("admin-login");
  }
}, [page, adminLoggedIn]);

useEffect(() => {
  if (page === "kitchen" && !kitchenLoggedIn) {
    setPage("kitchen-login");
  }
}, [page, kitchenLoggedIn]);

useEffect(() => {
  if (page === "developer" && !developerLoggedIn) {
    setPage("developer-login");
  }
}, [page, developerLoggedIn]);

  // Auto-logout admin when navigating away from admin pages
  useEffect(() => {
    if (page !== 'admin' && page !== 'admin-login' && adminLoggedIn) {
      onAdminLogout();
    }
  }, [page]);

  // Auto-logout developer when navigating away
  useEffect(() => {
    if (page !== 'developer' && page !== 'developer-login' && developerLoggedIn) {
      sessionStorage.removeItem("developerToken");
      setDeveloperLoggedIn(false);
    }
  }, [page, developerLoggedIn]);

  // Auto-logout kitchen when navigating away
  useEffect(() => {
    if (page !== 'kitchen' && page !== 'kitchen-login' && kitchenLoggedIn) {
      // Optional: Uncomment if you want kitchen to logout when leaving the page
      // sessionStorage.removeItem("kitchenToken");
      // setKitchenLoggedIn(false);
    }
  }, [page, kitchenLoggedIn]);

  // ✅ Redirect to landing if on menu but no order type (e.g. refresh or direct link)
  useEffect(() => {
    if (page === "menu" && !orderType) {
      setPage("landing");
    }
  }, [page, orderType]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  );

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found)
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const placeOrder = async (details?: any, showReceipt = true): Promise<string | null> => { 
    // ✅ VALIDATION GATE
    if (!details) {
      alert("Please fill in your details.");
      return null;
    }

    // 1. Name: Alphabets, spaces, hyphens and apostrophes
    if (!details.name || !/^[A-Za-z\s\-\']+$/.test(details.name)) {
      alert("Invalid Name: Please use alphabets only (A-Z).");
      return null;
    }

    // 2. Phone: Numbers only, starts with 01 or 03, 9-12 digits total
    if (!details.phone || !/^(01|03)\d{7,10}$/.test(details.phone)) {
      alert("Invalid Phone: Must start with '01' or '03', contain only numbers, and be 9-12 digits long.");
      return null;
    }

    // 3. Email: Optional, but must be valid if provided
    if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      alert("Invalid Email: Please enter a valid email address (e.g., user@gmail.com, user@hotmail.com).");
      return null;
    }

    // ✅ Generate Order ID and capture details
    const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    
    // Optimistic Update (Show in Kitchen immediately on this device)
    setKitchenOrders(prev => [...prev, {
      id: orderId,
      items: cart.map(item => `${item.quantity}x ${item.name}`),
      status: "new",
      orderType: orderType || "dine-in",
      tableNumber: details.tableNumber || "-",
      specialRequest: details.specialRequest
    }]);

    // ✅ SEND TO BACKEND (So other devices see it)
    try {
      await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: details.name,
          customerPhone: details.phone,
          customerEmail: details.email,
          tableNumber: details.tableNumber,
          orderType,
          specialRequest: details.specialRequest,
          paymentMethod: details.paymentMethod,
          items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
          total: cartTotal,
          status: "NEW"
        })
      });
    } catch (err) {
      console.error("Failed to send order to backend", err);
    }

    if (showReceipt) {
      setReceipt({
        id: orderId,
        name: details?.name || "Guest",
        phone: details?.phone || "N/A",
        email: details?.email || "N/A",
        specialRequest: details?.specialRequest || "",
        paymentMethod: details?.paymentMethod || "QR / Online Transfer",
        items: [...cart],
        total: cartTotal,
        date: new Date().toLocaleString(),
      });
    }
    setCart([]);
    return orderId;
  };

  const updateKitchenStatus = async (id: string, status: OrderStatus) => {
    // Optimistic Update
    setKitchenOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    
    // ✅ SYNC WITH BACKEND
    try {
      const token = sessionStorage.getItem("adminToken") || sessionStorage.getItem("kitchenToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: status.toUpperCase() })
      });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  function onAdminLogout() {
    sessionStorage.removeItem("adminToken");
    setAdminLoggedIn(false);
  }

  function onKitchenLogout() {
    sessionStorage.removeItem("kitchenToken");
    setKitchenLoggedIn(false);
    setPage("kitchen-login");
  }

  useEffect(() => {
    loadPublicData();  // ✅ Load on mount
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* HEADER */}
      {page !== "landing" && page !== "menu" && (
  <header className="h-14 bg-black text-white flex items-center px-4 justify-between print:hidden">
    {/* Left: Brand / Back to landing */}
    <div
      className="flex items-center gap-2 cursor-pointer"
      onClick={() => setPage("landing")}
    >
      {shopLogo ? (
        <img
          src={shopLogo.startsWith("http") ? shopLogo : `${API_BASE}${shopLogo}`}
          alt="Logo"
          className="w-8 h-8 object-contain rounded bg-white"
        />
      ) : (
        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
          <UtensilsCrossed size={18} />
        </div>
      )}
      <span className="font-bold">{brandName}</span>
    </div>

    {/* Right: Navigation */}
    <nav className="flex gap-3 items-center">
    </nav>
  </header>
)}

      {/* MAIN */}
      <main className="flex-1 print:hidden">
        {page === "landing" && (
          <LandingPage
            onSelectOrderType={(tOrder: "dine-in" | "take-away") => {
              setOrderType(tOrder);
              setPage("menu");
            }}
            landingImage={landingImage}
            shopLogo={shopLogo}
            brandName={brandName}
            dailySpecial={dailySpecial}
            aspectRatio={bannerAspectRatio}
            aboutConfig={aboutConfig}
            language={language}
            setLanguage={setLanguage}
            t={t}
            onShowInfo={() => setShowInfoModal(true)}
          />
        )}

        {page === "menu" && orderType && (
          <MenuPage
            orderType={orderType as "dine-in" | "take-away"}
            menu={menu}
            cart={cart}
            paymentConfig={paymentConfig}
            onAddToCart={addToCart}
            onUpdateQty={updateQty}
            onBackToLanding={() => setPage("landing")}
            onPlaceOrder={placeOrder}
            cartTotal={cartTotal}
            dailySpecial={dailySpecial}
            landingImage={landingImage}
            onShowInfo={() => setShowInfoModal(true)}
            t={(k) => t[k] || k}
          />
        )}

        {page === "admin-login" && (
  <AdminLogin
    onLoggedIn={() => {
      setAdminLoggedIn(true);
      setPage("admin");
    }}
  />
)}

{page === "admin" && adminLoggedIn && (
  <AdminPage
    onLogout={onAdminLogout}
  />
)}

        {page === "developer-login" && (
          <DeveloperLogin
            onLoggedIn={() => {
              setDeveloperLoggedIn(true);
              setPage("developer");
            }}
          />
        )}

        {page === "developer" && developerLoggedIn && <DeveloperPage />}

        {page === "kitchen-login" && (
          <KitchenLogin 
            onLoggedIn={() => {
              setKitchenLoggedIn(true);
              setPage("kitchen");
            }}
          />
        )}

        {page === "kitchen" && <KitchenPage orders={kitchenOrders} onUpdateStatus={updateKitchenStatus} onLogout={onKitchenLogout} onRefresh={fetchKitchenOrders} error={kitchenError} />}

        {page === "payment-status" && <PaymentStatusPage onBackToHome={() => setPage("landing")} />}
      </main>

      {/* INFO MODAL */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">Shop Information</h3>
              <button onClick={() => setShowInfoModal(false)} className="hover:bg-red-700 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="text-red-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-900">Address</h4>
                  <p className="text-gray-600 whitespace-pre-line">{aboutConfig.location || "Location not set"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="text-red-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-900">Contact</h4>
                  <p className="text-gray-600">{aboutConfig.phone || "Phone not set"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="text-red-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-900">Opening Hours</h4>
                  <p className="text-gray-600">{aboutConfig.operatingHours || "Hours not set"}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 text-center">
              <button 
                onClick={() => setShowInfoModal(false)}
                className="text-gray-500 hover:text-gray-800 font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ RECEIPT / ORDER SUCCESS MODAL */}
      {receipt && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200 print:bg-white print:p-0 print:static">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none print:h-auto">
            {/* Header */}
            <div className="bg-emerald-600 p-6 text-center text-white print:bg-transparent print:text-black print:p-0 print:mb-6 print:border-b print:pb-4">
              <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-3 print:hidden">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold print:text-3xl">Order Receipt</h2>
              <p className="opacity-90 print:hidden">Thank you for your purchase.</p>
            </div>

            {/* Receipt Details */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm text-gray-700 print:p-0 print:overflow-visible print:text-black">
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">Order ID:</span>
                <span className="font-mono text-base">{receipt.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">Date:</span>
                <span>{receipt.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">Name:</span>
                <span>{receipt.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">Phone:</span>
                <span>{receipt.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">Email:</span>
                <span>{receipt.email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">Payment:</span>
                <span className="text-emerald-600 font-bold">{receipt.paymentMethod}</span>
              </div>
              {receipt.specialRequest && (
                <div className="flex flex-col border-b pb-2">
                  <span className="font-bold">Special Request:</span>
                  <span className="text-gray-600 italic">{receipt.specialRequest}</span>
                </div>
              )}

              <div className="pt-2">
                <p className="font-bold mb-2">Items:</p>
                {receipt.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between mb-1">
                    <span>{item.quantity}x {item.name}</span>
                    <span>RM {((item.price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total Paid:</span>
                  <span>RM {(receipt.total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 border-t flex gap-3 print:hidden">
              <button 
                onClick={() => window.print()} 
                className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-900"
              >
                <Printer size={20} /> Print / PDF
              </button>
              <button 
                onClick={() => setReceipt(null)} 
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
