// ================= ADMIN =================
export function isAdminLoggedIn(): boolean {
  return !!localStorage.getItem("adminToken");
}

export function adminLogout() {
  localStorage.removeItem("adminToken");
}

// ================= KITCHEN =================
export function isKitchenLoggedIn(): boolean {
  return !!sessionStorage.getItem("kitchenToken");
}

export function kitchenLogout() {
  sessionStorage.removeItem("kitchenToken");
}
