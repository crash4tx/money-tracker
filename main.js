const defaultTransactions = [];

const defaultCategories = [
  { label: "Makanan", type: "Pengeluaran", color: "#8751ED", iconLabel: "MK" },
  { label: "Transport", type: "Pengeluaran", color: "#FF3434", iconLabel: "TR" },
  { label: "Hiburan", type: "Pengeluaran", color: "#10C260", iconLabel: "HB" },
  { label: "Belanja", type: "Pengeluaran", color: "#1653B5", iconLabel: "BL" },
  { label: "Tagihan", type: "Pengeluaran", color: "#43A8E6", iconLabel: "TG" },
  { label: "Kesehatan", type: "Pengeluaran", color: "#FF7A21", iconLabel: "KS" },
  { label: "Pendidikan", type: "Pengeluaran", color: "#EAB308", iconLabel: "PD" },
  { label: "Gaji", type: "Pemasukan", color: "#10C260", iconLabel: "GJ" },
  { label: "Freelance", type: "Pemasukan", color: "#43A8E6", iconLabel: "FL" },
  { label: "Investasi", type: "Pemasukan", color: "#8751ED", iconLabel: "IV" },
  { label: "Bonus", type: "Pemasukan", color: "#EAB308", iconLabel: "BN" },
  { label: "Lainnya", type: "Lainnya", color: "#64748b", iconLabel: "LN" }
];

const SESSION_KEY = "luxentra_session";
const TRANSACTIONS_KEY = "luxentra_transactions";
const PROFILE_AVATAR_KEY = "luxentra_profile_avatar";
const RECOVERY_EMAIL_KEY = "luxentra_recovery_email";
const USERS_KEY = "luxentra_users";
const CATEGORIES_KEY = "luxentra_default_categories";
const BROADCAST_KEY = "luxentra_broadcast";

function getStoredUsers() {
  const users = readStoredJson(USERS_KEY, null);
  return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
  writeStoredJson(USERS_KEY, users);
}

function getUserByEmail(email) {
  const users = getStoredUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

let categories = [];

function getCategories() {
  return categories.length > 0 ? categories : defaultCategories;
}

function saveCategories(cats) {
  categories = cats;
}
const protectedPages = new Set(["dashboard", "transactions", "new-transaction", "settings", "expense-categories"]);
const authPages = new Set(["login", "register"]);
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let activeAreaVariant = "expense";
let transactions = [];

function getCurrentPage() {
  return document.body?.dataset.page || "";
}

function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


function readStoredSession() {
  let localSession = "";

  try {
    localSession = window.localStorage.getItem(SESSION_KEY) || "";
  } catch (error) {
    localSession = "";
  }

  return localSession || (window.name.startsWith(`${SESSION_KEY}=`) ? window.name.slice(SESSION_KEY.length + 1) : "");
}

function writeStoredSession(value) {
  try {
    window.localStorage.setItem(SESSION_KEY, value);
    window.name = `${SESSION_KEY}=${value}`;
  } catch (error) {
    window.name = `${SESSION_KEY}=${value}`;
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // Fallback below handles browsers that block localStorage on file previews.
  }

  if (window.name.startsWith(`${SESSION_KEY}=`)) {
    window.name = "";
  }
}

function readStoredJson(key, fallback) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return fallback;
    return JSON.parse(rawValue);
  } catch (error) {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore write failures on restricted previews.
  }
}

function removeStoredValue(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore removal failures on restricted previews.
  }
}

function formatLongDate(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "Tanggal Tidak Valid";
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function parseCurrencyInput(value) {
  const digitsOnly = `${value || ""}`.replace(/[^\d]/g, "");
  return Number.parseInt(digitsOnly || "0", 10);
}

function parseIndonesianDateLabel(label) {
  const match = `${label || ""}`.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const monthIndex = monthNames.findIndex((month) => month.toLowerCase() === match[2].toLowerCase());
  const year = Number.parseInt(match[3], 10);
  if (monthIndex < 0) return null;

  return new Date(year, monthIndex, day);
}

function getTransactionTimestamp(item) {
  if (item.date) {
    const parsedTime = new Date(item.date).getTime();
    if (!Number.isNaN(parsedTime)) return parsedTime;
  }

  if (item.timestamp) {
    const parsedTime = new Date(item.timestamp).getTime();
    if (!Number.isNaN(parsedTime)) return parsedTime;
  }

  const subtitleParts = `${item.subtitle || ""}`.split(" - ");
  const datePart = subtitleParts[subtitleParts.length - 1] || "";
  const parsedDate = parseIndonesianDateLabel(datePart);
  return parsedDate ? parsedDate.getTime() : 0;
}

function buildTransactionTitle({ type, category, note, dateLabel }) {
  const cleanNote = `${note || ""}`.trim();
  if (cleanNote) {
    return cleanNote.length > 34 ? `${cleanNote.slice(0, 34).trim()}...` : cleanNote;
  }

  const monthLabel = `${dateLabel || ""}`.split(" ")[1] || "";
  if (type === "Pemasukan" && category === "Gaji" && monthLabel) {
    return `Gaji Bulan ${monthLabel}`;
  }

  if (type === "Pemasukan" && category === "Bonus") {
    return "Bonus Tambahan";
  }

  if (type === "Pemasukan" && category === "Investasi") {
    return "Pendapatan Investasi";
  }

  if (type === "Pengeluaran" && category === "Belanja") {
    return "Belanja Bulanan";
  }

  return category || type;
}

function sortTransactions(items) {
  return [...items].sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a));
}

async function getStoredTransactions() {
  const session = getSession();
  if (!session) return [];
  const token = localStorage.getItem("luxentra_token");
  try {
    const res = await fetch("/api/transactions", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Gagal mengambil data transaksi.");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveTransactions(nextTransactions) {
  transactions = nextTransactions;
}

function resetStoredTransactions() {
  saveTransactions([]);
}

function getSession() {
  const rawSession = readStoredSession();
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession);
  } catch (error) {
    clearStoredSession();
    return null;
  }
}

function createSession(payload = {}) {
  const email = payload.email?.trim() || "pengguna@luxentra.app";
  const fallbackName = email.split("@")[0].replace(/[._-]+/g, " ");
  const safeName = payload.name?.trim() || fallbackName || "Pengguna";
  const normalizedName = safeName
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const session = {
    name: normalizedName || "Pengguna",
    email,
    role: payload.role || "user",
    createdAt: payload.createdAt || new Date().toISOString()
  };

  writeStoredSession(JSON.stringify(session));
  resetStoredTransactions();
  removeStoredValue(PROFILE_AVATAR_KEY);
  removeStoredValue(RECOVERY_EMAIL_KEY);
  return session;
}

function redirectTo(path) {
  window.location.href = path;
}

