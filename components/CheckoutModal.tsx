import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { CartItem, OrderType, PaymentConfig } from "../types";
import { API_BASE } from "../constants";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  totalCents: number;
  orderType: OrderType;
  paymentConfig: PaymentConfig;
  onPlaceOrder: (details: any, showReceipt?: boolean) => Promise<string | null>;
  t: (key: string) => string;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  totalCents,
  orderType,
  paymentConfig,
  onPlaceOrder,
  t,
}: Props) {
  const [step, setStep] = useState<"details" | "payment">("details");
  
  // ✅ Initialize from localStorage so data persists if page refreshes or modal closes
  const [name, setName] = useState(() => localStorage.getItem("customer_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("customer_phone") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("customer_email") || "");
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem("customer_table") || "");
  const [specialRequest, setSpecialRequest] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Save to localStorage whenever fields change
  useEffect(() => { localStorage.setItem("customer_name", name); }, [name]);
  useEffect(() => { localStorage.setItem("customer_phone", phone); }, [phone]);
  useEffect(() => { localStorage.setItem("customer_email", email); }, [email]);
  useEffect(() => { localStorage.setItem("customer_table", tableNumber); }, [tableNumber]);

  if (!isOpen) return null;

  function handleProceedToPayment() {
    if (!name.trim()) return alert("Please enter your name.");
    
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return alert("Please enter your phone number.");
    if (!cleanPhone.startsWith("01") && !cleanPhone.startsWith("03")) return alert("Phone number must start with 01 or 03.");
    if (cleanPhone.length < 9 || cleanPhone.length > 12) return alert("Phone number must be between 9 and 12 digits.");
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Please enter a valid email address.");
    
    if (orderType === "dine-in" && !tableNumber.trim()) return alert("Please enter your table number.");

    setPhone(cleanPhone);
    setStep("payment");
  }

  async function handleConfirmPayment() {
    setLoading(true);
    
    // 1. Create Order in Database
    const orderId = await onPlaceOrder({
      name,
      phone,
      email,
      tableNumber: orderType === "dine-in" ? tableNumber : undefined,
      specialRequest,
      paymentMethod: "Online Payment"
    }, false); // ✅ Pass false to prevent receipt modal from showing immediately

    if (!orderId) {
      setLoading(false);
      return;
    }

    // 2. Initiate Payment Gateway
    try {
      const res = await fetch(`${API_BASE}/api/payment/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: totalCents,
          customerName: name,
          customerEmail: email,
          customerPhone: phone
        })
      });
      const data = await res.json();

      if (data.success && data.paymentUrl) {
        // ✅ Redirect to ToyyibPay
        window.location.href = data.paymentUrl;
      } else {
        // Mock mode or error
        onClose();
      }
    } catch (err) {
      console.error("Payment init failed", err);
      onClose();
    }
    
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <X size={24} />
        </button>

        {step === "details" && (
          <>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">{t("Customer Details")}</h3>
            
            {/* Order Summary */}
            <div className="bg-slate-50 p-4 rounded-xl mb-6 max-h-48 overflow-y-auto border border-slate-200 shadow-inner">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Summary</h4>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0 text-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">{item.quantity}x</span>
                    <span className="font-medium line-clamp-1">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">RM {((item.price * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-slate-300 mt-2 pt-2 flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span>RM {(totalCents / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("Name")}</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-slate-900" 
                  value={name} 
                  onChange={(e) => setName(e.target.value.replace(/[^A-Za-z\s\-']/g, ""))} // ✅ Allow only alphabets, spaces, hyphens, apostrophes
                  required 
                  placeholder="Alphabets only" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("Phone Number")}</label>
                <input 
                  type="tel" 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-slate-900" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} // ✅ Allow only numbers
                  required 
                  placeholder="e.g. 0123456789" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("Email")} (Optional)</label>
                <input type="email" className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-slate-900" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {orderType === "dine-in" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-slate-900" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required placeholder="e.g. 5" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("Special Request")} (Optional)</label>
                <textarea 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-slate-900" 
                  value={specialRequest} 
                  onChange={(e) => setSpecialRequest(e.target.value)} 
                  placeholder="e.g. Less spicy, no ice..." 
                  rows={2}
                  maxLength={100}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {specialRequest.length}/100
                </div>
              </div>
            </div>
            <button onClick={handleProceedToPayment} className="mt-8 w-full bg-red-500 text-white py-3 rounded-lg text-lg font-semibold hover:bg-red-600 transition-colors">
              {t("Proceed to Payment")}
            </button>
          </>
        )}

        {step === "payment" && (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Payment Gateway</h3>
            <p className="text-gray-600 mb-6">Total Amount: <span className="font-bold text-xl text-red-600">RM{(totalCents / 100).toFixed(2)}</span></p>
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 mb-6">
              {paymentConfig?.qrImage ? (
                <>
                  <p className="text-sm font-medium mb-4">{t("Scan DuitNow QR to Pay")}</p>
                  <img src={paymentConfig.qrImage} alt="Payment QR" className="mx-auto h-48 w-48 object-contain bg-white p-2 shadow-sm" />
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400"><p>No QR Code Configured</p></div>
              )}
            </div>
            <button onClick={handleConfirmPayment} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              {loading ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
