import { MenuItem, AboutConfig } from "./types";

// ✅ SMART API URL:
// We use "" (empty string) for everything.
// In DEV: Vite proxy (vite.config.ts) forwards /api to localhost:4000
// In PROD: The backend serves the frontend, so /api works naturally.
export const API_BASE = "";

export const INITIAL_MENU: MenuItem[] = [
  {
    id: "m1",
    name: "Nasi Ayam Biasa",
    price: 990, // RM9.90
    category: "Main",
    image: null,
    isActive: true,
    description: "Our signature chicken rice with fragrant rice and tender chicken.", // <<< ADD THIS LINE
  },
  {
    id: "m2",
    name: "Nasi Ayam Special",
    price: 1290, // RM12.90
    category: "Main",
    image: null,
    isActive: true,
    description: "Special chicken rice with extra chicken and sides.", // <<< ADD THIS LINE
  },
  {
    id: "d1",
    name: "Teh O' Ais",
    price: 300, // RM3.00
    category: "Drink",
    image: null,
    isActive: true,
    description: "Iced plain tea.", // <<< ADD THIS LINE
  },
  // ...add description to any other MenuItem in this array if missing...
];

export const INITIAL_ABOUT_CONFIG: AboutConfig = {
  description: "Simple ordering system for Pak Awi Nasi Ayam.",
  location: "Set your location in Admin later",
  operatingHours: "Daily 10:00 AM - 10:00 PM",
  phone: "+60XXXXXXXXX",
};