function initSessionRouting() {
  const page = getCurrentPage();
  const session = getSession();

  if (protectedPages.has(page) && !session) {
    redirectTo("login.html");
    return null;
  }

  if (page.startsWith("admin-") && session && session.role !== "admin") {
    redirectTo("dashboard.html");
    return null;
  }

  if (authPages.has(page) && session) {
    if (session.role === "admin") {
      redirectTo("admin-dashboard.html");
    } else {
      redirectTo("dashboard.html");
    }
    return null;
  }

  return session;
}

function initAuthForms() {
  const page = getCurrentPage();
  const form = document.querySelector(".auth-form");
  if (!form || !authPages.has(page)) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const emailInput = form.querySelector('input[type="email"]');
    const textInput = form.querySelector('input[type="text"]');
    const allInputs = Array.from(form.querySelectorAll('input'));
    const passwordInput = allInputs.find(i => i.placeholder === "Masukan Password") || form.querySelector('input[type="password"]');

    // Add input event listeners to clear error styles as the user types
    allInputs.forEach(i => {
      i.addEventListener("input", () => {
        const shell = i.closest(".input-shell");
        if (shell) shell.classList.remove("error");
      });
    });

    // Reset error styles on submit
    allInputs.forEach(i => {
      const shell = i.closest(".input-shell");
      if (shell) shell.classList.remove("error");
    });

    // Check for empty fields
    let hasEmpty = false;
    allInputs.forEach(i => {
      if (!i.value.trim()) {
        const shell = i.closest(".input-shell");
        if (shell) {
          shell.classList.add("error");
          hasEmpty = true;
        }
      }
    });

    if (hasEmpty) {
      showToast("Mohon lengkapi semua kolom terlebih dahulu.", "error");
      return;
    }

    if (page === "register") {
      const password = passwordInput?.value || "";
      const emailValue = emailInput.value.trim();
      const nameValue = textInput?.value.trim() || "Pengguna";

      fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue, email: emailValue, password })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Pendaftaran gagal.");
        
        localStorage.setItem("luxentra_token", data.token);
        createSession(data.user);
        
        if (data.user.role === "admin") {
          redirectTo("admin-dashboard.html");
        } else {
          redirectTo("dashboard.html");
        }
      })
      .catch((err) => {
        showToast(err.message, "error");
      });
    } else if (page === "login") {
      const emailValue = emailInput.value.trim();
      const pwd = passwordInput?.value || "";

      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, password: pwd })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login gagal.");
        
        localStorage.setItem("luxentra_token", data.token);
        createSession(data.user);
        
        if (data.user.role === "admin") {
          redirectTo("admin-dashboard.html");
        } else {
          redirectTo("dashboard.html");
        }
      })
      .catch((err) => {
        showToast(err.message, "error");
      });
    }
  });

  const googleButton = form.querySelector(".button--google");
  if (googleButton) {
    googleButton.addEventListener("click", async () => {
      try {
        const configRes = await fetch("/api/config");
        if (!configRes.ok) throw new Error("Gagal mengambil konfigurasi Google Login.");
        const config = await configRes.json();
        
        if (!config.supabaseUrl) {
          throw new Error("Supabase URL belum dikonfigurasi di backend.");
        }
        
        const redirectUrl = encodeURIComponent(window.location.origin + "/login.html?google_auth=success");
        window.location.href = `${config.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectUrl}`;
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

function initLogout() {
  const logoutButton = document.querySelector(".sidebar-exit");
  if (!logoutButton) return;

  logoutButton.addEventListener("click", (event) => {
    event.preventDefault();
    clearStoredSession();
    redirectTo("index.html");
  });
}

function initDeleteAccountModal() {
  const triggerButton = document.getElementById("deleteAccountButton");
  const modal = document.getElementById("deleteAccountModal");
  const backButton = document.getElementById("deleteAccountBackButton");
  if (!triggerButton || !modal || !backButton) return;

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add("modal-open");
  };

  const closeAndExit = () => {
    clearStoredSession();
    resetStoredTransactions();
    removeStoredValue(PROFILE_AVATAR_KEY);
    document.body.classList.remove("modal-open");
    modal.hidden = true;
    redirectTo("index.html");
  };

  triggerButton.addEventListener("click", openModal);
  backButton.addEventListener("click", closeAndExit);
}

function renderTransactionDetail() {
  if (getCurrentPage() !== "transaction-detail") return;

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get("id");
  if (!txId) return;

  const tx = transactions.find((t) => t.id === txId);
  if (!tx) return;

  const isIncome = tx.amount > 0;
  
  const banner = document.querySelector(".transaction-detail-banner");
  const bannerIcon = document.querySelector(".banner-icon");
  const badge = document.querySelector(".banner-info .badge");
  const title = document.querySelector(".banner-info h2");
  const subtitle = document.querySelector(".banner-info p");
  const amount = document.querySelector(".banner-amount strong");

  const infoType = document.querySelectorAll(".info-text strong")[0];
  const infoCategory = document.querySelectorAll(".info-text strong")[1];
  const infoDate = document.querySelectorAll(".info-text strong")[2];
  const infoAmount = document.querySelectorAll(".info-text strong")[3];
  
  const typeIcon = document.querySelectorAll(".info-icon")[0];
  const noteBox = document.querySelector(".note-box");

  if (banner) {
    banner.className = `transaction-detail-banner ${isIncome ? "transaction-detail-banner--income" : "transaction-detail-banner--expense"}`;
    bannerIcon.innerHTML = isIncome 
      ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>'
      : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>';
    badge.textContent = tx.type;
    title.textContent = tx.title;
    subtitle.textContent = tx.category;
    amount.textContent = formatCurrency(tx.amount);
  }

  if (infoType) infoType.textContent = tx.type;
  if (infoCategory) infoCategory.textContent = tx.category;
  if (infoDate) infoDate.textContent = tx.date ? formatLongDate(tx.date) : (tx.subtitle.split(" - ")[1] || "-");
  if (infoAmount) {
    infoAmount.textContent = formatCurrency(tx.amount);
    infoAmount.className = isIncome ? "income" : "expense";
  }

  if (typeIcon) {
    typeIcon.className = `info-icon ${isIncome ? "info-icon--green" : "info-icon--red"}`;
    typeIcon.innerHTML = isIncome 
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>';
  }

  if (noteBox) noteBox.textContent = tx.note || "-";
}

function initDeleteTransactionModal() {
  const triggerButton = document.getElementById("deleteTransactionButton");
  const modal = document.getElementById("deleteTransactionModal");
  const backButton = document.getElementById("deleteTransactionBackButton");
  if (!triggerButton || !modal || !backButton) return;

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get("id");

  const openModal = async () => {
    if (txId) {
      try {
        const token = localStorage.getItem("luxentra_token");
        const res = await fetch(`/api/transactions/${txId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Gagal menghapus transaksi.");
        showToast("Transaksi berhasil dihapus.");
      } catch (err) {
        showToast(err.message, "error");
        return;
      }
    }
    
    modal.hidden = false;
    document.body.classList.add("modal-open");
  };

  const closeAndExit = () => {
    document.body.classList.remove("modal-open");
    modal.hidden = true;
    redirectTo("transactions.html");
  };

  triggerButton.addEventListener("click", openModal);
  backButton.addEventListener("click", closeAndExit);
}

function initPasswordToggles() {
  const toggles = document.querySelectorAll(".password-toggle");
  toggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (!input || input.tagName !== "INPUT") return;

      const type = input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      
      if (type === "password") {
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      } else {
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      }
    });
  });
}

function hydrateUserProfile(session) {
  if (!session) return;

  const sidebarLabel = document.querySelector(".brand small");
  if (sidebarLabel) {
    sidebarLabel.textContent = session.name;
  }

  const profileName = document.querySelector(".profile-card__copy h3");
  if (profileName) {
    profileName.textContent = session.name;
  }

  const profileEmail = document.querySelector(".profile-card__copy p");
  if (profileEmail) {
    profileEmail.textContent = session.email;
  }

  const settingsNameInput = document.getElementById("settingsNameInput");
  if (settingsNameInput) {
    settingsNameInput.value = session.name;
  }

  const settingsEmailInput = document.getElementById("settingsEmailInput");
  if (settingsEmailInput) {
    settingsEmailInput.value = session.email;
  }

  const editNameInput = document.getElementById("editNameInput");
  if (editNameInput) {
    editNameInput.value = session.name;
  }

  const editEmailInput = document.getElementById("editEmailInput");
  if (editEmailInput) {
    editEmailInput.value = session.email;
  }

  const settingsPhoneInput = document.getElementById("settingsPhoneInput");
  if (settingsPhoneInput && session.phone) {
    settingsPhoneInput.value = session.phone;
  }

  const editPhoneInput = document.getElementById("editPhoneInput");
  if (editPhoneInput && session.phone) {
    editPhoneInput.value = session.phone;
  }

  const profileAvatar = document.querySelector(".profile-avatar");
  if (profileAvatar) {
    profileAvatar.textContent = session.name.charAt(0).toUpperCase();
  }
}

function formatCurrency(value) {
  const formatted = Math.abs(value).toLocaleString("id-ID");
  return `${value < 0 ? "-Rp" : "Rp"} ${formatted}`;
}

function getTransactionSummary(items = transactions) {
  return items.reduce(
    (summary, item) => {
      summary.count += 1;
      if (item.amount >= 0) {
        summary.income += item.amount;
      } else {
        summary.expense += Math.abs(item.amount);
      }
      summary.balance = summary.income - summary.expense;
      return summary;
    },
    { count: 0, income: 0, expense: 0, balance: 0 }
  );
}

function updateDashboardStats() {
  const summary = getTransactionSummary();
  const balanceNode = document.getElementById("dashboardBalanceTotal");
  const incomeNode = document.getElementById("dashboardIncomeTotal");
  const expenseNode = document.getElementById("dashboardExpenseTotal");

  if (balanceNode) balanceNode.textContent = formatCurrency(summary.balance);
  if (incomeNode) incomeNode.textContent = formatCurrency(summary.income);
  if (expenseNode) expenseNode.textContent = formatCurrency(summary.expense);
}

function updateTransactionsStats() {
  const summary = getTransactionSummary();
  const countNode = document.getElementById("transactionsCountTotal");
  const incomeNode = document.getElementById("transactionsIncomeTotal");
  const expenseNode = document.getElementById("transactionsExpenseTotal");

  if (countNode) countNode.textContent = `${summary.count}`;
  if (incomeNode) incomeNode.textContent = formatCurrency(summary.income);
  if (expenseNode) expenseNode.textContent = formatCurrency(summary.expense);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function createMonthBuckets(count) {
  const buckets = [];
  let latestDate = new Date();

  if (typeof transactions !== "undefined" && transactions.length > 0) {
    transactions.forEach(item => {
      const timestamp = getTransactionTimestamp(item);
      if (timestamp) {
        const d = new Date(timestamp);
        if (d > latestDate) latestDate = d;
      }
    });
  }

  const normalized = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(normalized.getFullYear(), normalized.getMonth() - index, 1);
    buckets.push({
      key: getMonthKey(date),
      label: monthNames[date.getMonth()],
      date
    });
  }

  return buckets;
}

function getAreaSeries(variant) {
  const buckets = createMonthBuckets(4);
  const groupedTotals = new Map(buckets.map((bucket) => [bucket.key, 0]));

  transactions.forEach((item) => {
    const timestamp = getTransactionTimestamp(item);
    if (!timestamp) return;

    const date = new Date(timestamp);
    const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
    if (!groupedTotals.has(key)) return;

    if (variant === "income" && item.amount > 0) {
      groupedTotals.set(key, groupedTotals.get(key) + item.amount);
    }

    if (variant === "expense" && item.amount < 0) {
      groupedTotals.set(key, groupedTotals.get(key) + Math.abs(item.amount));
    }
  });

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: groupedTotals.get(bucket.key) || 0
  }));
}

function getCompareSeries() {
  const buckets = createMonthBuckets(6);
  const groupedTotals = new Map(
    buckets.map((bucket) => [bucket.key, { income: 0, expense: 0 }])
  );

  transactions.forEach((item) => {
    const timestamp = getTransactionTimestamp(item);
    if (!timestamp) return;

    const date = new Date(timestamp);
    const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const bucket = groupedTotals.get(key);
    if (!bucket) return;

    if (item.amount > 0) bucket.income += item.amount;
    if (item.amount < 0) bucket.expense += Math.abs(item.amount);
  });

  return buckets.map((bucket) => ({
    label: bucket.label,
    income: groupedTotals.get(bucket.key)?.income || 0,
    expense: groupedTotals.get(bucket.key)?.expense || 0
  }));
}

function getDonutSeries() {
  const totalExpense = transactions.reduce((total, item) => {
    return item.amount < 0 ? total + Math.abs(item.amount) : total;
  }, 0);

  return getCategories()
    .map((item) => {
      const amount = transactions.reduce((total, transaction) => {
        if (transaction.amount >= 0 || transaction.category !== item.label) return total;
        return total + Math.abs(transaction.amount);
      }, 0);

      return {
        ...item,
        amount,
        value: totalExpense ? Math.round((amount / totalExpense) * 100) : 0
      };
    })
    .filter((item) => item.amount > 0);
}

function renderTransactionItem(item) {
  const isIncome = item.amount > 0;
  const icon = isIncome
    ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>'
    : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>';
  return `
    <a href="transaction-detail.html?id=${item.id}" class="transaction-item mb-4" data-type="${item.type}" data-category="${item.category}" data-amount="${item.amount}">
      <div class="transaction-item__icon ${isIncome ? "transaction-item__icon--income" : "transaction-item__icon--expense"}">${icon}</div>
      <div>
        <h3>${item.title}</h3>
        <p>${item.subtitle}</p>
      </div>
      <strong class="${isIncome ? "income" : "expense"}">${formatCurrency(item.amount)}</strong>
    </a>
  `;
}

function renderAreaChart(variant = activeAreaVariant) {
  const container = document.getElementById("areaChart");
  if (!container) return;

  const isIncome = variant === "income";
  const series = getAreaSeries(variant);
  const fillColor = isIncome ? "#61C454" : "#E6545D";
  const subtitle = container.parentElement?.querySelector("p");

  activeAreaVariant = variant;

  const width = 760;
  const height = 360;
  const padding = 48;
  const maxValue = Math.max(...series.map((point) => point.value), 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 1.6;

  const points = series.map((point, index) => {
    const x = padding + (usableWidth / (series.length - 1)) * index;
    const ratio = point.value === 0 ? 0 : 0.06 + 0.94 * (point.value / maxValue);
    const y = height - padding - ratio * usableHeight;
    return { ...point, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  if (subtitle) {
    subtitle.textContent = isIncome ? "Perbandingan Pemasukan Perbulan" : "Perbandingan Pengeluaran Perbulan";
  }

  container.tabIndex = 0;
  container.setAttribute("aria-label", isIncome ? "Perbandingan pemasukan perbulan" : "Perbandingan pengeluaran perbulan");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${isIncome ? "Perbandingan pemasukan perbulan" : "Perbandingan pengeluaran perbulan"}">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${fillColor}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="${fillColor}" stop-opacity="0.06"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#areaFill)"></path>
      <path d="${linePath}" fill="none" stroke="#111111" stroke-width="3"></path>
      ${points
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="7" fill="#111111"></circle>
            <text x="${point.x}" y="${height - 8}" text-anchor="middle" fill="#1f2937" font-size="18">${point.label}</text>
          `
        )
        .join("")}
    </svg>
  `;
}

function setAreaChartVariant(variant) {
  if (activeAreaVariant === variant) return;
  renderAreaChart(variant);
}

function initAreaChartInteraction() {
  const panel = document.getElementById("trendPanel");
  const container = document.getElementById("areaChart");
  if (!panel || !container) return;

  // Make it visually interactive
  panel.classList.add("panel--link");
  panel.setAttribute("tabindex", "0");
  panel.setAttribute("role", "button");

  // Mobile/Touch toggle function
  const toggleChart = () => {
    if (activeAreaVariant === "expense") {
      setAreaChartVariant("income");
    } else {
      setAreaChartVariant("expense");
    }
  };

  // Click handler (functions as toggle on all devices)
  panel.addEventListener("click", () => {
    toggleChart();
  });

  panel.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleChart();
    }
  });

  // Set initial aria-label dynamically
  const updateAriaLabel = () => {
    panel.setAttribute("aria-label", "Klik untuk mengganti grafik antara Pemasukan dan Pengeluaran");
  };
  updateAriaLabel();
}

function renderBarChart() {
  const container = document.getElementById("barChart");
  if (!container) return;

  const compareSeries = getCompareSeries();
  const width = 980;
  const height = 420;
  const maxValue = Math.max(...compareSeries.flatMap((item) => [item.income, item.expense]), 1);
  const baseY = 286;
  const left = 70;
  const groupWidth = 130;
  const barWidth = 32;
  const barMaxHeight = 236;
  const monthLabelY = baseY + 48;
  const legendY = height - 32;
  const legendStartX = 332;

  const bars = compareSeries
    .map((item, index) => {
      const x = left + index * groupWidth;
      const incomeHeight = (item.income / maxValue) * barMaxHeight;
      const expenseHeight = (item.expense / maxValue) * barMaxHeight;
      return `
        <rect x="${x}" y="${baseY - incomeHeight}" width="${barWidth}" height="${incomeHeight}" rx="10" fill="#2AAD1F"></rect>
        <rect x="${x + 40}" y="${baseY - expenseHeight}" width="${barWidth}" height="${expenseHeight}" rx="10" fill="#FF1616"></rect>
        <text x="${x + 36}" y="${monthLabelY}" text-anchor="middle" fill="#1f2937" font-size="18">${item.label}</text>
      `;
    })
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Perbandingan pemasukan dan pengeluaran">
      ${[0, 1, 2, 3, 4, 5]
        .map((row) => {
          const y = baseY - row * 44;
          return `<line x1="50" y1="${y}" x2="${width - 30}" y2="${y}" stroke="#E5E7EB" stroke-width="2"></line>`;
        })
        .join("")}
      ${bars}
      <rect x="${legendStartX}" y="${legendY - 14}" width="16" height="16" rx="8" fill="#2AAD1F"></rect>
      <text x="${legendStartX + 24}" y="${legendY}" fill="#2AAD1F" font-size="18">Pemasukan</text>
      <rect x="${legendStartX + 210}" y="${legendY - 14}" width="16" height="16" rx="8" fill="#FF1616"></rect>
      <text x="${legendStartX + 234}" y="${legendY}" fill="#FF1616" font-size="18">Pengeluaran</text>
    </svg>
  `;
}

function getDonutGradient() {
  const donutSeries = getDonutSeries();
  const gradient = donutSeries
    .map((item, index) => {
      const start = donutSeries.slice(0, index).reduce((sum, current) => sum + current.value, 0);
      return `${item.color} ${start}% ${start + item.value}%`;
    })
    .join(", ");

  return `conic-gradient(${gradient})`;
}

function renderDonut() {
  const chart = document.getElementById("donutChart");
  const legend = document.getElementById("donutLegend");
  if (!chart || !legend) return;

  const donutSeries = getDonutSeries();

  if (!donutSeries.length) {
    chart.style.background = "conic-gradient(#e5e7eb 0% 100%)";
    legend.innerHTML = '<li class="legend-empty">Belum ada pengeluaran yang tercatat.</li>';
    return;
  }

  chart.style.background = getDonutGradient();
  legend.innerHTML = donutSeries
    .map(
      (item) => `
        <li>
          <span><i class="legend-dot" style="background:${item.color}"></i>${item.label}</span>
          <strong>${item.value}%</strong>
        </li>
      `
    )
    .join("");
}

function renderExpenseCategoryDetailPage() {
  const chart = document.getElementById("expenseDetailChart");
  const list = document.getElementById("expenseCategoryList");
  if (!chart || !list) return;

  const monthNode = document.getElementById("expenseDetailMonth");
  const totalNode = document.getElementById("expenseDetailTotal");
  const orderedItems = getDonutSeries();
  const totalExpense = orderedItems.reduce((total, item) => total + item.amount, 0);

  if (monthNode) {
    const latestDate = transactions.length ? new Date(getTransactionTimestamp(transactions[0])) : new Date();
    monthNode.textContent = `${monthNames[latestDate.getMonth()]} ${latestDate.getFullYear()}`;
  }

  if (totalNode) {
    totalNode.textContent = formatCurrency(totalExpense);
  }

  if (!orderedItems.length) {
    chart.style.background = "conic-gradient(#e5e7eb 0% 100%)";
    list.innerHTML = '<p class="empty-state">Belum ada pengeluaran yang tercatat, jadi detail kategori masih kosong.</p>';
    return;
  }

  chart.style.background = getDonutGradient();
  list.innerHTML = orderedItems
    .map(
      (item) => `
        <article class="expense-category-item">
          <div class="expense-category-item__main">
            <span class="expense-category-item__icon" style="background:${item.color}">${item.iconLabel}</span>
            <div>
              <h3>${item.label}</h3>
              <p>${item.value}% Dari Total</p>
            </div>
          </div>
          <strong>${formatCurrency(item.amount)}</strong>
        </article>
      `
    )
    .join("");
}

function initExpenseCategoryPanel() {
  const panel = document.getElementById("expenseCategoryPanel");
  if (!panel) return;

  const openDetailPage = () => {
    redirectTo("expense-categories.html");
  };

  panel.addEventListener("click", openDetailPage);
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDetailPage();
  });
}

function initRecoveryForms() {
  const page = getCurrentPage();
  const form = document.querySelector(".auth-form");
  if (!form) return;

  if (page === "forgot-password") {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput?.value?.trim() || "";
      if (!email) {
        showToast("Mohon masukkan email Anda terlebih dahulu.", "error");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Mengirim...";

      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memproses permintaan reset password.");

        showToast(data.message || "Kode verifikasi telah dikirim ke email Anda.");
        writeStoredJson(RECOVERY_EMAIL_KEY, { email });
        
        setTimeout(() => redirectTo("verify-email.html"), 1200);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Verifikasi Email Anda";
      }
    });
  }

  if (page === "verify-email") {
    const resendButton = document.getElementById("resendRecoveryOtpBtn");
    const otpInput = document.getElementById("recoveryOtpInput");
    const newPasswordInput = document.getElementById("recoveryNewPasswordInput");
    const confirmPasswordInput = document.getElementById("recoveryConfirmPasswordInput");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const savedData = readStoredJson(RECOVERY_EMAIL_KEY, null);
      const email = savedData?.email;

      if (!email) {
        showToast("Email pemulihan tidak ditemukan. Silakan isi ulang form lupa password.", "error");
        setTimeout(() => redirectTo("forgot-password.html"), 1500);
        return;
      }

      const otp = otpInput?.value?.trim();
      const newPassword = newPasswordInput?.value;
      const confirmPassword = confirmPasswordInput?.value;

      if (!otp || !newPassword || !confirmPassword) {
        showToast("Mohon lengkapi semua kolom terlebih dahulu.", "error");
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast("Password baru dan konfirmasi password tidak cocok.", "error");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Memverifikasi...";

      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, newPassword })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menyetel ulang password.");

        showToast("Password berhasil disetel ulang! Silakan login kembali.");
        removeStoredValue(RECOVERY_EMAIL_KEY);
        
        setTimeout(() => redirectTo("login.html"), 1500);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Verifikasi & Ubah Password";
      }
    });

    if (resendButton) {
      resendButton.addEventListener("click", async () => {
        const savedData = readStoredJson(RECOVERY_EMAIL_KEY, null);
        const email = savedData?.email;

        if (!email) {
          showToast("Email tidak ditemukan. Silakan isi kembali email Anda.", "error");
          redirectTo("forgot-password.html");
          return;
        }

        resendButton.disabled = true;
        resendButton.textContent = "Mengirim...";

        try {
          const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal mengirim ulang OTP.");

          showToast(data.message || "Kode OTP pemulihan baru telah dikirim.");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          resendButton.disabled = false;
          resendButton.textContent = "Kirim Ulang Kode";
        }
      });
    }
  }
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 10);
  
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function initEditProfileForm(session) {
  if (!session) return;
  const saveButton = document.getElementById("saveProfileChanges");
  const nameInput = document.getElementById("editNameInput");
  const emailInput = document.getElementById("editEmailInput");
  const phoneInput = document.getElementById("editPhoneInput");
  const verifyPhoneBtn = document.getElementById("verifyPhoneBtn");
  const otpContainer = document.getElementById("otpContainer");
  const confirmOtpBtn = document.getElementById("confirmOtpBtn");
  const otpInput = document.getElementById("otpInput");

  const token = localStorage.getItem("luxentra_token");
  let isPhoneVerified = phoneInput ? (phoneInput.value.trim() === (session.phone || "") && !!session.phone) : false;

  if (phoneInput && verifyPhoneBtn) {
    const toggleVerifyBtn = () => {
      if (isPhoneVerified) {
        verifyPhoneBtn.style.display = "block";
        verifyPhoneBtn.textContent = "Terverifikasi";
        verifyPhoneBtn.disabled = true;
        verifyPhoneBtn.style.background = "#10b981";
      } else {
        verifyPhoneBtn.style.display = phoneInput.value.trim() ? "block" : "none";
        verifyPhoneBtn.textContent = "Verifikasi";
        verifyPhoneBtn.disabled = false;
        verifyPhoneBtn.style.background = "";
      }
    };

    phoneInput.addEventListener("input", () => {
      if (phoneInput.value.trim() === (session.phone || "")) {
        isPhoneVerified = !!session.phone;
      } else {
        isPhoneVerified = false;
      }
      if (otpContainer) otpContainer.style.display = "none";
      toggleVerifyBtn();
    });
    toggleVerifyBtn();

    verifyPhoneBtn.addEventListener("click", async () => {
      const phone = phoneInput.value.trim();
      if (!phone) return;

      verifyPhoneBtn.disabled = true;
      verifyPhoneBtn.textContent = "Mengirim...";

      try {
        const res = await fetch("/api/auth/send-phone-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ phone })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengirim kode OTP.");

        showToast(data.message || "Kode OTP telah dikirim ke email Anda.");
        if (otpContainer) {
          otpContainer.style.display = "grid";
          if (otpInput) {
            otpInput.value = "";
            otpInput.focus();
          }
        }
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        toggleVerifyBtn();
      }
    });

    if (confirmOtpBtn && otpInput) {
      confirmOtpBtn.addEventListener("click", async () => {
        const phone = phoneInput.value.trim();
        const otp = otpInput.value.trim();

        if (!otp) {
          showToast("Mohon masukkan kode OTP.", "error");
          return;
        }

        confirmOtpBtn.disabled = true;
        confirmOtpBtn.textContent = "Memverifikasi...";

        try {
          const res = await fetch("/api/auth/verify-phone-otp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ phone, otp })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal memverifikasi OTP.");

          showToast(data.message || "Nomor telepon berhasil diverifikasi!");
          otpContainer.style.display = "none";
          isPhoneVerified = true;
          toggleVerifyBtn();

          // Update local session immediately
          session.phone = phone;
          writeStoredSession(JSON.stringify(session));
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          confirmOtpBtn.disabled = false;
          confirmOtpBtn.textContent = "Konfirmasi";
        }
      });
    }
  }

  if (saveButton && nameInput && emailInput) {
    saveButton.addEventListener("click", async () => {
      const newName = nameInput.value.trim();
      const newPhone = phoneInput ? phoneInput.value.trim() : "";

      if (!newName) {
        showToast("Nama tidak boleh kosong.", "error");
        return;
      }

      if (newPhone && newPhone !== session.phone && !isPhoneVerified) {
        showToast("Silakan verifikasi nomor telepon baru Anda terlebih dahulu.", "error");
        return;
      }

      // Simpan ke server via API
      try {
        saveButton.disabled = true;
        saveButton.textContent = "Menyimpan...";

        const res = await fetch("/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ name: newName, phone: newPhone })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil.");

        // Update session lokal
        session.name = data.name;
        if (newPhone !== undefined) session.phone = newPhone;
        writeStoredSession(JSON.stringify(session));

        showToast("Profil berhasil diperbarui!");
        setTimeout(() => redirectTo("settings.html"), 1200);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Simpan Perubahan`;
      }
    });
  }
}

function initNewTransactionForm() {
  const form = document.getElementById("newTransactionForm");
  if (!form) return;

  const typeField = document.getElementById("newTransactionType");
  const categoryField = document.getElementById("newTransactionCategory");
  const amountField = document.getElementById("newTransactionAmount");
  const dateField = document.getElementById("newTransactionDate");
  const noteField = document.getElementById("newTransactionNote");
  const cancelButton = document.getElementById("cancelTransactionButton");

  if (typeField && categoryField) {
    typeField.addEventListener("change", () => {
      const type = typeField.value;
      const incomeOptions = getCategories().filter(c => c.type === "Pemasukan").map(c => c.label);
      const expenseOptions = getCategories().filter(c => c.type === "Pengeluaran").map(c => c.label);

      categoryField.innerHTML = '<option value="">Pilih kategori</option>';
      const optionsToUse = type === "Pemasukan" ? incomeOptions : (type === "Pengeluaran" ? expenseOptions : []);
      
      optionsToUse.forEach(opt => {
        const optionEl = document.createElement("option");
        optionEl.value = opt;
        optionEl.textContent = opt;
        categoryField.appendChild(optionEl);
      });

      if (categoryField.nextElementSibling && categoryField.nextElementSibling.classList.contains("custom-select")) {
        categoryField.nextElementSibling.remove();
      }
      categoryField.style.display = ""; 
      initCustomSelects();
    });
  }

  if (dateField && !dateField.value) {
    dateField.value = new Date().toISOString().split("T")[0];
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      redirectTo("transactions.html");
    });
  }

  if (amountField) {
    amountField.addEventListener("input", () => {
      const numericValue = parseCurrencyInput(amountField.value);
      amountField.value = numericValue ? numericValue.toLocaleString("id-ID") : "";
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const type = typeField?.value || "";
    const category = categoryField?.value || "";
    const amount = parseCurrencyInput(amountField?.value);
    const dateValue = dateField?.value || "";
    const note = noteField?.value?.trim() || "";

    if (!type || !category || !amount || !dateValue) {
      window.alert("Lengkapi tipe, kategori, nominal, dan tanggal transaksi terlebih dahulu.");
      return;
    }

    const token = localStorage.getItem("luxentra_token");
    fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ amount, type, category, note, date: dateValue })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan transaksi.");
      showToast("Transaksi berhasil disimpan.");
      redirectTo("dashboard.html");
    })
    .catch((err) => {
      window.alert(err.message);
    });
  });
}

function showImageModal(imageUrl) {
  const modal = document.createElement("div");
  modal.className = "image-modal";
  modal.innerHTML = `
    <div class="image-modal__backdrop"></div>
    <div class="image-modal__content">
      <button class="image-modal__close" type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <img src="${imageUrl}" alt="Full Profile Photo" />
    </div>
  `;
  document.body.appendChild(modal);

  const backdrop = modal.querySelector(".image-modal__backdrop");
  const closeBtn = modal.querySelector(".image-modal__close");

  const closeModal = () => {
    modal.classList.add("closing");
    setTimeout(() => modal.remove(), 300);
  };

  backdrop.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
}

function initProfilePhotoPicker(session) {
  const button = document.querySelector(".profile-card__copy .button--outline");
  const smallCamBtn = document.querySelector(".profile-card > div > button");
  const avatar = document.querySelector(".profile-avatar");
  if (!avatar) return;

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const token = localStorage.getItem("luxentra_token");

  // Muat avatar dari server
  async function loadAvatarFromServer() {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/avatar", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.avatar_url) {
          applyAvatarToUI(data.avatar_url, session);
          writeStoredJson(PROFILE_AVATAR_KEY, data.avatar_url);
          return;
        }
      }
    } catch (err) {
      console.error("Gagal memuat avatar:", err);
    }
    // Fallback ke localStorage
    const saved = readStoredJson(PROFILE_AVATAR_KEY, "");
    if (saved) {
      applyAvatarToUI(saved, session);
    } else if (session?.name) {
      avatar.textContent = session.name.charAt(0).toUpperCase();
    }
  }

  function applyAvatarToUI(imageUrl, sess) {
    avatar.textContent = "";
    avatar.style.backgroundImage = `url(${imageUrl})`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
  }

  loadAvatarFromServer();

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.hidden = true;
  document.body.append(fileInput);

  function triggerFilePicker() {
    fileInput.click();
  }

  if (button) button.addEventListener("click", triggerFilePicker);
  if (smallCamBtn) smallCamBtn.addEventListener("click", triggerFilePicker);

  avatar.style.cursor = "pointer";
  avatar.addEventListener("click", () => {
    const currentAvatar = readStoredJson(PROFILE_AVATAR_KEY, "");
    if (currentAvatar) {
      showImageModal(currentAvatar);
    }
  });

  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files || [];
    if (!file) return;

    // Validasi ukuran file (client-side)
    if (file.size > MAX_FILE_SIZE) {
      showToast("Ukuran foto melebihi 2MB. Pilih foto yang lebih kecil.", "error");
      fileInput.value = "";
      return;
    }

    // Validasi tipe file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.", "error");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = typeof reader.result === "string" ? reader.result : "";
      if (!imageUrl) return;

      // Tampilkan preview dulu
      applyAvatarToUI(imageUrl, session);
      showToast("Mengupload foto...");

      // Upload ke server
      try {
        const res = await fetch("/api/auth/upload-avatar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ avatarBase64: imageUrl, mimeType: file.type })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload gagal.");

        writeStoredJson(PROFILE_AVATAR_KEY, imageUrl);
        showToast("Foto profil berhasil diperbarui!");
      } catch (err) {
        showToast(err.message, "error");
        // Rollback preview jika gagal
        const prevAvatar = readStoredJson(PROFILE_AVATAR_KEY, "");
        if (prevAvatar) {
          applyAvatarToUI(prevAvatar, session);
        } else {
          avatar.style.backgroundImage = "";
          if (session?.name) avatar.textContent = session.name.charAt(0).toUpperCase();
        }
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderRecentTransactions() {
  const container = document.getElementById("recentTransactions");
  if (!container) return;
  if (!transactions.length) {
    container.innerHTML = '<p class="empty-state">Belum ada transaksi. Tambahkan transaksi baru untuk mulai melacak keuangan Anda.</p>';
    return;
  }

  container.innerHTML = transactions.slice(0, 5).map(renderTransactionItem).join("");
}

function renderTransactionsPage(filteredItems = transactions) {
  const container = document.getElementById("transactionsList");
  if (!container) return;
  if (!filteredItems.length) {
    container.innerHTML = '<p class="empty-state">Belum ada transaksi yang cocok dengan filter Anda.</p>';
    return;
  }

  container.innerHTML = filteredItems.map(renderTransactionItem).join("");
}

function initTransactionFilters() {
  const form = document.getElementById("transactionFilters");
  if (!form) return;

  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const typeFilter = document.getElementById("typeFilter");
  const sortField = document.getElementById("sortField");
  const sortDirection = document.getElementById("sortDirection");
  const resetButton = document.getElementById("resetFilters");

  function populateCategories() {
    if (!categoryFilter) return;
    const cats = getCategories();
    const type = typeFilter ? typeFilter.value : "";
    
    // Filter categories if a type is selected, otherwise show all
    const filteredCats = type ? cats.filter(c => c.type === type) : cats;
    
    categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
    
    filteredCats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.label;
      opt.textContent = c.label;
      categoryFilter.appendChild(opt);
    });

    // Re-initialize custom select UI for this dropdown
    if (categoryFilter.nextElementSibling && categoryFilter.nextElementSibling.classList.contains("custom-select")) {
      categoryFilter.nextElementSibling.remove();
    }
    categoryFilter.style.display = "";
    initCustomSelects();
  }

  // Initial population
  populateCategories();

  if (typeFilter) {
    typeFilter.addEventListener("change", () => {
      // Reset category filter when type changes so we don't filter by a hidden category
      if (categoryFilter) categoryFilter.value = "";
      populateCategories();
    });
  }

  function applyFilters() {
    let next = [...transactions];

    if (searchInput.value.trim()) {
      const query = searchInput.value.trim().toLowerCase();
      next = next.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query));
    }

    if (categoryFilter.value) {
      next = next.filter((item) => item.category === categoryFilter.value);
    }

    if (typeFilter.value) {
      next = next.filter((item) => item.type === typeFilter.value);
    }

    next.sort((a, b) => {
      const multiplier = sortDirection.value === "asc" ? 1 : -1;
      if (sortField.value === "amount") {
        return (Math.abs(a.amount) - Math.abs(b.amount)) * multiplier;
      }
      return (getTransactionTimestamp(a) - getTransactionTimestamp(b)) * multiplier;
    });

    renderTransactionsPage(next);
  }

  [searchInput, categoryFilter, typeFilter, sortField, sortDirection].forEach((element) => {
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    renderTransactionsPage(transactions);
  });

  renderTransactionsPage(transactions);
}

function initMenu() {
  const topbar = document.querySelector(".topbar");
  const menuToggle = document.querySelector(".menu-toggle");
  if (!topbar || !menuToggle) return;
  menuToggle.addEventListener("click", () => {
    topbar.classList.toggle("is-open");
  });
}

async function handleGoogleAuthCallback() {
  const query = window.location.search;
  const hash = window.location.hash;
  
  if (query.includes("google_auth=success") && hash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const errorDescription = hashParams.get("error_description");
    
    if (errorDescription) {
      showToast(decodeURIComponent(errorDescription), "error");
      window.history.replaceState(null, null, window.location.pathname + query);
      return;
    }
    
    if (accessToken) {
      showToast("Memverifikasi akun Google...");
      try {
        const res = await fetch("/api/auth/google-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supabaseToken: accessToken })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal masuk menggunakan Google.");
        
        localStorage.setItem("luxentra_token", data.token);
        createSession(data.user);
        
        showToast("Berhasil login dengan Google!");
        window.history.replaceState(null, null, window.location.pathname);
        setTimeout(() => redirectTo("dashboard.html"), 500);
      } catch (err) {
        showToast(err.message, "error");
        window.history.replaceState(null, null, window.location.pathname + query);
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await handleGoogleAuthCallback();

  const page = getCurrentPage();
  const session = initSessionRouting();
  if (page && !session && protectedPages.has(page)) {
    return;
  }

  // Load backend data asynchronously if session is active
  if (session) {
    const token = localStorage.getItem("luxentra_token");
    try {
      const [txData, catData] = await Promise.all([
        getStoredTransactions(),
        fetch("/api/categories", {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : [])
      ]);
      transactions = txData;
      categories = catData;
    } catch (err) {
      console.error("Gagal memuat data dari server:", err);
      transactions = [];
      categories = [];
    }
  }

  initAuthForms();
  initRecoveryForms();
  initLogout();
  initDeleteAccountModal();
  initDeleteTransactionModal();
  hydrateUserProfile(session);
  initProfilePhotoPicker(session);
  initEditProfileForm(session);
  initPasswordToggles();
  initNewTransactionForm();
  initMenu();
  initCustomSelects();
  renderTransactionDetail();
  renderAreaChart();
  initAreaChartInteraction();
  renderBarChart();
  renderDonut();
  renderExpenseCategoryDetailPage();
  initExpenseCategoryPanel();
  updateDashboardStats();
  updateTransactionsStats();
  renderRecentTransactions();
  initTransactionFilters();
  initEditTransactionModal();
  initBroadcast(session);
});

function syncCustomSelect(select) {
  const wrapper = select.nextElementSibling;
  if (!wrapper || !wrapper.classList.contains("custom-select")) return;
  
  const triggerText = wrapper.querySelector(".custom-select__content span:last-child");
  if (triggerText) {
    triggerText.textContent = select.options[select.selectedIndex]?.text || "";
  }
  
  const optionsContainer = wrapper.querySelector(".custom-select__options");
  if (optionsContainer) {
    const optionDivs = optionsContainer.children;
    const activeOptions = Array.from(select.options).filter(opt => !opt.disabled);
    activeOptions.forEach((option, idx) => {
      const optDiv = optionDivs[idx];
      if (optDiv) {
        optDiv.classList.toggle("selected", option.selected);
      }
    });
  }
}

function initEditTransactionModal() {
  const editBtn = document.getElementById("editTransactionButton");
  const modal = document.getElementById("editTransactionModal");
  const cancelBtn = document.getElementById("btnCancelEditTx");
  const form = document.getElementById("editTransactionForm");
  if (!editBtn || !modal || !form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get("id");
  if (!txId) return;

  const tx = transactions.find(t => t.id === txId);

  const typeSelect = document.getElementById("editTxType");
  const categorySelect = document.getElementById("editTxCategory");
  const amountInput = document.getElementById("editTxAmount");
  const dateInput = document.getElementById("editTxDate");
  const noteInput = document.getElementById("editTxNote");

  function populateEditCategories(type) {
    categorySelect.innerHTML = "";
    const cats = getCategories().filter(c => c.type === type || c.type === "Lainnya");
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.label;
      opt.textContent = c.label;
      categorySelect.appendChild(opt);
    });

    if (categorySelect.nextElementSibling && categorySelect.nextElementSibling.classList.contains("custom-select")) {
      categorySelect.nextElementSibling.remove();
    }
    categorySelect.style.display = "";
    initCustomSelects();
  }

  typeSelect.addEventListener("change", () => {
    populateEditCategories(typeSelect.value);
  });

  editBtn.addEventListener("click", () => {
    if (!tx) { showToast("Data transaksi tidak ditemukan.", "error"); return; }
    // Pre-fill form
    typeSelect.value = tx.type || "Pengeluaran";
    syncCustomSelect(typeSelect);

    populateEditCategories(typeSelect.value);

    categorySelect.value = tx.category || "";
    syncCustomSelect(categorySelect);

    amountInput.value = Math.abs(tx.amount).toLocaleString("id-ID");
    dateInput.value = tx.date || new Date().toISOString().split("T")[0];
    noteInput.value = tx.note || "";
    modal.hidden = false;
  });

  cancelBtn.addEventListener("click", () => { modal.hidden = true; });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = typeSelect.value;
    const category = categorySelect.value;
    const amount = parseCurrencyInput(amountInput.value);
    const date = dateInput.value;
    const note = noteInput.value.trim();

    if (!type || !category || !amount || !date) {
      showToast("Lengkapi semua field wajib.", "error");
      return;
    }

    const saveBtn = document.getElementById("btnSaveEditTx");
    saveBtn.disabled = true;
    saveBtn.textContent = "Menyimpan...";

    try {
      const token = localStorage.getItem("luxentra_token");
      const res = await fetch(`/api/transactions/${txId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount, type, category, note, date })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui transaksi.");

      showToast("Transaksi berhasil diperbarui!");
      modal.hidden = true;
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan Perubahan";
    }
  });
}

