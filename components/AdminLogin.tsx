import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Sun, Moon } from "lucide-react";
import { API_BASE } from "../constants";


export default function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [dark, setDark] = useState<boolean>(() =>
    localStorage.getItem("adminTheme") === "dark"
  );

  const canSubmit = username.trim() !== "" && password.trim() !== "";

  useEffect(() => {
    localStorage.setItem("adminTheme", dark ? "dark" : "light");
  }, [dark]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error("Wrong username or password");

      sessionStorage.setItem("adminToken", data.token);
      onLoggedIn();
    } catch {
      setErr("Wrong username or password");
      setShake(true);
      setUsername("");
      setPassword("");
      setTimeout(() => setShake(false), 300);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition ${
        dark ? "bg-slate-900" : "bg-slate-100"
      }`}
    >
      <div
        className={`w-full max-w-sm rounded-xl shadow-lg p-6 transition ${
          shake ? "animate-shake" : ""
        } ${dark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Admin Login</h2>

          <button
            type="button"
            onClick={() => setDark((v) => !v)}
            className="p-2 rounded hover:bg-black/10"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <form onSubmit={login} className="space-y-4">
          {/* Username */}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className={`w-full px-3 py-2 rounded border focus:outline-none ${
              dark
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-white border-slate-300"
            }`}
          />

          {/* Password */}
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={`w-full px-3 py-2 rounded border pr-10 focus:outline-none ${
                dark
                  ? "bg-slate-700 border-slate-600 text-white"
                  : "bg-white border-slate-300"
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error */}
          {err && (
            <div className="text-sm text-red-500 text-center">{err}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className={`w-full py-2 rounded font-semibold transition ${
              canSubmit
                ? dark
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-black hover:bg-slate-800 text-white"
                : "bg-slate-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}