import { useState } from "react";
import { API_BASE } from "../constants";

interface KitchenLoginProps {
  onLoggedIn: () => void;
}

export default function KitchenLogin({ onLoggedIn }: KitchenLoginProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setError("");
    }
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kitchen/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem("kitchenToken", data.token);
        onLoggedIn();
      } else {
        setError(data.error || "Incorrect PIN");
        setPin("");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-slate-900">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 w-full max-w-xs">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-6">Kitchen Login</h2>
        
        <div className="mb-6 text-center">
          <div className="h-14 w-full bg-slate-50 rounded-lg flex items-center justify-center text-3xl font-mono tracking-widest border border-slate-300 mb-2">
            {pin.split("").map(() => "•").join("") || <span className="text-slate-300 text-lg font-sans">Enter PIN</span>}
          </div>
          <div className="h-5 text-red-500 text-sm font-medium">{error}</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="h-14 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xl font-semibold text-slate-700 shadow-sm active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 font-semibold shadow-sm active:scale-95 transition-all"
          >
            CLR
          </button>
          <button
            onClick={() => handleNumberClick("0")}
            className="h-14 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xl font-semibold text-slate-700 shadow-sm active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold shadow-sm active:scale-95 transition-all flex items-center justify-center"
          >
            {loading ? "..." : "⏎"}
          </button>
        </div>
      </div>
    </div>
  );
}