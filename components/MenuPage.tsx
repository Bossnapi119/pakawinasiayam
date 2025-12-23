import { useState, useRef, useEffect } from "react";
import {
  MenuItem,
  CartItem, // <<< Make sure CartItem is imported
  OrderType,
  PaymentConfig,
} from "../types";
import { Plus, Minus, ChevronLeft, ShoppingBag, UtensilsCrossed, Info } from "lucide-react";
import { API_BASE } from "../constants";
import CheckoutModal from "./CheckoutModal";

interface Props {
  menu: MenuItem[];
  cart: CartItem[]; // <<< CHANGE THIS LINE: from MenuItem[] to CartItem[]
  orderType: OrderType;
  onAddToCart: (item: MenuItem) => void;
  // <<< CHANGE THIS LINE: to match the (id: string, delta: number) signature from App.tsx
  onUpdateQty: (id: string, delta: number) => void;
  onPlaceOrder: (details?: any, showReceipt?: boolean) => Promise<string | null>;
  onBackToLanding: () => void;
  dailySpecial: string;
  onShowInfo: () => void;
  t: (key: string) => string;
  paymentConfig: PaymentConfig;
  cartTotal: number;
  landingImage: string | null;
}

export default function MenuPage(props: Props) {
  const {
    menu,
    cart,
    orderType,
    onAddToCart,
    onUpdateQty,
    onPlaceOrder,
    onBackToLanding,
    t,
    onShowInfo,
    dailySpecial,
    cartTotal,
    paymentConfig,
    landingImage,
  } = props;

  const [activeCategory, setActiveCategory] = useState<
    MenuItem["category"] | "All"
  >("All");
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [isLoading, setIsLoading] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // ✅ Auto-scroll active category into view (center it)
  useEffect(() => {
    if (categoryScrollRef.current) {
      const activeBtn = categoryScrollRef.current.querySelector(`[data-active="true"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeCategory]);

  const filteredMenu =
    activeCategory === "All"
      ? menu
      : menu.filter((item) => item.category === activeCategory);

  const totalCents = cartTotal;

  const categories: (MenuItem["category"] | "All")[] = [
    "All",
    "Main",
    "Set",
    "Side",
    "Drink",
  ];

  const changeCategory = (cat: MenuItem["category"] | "All") => {
    const prevIdx = categories.indexOf(activeCategory);
    const newIdx = categories.indexOf(cat);
    setSlideDirection(newIdx > prevIdx ? "right" : "left");
    setActiveCategory(cat);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 350);
  };

  // ✅ SWIPE LOGIC
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); 
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const currentIndex = categories.indexOf(activeCategory);
    if (isLeftSwipe && currentIndex < categories.length - 1) {
      changeCategory(categories[currentIndex + 1]); // Next Category
    } else if (isRightSwipe && currentIndex > 0) {
      changeCategory(categories[currentIndex - 1]); // Previous Category
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans overflow-hidden relative">
      {/* Background Image with Overlay */}
      {landingImage && (
        <>
          <img
            src={landingImage.startsWith("http") ? landingImage : `${API_BASE}${landingImage}`}
            alt="Menu Background"
            className="fixed inset-0 w-full h-full object-cover z-0 opacity-100"
          />
          <div className="fixed inset-0 bg-black/40 z-0" />
        </>
      )}

      {/* MENU SECTION (Full Width) */}
      <div className="flex-1 flex flex-col min-h-0 relative min-w-0 pb-24 z-10">
        {/* Header & Categories (Sticky) */}
        <div 
          className={`sticky top-0 z-20 transition-all duration-300 ${
            isScrolled 
              ? "bg-slate-900/90 backdrop-blur-md border-b border-slate-700 shadow-lg" 
              : "bg-transparent border-b border-transparent shadow-none"
          }`}
        >
          <header className="flex items-center justify-between px-4 pt-2 pb-1">
            <button 
              onClick={onBackToLanding} 
              className="p-2 rounded-full hover:bg-white/10 text-slate-100 transition-colors active:scale-90"
              title="Back"
            >
              <ChevronLeft size={28} />
            </button>
            
            <h1 className="font-bold text-lg text-white tracking-wide opacity-90 drop-shadow-md">Menu</h1>
            <button 
              onClick={onShowInfo}
              className="p-2 rounded-full hover:bg-white/10 text-slate-100 transition-colors active:scale-90"
              title="Info"
            >
              <Info size={28} />
            </button>
          </header>

          {dailySpecial && (
            <div className="px-4 pt-0 pb-3">
              <div className="bg-gradient-to-r from-red-600/90 to-orange-600/90 text-white px-4 py-1.5 rounded-xl text-xs md:text-sm font-bold shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-500 border border-white/10">
                <span>🔥</span>
                <span>{t("Special")}: {dailySpecial}</span>
              </div>
            </div>
          )}

          {/* Categories Filter */}
          <div ref={categoryScrollRef} className="px-4 pb-2 pt-0 flex flex-nowrap justify-center gap-2 md:gap-3 overflow-x-auto no-scrollbar w-full touch-pan-x overscroll-x-contain items-center">
            {categories.map((cat) => (
              <button
                key={cat}
                data-active={activeCategory === cat}
                onClick={() => changeCategory(cat)}
                className={`
                  px-4 py-2 md:px-6 md:py-2.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all duration-200 shadow-sm active:scale-95 flex-shrink-0
                  ${activeCategory === cat
                    ? "bg-red-600 text-white shadow-lg shadow-red-900/50 scale-105 border border-transparent"
                    : isScrolled 
                      ? "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white backdrop-blur-sm"
                      : "bg-black/30 text-white border border-white/10 hover:bg-black/50 backdrop-blur-sm"}
                `}
              >
                {t(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid (Scrollable) */}
        <div 
          className="flex-1 overflow-y-auto p-4 scroll-smooth"
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 10)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col animate-pulse">
                  <div className="h-32 md:h-40 bg-slate-200" />
                  <div className="p-3 flex flex-col flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="mt-auto pt-2 flex justify-between items-center">
                      <div className="h-6 bg-slate-200 rounded w-16" />
                      <div className="h-8 w-8 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div 
            key={activeCategory}
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-8 animate-in fade-in duration-300 ${slideDirection === "right" ? "slide-in-from-right-8" : "slide-in-from-left-8"}`}
          >
          {filteredMenu.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">No items found in this category.</p>
            </div>
          ) : (
            filteredMenu.map((item, index) => {
              const cartItem = cart.find((c) => c.id === item.id);
              const quantity = cartItem ? cartItem.quantity : 0;

              return (
              <div
                key={item.id}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="relative h-32 md:h-40 overflow-hidden bg-slate-100">
                  {item.image ? (
                    <img
                      src={`${API_BASE}${item.image}`}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <UtensilsCrossed size={32} />
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-sm md:text-base text-slate-900 leading-tight mb-1">
                    {item.name}
                  </h3>
                  {item.description && ( // Display description if available
                    <p className="text-xs text-slate-600 line-clamp-3 mb-3 flex-1 leading-snug">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-slate-900 font-extrabold text-base md:text-lg">
                      RM{(item.price / 100).toFixed(2)}
                    </span>
                    
                    {quantity > 0 ? (
                      <div className="flex items-center bg-slate-900 rounded-full p-1 shadow-lg shadow-slate-200">
                        <button
                          onClick={() => onUpdateQty(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-slate-700 text-white rounded-full hover:bg-slate-600 active:scale-90 transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-white px-3 min-w-[1.5rem] text-center">{quantity}</span>
                        <button
                          onClick={() => onUpdateQty(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-500 active:scale-90 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onAddToCart(item)}
                        className="bg-red-600 text-white rounded-full p-2 shadow-lg shadow-red-200 hover:bg-red-700 hover:scale-110 active:scale-95 transition-all duration-200"
                        title="Add to Cart"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})
          )}
          </div>
          )}
        </div>
      </div>

      {/* FLOATING HOVERING CHECKOUT PANEL */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-900 text-white shadow-2xl rounded-full p-2 pl-6 pr-2 flex items-center gap-6 pointer-events-auto border border-slate-700/50 backdrop-blur-xl max-w-[90%]">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                {cart.reduce((a, c) => a + c.quantity, 0)} {t("Items")}
              </span>
              <span className="font-bold text-lg leading-none">
                RM {(totalCents / 100).toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-bold transition-all active:scale-95 flex items-center gap-2"
            >
              {t("Checkout")}
            </button>
          </div>
        </div>
      )}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        totalCents={totalCents}
        orderType={orderType}
        paymentConfig={paymentConfig}
        onPlaceOrder={onPlaceOrder}
        t={t}
      />
    </div>
  );
}
