// === CONFIG SUPABASE ===
const SUPABASE_URL = "https://mpfpndofdiwnusrpesnh.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZnBuZG9mZGl3bnVzcnBlc25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDI1MzUsImV4cCI6MjA3NjExODUzNX0.QthlrDtg5xkYipx6aaBXOlDbUmQh5F-31PSBvMt_yN0";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = "admin@ecolimp.cl";
let currentUser = null;

// === TOAST ===
function showToast(message, type = "success") {
  const colors = {
    success: "#00c851",
    error: "#ff4444",
    info: "#ff8800",
  };
  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    backgroundColor: colors[type] || colors.info,
    stopOnFocus: true,
  }).showToast();
}

// === ELEMENTOS ===
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const refreshMsgsBtn = document.getElementById("refreshMsgsBtn");
const tabUsers = document.getElementById("tabUsers");
const tabMessages = document.getElementById("tabMessages");
const usersView = document.getElementById("usersView");
const messagesView = document.getElementById("messagesView");

// === LOGIN ===
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return showToast("❌ Credenciales incorrectas", "error");

  currentUser = data.user;

  // Obtener rol del usuario
  const { data: userInfo } = await client
    .from("users")
    .select("*")
    .eq("email", currentUser.email)
    .single();
  if (!userInfo) return showToast("Usuario no encontrado", "error");

  currentUser.role = userInfo.role;

  // Mostrar dashboard
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  if (userInfo.role === "admin") {
    loadUsers();
  } else {
    loadUserPanel();
    updateNotificationBadge();
  }
});

// === LOGOUT ===
logoutBtn.addEventListener("click", async () => {
  await client.auth.signOut();

  // Limpiar visual
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  document.getElementById("usersTable").innerHTML = "";
  document.getElementById("messagesTable").innerHTML = "";
  document.getElementById("totalUsers").textContent = "0";
  document.getElementById("totalBalance").textContent = "$0";
  document.getElementById("totalReferrals").textContent = "0";

  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  logoutBtn.classList.add("hidden");

  const badge = document.getElementById("notifBadge");
  if (badge) badge.classList.add("hidden");

  showToast("👋 Sesión cerrada correctamente", "info");

  setTimeout(() => location.reload(), 1000);
});

const registerSection = document.getElementById("registerSection");
const goRegister = document.getElementById("goRegister");
const registerBtn = document.getElementById("registerBtn");

goRegister.addEventListener("click", () => {
  loginSection.classList.add("hidden");
  registerSection.classList.remove("hidden");
});

registerBtn.addEventListener("click", async () => {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPass").value.trim();

  if (!name || !email || !password)
    return showToast("Por favor completa todos los campos", "error");

  // Crear usuario en Auth
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) return showToast("Error creando usuario", "error");

  // Insertar registro adicional en tabla "users"
  await client.from("users").insert([
    {
      name,
      email,
      role: "user",
      referrals_count: 0,
      total_balance: 0,
      cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
    },
  ]);

  showToast("✅ Cuenta creada correctamente, ahora inicia sesión", "success");

  registerSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
});


// === CARGAR PANEL ADMIN ===
async function loadUsers() {
  const { data: users, error } = await client.from("users").select("*");
  if (error) return showToast("Error cargando usuarios", "error");

  document.getElementById("totalUsers").textContent = users.length;
  const totalBalance = users.reduce(
    (acc, u) => acc + (u.total_balance || 0),
    0
  );
  document.getElementById("totalBalance").textContent = `$${totalBalance}`;
  const totalReferrals = users.reduce(
    (acc, u) => acc + (u.referrals_count || 0),
    0
  );
  document.getElementById("totalReferrals").textContent = totalReferrals;

  const table = document.getElementById("usersTable");
  table.innerHTML = "";
  users.forEach((u) => {
    const row = document.createElement("tr");
    row.classList.add("border-b", "hover:bg-gray-50");
    row.innerHTML = `
      <td class="px-3 py-2 text-left font-medium">${u.name}</td>
      <td class="px-3 py-2">${u.referrals_count}</td>
      <td class="px-3 py-2 font-semibold text-[#ff6600]">$${u.total_balance}</td>
      <td class="px-3 py-2">${new Date(
        u.cycle_end
      ).toLocaleDateString()}</td>
      <td class="px-3 py-2 flex justify-center gap-2">
        <button onclick="confirmReferral('${
          u.id
        }')" class="bg-[#ff6600] text-white px-3 py-1 rounded hover:bg-orange-600">+ Referido</button>
        <button onclick="openMessageModal('${
          u.id
        }','${u.name}')" class="bg-black text-white px-3 py-1 rounded hover:bg-gray-800">📩</button>
      </td>`;
    table.appendChild(row);
  });
}

