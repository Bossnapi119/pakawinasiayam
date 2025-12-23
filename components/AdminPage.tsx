import { useMemo, useState, useEffect } from "react";
import { API_BASE } from "../constants";
import { Edit2, Image as ImageIcon, Download, FileText, Trash2, TrendingUp, Calendar, Shield, Eye, EyeOff } from "lucide-react";

type AnyMenuItem = any;

function getToken() {
  return sessionStorage.getItem("adminToken");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

interface AdminPageProps {
  onLogout: () => void;
}

const CATEGORIES = ["Main", "Set", "Side", "Drink"];

const CATEGORY_LABELS: Record<string, string> = {
  Main: "Mains",
  Set: "Sets",
  Side: "Sides",
  Drink: "Drinks",
  Uncategorized: "Uncategorized",
};

export default function AdminPage({ onLogout }: AdminPageProps) {
  // ========== TAB STATE ==========
  const [tab, setTab] = useState<"dashboard" | "branding" | "menu" | "security">("menu");

  // ========== MENU STATE ==========
  const [menu, setMenu] = useState<AnyMenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<AnyMenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AnyMenuItem | null>(null);
  const [showClearDbModal, setShowClearDbModal] = useState(false);

  const [mName, setMName] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mCat, setMCat] = useState("Main");
  const [mPrice, setMPrice] = useState("");
  const [mActive, setMActive] = useState(true);
  const [mImageFile, setMImageFile] = useState<File | null>(null);
  const [mImagePreview, setMImagePreview] = useState("");

  // ========== BRANDING STATE ==========
  const [brandName, setBrandName] = useState("");
  const [dailySpecial, setDailySpecial] = useState("");
  const [posterPath, setPosterPath] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [operatingHours, setOperatingHours] = useState("");

  // Individual Edit States
  const [editName, setEditName] = useState(false);
  const [editSpecial, setEditSpecial] = useState(false);
  const [editPoster, setEditPoster] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [specialStatus, setSpecialStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [posterStatus, setPosterStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [editLogo, setEditLogo] = useState(false);
  const [logoStatus, setLogoStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [editInfo, setEditInfo] = useState(false);
  const [infoStatus, setInfoStatus] = useState<"idle" | "saving" | "saved">("idle");

  // ========== DASHBOARD STATE ==========
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeMenuItems: 0,
    pendingOrders: 0,
  });
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<{ date: string; total: number }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ========== SECURITY STATE ==========
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [passwordError, setPasswordError] = useState("");

  // Visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ========== GROUP MENU BY CATEGORY ==========
  const groupedMenu = useMemo(() => {
    const groups: { [key: string]: AnyMenuItem[] } = {};
    const categorizedIds = new Set();

    CATEGORIES.forEach((cat) => {
      groups[cat] = menu.filter((item) => {
        const isMatch = item.category === cat;
        if (isMatch) categorizedIds.add(item.id);
        return isMatch;
      });
    });
    // Catch items with wrong categories (e.g. "Mains" instead of "Main")
    groups["Uncategorized"] = menu.filter((item) => !categorizedIds.has(item.id));
    return groups;
  }, [menu]);

  // ========== LOAD DATA ON MOUNT ==========
  useEffect(() => {
    loadMenu();
    loadBranding();
    loadStats();
  }, []);

  // ========== LOAD FUNCTIONS ==========
  async function loadStats() {
    try {
      const ordersRes = await fetch(`${API_BASE}/api/orders`, {
        headers: authHeaders(),
      });
      if (!ordersRes.ok) return;
      const orders = await ordersRes.json();

      if (!Array.isArray(orders)) return;

      const totalRevenue = orders.reduce(
        (sum: number, o: any) => sum + (o.total || 0),
        0
      );
      const pendingOrders = orders.filter(
        (o: any) => o.status === "NEW" || o.status === "PREPARING"
      ).length;

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        activeMenuItems: menu.filter((m: any) => m.isActive).length,
        pendingOrders,
      });

      setAllOrders(orders);
    } catch (err) {
      console.error("Load stats failed:", err);
    }
  }

  // ========== FILTER SALES DATA ==========
  useEffect(() => {
    let start: Date, end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default: Last 7 days (UTC midnight to match input behavior)
      const now = new Date();
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      start = new Date(end);
      start.setDate(end.getDate() - 6);
    }

    const dates: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const salesMap = new Map<string, number>();
    allOrders.forEach((o: any) => {
      const d = new Date(o.createdAt).toISOString().split('T')[0];
      salesMap.set(d, (salesMap.get(d) || 0) + (o.total || 0));
    });

    setSalesData(dates.map(date => ({
      date,
      total: salesMap.get(date) || 0
    })));
  }, [allOrders, startDate, endDate]);

  async function loadMenu() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/menu`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setMenu(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }

  async function loadBranding() {
    try {
      // Add timestamp to prevent caching
      const res = await fetch(`${API_BASE}/api/site?t=${Date.now()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setBrandName(data.brandName || "");
      setDailySpecial(data.dailySpecial || "");
      setPosterPath(data.landingPosterPath || "");
      setLogoPath(data.logoPath || "");
      setAddress(data.address || "");
      setPhone(data.phone || "");
      setOperatingHours(data.operatingHours || "");
    } catch (err) {
      console.error("Load branding failed:", err);
    }
  }

  // ========== MENU CRUD ==========
  function openModal(item: AnyMenuItem | null = null) {
    if (item) {
      setEditItem(item);
      setMName(item.name || "");
      setMDesc(item.description || "");
      setMCat(item.category || "Main");
      setMPrice(String((item.price / 100).toFixed(2)) || "");
      setMActive(String(item.isActive) === "1" || String(item.isActive) === "true");
      setMImagePreview(item.image || "");
    } else {
      setEditItem(null);
      setMName("");
      setMDesc("");
      setMCat("Main");
      setMPrice("");
      setMActive(true);
      setMImagePreview("");
    }
    setMImageFile(null);
    setShowModal(true);
  }

  async function createOrUpdateMenu() {
    if (!mName.trim()) throw new Error("Item name required");
    if (!mPrice.trim()) throw new Error("Price required");

    const priceInCents = Math.round(parseFloat(mPrice) * 100);
    if (isNaN(priceInCents) || priceInCents < 0)
      throw new Error("Invalid price");

    const formData = new FormData();
    formData.append("name", mName);
    formData.append("description", mDesc);
    formData.append("category", mCat);
    formData.append("price", String(priceInCents));
    formData.append("isActive", String(mActive ? 1 : 0));
    if (mImageFile) {
      try {
        const compressed = await compressImage(mImageFile, 800, 0.7);
        formData.append("image", compressed);
      } catch (err) {
        formData.append("image", mImageFile);
      }
    }

    try {
      const url = editItem
        ? `${API_BASE}/api/admin/menu/${editItem.id}`
        : `${API_BASE}/api/admin/menu`;
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Operation failed");

      setShowModal(false);
      loadMenu();
    } catch (err) {
      throw err;
    }
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/menu/${itemToDelete.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error("Delete failed");
      loadMenu();
      setItemToDelete(null);
    } catch (err) {
      alert("Delete failed: " + (err instanceof Error ? err.message : ""));
    }
  }

  async function saveField(type: "name" | "special" | "info") {
    const setStatus = type === "name" ? setNameStatus : type === "special" ? setSpecialStatus : setInfoStatus;
    const setEdit = type === "name" ? setEditName : type === "special" ? setEditSpecial : setEditInfo;

    setStatus("saving");
    try {
      const res = await fetch(`${API_BASE}/api/admin/site`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          brandName,
          dailySpecial,
          address,
          phone,
          operatingHours,
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      
      setStatus("saved");
      setTimeout(() => {
        setStatus("idle");
        setEdit(false);
      }, 1500);

      loadBranding();
    } catch (err) {
      alert("Failed: " + (err instanceof Error ? err.message : ""));
      setStatus("idle");
    }
  }

  function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            } else {
              reject(new Error("Compression failed"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
    });
  }

  async function savePoster() {
    if (!posterFile) return;
    setPosterStatus("saving");

    const formData = new FormData();
    try {
      const compressed = await compressImage(posterFile);
      formData.append("image", compressed);

      const res = await fetch(`${API_BASE}/api/admin/site/poster`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      
      setPosterStatus("saved");
      setTimeout(() => {
        setPosterStatus("idle");
        setEditPoster(false);
        setPosterFile(null);
        setPosterPreview("");
      }, 1500);

      loadBranding();
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : ""));
      setPosterStatus("idle");
    }
  }

  // ========== DATA MANAGEMENT ==========
  async function exportCSV() {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, { headers: authHeaders() });
      const orders = await res.json();
      
      if (!orders || orders.length === 0) {
        alert("No data to export");
        return;
      }

      // CSV Header
      let csv = "Order ID,Date,Customer,Phone,Type,Status,Total (RM),Items\n";
      
      // CSV Rows
      orders.forEach((o: any) => {
        const date = new Date(o.createdAt).toLocaleString().replace(/,/g, " ");
        const total = (o.total / 100).toFixed(2);
        const items = o.items.map((i: any) => `${i.quantity}x ${i.name}`).join("; ");
        
        csv += `${o.id},${date},${o.customerName},${o.customerPhone},${o.orderType},${o.status},${total},"${items}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert("Export failed");
    }
  }

  async function printReport() {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, { headers: authHeaders() });
      const orders = await res.json();

      if (!orders || orders.length === 0) {
        alert("No data to print");
        return;
      }

      const html = `
        <html>
          <head>
            <title>Sales Report</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { bg-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Sales Report - ${new Date().toLocaleDateString()}</h1>
            <table>
              <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                ${orders.map((o: any) => `
                  <tr>
                    <td>${o.id}</td>
                    <td>${new Date(o.createdAt).toLocaleString()}</td>
                    <td>${o.customerName}</td>
                    <td>${o.orderType}</td>
                    <td>RM ${(o.total / 100).toFixed(2)}</td>
                    <td>${o.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>window.print();</script>
          </body>
        </html>
      `;
      const win = window.open("", "_blank");
      win?.document.write(html);
      win?.document.close();
    } catch (err) {
      alert("Failed to generate report");
    }
  }

  async function performClearDatabase() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (!res.ok) throw new Error("Failed");
      alert("Database cleared successfully.");
      loadStats();
      setShowClearDbModal(false);
    } catch (err) {
      alert("Failed to clear database");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordStatus("saving");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      setPasswordStatus("idle");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/change-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "An unknown error occurred");

      setPasswordStatus("saved");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordStatus("idle"), 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
      setPasswordStatus("idle");
    }
  }

  async function saveLogo() {
    if (!logoFile) return;
    setLogoStatus("saving");

    const formData = new FormData();
    try {
      const compressed = await compressImage(logoFile, 512, 0.8);
      formData.append("image", compressed);

      const res = await fetch(`${API_BASE}/api/admin/site/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      
      setLogoStatus("saved");
      setTimeout(() => {
        setLogoStatus("idle");
        setEditLogo(false);
        setLogoFile(null);
        setLogoPreview("");
      }, 1500);

      loadBranding();
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : ""));
      setLogoStatus("idle");
    }
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* ========== SIDEBAR ========== */}
      <div className="w-full md:w-72 bg-slate-900 text-white flex flex-col shadow-xl z-10 flex-shrink-0">
        <div className="p-6 md:p-8 border-b border-slate-800">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Admin Panel</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Manage your shop</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setTab("dashboard")}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 ${
              tab === "dashboard"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <TrendingUp size={20} /> Dashboard
          </button>

          <button
            onClick={() => setTab("menu")}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 ${
              tab === "menu"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileText size={20} /> Menu Management
          </button>

          <button
            onClick={() => setTab("branding")}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 ${
              tab === "branding"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <ImageIcon size={20} /> Branding & Site
          </button>

          <button
            onClick={() => setTab("security")}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 ${
              tab === "security"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Shield size={20} /> Security
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full bg-slate-800 text-slate-300 py-3 rounded-xl font-semibold hover:bg-red-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 overflow-auto">
        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard Overview</h2>
              <p className="text-slate-500">Welcome back, here is what's happening today.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
                  Total Revenue
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900">
                  RM {(stats.totalRevenue / 100).toFixed(2)}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
                  Total Orders
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900">
                  {stats.totalOrders}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
                  Active Items
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900">
                  {stats.activeMenuItems}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
                  Pending Orders
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900">
                  {stats.pendingOrders}
                </div>
              </div>
            </div>

            {/* Sales Graph */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-red-600" />
                  <h3 className="text-xl font-bold text-slate-900">Revenue</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="pl-9 pr-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                  <span className="text-gray-400">-</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2 sm:gap-4">
                {salesData.map((day) => {
                  const maxVal = Math.max(...salesData.map(d => d.total), 100); // Avoid div by zero
                  const height = (day.total / maxVal) * 100;
                  const dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                  
                  return (
                    <div key={day.date} className="flex flex-col items-center flex-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-10">
                        RM {(day.total / 100).toFixed(2)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                      </div>
                      
                      {/* Bar */}
                      <div className="w-full bg-gray-100 rounded-t-md relative flex items-end overflow-hidden h-full">
                        <div 
                          style={{ height: `${height}%` }} 
                          className={`w-full transition-all duration-500 ${day.total > 0 ? 'bg-red-500 group-hover:bg-red-600' : 'bg-transparent'}`}
                        ></div>
                      </div>
                      
                      {/* Label */}
                      <div className="text-xs text-gray-500 mt-2 font-medium text-center">{dateLabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Management Section */}
            <div className="mt-8 border-t pt-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Data Management</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition shadow-sm"
                >
                  <Download size={20} />
                  Export CSV
                </button>
                <button
                  onClick={printReport}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
                >
                  <FileText size={20} />
                  Print Report (PDF)
                </button>
                <button
                  onClick={() => setShowClearDbModal(true)}
                  className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition shadow-sm"
                >
                  <Trash2 size={20} />
                  Clear Database
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                * Export your data before clearing the database. Clearing deletes all order history permanently.
              </p>
            </div>
          </div>
        )}

        {/* MENU TAB */}
        {tab === "menu" && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Menu Items</h2>
              <button
                onClick={() => openModal(null)}
                className="bg-red-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-700 transition shadow-lg shadow-red-600/20"
              >
                ➕ Add Item
              </button>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-8">
                {[...CATEGORIES, "Uncategorized"].map((category) => {
                  // Hide Uncategorized section if empty
                  if (category === "Uncategorized" && (!groupedMenu[category] || groupedMenu[category].length === 0)) return null;

                  return (
                  <div key={category}>
                    {/* Category Title Panel */}
                    <div className={`${category === "Uncategorized" ? "bg-slate-600" : "bg-red-600"} text-white px-6 py-3 rounded-xl font-bold text-lg mb-4 shadow-md`}>
                      {CATEGORY_LABELS[category] || category}
                    </div>

                    {/* Category Items */}
                    {groupedMenu[category]?.length === 0 ? (
                      <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
                        <p className="text-gray-500">No items in {CATEGORY_LABELS[category]}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedMenu[category]?.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                          >
                            {/* Image */}
                            {item.image ? (
                              <img
                                src={item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`}
                                alt={item.name}
                                className="w-full h-40 object-cover"
                              />
                            ) : (
                              <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-gray-400">
                                No Image
                              </div>
                            )}

                            <div className="p-4">
                              {/* Name */}
                              <h3 className="font-bold text-lg text-slate-900 mb-2">
                                {item.name}
                              </h3>

                              {/* Description */}
                              {item.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {item.description}
                                </p>
                              )}

                              {/* Price */}
                              <div className="mb-4 pb-4 border-b border-gray-200">
                                <span className="text-lg font-bold text-slate-900">
                                  RM {(item.price / 100).toFixed(2)}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <div className="mb-4">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                    (String(item.isActive) === "1" || String(item.isActive) === "true")
                                      ? "bg-green-100 text-green-800 border border-green-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {(String(item.isActive) === "1" || String(item.isActive) === "true") ? "Active" : "Inactive"}
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openModal(item)}
                                  className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 text-sm font-semibold transition"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => setItemToDelete(item)}
                                  className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 text-sm font-semibold transition"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}
          </div>
        )}

        {/* BRANDING TAB */}
        {tab === "branding" && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
              Shop Branding
            </h2>

            <div className="space-y-6 max-w-3xl">
              {/* Shop Logo */}
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Shop Logo</h3>
                  {!editLogo && (
                    <button onClick={() => setEditLogo(true)} className="text-gray-500 hover:text-red-600">
                      <Edit2 size={20} />
                    </button>
                  )}
                </div>

                {/* Preview Box */}
                <div className="mb-4 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 relative h-32 w-32 flex items-center justify-center mx-auto">
                  {logoPreview || logoPath ? (
                    <img
                      src={logoPreview || `${API_BASE}${logoPath}`}
                      alt="Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <ImageIcon size={32} />
                      <span className="mt-1 text-xs">No Logo</span>
                    </div>
                  )}
                </div>

                {editLogo && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setLogoFile(e.target.files[0]);
                          setLogoPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditLogo(false);
                          setLogoPreview("");
                          setLogoFile(null);
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveLogo}
                        disabled={!logoFile || logoStatus === "saving"}
                        className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                          logoStatus === "saved" ? "bg-green-600" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {logoStatus === "saving"
                          ? "Compressing..."
                          : logoStatus === "saved"
                          ? "Saved!"
                          : "Upload & Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shop Name */}
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Shop Name</h3>
                  {!editName && (
                    <button onClick={() => setEditName(true)} className="text-gray-500 hover:text-red-600">
                      <Edit2 size={20} />
                    </button>
                  )}
                </div>
                {editName ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    />
                    <button
                      onClick={() => saveField("name")}
                      disabled={nameStatus === "saving"}
                      className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                        nameStatus === "saved" ? "bg-green-600" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {nameStatus === "saving" ? "Saving..." : nameStatus === "saved" ? "Saved!" : "Save"}
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-700 text-lg">{brandName}</p>
                )}
              </div>

              {/* Daily Special */}
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Daily Special</h3>
                  {!editSpecial && (
                    <button onClick={() => setEditSpecial(true)} className="text-gray-500 hover:text-red-600">
                      <Edit2 size={20} />
                    </button>
                  )}
                </div>
                {editSpecial ? (
                  <div className="space-y-3">
                    <textarea
                      value={dailySpecial}
                      onChange={(e) => setDailySpecial(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => saveField("special")}
                        disabled={specialStatus === "saving"}
                        className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                          specialStatus === "saved" ? "bg-green-600" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {specialStatus === "saving" ? "Saving..." : specialStatus === "saved" ? "Saved!" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 italic">{dailySpecial || "No daily special set."}</p>
                )}
              </div>

              {/* Shop Information */}
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Shop Information</h3>
                  {!editInfo && (
                    <button onClick={() => setEditInfo(true)} className="text-gray-500 hover:text-red-600">
                      <Edit2 size={20} />
                    </button>
                  )}
                </div>
                {editInfo ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Operating Hours</label>
                      <input
                        type="text"
                        value={operatingHours}
                        onChange={(e) => setOperatingHours(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => saveField("info")}
                        disabled={infoStatus === "saving"}
                        className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                          infoStatus === "saved" ? "bg-green-600" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {infoStatus === "saving" ? "Saving..." : infoStatus === "saved" ? "Saved!" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-gray-700">
                    <p><span className="font-semibold">Address:</span> {address || "Not set"}</p>
                    <p><span className="font-semibold">Phone:</span> {phone || "Not set"}</p>
                    <p><span className="font-semibold">Hours:</span> {operatingHours || "Not set"}</p>
                  </div>
                )}
              </div>

              {/* Landing Poster */}
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Landing Poster</h3>
                  {!editPoster && (
                    <button onClick={() => setEditPoster(true)} className="text-gray-500 hover:text-red-600">
                      <Edit2 size={20} />
                    </button>
                  )}
                </div>

                {/* Preview Box */}
                <div className="mb-4 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 relative aspect-video flex items-center justify-center">
                  {posterPreview || posterPath ? (
                    <img
                      src={posterPreview || `${API_BASE}${posterPath}`}
                      alt="Poster Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <ImageIcon size={48} />
                      <span className="mt-2">No poster uploaded</span>
                    </div>
                  )}
                </div>

                {editPoster && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setPosterFile(e.target.files[0]);
                          setPosterPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditPoster(false);
                          setPosterPreview("");
                          setPosterFile(null);
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={savePoster}
                        disabled={!posterFile || posterStatus === "saving"}
                        className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                          posterStatus === "saved" ? "bg-green-600" : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {posterStatus === "saving"
                          ? "Compressing..."
                          : posterStatus === "saved"
                          ? "Saved!"
                          : "Upload & Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {tab === "security" && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
              Security Settings
            </h2>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm max-w-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Change Admin Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passwordStatus === "saving"}
                    className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                      passwordStatus === "saved" ? "bg-green-600" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {passwordStatus === "saving" ? "Saving..." : passwordStatus === "saved" ? "Saved!" : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ========== MODAL ========== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {editItem ? "Edit Menu Item" : "Add Menu Item"}
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createOrUpdateMenu().catch((err) =>
                    alert(err instanceof Error ? err.message : "Error")
                  );
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={mName}
                      onChange={(e) => setMName(e.target.value)}
                      placeholder="e.g., Nasi Ayam Biasa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Price (RM) *
                    </label>
                    <input
                      type="number"
                      value={mPrice}
                      onChange={(e) => setMPrice(e.target.value)}
                      placeholder="10.00"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Category *
                    </label>
                    <select
                      value={mCat}
                      onChange={(e) => setMCat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Active Status */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mActive}
                        onChange={(e) => setMActive(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300"
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        Available
                      </span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Description
                  </label>
                  <textarea
                    value={mDesc}
                    onChange={(e) => setMDesc(e.target.value)}
                    placeholder="Describe the item..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Item Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setMImageFile(e.target.files[0]);
                        const reader = new FileReader();
                        reader.onload = (ev) =>
                          setMImagePreview(String(ev.target?.result));
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PNG/JPG, max 2MB (compress before upload)
                  </p>
                </div>

                {/* Image Preview */}
                {mImagePreview && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      Preview:
                    </p>
                    <img
                      src={mImagePreview}
                      alt="Preview"
                      className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    💾 Save Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
                  >
                    ❌ Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Item?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{itemToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CLEAR DATABASE CONFIRMATION MODAL ========== */}
      {showClearDbModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border-2 border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <Trash2 size={32} />
              <h3 className="text-xl font-bold text-slate-900">Clear Database?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will <strong>permanently delete all order history</strong>. This action cannot be undone. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearDbModal(false)}
                className="flex-1 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={performClearDatabase}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 shadow-lg shadow-red-600/20"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
