const navItems = [
  ["dashboard", "Início", "⌂", "index.html"], ["usuarios", "Usuários", "♙", "usuarios.html"], ["alunos", "Alunos e Turmas", "▤", "alunos.html"], ["autorizacoes", "Autorizações", "▣", "autorizacoes.html"], ["locais", "Locais e Setores", "⌖", "locais.html"], ["relatorios", "Relatórios", "▥", "relatorios.html"], ["configuracoes", "Configurações", "⚙", "configuracoes.html"]
];

const page = document.body.dataset.page;
const sidebar = document.getElementById("sidebar");

if (sidebar) {
  sidebar.innerHTML = `
 <div class="brand"><div class="brand-mark">✓</div><div><strong>Autoriza CESF</strong><small>Painel administrativo</small></div></div>
 <div class="nav-label">MENU PRINCIPAL</div>
 ${navItems.map(([id, label, icon, url]) => `<a class="nav-link ${page === id ? "active" : ""}" href="${url}"><span class="nav-icon">${icon}</span>${label}</a>`).join("")}
 <div class="sidebar-bottom">Autoriza CESF<br>Organização e segurança escolar<br><b>Versão 1.0.0</b><a class="logout-link" href="acesso.html" id="adminLogout">↪ Sair</a></div>`;
}

const menuToggle = document.getElementById("menuToggle");
if (menuToggle) menuToggle.addEventListener("click", () => sidebar?.classList.toggle("open"));

document.addEventListener("click", e => {
  if (e.target.matches("[data-open-modal]")) document.getElementById(e.target.dataset.openModal)?.classList.add("open");
  if (e.target.matches("[data-close]") || e.target.classList.contains("modal")) e.target.closest(".modal")?.classList.remove("open");
});

const getData = (key) => JSON.parse(localStorage.getItem("ac_" + key) || "[]");
const save = (key, val) => localStorage.setItem("ac_" + key, JSON.stringify(val));

let users = getData("users");
let students = getData("students");
let auth = getData("auth");
const professorAuth = JSON.parse(localStorage.getItem("cesf_prof_auth") || "[]");
if (professorAuth.length) auth = professorAuth;
let places = getData("places");

const badge = s => `<span class="badge ${s === "Liberada" ? "success" : s === "Recusada" ? "danger" : "pending"}">${s || "Pendente"}</span>`;

function renderUsers(filter = "Todos", query = "") {
  const body = document.getElementById("userRows"); if (!body) return;
  body.innerHTML = users.filter(u => (filter === "Todos" || u.role === filter) && (u.name + " " + u.email).toLowerCase().includes(query.toLowerCase()))
    .map(u => `<tr><td><b>${u.name}</b></td><td>${u.role}</td><td>${u.email}</td><td><span class="badge success">Ativo</span></td><td>—</td></tr>`).join("")
    || `<tr><td colspan="5" class="empty-cell">Nenhum usuário cadastrado ainda.</td></tr>`;
}

function renderStudents(q = "") {
  const body = document.getElementById("studentRows"); if (!body) return;
  body.innerHTML = students.filter(s => (s.name + " " + s.class + " " + (s.code || "")).toLowerCase().includes(q.toLowerCase()))
    .map(s => `<tr><td><b>${s.name}</b></td><td>${s.class}</td><td>${s.code || "—"}</td><td><span class="badge success">Ativo</span></td></tr>`).join("")
    || `<tr><td colspan="4" class="empty-cell">Nenhum aluno cadastrado ainda.</td></tr>`;
}

function renderAuth(filter = "Todas", q = "") {
  const body = document.getElementById("authorizationRows"); if (!body) return;
  body.innerHTML = auth.filter(a => (filter === "Todas" || a.status === filter) && (a.student + " " + (a.teacher || "") + " " + a.place + " " + a.class).toLowerCase().includes(q.toLowerCase()))
    .map(a => `<tr><td><b>${a.student}</b></td><td>${a.teacher || "—"}</td><td>${a.class || "—"}</td><td>${a.place}</td><td>${a.date} · ${a.time}</td><td>${badge(a.status)}</td></tr>`).join("")
    || `<tr><td colspan="6" class="empty-cell">Nenhuma autorização registrada ainda.</td></tr>`;
}

