import { useState, FormEvent } from "react";
import { API_BASE } from "../constants";
import { Terminal } from "lucide-react";

interface Props {
  onLoggedIn: () => void;
}

export default function DeveloperLogin({ onLoggedIn }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Access Denied");
      }

      sessionStorage.setItem("developerToken", data.token);
      onLoggedIn();
    } catch (err) {
      setError("Access Denied");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 font-mono">
      <div className="bg-slate-900 border border-green-900/50 p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <Terminal className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-500">System Access</h1>
          <p className="text-green-800 mt-2 text-sm">Restricted Area</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-500 px-4 py-2 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950 border border-green-900/30 rounded text-green-500 focus:border-green-500 focus:outline-none placeholder-green-900"
            placeholder="Username"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950 border border-green-900/30 rounded text-green-500 focus:border-green-500 focus:outline-none placeholder-green-900"
            placeholder="Password"
          />
          <button disabled={loading} className="w-full bg-green-900/20 hover:bg-green-900/40 text-green-500 border border-green-900/50 py-3 rounded font-bold transition-colors">
            {loading ? "Authenticating..." : "Initialize Session"}
          </button>
        </form>
      </div>
    </div>
  );
}