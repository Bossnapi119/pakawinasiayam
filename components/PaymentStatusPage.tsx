import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Home } from "lucide-react";

interface Props {
  onBackToHome: () => void;
}

export default function PaymentStatusPage({ onBackToHome }: Props) {
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusId = params.get("status_id"); // ToyyibPay: 1 = success, 3 = fail
    const billExternalReferenceNo = params.get("order_id") || params.get("billExternalReferenceNo");

    if (billExternalReferenceNo) setOrderId(billExternalReferenceNo);

    if (statusId === "1") {
      setStatus("success");
    } else if (statusId === "3") {
      setStatus("failed");
    } else {
      // Fallback or Mock handling
      setStatus("failed");
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        {status === "loading" && (
          <p className="text-lg font-semibold text-slate-600">Verifying payment...</p>
        )}

        {status === "success" && (
          <div className="animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-6">
              Your order <span className="font-mono font-bold text-slate-800">{orderId}</span> has been placed and sent to the kitchen.
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h2>
            <p className="text-slate-600 mb-6">
              We couldn't process your payment for order <span className="font-mono font-bold text-slate-800">{orderId}</span>. Please try again or pay at the counter.
            </p>
          </div>
        )}

        {status !== "loading" && (
          <button
            onClick={onBackToHome}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            <Home size={20} /> Back to Home
          </button>
        )}
      </div>
    </div>
  );
}