function renderPlaces() {
  const grid = document.getElementById("placeGrid"); if (!grid) return;
  grid.innerHTML = places.map((p, i) => `<article class="place-card"><div class="place-icon">⌖</div><div><strong>${p}</strong><small>Local disponível</small></div><button title="Remover local" data-remove-place="${i}">×</button></article>`).join("")
    || `<div class="empty-state">Nenhum local cadastrado ainda. Use “Adicionar local” para começar.</div>`;
}

document.getElementById("userSearch")?.addEventListener("input", e => renderUsers(document.querySelector("[data-role-filter].active")?.dataset.roleFilter || "Todos", e.target.value));
document.querySelectorAll("[data-role-filter]").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("[data-role-filter]").forEach(x => x.classList.remove("active")); b.classList.add("active");
  renderUsers(b.dataset.roleFilter, document.getElementById("userSearch")?.value || "");
}));
document.getElementById("studentSearch")?.addEventListener("input", e => renderStudents(e.target.value));
document.getElementById("authorizationSearch")?.addEventListener("input", e => renderAuth(document.querySelector("[data-status-filter].active")?.dataset.statusFilter || "Todas", e.target.value));
document.querySelectorAll("[data-status-filter]").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("[data-status-filter]").forEach(x => x.classList.remove("active")); b.classList.add("active");
  renderAuth(b.dataset.statusFilter, document.getElementById("authorizationSearch")?.value || "");
}));

document.getElementById("userForm")?.addEventListener("submit", e => {
  e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); users.push(d); save("users", users);
  renderUsers(); e.target.closest(".modal").classList.remove("open"); e.target.reset(); updateDashboard();
});
document.getElementById("studentForm")?.addEventListener("submit", e => {
  e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); students.push(d); save("students", students);
  renderStudents(); e.target.closest(".modal").classList.remove("open"); e.target.reset(); updateDashboard();
});
document.getElementById("placeForm")?.addEventListener("submit", e => {
  e.preventDefault(); const d = new FormData(e.target); places.push(d.get("name")); save("places", places);
  renderPlaces(); e.target.closest(".modal").classList.remove("open"); e.target.reset();
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-remove-place]");
  if (b) { places.splice(Number(b.dataset.removePlace), 1); save("places", places); renderPlaces(); }
});

function updateDashboard() {
  const recent = document.getElementById("recentRows");
  if (recent) {
    recent.innerHTML = auth.slice(-3).reverse().map(a => `<tr><td><b>${a.student}</b><br><small>${a.class || ""}</small></td><td>${a.place}</td><td>${a.time}</td><td>${badge(a.status)}</td></tr>`).join("")
      || `<tr><td colspan="4" class="empty-cell">Nenhuma autorização registrada ainda.</td></tr>`;
  }
  const uc = document.getElementById("userCount"); if (uc) uc.textContent = users.length;
  const sc = document.getElementById("studentCount"); if (sc) sc.textContent = students.length;
  const pc = document.getElementById("pendingCount"); if (pc) pc.textContent = auth.filter(a => (a.status || "Pendente") === "Pendente").length;
  const tc = document.getElementById("todayCount"); if (tc) tc.textContent = auth.length;
}

function updateReports() {
  const total = auth.length, done = auth.filter(a => a.status === "Liberada").length, pending = auth.filter(a => (a.status || "Pendente") === "Pendente").length, refused = auth.filter(a => a.status === "Recusada").length;
  const ids = { reportTotal: total, reportDone: done, reportPending: pending, reportRefused: refused };
  Object.entries(ids).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
  const notice = document.getElementById("reportEmpty");
  if (notice) notice.textContent = total ? "Os números acima são baseados nos registros cadastrados no sistema." : "Ainda não existem autorizações suficientes para gerar um relatório. Os indicadores serão preenchidos conforme os registros forem adicionados.";
}
updateDashboard();
updateReports();
renderUsers();
renderStudents();
renderAuth();
renderPlaces();