// === PANEL USUARIO ===
async function loadUserPanel() {
  const { data: userData } = await client
    .from("users")
    .select("*")
    .eq("email", currentUser.email)
    .single();

  if (!userData) return;

  document.getElementById("totalUsers").textContent = 1;
  document.getElementById("totalBalance").textContent = `$${userData.total_balance}`;
  document.getElementById("totalReferrals").textContent = userData.referrals_count;

  const table = document.getElementById("usersTable");
  table.innerHTML = `
    <tr class="border-b">
      <td class="px-3 py-2 font-medium">${userData.name}</td>
      <td class="px-3 py-2">${userData.referrals_count}</td>
      <td class="px-3 py-2 font-semibold text-[#ff6600]">$${userData.total_balance}</td>
      <td class="px-3 py-2">${new Date(userData.cycle_end).toLocaleDateString()}</td>
      <td class="px-3 py-2 italic text-gray-400">Solo lectura</td>
    </tr>`;
}

// === CONFIRMAR REFERIDO ===
async function confirmReferral(userId) {
  const { error } = await client.rpc("add_referral_bonus", { user_id: userId });
  if (error) return showToast("Error al confirmar referido", "error");
  showToast("✅ Referido confirmado", "success");
  loadUsers();
}

// === CARGAR MENSAJES ===
async function loadMessages() {
  let query = client
    .from("messages")
    .select("*, users(name)")
    .order("sent_at", { ascending: false });

  if (currentUser && currentUser.email !== ADMIN_EMAIL) {
    const { data: userData } = await client
      .from("users")
      .select("id")
      .eq("email", currentUser.email)
      .single();
    if (userData) query = query.eq("user_id", userData.id);
  }

  const { data: messages, error } = await query;
  if (error) return showToast("Error cargando mensajes", "error");

  // Marcar pendientes como entregados
  if (currentUser && currentUser.email !== ADMIN_EMAIL) {
    const pendingIds = messages
      .filter((m) => m.status === "pending")
      .map((m) => m.id);
    if (pendingIds.length > 0) {
      await client
        .from("messages")
        .update({ status: "entregado" })
        .in("id", pendingIds);
    }
  }

  const table = document.getElementById("messagesTable");
  table.innerHTML = "";
  messages.forEach((m) => {
    const estado =
      m.status === "pending"
        ? "Pendiente 🕓"
        : m.status === "entregado"
        ? "Entregado ✅"
        : m.status === "leído"
        ? "Leído 👀"
        : m.status;

    const row = document.createElement("tr");
    row.classList.add("border-b", "hover:bg-gray-50");
    row.innerHTML = `
      <td class="px-3 py-2 text-left">${m.users?.name || "-"}</td>
      <td class="px-3 py-2 text-left">${m.message}</td>
      <td class="px-3 py-2">${new Date(m.sent_at).toLocaleString()}</td>
      <td class="px-3 py-2">${estado}</td>`;
    table.appendChild(row);
  });

  updateNotificationBadge();
}

// === CONTADOR DE NOTIFICACIONES ===
async function updateNotificationBadge() {
  try {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;

    const { data: userData } = await client
      .from("users")
      .select("id")
      .eq("email", currentUser.email)
      .single();
    if (!userData) return;

    const { count } = await client
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userData.id)
      .eq("status", "pending");

    const badge = document.getElementById("notifBadge");
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error en updateNotificationBadge:", err);
  }
}

// === BOTONES ===
refreshBtn.addEventListener("click", () => {
  if (currentUser.role === "admin") loadUsers();
  else loadUserPanel();
});

refreshMsgsBtn.addEventListener("click", loadMessages);

tabUsers.addEventListener("click", () => {
  usersView.classList.remove("hidden");
  messagesView.classList.add("hidden");
});

tabMessages.addEventListener("click", () => {
  messagesView.classList.remove("hidden");
  usersView.classList.add("hidden");
  loadMessages();
});

// === MODAL MENSAJES ===
let selectedUserId = null;
function openMessageModal(userId, name) {
  selectedUserId = userId;
  document.getElementById("modalUserName").textContent = name;
  document.getElementById("messageModal").classList.remove("hidden");
}
function closeMessageModal() {
  document.getElementById("messageModal").classList.add("hidden");
  document.getElementById("messageContent").value = "";
}
document.getElementById("sendMsgBtn").addEventListener("click", async () => {
  const message = document.getElementById("messageContent").value.trim();
  if (!message) return showToast("Mensaje vacío", "error");

  const { error } = await client
    .from("messages")
    .insert([{ user_id: selectedUserId, message }]);
  if (error) return showToast("Error al guardar mensaje", "error");

  showToast("✅ Mensaje guardado correctamente", "success");
  closeMessageModal();
  loadMessages();
});
