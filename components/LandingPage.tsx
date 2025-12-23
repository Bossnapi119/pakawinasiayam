import { useState } from "react";
import { UtensilsCrossed, ShoppingBag, Info } from "lucide-react";
import { Language } from "../translations";
import { API_BASE } from "../constants";

type Props = {
  onSelectOrderType: (type: "dine-in" | "take-away") => void;
  landingImage: string | null;
  shopLogo: string | null;
  brandName: string;
  dailySpecial: string;
  aspectRatio: "16:9" | "9:16";
  aboutConfig: any;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: any;
  onShowInfo: () => void;
};

export default function LandingPage({
  onSelectOrderType,
  landingImage,
  shopLogo,
  brandName,
  dailySpecial,
  language,
  setLanguage,
  t,
  onShowInfo,
}: Props) {
  const safeT = t ?? {};
  const [selected, setSelected] = useState<"dine-in" | "take-away" | null>(null);

  const handleSelect = (type: "dine-in" | "take-away") => {
    setSelected(type);
    setTimeout(() => {
      onSelectOrderType(type);
    }, 100);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Background image */}
      {landingImage && (
        <img
          src={landingImage.startsWith("http") ? landingImage : `${API_BASE}${landingImage}`}
          alt="Landing"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}

      {/* Dark overlay (does not block clicks) */}
      <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none" />

      {/* Language switch */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <button
          onClick={onShowInfo}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition shadow-lg mb-2"
          title="Shop Info"
        >
          <Info size={20} />
        </button>

        <button
          onClick={() => setLanguage("en")}
          className={`w-10 h-10 rounded-full text-white font-bold ${
            language === "en" ? "bg-red-600" : "bg-black/60"
          }`}
        >
          EN
        </button>

        <button
          onClick={() => setLanguage("ms")}
          className={`w-10 h-10 rounded-full text-white font-bold ${
            language === "ms" ? "bg-red-600" : "bg-black/60"
          }`}
        >
          MS
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white px-4">
        {shopLogo && (
          <img
            src={shopLogo.startsWith("http") ? shopLogo : `${API_BASE}${shopLogo}`}
            alt="Logo"
            className="w-32 h-32 object-contain mb-6 rounded-full bg-white p-2 shadow-xl"
          />
        )}

        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-8">
          {brandName}
        </h1>

        <div className="flex gap-6 mb-6">
          {/* 🔴 DINE IN */}
          <button
            onClick={() => handleSelect("dine-in")}
            className={`
              rounded-2xl p-6 w-40 h-40 flex flex-col items-center justify-center transition-all duration-100 shadow-xl backdrop-blur-sm
              ${selected === "dine-in" 
                ? "bg-red-600 border-2 border-red-600 text-white scale-95" 
                : "bg-black/40 border-2 border-red-600 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95"
              }
              ${selected === "take-away" ? "opacity-50 grayscale" : "opacity-100"}
            `}
          >
            <UtensilsCrossed size={32} />
            <span className="mt-3 font-semibold">
              {safeT.dineIn ?? "Dine In"}
            </span>
            <span className="text-sm opacity-90">
              {safeT.dineInSub ?? "Eat here"}
            </span>
          </button>

          {/* TAKE AWAY */}
          <button
            onClick={() => handleSelect("take-away")}
            className={`
              rounded-2xl p-6 w-40 h-40 flex flex-col items-center justify-center transition-all duration-100 shadow-xl backdrop-blur-sm
              ${selected === "take-away" 
                ? "bg-orange-500 border-2 border-orange-500 text-white scale-95" 
                : "bg-black/40 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white hover:border-orange-500 active:scale-95"
              }
              ${selected === "dine-in" ? "opacity-50 grayscale" : "opacity-100"}
            `}
          >
            <ShoppingBag size={32} />
            <span className="mt-3 font-semibold">
              {safeT.takeAway ?? "Take Away"}
            </span>
            <span className="text-sm opacity-90">
              {safeT.takeAwaySub ?? "Pack & Go"}
            </span>
          </button>
        </div>

        {/* Special today */}
        {dailySpecial && (
          <div className="mt-4 bg-red-600 px-6 py-2 rounded-full text-sm font-semibold">
            {(safeT.specialToday ?? "Special Today")}: {dailySpecial}
          </div>
        )}
      </div>
    </div>
  );
}
