// 🚀 Configura tu Supabase
const SUPABASE_URL = "https://mpfpndofdiwnusrpesnh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZnBuZG9mZGl3bnVzcnBlc25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDI1MzUsImV4cCI6MjA3NjExODUzNX0.QthlrDtg5xkYipx6aaBXOlDbUmQh5F-31PSBvMt_yN0"; // ⚠️ Usa tu anon key pública
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// === TOAST ===
function showToast(message, type = "success") {
  const colors = {
    success: "#00c851", // verde
    error: "#ff4444",   // rojo
    info: "#ff8800"     // naranja
  };
  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    backgroundColor: colors[type] || colors.info,
    stopOnFocus: true
  }).showToast();
}

// Elementos del DOM
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const refreshMsgsBtn = document.getElementById("refreshMsgsBtn");

// Tabs
const tabUsers = document.getElementById("tabUsers");
const tabMessages = document.getElementById("tabMessages");
const usersView = document.getElementById("usersView");
const messagesView = document.getElementById("messagesView");

// === LOGIN ===
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return showToast("❌ Credenciales incorrectas", "error");

  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  loadUsers();
});

// === LOGOUT ===
logoutBtn.addEventListener("click", async () => {
  await client.auth.signOut();
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  logoutBtn.classList.add("hidden");
});

// === CARGAR USUARIOS ===
async function loadUsers() {
  const { data: users, error } = await client.from("users").select("*");
  if (error) return showToast("Error cargando usuarios", "error");

  document.getElementById("totalUsers").textContent = users.length;
  const totalBalance = users.reduce((acc, u) => acc + (u.total_balance || 0), 0);
  document.getElementById("totalBalance").textContent = `$${totalBalance}`;
  const totalReferrals = users.reduce((acc, u) => acc + (u.referrals_count || 0), 0);
  document.getElementById("totalReferrals").textContent = totalReferrals;

  const table = document.getElementById("usersTable");
  table.innerHTML = "";
  users.forEach(u => {
    const row = document.createElement("tr");
    row.classList.add("border-b", "hover:bg-gray-50");
    row.innerHTML = `
      <td class="px-3 py-2 text-left font-medium">${u.name}</td>
      <td class="px-3 py-2">${u.referrals_count}</td>
      <td class="px-3 py-2 font-semibold text-[#ff6600]">$${u.total_balance}</td>
      <td class="px-3 py-2">${new Date(u.cycle_end).toLocaleDateString()}</td>
      <td class="px-3 py-2 flex justify-center gap-2">
        <button onclick="confirmReferral('${u.id}')" class="bg-[#ff6600] text-white px-3 py-1 rounded hover:bg-orange-600">+ Referido</button>
        <button onclick="openMessageModal('${u.id}', '${u.name}')" class="bg-black text-white px-3 py-1 rounded hover:bg-gray-800">📩</button>
      </td>
    `;
    table.appendChild(row);
  });
}

// === CONFIRMAR REFERIDO ===
async function confirmReferral(userId) {
  const { error } = await client.rpc("add_referral_bonus", { user_id: userId });
  if (error) return showToast("Error al confirmar referido" , "error");
  showToast("✅ Referido confirmado" , "error");
  loadUsers();
}

// === CARGAR MENSAJES ===
async function loadMessages() {
  const { data: messages, error } = await client
    .from("messages")
    .select("*, users(name)")
    .order("sent_at", { ascending: false });
  if (error) return showToast("Error cargando mensajes" , "error");

  const table = document.getElementById("messagesTable");
  table.innerHTML = "";
  messages.forEach(m => {
    const row = document.createElement("tr");
    row.classList.add("border-b", "hover:bg-gray-50");
    row.innerHTML = `
      <td class="px-3 py-2 text-left">${m.users?.name || "-"}</td>
      <td class="px-3 py-2 text-left">${m.message}</td>
      <td class="px-3 py-2">${new Date(m.sent_at).toLocaleString()}</td>
      <td class="px-3 py-2">${m.status}</td>
    `;
    table.appendChild(row);
  });
}

// === BOTONES ===
refreshBtn.addEventListener("click", loadUsers);
refreshMsgsBtn.addEventListener("click", loadMessages);

// === TABS ===
tabUsers.addEventListener("click", () => {
  usersView.classList.remove("hidden");
  messagesView.classList.add("hidden");
  tabUsers.classList.add("primary-text", "border-b-2", "border-[#ff6600]");
  tabMessages.classList.remove("primary-text", "border-b-2", "border-[#ff6600]");
});
tabMessages.addEventListener("click", () => {
  messagesView.classList.remove("hidden");
  usersView.classList.add("hidden");
  loadMessages();
  tabMessages.classList.add("primary-text", "border-b-2", "border-[#ff6600]");
  tabUsers.classList.remove("primary-text", "border-b-2", "border-[#ff6600]");
});

// === MODAL DE MENSAJE ===
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
  if (!message) return showToast("Mensaje vacío" , "error");

  const { error } = await client.from("messages").insert([{ user_id: selectedUserId, message }]);
  if (error) return showToast("Error al guardar mensaje", "error");
  showToast("✅ Mensaje guardado correctamente", "error");
  closeMessageModal();
  loadMessages();
});



