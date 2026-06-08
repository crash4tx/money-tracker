document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  if (page !== "admin-dashboard") return;

  const token = localStorage.getItem("luxentra_token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  let users = [];
  let selectedUserId = null;

  const totalUsersEl = document.getElementById("adminTotalUsers");
  const newUsersEl = document.getElementById("adminNewUsers");
  const tableBody = document.getElementById("adminUsersTableBody");
  const modal = document.getElementById("userActionModal");

  // Fetch Users from API
  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Gagal mengambil daftar pengguna.");
      users = await res.json();
      
      // Update Stats
      if (totalUsersEl) totalUsersEl.textContent = users.length;
      if (newUsersEl) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newThisMonth = users.filter(u => {
          const d = new Date(u.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;
        newUsersEl.textContent = newThisMonth;
      }
      
      renderUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  }

  function renderUsers() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    
    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50 transition-colors";
      
      const dateStr = formatLongDate(u.createdAt);
      const statusPill = u.status === "blocked" 
        ? `<span class="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Diblokir</span>`
        : `<span class="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Aktif</span>`;
      
      const isAdmin = u.role === "admin";

      tr.innerHTML = `
        <td class="py-3 px-4 font-bold text-lux-text">${u.name} ${isAdmin ? '<span class="text-xs text-blue-500 ml-1">(Admin)</span>' : ''}</td>
        <td class="py-3 px-4 text-lux-text-muted">${u.email}</td>
        <td class="py-3 px-4 text-lux-text-muted">${dateStr}</td>
        <td class="py-3 px-4">${statusPill}</td>
        <td class="py-3 px-4">
          ${!isAdmin ? `<button class="text-sm text-blue-600 font-bold hover:underline" data-action-id="${u.id}">Edit Status</button>` : ''}
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Attach events
    tableBody.querySelectorAll("button[data-action-id]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        selectedUserId = e.target.getAttribute("data-action-id");
        openModal();
      });
    });
  }

  function openModal() {
    if (!modal || !selectedUserId) return;
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;
    
    document.getElementById("userActionTitle").textContent = `Edit Status: ${user.name}`;
    
    const btnBlock = document.getElementById("btnBlockUser");
    const btnActivate = document.getElementById("btnActivateUser");
    
    if (user.status === "blocked") {
      btnBlock.style.display = "none";
      btnActivate.style.display = "block";
    } else {
      btnBlock.style.display = "block";
      btnActivate.style.display = "none";
    }

    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    selectedUserId = null;
  }

  document.getElementById("btnCancelUserAction")?.addEventListener("click", closeModal);
  
  document.getElementById("btnBlockUser")?.addEventListener("click", async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "blocked" })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memblokir pengguna.");
      }
      showToast("Pengguna berhasil diblokir.");
      closeModal();
      await fetchUsers();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  document.getElementById("btnActivateUser")?.addEventListener("click", async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "active" })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengaktifkan pengguna.");
      }
      showToast("Pengguna berhasil diaktifkan.");
      closeModal();
      await fetchUsers();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  document.getElementById("btnDeleteUser")?.addEventListener("click", async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus pengguna.");
      }
      showToast("Pengguna berhasil dihapus.");
      closeModal();
      await fetchUsers();
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  await fetchUsers();

  // ==========================================
  // CATEGORIES MANAGEMENT
  // ==========================================
  const categoriesList = document.getElementById("adminCategoriesList");
  const categoryForm = document.getElementById("adminCategoryForm");
  const categoryFilter = document.getElementById("adminCategoryFilter");
  let allCats = [];

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Gagal mengambil kategori.");
      allCats = await res.json();
      renderCategories();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  }
  
  function renderCategories() {
    if (!categoriesList) return;
    const filterType = categoryFilter ? categoryFilter.value : "Pemasukan";
    
    const filteredCats = allCats.filter(c => {
      const cType = c.type || "Pengeluaran";
      return cType === filterType;
    });
    
    categoriesList.innerHTML = "";
    filteredCats.forEach((cat) => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-100";
      const cType = cat.type || "Pengeluaran";
      const typeBadge = cType === "Pemasukan" 
        ? `<span class="px-2 py-0.5 ml-2 text-[0.65rem] font-bold bg-green-100 text-green-700 rounded-full">Pemasukan</span>` 
        : `<span class="px-2 py-0.5 ml-2 text-[0.65rem] font-bold bg-red-100 text-red-700 rounded-full">Pengeluaran</span>`;
        
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style="background: ${cat.color}">
            ${cat.icon_label || cat.iconLabel || "LN"}
          </div>
          <span class="font-bold">${cat.label} ${typeBadge}</span>
        </div>
        ${cat.user_id ? `
        <button class="text-red-500 hover:text-red-700" data-cat-id="${cat.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>` : ''}
      `;
      categoriesList.appendChild(div);
    });

    categoriesList.querySelectorAll("button[data-cat-id]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-cat-id");
        try {
          const res = await fetch(`/api/categories/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Gagal menghapus kategori.");
          showToast("Kategori dihapus.");
          await fetchCategories();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener("change", renderCategories);
  }

  if (categoryForm) {
    categoryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("newCategoryName");
      const filterType = categoryFilter ? categoryFilter.value : "Pemasukan";
      const name = input.value.trim();
      const type = filterType;
      
      if (!name) return;

      const colors = ["#8751ED", "#FF3434", "#10C260", "#1653B5", "#43A8E6", "#FF7A21", "#EAB308", "#64748b"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const iconLabel = name.substring(0, 2).toUpperCase();
      
      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ label: name, type, color, iconLabel })
        });
        if (!res.ok) throw new Error("Gagal menambahkan kategori.");
        input.value = "";
        showToast("Kategori berhasil ditambahkan.");
        await fetchCategories();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  await fetchCategories();

  // ==========================================
  // BROADCAST MANAGEMENT
  // ==========================================
  const historyContainer = document.getElementById("adminBroadcastHistory");
  
  async function renderBroadcastHistory() {
    if (!historyContainer) return;
    
    let history = [];
    try {
      const res = await fetch("/api/broadcasts");
      if (res.ok) history = await res.json();
    } catch (err) {
      console.error(err);
    }
    
    historyContainer.innerHTML = "";
    
    if (history.length === 0) {
      historyContainer.innerHTML = `<p style="font-size: 0.875rem; color: #94a3b8; font-style: italic; padding: 1rem 0; text-align: center;">Belum ada riwayat pengumuman.</p>`;
      return;
    }
    
    history.forEach(item => {
      const div = document.createElement("div");
      div.style.cssText = "padding: 0.875rem; border-radius: 1rem; background-color: #f8fafc; border: 1px solid rgba(226, 232, 240, 0.6); display: flex; flex-direction: column; gap: 0.375rem;";
      
      const date = new Date(item.timestamp);
      const dateStr = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()} • ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      div.innerHTML = `
        <span style="font-size: 0.75rem; font-weight: 700; color: #0062ff; letter-spacing: 0.025em; text-transform: uppercase;">${dateStr}</span>
        <p style="font-size: 0.95rem; color: #0f172a; margin: 0; line-height: 1.3;">${item.message}</p>
      `;
      historyContainer.appendChild(div);
    });
  }

  await renderBroadcastHistory();

  const broadcastForm = document.getElementById("adminBroadcastForm");
  if (broadcastForm) {
    broadcastForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("broadcastMessage");
      const msg = input.value.trim();
      if (!msg) return;

      try {
        const res = await fetch("/api/admin/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ message: msg })
        });
        if (!res.ok) throw new Error("Gagal mengirim pengumuman.");
        input.value = "";
        showToast("Pengumuman berhasil disebarkan!");
        await renderBroadcastHistory();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
});
