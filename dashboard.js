// Configura tu Supabase
const SUPABASE_URL = "https://TU_PROYECTO.supabase.co";
const SUPABASE_KEY = "TU_API_KEY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

// Login básico
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("Credenciales incorrectas");
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  loadDashboard();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  logoutBtn.classList.add("hidden");
});

// Cargar datos
async function loadDashboard() {
  const { data: users, error } = await supabase.from("users").select("*");
  if (error) {
    alert("Error cargando datos");
    return;
  }

  document.getElementById("totalUsers").textContent = users.length;

  const totalBalance = users.reduce((acc, u) => acc + (u.total_balance || 0), 0);
  document.getElementById("totalBalance").textContent = `$${totalBalance}`;

  const totalReferrals = users.reduce((acc, u) => acc + (u.referrals_count || 0), 0);
  document.getElementById("totalReferrals").textContent = totalReferrals;

  const table = document.getElementById("usersTable");
  table.innerHTML = "";

  users.forEach(u => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-3 py-2">${u.name}</td>
      <td class="border px-3 py-2 text-center">${u.referrals_count}</td>
      <td class="border px-3 py-2 text-center">$${u.total_balance}</td>
      <td class="border px-3 py-2 text-center">${new Date(u.cycle_end).toLocaleDateString()}</td>
      <td class="border px-3 py-2 text-center">
        <button onclick="confirmReferral('${u.id}')" class="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800">+ Referido</button>
      </td>
    `;
    table.appendChild(row);
  });
}

// Confirmar nuevo referido
async function confirmReferral(userId) {
  const { data, error } = await supabase.rpc("add_referral_bonus", { user_id: userId });
  if (error) return alert("Error al confirmar referido");
  alert("Referido confirmado y saldo actualizado");
  loadDashboard();
}

refreshBtn.addEventListener("click", loadDashboard);
