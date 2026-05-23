const defaultTransactions = [];

const expenseCategoryPalette = [
  { label: "Transportasi", color: "#FF3434", iconLabel: "TR" },
  { label: "Tagihan", color: "#43A8E6", iconLabel: "TG" },
  { label: "Belanja", color: "#1653B5", iconLabel: "BL" },
  { label: "Makan", color: "#8751ED", iconLabel: "MK" },
  { label: "Liburan", color: "#10C260", iconLabel: "LB" },
  { label: "Kesehatan", color: "#FF7A21", iconLabel: "KS" }
];

const SESSION_KEY = "luxentra_session";
const TRANSACTIONS_KEY = "luxentra_transactions";
const PROFILE_AVATAR_KEY = "luxentra_profile_avatar";
const RECOVERY_EMAIL_KEY = "luxentra_recovery_email";
const protectedPages = new Set(["dashboard", "transactions", "new-transaction", "settings", "expense-categories"]);
const authPages = new Set(["login", "register"]);
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let activeAreaVariant = "expense";
let transactions = [];

function getCurrentPage() {
  return document.body?.dataset.page || "";
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

function getStoredTransactions() {
  const savedTransactions = readStoredJson(TRANSACTIONS_KEY, null);
  const sourceTransactions = Array.isArray(savedTransactions) ? savedTransactions : defaultTransactions;
  return sortTransactions(
    sourceTransactions.map((item) => {
      const dateLabel = `${item.subtitle || ""}`.split(" - ").pop();
      const parsedDate = parseIndonesianDateLabel(dateLabel);
      return {
        ...item,
        timestamp: item.timestamp || (parsedDate ? parsedDate.toISOString() : new Date().toISOString())
      };
    })
  );
}

function saveTransactions(nextTransactions) {
  transactions = sortTransactions(nextTransactions);
  writeStoredJson(TRANSACTIONS_KEY, transactions);
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
    createdAt: new Date().toISOString()
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

    createSession({
      email: emailInput?.value,
      name: page === "register" ? textInput?.value : ""
    });

    redirectTo("dashboard.html");
  });

  const googleButton = form.querySelector(".button--google");
  if (googleButton) {
    googleButton.addEventListener("click", () => {
      createSession({
        name: "Pengguna Google",
        email: "google.user@luxentra.app"
      });
      redirectTo("dashboard.html");
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
  const today = new Date();
  const normalized = new Date(today.getFullYear(), today.getMonth(), 1);

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

  return expenseCategoryPalette
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
  const icon = isIncome ? "↗" : "↘";
  return `
    <article class="transaction-item" data-type="${item.type}" data-category="${item.category}" data-amount="${item.amount}">
      <div class="transaction-item__icon ${isIncome ? "transaction-item__icon--income" : "transaction-item__icon--expense"}">${icon}</div>
      <div>
        <h3>${item.title}</h3>
        <p>${item.subtitle}</p>
      </div>
      <strong class="${isIncome ? "income" : "expense"}">${formatCurrency(item.amount)}</strong>
    </article>
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
    const y = height - padding - (point.value / maxValue) * usableHeight;
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

  const showIncome = () => {
    setAreaChartVariant("income");
  };

  const showExpense = () => {
    setAreaChartVariant("expense");
  };

  panel.addEventListener("mouseenter", showIncome);
  panel.addEventListener("mouseleave", showExpense);
  panel.addEventListener("focusin", showIncome);
  panel.addEventListener("focusout", showExpense);
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
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      writeStoredJson(RECOVERY_EMAIL_KEY, { email: emailInput?.value?.trim() || "" });
      redirectTo("verify-email.html");
    });
  }

  if (page === "verify-email") {
    const resendButton = form.querySelector('.button[type="button"]');

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      removeStoredValue(RECOVERY_EMAIL_KEY);
      redirectTo("login.html");
    });

    if (resendButton) {
      resendButton.addEventListener("click", () => {
        window.alert("Kode verifikasi baru telah dikirim ke email Anda.");
      });
    }
  }
}

function initEditProfileForm(session) {
  if (!session) return;
  const saveButton = document.getElementById("saveProfileChanges");
  const nameInput = document.getElementById("editNameInput");
  const emailInput = document.getElementById("editEmailInput");

  if (saveButton && nameInput && emailInput) {
    saveButton.addEventListener("click", () => {
      const newName = nameInput.value.trim();
      const newEmail = emailInput.value.trim();

      if (!newName || !newEmail) {
        window.alert("Nama dan Email tidak boleh kosong.");
        return;
      }

      session.name = newName;
      session.email = newEmail;
      
      writeStoredSession(JSON.stringify(session));
      redirectTo("settings.html");
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

    const formattedDate = formatLongDate(dateValue);
    const transaction = {
      title: buildTransactionTitle({ type, category, note, dateLabel: formattedDate }),
      subtitle: `${category} - ${formattedDate}`,
      amount: type === "Pengeluaran" ? -amount : amount,
      type,
      category,
      note,
      date: dateValue,
      timestamp: new Date(`${dateValue}T12:00:00`).toISOString()
    };

    saveTransactions([transaction, ...transactions]);
    redirectTo("dashboard.html");
  });
}

function initProfilePhotoPicker(session) {
  const button = document.querySelector(".profile-card__copy .button--outline");
  const avatar = document.querySelector(".profile-avatar");
  if (!button || !avatar) return;

  const savedAvatar = readStoredJson(PROFILE_AVATAR_KEY, "");
  if (savedAvatar) {
    avatar.textContent = "";
    avatar.style.background = `center / cover no-repeat url(${savedAvatar})`;
  } else if (session?.name) {
    avatar.textContent = session.name.charAt(0).toUpperCase();
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.hidden = true;
  document.body.append(fileInput);

  button.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === "string" ? reader.result : "";
      if (!imageUrl) return;
      avatar.textContent = "";
      avatar.style.background = `center / cover no-repeat url(${imageUrl})`;
      writeStoredJson(PROFILE_AVATAR_KEY, imageUrl);
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

document.addEventListener("DOMContentLoaded", () => {
  const page = getCurrentPage();
  const session = initSessionRouting();
  if (page && !session && protectedPages.has(page)) {
    return;
  }

  transactions = getStoredTransactions();
  initAuthForms();
  initRecoveryForms();
  initLogout();
  initDeleteAccountModal();
  hydrateUserProfile(session);
  initProfilePhotoPicker(session);
  initEditProfileForm(session);
  initNewTransactionForm();
  initMenu();
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
});