async function initBroadcast(session) {
  const banner = document.getElementById("broadcastBanner");
  const textEl = document.getElementById("broadcastBannerText");
  const closeBtn = document.getElementById("closeBroadcastBtn");
  if (!banner || !textEl || !closeBtn) return;

  const activeSession = session || getSession();

  let history = [];
  try {
    const res = await fetch("/api/broadcasts");
    if (res.ok) {
      history = await res.json();
    }
  } catch (err) {
    console.error("Gagal mengambil data broadcast:", err);
  }

  if (history.length === 0) return;

  let currentBroadcast = null;

  function showNextBroadcast() {
    // Cari pengumuman paling lama (index terkecil) yang belum di-dismiss
    currentBroadcast = history.find(b => {
      // 1. Cek apakah pesan sudah ditutup
      const isDismissed = readStoredJson(`luxentra_dismissed_${b.id}`, false);
      if (isDismissed) return false;

      return true;
    });

    if (currentBroadcast) {
      textEl.textContent = currentBroadcast.message;
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  }

  closeBtn.addEventListener("click", () => {
    if (currentBroadcast) {
      banner.classList.add("hidden");
      writeStoredJson(`luxentra_dismissed_${currentBroadcast.id}`, true);
      
      // Beri jeda sedikit sebelum memunculkan pengumuman berikutnya agar transisinya terlihat
      setTimeout(showNextBroadcast, 300);
    }
  });

  showNextBroadcast();
}

function initCustomSelects() {
  const selects = document.querySelectorAll("select");
  selects.forEach((select) => {
    if (select.nextElementSibling && select.nextElementSibling.classList.contains("custom-select")) return;

    select.style.display = "none";
    
    const wrapper = document.createElement("div");
    wrapper.className = `custom-select ${select.className}`;
    if (select.style.width) {
      wrapper.style.width = select.style.width;
    }
    // keep pill classes if present
    if (select.classList.contains("filter-select-pill") || select.parentNode.classList.contains("filter-input-pill")) {
      wrapper.classList.add("custom-select--pill");
    }
    
    const trigger = document.createElement("div");
    trigger.className = "custom-select__trigger";
    
    const triggerContent = document.createElement("div");
    triggerContent.className = "custom-select__content";
    
    if (select.dataset.icon === "funnel" || select.dataset.icon === "type") {
      const icon = document.createElement("span");
      icon.className = "input-icon";
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>';
      icon.style.opacity = "0.6";
      triggerContent.appendChild(icon);
    } else if (select.dataset.icon === "tag") {
      const icon = document.createElement("span");
      icon.className = "input-icon";
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>';
      icon.style.opacity = "0.6";
      triggerContent.appendChild(icon);
    }
    
    const triggerText = document.createElement("span");
    triggerText.textContent = select.options[select.selectedIndex]?.text || "";
    triggerContent.appendChild(triggerText);
    
    const chevron = document.createElement("div");
    chevron.className = "custom-select__chevron";
    chevron.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    trigger.appendChild(triggerContent);
    trigger.appendChild(chevron);
    
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "custom-select__options";
    
    Array.from(select.options).forEach((option) => {
      if (option.disabled) return; // Skip disabled options (like placeholders)

      const optDiv = document.createElement("div");
      optDiv.className = "custom-select__option";
      optDiv.textContent = option.text;
      if (option.selected) optDiv.classList.add("selected");
      
      optDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        select.value = option.value;
        triggerText.textContent = option.text;
        
        Array.from(optionsContainer.children).forEach(c => c.classList.remove("selected"));
        optDiv.classList.add("selected");
        
        wrapper.classList.remove("open");
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      
      optionsContainer.appendChild(optDiv);
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    
    select.parentNode.insertBefore(wrapper, select.nextSibling);

    if (select.form) {
      select.form.addEventListener("reset", () => {
        setTimeout(() => {
          triggerText.textContent = select.options[select.selectedIndex]?.text || "";
          Array.from(optionsContainer.children).forEach((c, idx) => {
            c.classList.toggle("selected", idx === select.selectedIndex);
          });
        }, 0);
      });
    }

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = wrapper.classList.contains("open");
      document.querySelectorAll(".custom-select").forEach(cs => cs.classList.remove("open"));
      if (!isOpen) wrapper.classList.add("open");
    });
  });
  
  document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select").forEach(cs => cs.classList.remove("open"));
  });
}
