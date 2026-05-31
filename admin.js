document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page !== "admin-dashboard") return;

  const users = getStoredUsers();
  
  // Render Stats
  const totalUsersEl = document.getElementById("adminTotalUsers");
  const newUsersEl = document.getElementById("adminNewUsers");
  
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

  // Render Users Table
  const tableBody = document.getElementById("adminUsersTableBody");
  const modal = document.getElementById("userActionModal");
  let selectedUserId = null;

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
  
  document.getElementById("btnBlockUser")?.addEventListener("click", () => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      user.status = "blocked";
      saveUsers(users);
      renderUsers();
      closeModal();
      showToast("Pengguna berhasil diblokir.");
    }
  });

  document.getElementById("btnActivateUser")?.addEventListener("click", () => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      user.status = "active";
      saveUsers(users);
      renderUsers();
      closeModal();
      showToast("Pengguna berhasil diaktifkan.");
    }
  });

  document.getElementById("btnDeleteUser")?.addEventListener("click", () => {
    const idx = users.findIndex(u => u.id === selectedUserId);
    if (idx > -1) {
      users.splice(idx, 1);
      saveUsers(users);
      renderUsers();
      closeModal();
      showToast("Pengguna berhasil dihapus.");
      // update stats
      if (totalUsersEl) totalUsersEl.textContent = users.length;
    }
  });

  renderUsers();

  // Categories
  const categoriesList = document.getElementById("adminCategoriesList");
  const categoryForm = document.getElementById("adminCategoryForm");
  const categoryFilter = document.getElementById("adminCategoryFilter");
  
  function renderCategories() {
    if (!categoriesList) return;
    const allCats = getCategories();
    const filterType = categoryFilter ? categoryFilter.value : "Pemasukan";
    
    // Default legacy categories to "Pengeluaran" if type is missing
    const filteredCats = allCats.filter(c => {
      const cType = c.type || "Pengeluaran";
      return cType === filterType;
    });
    
    categoriesList.innerHTML = "";
    filteredCats.forEach((cat) => {
      const originalIdx = allCats.findIndex(c => c === cat);
      const div = document.createElement("div");
      div.className = "flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-100";
      const cType = cat.type || "Pengeluaran";
      const typeBadge = cType === "Pemasukan" 
        ? `<span class="px-2 py-0.5 ml-2 text-[0.65rem] font-bold bg-green-100 text-green-700 rounded-full">Pemasukan</span>` 
        : `<span class="px-2 py-0.5 ml-2 text-[0.65rem] font-bold bg-red-100 text-red-700 rounded-full">Pengeluaran</span>`;
        
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style="background: ${cat.color}">
            ${cat.iconLabel}
          </div>
          <span class="font-bold">${cat.label} ${typeBadge}</span>
        </div>
        <button class="text-red-500 hover:text-red-700" data-cat-idx="${originalIdx}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;
      categoriesList.appendChild(div);
    });

    categoriesList.querySelectorAll("button[data-cat-idx]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.currentTarget.getAttribute("data-cat-idx");
        const cats = getCategories();
        cats.splice(idx, 1);
        saveCategories(cats);
        renderCategories();
        showToast("Kategori dihapus.");
      });
    });
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener("change", renderCategories);
  }

  if (categoryForm) {
    categoryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("newCategoryName");
      const filterType = categoryFilter ? categoryFilter.value : "Pemasukan";
      const name = input.value.trim();
      const type = filterType;
      
      if (!name) return;

      const cats = getCategories();
      // random color and icon label
      const colors = ["#8751ED", "#FF3434", "#10C260", "#1653B5", "#43A8E6", "#FF7A21", "#EAB308", "#64748b"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const iconLabel = name.substring(0, 2).toUpperCase();
      
      cats.push({ label: name, type, color, iconLabel });
      saveCategories(cats);
      renderCategories();
      input.value = "";
      showToast("Kategori berhasil ditambahkan.");
    });
  }

  renderCategories();

  // Broadcast
  const broadcastForm = document.getElementById("adminBroadcastForm");
  if (broadcastForm) {
    broadcastForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("broadcastMessage");
      const msg = input.value.trim();
      if (!msg) return;

      const broadcast = {
        id: generateUUID(),
        message: msg,
        timestamp: new Date().toISOString()
      };
      
      writeStoredJson(BROADCAST_KEY, broadcast);
      input.value = "";
      showToast("Pengumuman berhasil disebarkan ke semua pengguna!");
    });
  }

});
