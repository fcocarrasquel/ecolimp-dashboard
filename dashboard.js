async function loadUserPanel() {
  const { data: userData } = await client
    .from("users")
    .select("*")
    .eq("email", currentUser.email)
    .single();
  if (!userData) return;

  // === MENSAJES AUTOMÁTICOS ===
  if (userData.referrals_count >= 5 && !userData.reward_sent) {
    await client.from("messages").insert([
      {
        user_id: userData.id,
        message: "🎉 ¡Felicidades! Has conseguido 5 referidos activos.",
        status: "pending"
      }
    ]);
    await client.from("users").update({ reward_sent: true }).eq("id", userData.id);
  }

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
}
