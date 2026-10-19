const app = document.querySelector("#app");
const STORE_KEY = "xyro-ai-chats-v1";
const MODEL_KEY = "xyro-ai-model-v1";
const BACKEND_KEY = "xyro-ai-backend-url-v1";
const PROJECTS_KEY = "xyro-ai-projects-v1";
function apiUrl(path) { const base = (localStorage.getItem(BACKEND_KEY) || "").trim().replace(/\/+$/, ""); return `${base}${path}`; }
const SYSTEM_PROMPT = "Kamu adalah Xyro AI, asisten yang membantu percakapan, analisis, dan pemrograman. Jawab dengan jelas, akurat, dan dalam bahasa yang digunakan pengguna. Untuk kode, sertakan blok kode dan penjelasan yang relevan. Jangan mengaku menjalankan kode atau mengakses web jika tidak dilakukan.";

let chats = loadChats();
let activeId = chats[0]?.id || null;
let selectedModel = localStorage.getItem(MODEL_KEY) || "claude-opus-4.8";
let availableModels = [{ id: "claude-opus-4.8", name: "Claude Opus 4.8" }];
let modelsLoading = false;
let busy = false;
let sidebarOpen = true;
let currentMode = "chat";
let toastTimer;
let adminVerifiedFor = "";
let projects = loadProjects();
let selectedProjectPath = "index.html";
let projectSourceVisible = false;

function id() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function loadChats() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(chats)); }
function loadProjects() { try { const v = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
function saveProjects() { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); }
function activeChat() { return chats.find(c => c.id === activeId); }
function escapeHTML(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function icon(name, size = 19) {
  const paths = {
    plus:'<path d="M12 5v14M5 12h14"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6M14 4l-4 16"/>',
    paperclip:'<path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    spark:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2Z"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    x:'<path d="m18 6-12 12M6 6l12 12"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}
function notify(message) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.append(el); }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function newChat() {
  const chat = { id: id(), title: "Percakapan baru", messages: [], updated: Date.now() };
  chats.unshift(chat); activeId = chat.id; if (currentMode !== "project") currentMode = "chat"; save(); render();
  document.querySelector("#prompt")?.focus();
}
function titleFrom(text) { return text.trim().split(/\s+/).slice(0, 6).join(" ").slice(0, 52) || "Percakapan baru"; }

function render() {
  const chat = activeChat();
  const groups = groupChats(chats);
  app.innerHTML = `
    <div class="layout ${sidebarOpen ? "" : "sidebar-hidden"}">
      <aside class="sidebar">
        <div class="brand-row">
          <button class="brand-mark" id="brandHome" aria-label="Beranda"><span class="brand-glyph">x</span></button>
          <div class="brand-name">xyro<span>ai</span></div>
          <button class="icon-btn sidebar-collapse" id="collapse" aria-label="Tutup sidebar">${icon("menu")}</button>
        </div>
        <button class="new-chat" id="newChat">${icon("plus")}<span>Chat baru</span><kbd>⌘ K</kbd></button>
        <div class="nav-label">RUANG KERJA</div>
        <button class="nav-item ${currentMode === "chat" ? "selected" : ""}" data-mode="chat">${icon("message")}<span>Chat</span></button>
        <button class="nav-item ${currentMode === "code" ? "selected" : ""}" data-mode="code">${icon("code")}<span>Coding</span><span class="nav-tag">DEV</span></button>
        <button class="nav-item ${currentMode === "project" ? "selected" : ""}" data-mode="project">${icon("file")}<span>Project Dev</span><span class="nav-tag">ZIP</span></button>
        <button class="nav-item" id="searchChats">${icon("search")}<span>Cari percakapan</span></button>
        <div class="history-heading"><span>TERBARU</span><button class="tiny-icon" id="clearHistory" title="Hapus semua percakapan">${icon("trash", 15)}</button></div>
        <div class="history-list">${groups.map(g => `<div class="history-group"><div class="history-date">${g.label}</div>${g.items.map(c => `<button class="history-item ${c.id === activeId ? "active" : ""}" data-chat="${c.id}"><span class="history-dot"></span><span class="history-title">${escapeHTML(c.title)}</span><span class="history-actions"><span data-rename="${c.id}" title="Ubah nama">${icon("edit",14)}</span><span data-delete="${c.id}" title="Hapus">${icon("trash",14)}</span></span></button>`).join("")}</div>`).join("") || '<div class="empty-history">Percakapanmu akan muncul di sini.</div>'}</div>
        <div class="sidebar-bottom">
          <div class="plan-card"><div class="plan-icon">${icon("spark",18)}</div><div><strong>Xyro Workspace</strong><small>Asisten AI untuk ide dan kode</small></div></div>
          <button class="profile-row" id="settings"><div class="avatar">X</div><div class="profile-text"><strong>Pengguna Xyro</strong><small>Pengaturan & API</small></div><span class="profile-more">···</span></button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="top-left"><button class="icon-btn mobile-menu" id="expand">${icon("menu")}</button><div class="mobile-brand">xyro<span>ai</span></div><span class="breadcrumb">${currentMode === "project" ? "Project Dev" : currentMode === "code" ? "Coding" : "Chat"}</span><span class="crumb-slash">/</span><span class="crumb-current">${escapeHTML(chat?.title || "Percakapan baru")}</span></div>
          <div class="top-right"><div class="connection"><span class="status-dot"></span><span>AI Workspace</span></div><button class="icon-btn" id="exportChat" title="Ekspor percakapan">${icon("download")}</button><button class="icon-btn" id="settingsTop" title="Pengaturan">${icon("globe")}</button></div>
        </header>
        <section class="workspace">
          ${chat?.messages?.length ? renderConversation(chat) : renderWelcome()}
          <div class="composer-wrap">
            <div class="composer" id="composer">
              <textarea id="prompt" rows="1" placeholder="${currentMode === "project" ? "Jelaskan website atau aplikasi yang ingin dibuat..." : currentMode === "code" ? "Jelaskan fitur atau kode yang ingin kamu buat..." : "Tanyakan apa saja kepada Xyro..."}" ${busy ? "disabled" : ""}></textarea>
              <div class="composer-tools">
                <div class="tools-left">
                  <button class="tool-btn" id="attach" title="Lampirkan file teks">${icon("paperclip")}<span>Lampirkan</span></button>
                  <input type="file" id="fileInput" hidden accept=".txt,.md,.js,.ts,.jsx,.tsx,.html,.css,.json,.py,.java,.c,.cpp,.h,.php,.sql,.xml,.yaml,.yml,.csv,.log" multiple>
                  <div class="model-select-wrap"><button class="model-select" id="modelSelect">${icon("spark",15)}<span>${escapeHTML(modelLabel(selectedModel))}</span>${icon("down",14)}</button><div class="model-menu" id="modelMenu" hidden>
                    ${availableModels.map(m=>`<button data-model="${escapeHTML(m.id)}" class="${selectedModel===m.id?"chosen":""}">${escapeHTML(m.name || m.id)}${selectedModel===m.id?icon("check",14):""}</button>`).join("")}
                    <p id="modelMenuStatus">${modelsLoading ? "Memuat model..." : "Daftar model dari backend RadoxAI."}</p>
                  </div></div>
                </div>
                <button class="send-btn" id="send" aria-label="Kirim" ${busy ? "disabled" : ""}>${busy ? '<span class="spinner"></span>' : icon("send",18)}</button>
              </div>
            </div>
            <div class="composer-foot">Xyro AI dapat membuat kesalahan. Periksa kembali informasi penting.</div>
          </div>
        </section>
      </main>
    </div>
    <div class="modal-backdrop" id="modal" hidden><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><div><div class="eyebrow">PREFERENSI</div><h2 id="modalTitle">Pengaturan Xyro</h2></div><button class="icon-btn" id="closeModal">${icon("x")}</button></div>
      <div class="setting-block"><label>Alamat backend (perlu verifikasi admin)</label><input id="backendUrl" class="backend-url-input backend-url-private" type="password" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Alamat backend tersamarkan" placeholder="••••••••" title="Alamat backend disamarkan"><p>Masukkan URL backend HTTPS yang sudah online. Perubahan alamat baru aktif setelah password admin diverifikasi oleh backend.</p><label for="adminPassword" class="small-field-label">Password admin</label><input id="adminPassword" class="backend-url-input" type="password" autocomplete="current-password" placeholder="Password admin server"><button class="secondary-btn verify-admin-btn" id="verifyAdmin" type="button">Verifikasi admin</button><div class="server-status" id="serverStatus"><span class="status-dot"></span> Masukkan URL backend dan verifikasi admin.</div></div><div class="setting-block"><label>Keamanan</label><p>Password hanya dipakai untuk verifikasi saat ini dan tidak disimpan di browser. Set <code>ADMIN_PASSWORD</code> di environment backend dengan password yang sama. Mengunci tombol di UI bukan pengganti otorisasi backend.</p></div>
      <div class="setting-block"><label>Base URL</label><div class="readonly-url">https://radoxai.com/v1 <span>RadoxAI</span></div><p>Base URL mengikuti dokumentasi RadoxAI.</p></div>
      <div class="setting-block"><label>Model default</label><select id="settingModel"><option value="claude-opus-4.8">Claude Opus 4.8</option></select><button class="secondary-btn" id="refreshModels" type="button">Muat ulang daftar model</button><p id="settingsModelStatus" class="model-load-status">Model akan diambil dari backend yang dikonfigurasi.</p></div>
      <div class="setting-block"><label>Data lokal</label><p>Riwayat chat disimpan di browser ini saja.</p><button class="secondary-btn" id="downloadData">${icon("download",16)} Ekspor riwayat JSON</button></div>
      <div class="modal-actions"><button class="secondary-btn" id="clearLocal">${icon("trash",15)} Hapus seluruh riwayat</button><button class="primary-btn" id="saveSettings">Simpan pengaturan</button></div>
    </div></div>
    <div class="search-overlay" id="searchOverlay" hidden><div class="search-box">${icon("search")}<input id="searchInput" placeholder="Cari judul percakapan..."><kbd>ESC</kbd><div class="search-results" id="searchResults"></div></div></div>
    <div class="preview-overlay" id="previewOverlay" hidden><section class="preview-panel" role="dialog" aria-modal="true" aria-labelledby="previewTitle"><header class="preview-header"><div><strong id="previewTitle">Preview HTML</strong><small>Berjalan dalam iframe sandbox</small></div><div class="preview-actions"><button class="secondary-btn" id="refreshPreview" type="button">Jalankan ulang</button><button class="secondary-btn" id="closePreview" type="button">Tutup</button></div></header><iframe id="htmlPreview" title="Pratinjau kode HTML" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe></section></div>
  `;
  bindEvents();
  if (chat?.messages?.length) scrollToBottom();
  autoResize();
}
function groupChats(list) {
  const now = new Date(); const today = []; const yesterday = []; const older = [];
  for (const c of list) {
    const d = new Date(c.updated || Date.now());
    const days = Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate()) - new Date(d.getFullYear(),d.getMonth(),d.getDate())) / 86400000);
    (days === 0 ? today : days === 1 ? yesterday : older).push(c);
  }
  return [{label:"HARI INI",items:today},{label:"KEMARIN",items:yesterday},{label:"SEBELUMNYA",items:older}].filter(g=>g.items.length);
}
function modelLabel(v) {
  return availableModels.find(m => m.id === v)?.name || v;
}
function renderModelControls() {
  const menu = document.querySelector("#modelMenu");
  if (menu) {
    menu.innerHTML = `${availableModels.map(m=>`<button data-model="${escapeHTML(m.id)}" class="${selectedModel===m.id?"chosen":""}">${escapeHTML(m.name || m.id)}${selectedModel===m.id?icon("check",14):""}</button>`).join("")}<p id="modelMenuStatus">${modelsLoading ? "Memuat model..." : `Tersedia ${availableModels.length} model dari backend.`}</p>`;
  }
  const select = document.querySelector("#settingModel");
  if (select) {
    select.innerHTML = availableModels.map(m=>`<option value="${escapeHTML(m.id)}">${escapeHTML(m.name || m.id)}</option>`).join("");
    if (availableModels.some(m=>m.id===selectedModel)) select.value=selectedModel;
  }
  const status = document.querySelector("#settingsModelStatus");
  if (status) status.textContent = modelsLoading ? "Sedang memuat daftar model..." : `Ditemukan ${availableModels.length} model. Jika hanya satu, periksa akses key dan endpoint backend.`;
}
async function refreshModels(backendOverride) {
  const backend = (backendOverride || localStorage.getItem(BACKEND_KEY) || "").trim().replace(/\/+$/, "");
  if (!backend) { renderModelControls(); return; }
  modelsLoading = true; renderModelControls();
  try {
    const r = await fetch(`${backend}/api/models`, { headers: { Accept: "application/json" }, cache: "no-store" });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
    const models = rows.map(m=>({id: String(m.id || m.model || "").trim(), name: String(m.name || m.display_name || m.id || m.model || "").trim()})).filter(m=>m.id && /^[\w./:-]+$/.test(m.id));
    if (!models.length) throw new Error("Backend tidak mengembalikan daftar model yang valid.");
    availableModels = models;
    if (!models.some(m=>m.id===selectedModel)) selectedModel = models.some(m=>m.id==="claude-opus-4.8") ? "claude-opus-4.8" : models[0].id;
    localStorage.setItem(MODEL_KEY, selectedModel);
  } catch (e) {
    const status = document.querySelector("#settingsModelStatus");
    if (status) status.textContent = `Gagal memuat model: ${e.message}. Menampilkan model cadangan.`;
  } finally { modelsLoading = false; renderModelControls(); }
}
function renderWelcome() {
  const coding = currentMode === "code";
  const projectMode = currentMode === "project";
  if (projectMode) return `<div class="welcome project-welcome">
    <div class="welcome-orb"><div class="orb-core">x<span>.</span></div><div class="orb-ring ring-one"></div><div class="orb-ring ring-two"></div></div>
    <div class="welcome-kicker"><span class="kicker-line"></span> PROJECT DEV WORKSPACE <span class="kicker-line"></span></div>
    <h1>Ide jadi project.<br><span>Kode siap diunduh.</span></h1>
    <p class="welcome-sub">Jelaskan project yang kamu inginkan. Xyro menyiapkan struktur multi-file, preview, dan ZIP setelah selesai. Kode tidak ditampilkan selama proses pembuatan.</p>
    <div class="suggestions">
      <button class="suggestion" data-prompt="Buat website portfolio modern responsif dengan halaman utama, tentang, project, kontak, CSS terpisah, dan JavaScript untuk menu mobile."><span class="suggestion-icon violet">${icon("code",18)}</span><span><strong>Portfolio modern</strong><small>HTML, CSS, JavaScript</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Buat aplikasi catatan sederhana dengan tambah, edit, hapus, pencarian, penyimpanan localStorage, desain responsif, dan README."><span class="suggestion-icon blue">${icon("file",18)}</span><span><strong>Aplikasi catatan</strong><small>CRUD dan penyimpanan lokal</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Buat landing page produk dengan hero, fitur, harga, FAQ accordion, tombol CTA, animasi halus, dan desain mobile-first."><span class="suggestion-icon amber">${icon("spark",18)}</span><span><strong>Landing page</strong><small>Komponen siap digunakan</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Buat dashboard admin responsif dengan sidebar, kartu statistik contoh, tabel pencarian, filter, dan grafik SVG tanpa library eksternal."><span class="suggestion-icon green">${icon("globe",18)}</span><span><strong>Dashboard admin</strong><small>UI dan interaksi dasar</small></span><span class="suggestion-arrow">↗</span></button>
    </div>
    <div class="project-capabilities"><span>${icon("file",15)} Multi-file</span><span>${icon("monitor-play",15)} Preview</span><span>${icon("download",15)} Unduh ZIP</span><span>${icon("shield-check",15)} Kode disembunyikan saat dibuat</span></div>
  </div>`;
  return `<div class="welcome">
    <div class="welcome-orb"><div class="orb-core">x<span>.</span></div><div class="orb-ring ring-one"></div><div class="orb-ring ring-two"></div></div>
    <div class="welcome-kicker"><span class="kicker-line"></span> YOUR AI WORKSPACE <span class="kicker-line"></span></div>
    <h1>${coding ? 'Mari bangun sesuatu<br><span>yang luar biasa.</span>' : 'Ide besar dimulai<br><span>dari satu pertanyaan.</span>'}</h1>
    <p class="welcome-sub">${coding ? 'Tulis, debug, dan kembangkan kode bersama Xyro.' : 'Ruang berpikir untuk eksplorasi, analisis, dan kreativitasmu.'}</p>
    <div class="suggestions">
      <button class="suggestion" data-prompt="Buatkan website modern dengan HTML, CSS, dan JavaScript. Jelaskan struktur filenya."><span class="suggestion-icon violet">${icon("code",18)}</span><span><strong>Buat website</strong><small>Ubah ide menjadi kode</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Bantu analisis sebuah masalah secara terstruktur: ringkasan, fakta, kemungkinan, dan langkah berikutnya."><span class="suggestion-icon blue">${icon("search",18)}</span><span><strong>Analisis mendalam</strong><small>Pecahkan masalah kompleks</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Buat rencana proyek yang realistis dengan tahap, prioritas, dan checklist yang jelas."><span class="suggestion-icon amber">${icon("spark",18)}</span><span><strong>Rencanakan proyek</strong><small>Susun langkah berikutnya</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Jelaskan konsep pemrograman yang sulit dengan bahasa sederhana dan contoh."><span class="suggestion-icon green">${icon("file",18)}</span><span><strong>Belajar sesuatu</strong><small>Pahami konsep lebih cepat</small></span><span class="suggestion-arrow">↗</span></button>
    </div>
  </div>`;
}
function renderConversation(chat) {
  const project = currentMode === "project" ? projects[chat.id] : null;
  const messageMarkup = chat.messages.map((m,i)=>`<article class="message ${m.role === "user" ? "user-message" : "assistant-message"}"><div class="message-avatar ${m.role==="user"?"user-avatar":"ai-avatar"}">${m.role==="user"?"U":'<span class="mini-x">x</span>'}</div><div class="message-body"><div class="message-meta"><strong>${m.role==="user"?"Kamu":"Xyro"}</strong><span>${m.role==="user"?"":"· AI assistant"}</span></div><div class="message-content">${m.role==="assistant"?(currentMode === "project" ? `<p>${escapeHTML(m.content).replace(/\n/g,"<br>")}</p>` : renderMarkdown(m.content,i)):escapeHTML(m.content).replace(/\n/g,"<br>")}</div>${m.role==="assistant"&&currentMode!=="project"?`<div class="message-actions"><button data-copy="${i}">${icon("copy",14)} Salin</button><button data-download-message="${i}">${icon("download",14)} Unduh</button></div>`:""}</div></article>`).join("");
  return `<div class="conversation" id="conversation">${messageMarkup}${busy?`<article class="message assistant-message"><div class="message-avatar ai-avatar"><span class="mini-x">x</span></div><div class="message-body"><div class="message-meta"><strong>Xyro</strong><span>· ${currentMode === "project" ? "sedang membangun project" : "sedang berpikir"}</span></div>${currentMode === "project" ? `<div class="project-build-progress"><div class="project-progress-top"><span class="spinner"></span><strong>Menyiapkan project kamu</strong></div><div class="build-step active">${icon("check",14)} Menganalisis kebutuhan</div><div class="build-step active">${icon("spark",14)} Menyusun struktur dan file</div><div class="build-step active">${icon("code",14)} Menulis kode di latar proses</div><div class="build-step">${icon("download",14)} Menyiapkan preview dan ZIP</div><p>Kode sumber disembunyikan selama proses pembuatan. Tunggu sampai project selesai.</p></div>`:`<div class="thinking"><span></span><span></span><span></span></div>`}</div></article>`:""}${project ? renderProjectWorkspace(project) : ""}</div>`;
}
function renderProjectWorkspace(project) {
  const files = Array.isArray(project.files) ? project.files : [];
  const selected = files.find(f => f.path === selectedProjectPath) || files.find(f => /(^|\/)index\.html$/i.test(f.path)) || files[0];
  const safeName = escapeHTML(project.projectName || "Project Xyro");
  return `<section class="project-result">
    <div class="project-result-head"><div><div class="eyebrow">PROJECT SELESAI</div><h2>${safeName}</h2><p>${escapeHTML(project.summary || "File project siap di-preview dan diunduh.")}</p></div><span class="project-ready">${icon("check",14)} Siap</span></div>
    <div class="project-toolbar"><button class="primary-btn" id="downloadProjectZip">${icon("download",16)} Unduh ZIP</button><button class="secondary-btn" id="previewProject">${icon("monitor-play",16)} Preview website</button><button class="secondary-btn" id="toggleProjectSource">${icon("code",16)} ${projectSourceVisible ? "Sembunyikan kode" : "Lihat kode"}</button></div>
    <div class="project-file-layout"><aside class="project-file-list"><div class="project-file-title">${icon("file",15)} FILE PROJECT <span>${files.length}</span></div>${files.map(f=>`<button class="project-file ${selected && f.path===selected.path?"active":""}" data-project-file="${escapeHTML(f.path)}"><span class="file-dot"></span><span>${escapeHTML(f.path)}</span></button>`).join("")}</aside><div class="project-file-detail">${selected ? `<div class="project-file-detail-head"><strong>${escapeHTML(selected.path)}</strong><span>${selected.content.length.toLocaleString("id-ID")} karakter</span><button class="tiny-icon" id="downloadSelectedFile" title="Unduh file ini">${icon("download",15)}</button></div>${projectSourceVisible ? `<pre class="project-source"><code>${escapeHTML(selected.content)}</code></pre>` : `<div class="source-hidden"><div class="source-hidden-icon">${icon("code",24)}</div><strong>Kode sumber disembunyikan</strong><p>Tekan “Lihat kode” untuk membaca atau mengedit file setelah project selesai dibuat.</p></div>`}` : `<div class="source-hidden">Tidak ada file untuk ditampilkan.</div>`}</div></div>
    <div class="project-result-foot">${icon("shield-check",14)} Preview berjalan dalam sandbox. Periksa kode dan dependency sebelum memakai project di produksi.</div>
  </section>`;
}

function renderMarkdown(text, messageIndex = 0) {
  // Renderer ringan: escape HTML terlebih dahulu, lalu format Markdown dasar.
  let s = escapeHTML(text);
  const blocks = [];
  s = s.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = blocks.length; blocks.push({lang, code});
    return `@@CODEBLOCK${idx}@@`;
  });
  s = s.replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h1>$1</h1>");
  s = s.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>");
  s = s.replace(/^\s*[-*] (.*)$/gm,"<li>$1</li>");
  s = s.replace(/(?:<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`);
  s = s.split(/\n{2,}/).map(p=>/^@@CODEBLOCK\d+@@$/.test(p.trim())||/^<h[123]>/.test(p.trim())||/^<ul>/.test(p.trim())?p:`<p>${p.replace(/\n/g,"<br>")}</p>`).join("");
  s = s.replace(/@@CODEBLOCK(\d+)@@/g,(_m,n)=>{
    const b=blocks[Number(n)]; const isHtml = /^(html|htm|xhtml)$/i.test((b.lang||"").trim()); return `<div class="code-block"><div class="code-head"><span>${escapeHTML(b.lang||"code")}</span>${isHtml?`<button data-preview-code="${Number(n)}" data-code-message="${Number(messageIndex)}">${icon("globe",14)} Preview</button>`:""}<button data-copy-code="${Number(n)}" data-code-message="${Number(messageIndex)}">${icon("copy",14)} Salin kode</button><button data-download-code="${Number(n)}" data-code-message="${Number(messageIndex)}">${icon("download",14)} Unduh</button></div><pre><code>${b.code}</code></pre></div>`;
  });
  return s;
}
let lastBlocks = [];
function scrollToBottom() { requestAnimationFrame(()=>{ const c=document.querySelector("#conversation"); if(c)c.scrollTop=c.scrollHeight; }); }
function autoResize() {
  const el=document.querySelector("#prompt"); if(!el)return;
  el.addEventListener("input",()=>{el.style.height="auto";el.style.height=Math.min(el.scrollHeight,180)+"px";});
}
function bindEvents() {
  document.querySelector("#newChat")?.addEventListener("click",newChat);
  document.querySelector("#brandHome")?.addEventListener("click",()=>{currentMode="chat";newChat();});
  document.querySelector("#collapse")?.addEventListener("click",()=>{sidebarOpen=false;render();});
  document.querySelector("#expand")?.addEventListener("click",()=>{sidebarOpen=!sidebarOpen;render();});
  document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{currentMode=b.dataset.mode;projectSourceVisible=false;render();}));
  document.querySelectorAll("[data-chat]").forEach(b=>b.addEventListener("click",()=>{activeId=b.dataset.chat;render();}));
  document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();chats=chats.filter(c=>c.id!==b.dataset.delete);if(activeId===b.dataset.delete)activeId=chats[0]?.id||null;save();render();notify("Percakapan dihapus.");}));
  document.querySelectorAll("[data-rename]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const c=chats.find(x=>x.id===b.dataset.rename);if(!c)return;const n=prompt("Nama percakapan:",c.title);if(n?.trim()){c.title=n.trim().slice(0,80);save();render();}}));
  document.querySelector("#clearHistory")?.addEventListener("click",()=>{if(confirm("Hapus semua percakapan dari daftar?")){chats=[];activeId=null;save();render();}});
  document.querySelector("#prompt")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});
  document.querySelector("#send")?.addEventListener("click",sendMessage);
  document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>{const el=document.querySelector("#prompt");if(el){el.value=b.dataset.prompt;el.focus();autoResize();el.dispatchEvent(new Event("input"));}}));
  document.querySelector("#modelSelect")?.addEventListener("click",()=>{const m=document.querySelector("#modelMenu");m.hidden=!m.hidden;if(!m.hidden)refreshModels();});
  document.querySelector("#modelMenu")?.addEventListener("click",e=>{const b=e.target.closest("[data-model]");if(!b)return;selectedModel=b.dataset.model;localStorage.setItem(MODEL_KEY,selectedModel);render();});
  document.querySelector("#refreshModels")?.addEventListener("click",()=>refreshModels(document.querySelector("#backendUrl")?.value));
  const privateBackend=document.querySelector("#backendUrl");
  ["copy","cut","contextmenu","selectstart"].forEach(evt=>privateBackend?.addEventListener(evt,e=>e.preventDefault()));
  privateBackend?.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&["c","x","a"].includes(e.key.toLowerCase()))e.preventDefault();});
  document.querySelector("#attach")?.addEventListener("click",()=>document.querySelector("#fileInput").click());
  document.querySelector("#fileInput")?.addEventListener("change",async e=>{
    const files=[...e.target.files];let snippets=[];
    for(const f of files.slice(0,4)){try{snippets.push(`--- File: ${f.name} ---\n${(await f.text()).slice(0,12000)}`);}catch{}}
    if(snippets.length){const el=document.querySelector("#prompt");el.value+=(el.value?"\n\n":"")+"Tolong analisis file berikut:\n"+snippets.join("\n\n");el.dispatchEvent(new Event("input"));notify(`${snippets.length} file dimuat ke composer.`);}
    e.target.value="";
  });
  document.querySelector("#exportChat")?.addEventListener("click",exportCurrentChat);
  document.querySelector("#settings")?.addEventListener("click",openSettings);
  document.querySelector("#settingsTop")?.addEventListener("click",openSettings);
  document.querySelector("#searchChats")?.addEventListener("click",openSearch);
  document.querySelector("#modal")?.addEventListener("click",e=>{if(e.target.id==="modal")closeSettings();});
  document.querySelector("#closeModal")?.addEventListener("click",closeSettings);
  const backendInput=document.querySelector("#backendUrl");
  const adminPasswordInput=document.querySelector("#adminPassword");
  const verifyButton=document.querySelector("#verifyAdmin");
  const currentBackend=()=>((backendInput?.value||"").trim().replace(/\/+$/, ""));
  const resetAdminVerification=()=>{adminVerifiedFor="";const st=document.querySelector("#serverStatus");if(st)st.textContent="Alamat/password berubah. Verifikasi admin kembali sebelum menyimpan alamat.";};
  backendInput?.addEventListener("input",resetAdminVerification);
  adminPasswordInput?.addEventListener("input",resetAdminVerification);
  verifyButton?.addEventListener("click",async()=>{
    const backend=currentBackend(); const password=adminPasswordInput?.value||"";
    if(!/^https:\/\//i.test(backend)){notify("Masukkan URL backend HTTPS yang benar terlebih dahulu.");return;}
    if(!password){notify("Masukkan password admin terlebih dahulu.");return;}
    verifyButton.disabled=true;const st=document.querySelector("#serverStatus");if(st)st.textContent="Memverifikasi password admin ke backend...";
    try{
      const r=await fetch(backend+"/api/admin/status",{method:"GET",headers:{"x-admin-password":password},cache:"no-store"});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||`Verifikasi gagal (HTTP ${r.status}).`);
      adminVerifiedFor=backend;
      if(st){st.textContent=`Admin terverifikasi. Status API: ${d.maskedKey||"••••••••"}.`;st.classList.add("verified");}
      notify("Admin terverifikasi. Alamat backend bisa disimpan.");
    }catch(e){adminVerifiedFor="";if(st){st.textContent="Verifikasi gagal: "+e.message;st.classList.remove("verified");} }
    finally{verifyButton.disabled=false;}
  });
  document.querySelector("#saveSettings")?.addEventListener("click",()=>{
    const backend=currentBackend(); const previous=(localStorage.getItem(BACKEND_KEY)||"").trim().replace(/\/+$/, "");
    if(backend && !/^https:\/\//i.test(backend)){notify("Alamat backend harus menggunakan HTTPS.");return;}
    if(backend!==previous && adminVerifiedFor!==backend){notify("Verifikasi admin berhasil diperlukan sebelum mengganti alamat backend.");return;}
    localStorage.setItem(BACKEND_KEY,backend);
    selectedModel=document.querySelector("#settingModel").value;localStorage.setItem(MODEL_KEY,selectedModel);
    closeSettings();render();notify("Pengaturan disimpan.");
  });
  document.querySelector("#clearLocal")?.addEventListener("click",()=>{if(confirm("Yakin hapus seluruh riwayat lokal?")){chats=[];activeId=null;save();closeSettings();render();notify("Riwayat lokal dihapus.");}});
  document.querySelector("#downloadData")?.addEventListener("click",()=>download("xyro-riwayat.json",JSON.stringify(chats,null,2),"application/json"));
  document.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",()=>{const m=activeChat()?.messages[Number(b.dataset.copy)];if(m)copyText(m.content);}));
  document.querySelectorAll("[data-download-message]").forEach(b=>b.addEventListener("click",()=>{const m=activeChat()?.messages[Number(b.dataset.downloadMessage)];if(m)download(`xyro-jawaban-${Number(b.dataset.downloadMessage)+1}.md`,m.content,"text/markdown");}));
  document.querySelectorAll("[data-copy-code]").forEach(b=>b.addEventListener("click",()=>{const block=findCodeBlock(Number(b.dataset.copyCode),Number(b.dataset.codeMessage));if(block)copyText(block.code);}));
  document.querySelectorAll("[data-download-code]").forEach(b=>b.addEventListener("click",()=>{const block=findCodeBlock(Number(b.dataset.downloadCode),Number(b.dataset.codeMessage));if(block){const ext=({js:"js",javascript:"js",ts:"ts",typescript:"ts",html:"html",css:"css",json:"json",py:"py",python:"py",bash:"sh",sh:"sh"}[block.lang.toLowerCase()]||"txt");download(`xyro-kode.${ext}`,block.code,"text/plain");}}));
  document.querySelectorAll("[data-preview-code]").forEach(b=>b.addEventListener("click",()=>{const block=findCodeBlock(Number(b.dataset.previewCode),Number(b.dataset.codeMessage));if(block)showHtmlPreview(block.code);}));
  document.querySelectorAll("[data-project-file]").forEach(b=>b.addEventListener("click",()=>{selectedProjectPath=b.dataset.projectFile;projectSourceVisible=true;render();}));
  document.querySelector("#toggleProjectSource")?.addEventListener("click",()=>{projectSourceVisible=!projectSourceVisible;render();});
  document.querySelector("#downloadProjectZip")?.addEventListener("click",async()=>{const c=activeChat();const project=c&&projects[c.id];if(project)await downloadProjectZip(project);});
  document.querySelector("#downloadSelectedFile")?.addEventListener("click",()=>{const c=activeChat();const project=c&&projects[c.id];const file=project?.files?.find(f=>f.path===selectedProjectPath);if(file)download(file.path.split("/").pop(),file.content,"text/plain");});
  document.querySelector("#previewProject")?.addEventListener("click",()=>{const c=activeChat();const project=c&&projects[c.id];if(project)showHtmlPreview(buildProjectPreview(project));});
  document.querySelector("#closePreview")?.addEventListener("click",closeHtmlPreview);
  document.querySelector("#previewOverlay")?.addEventListener("click",e=>{if(e.target.id==="previewOverlay")closeHtmlPreview();});
  document.querySelector("#refreshPreview")?.addEventListener("click",()=>{if(lastPreviewHtml!==null)showHtmlPreview(lastPreviewHtml);});
  document.querySelector("#searchOverlay")?.addEventListener("click",e=>{if(e.target.id==="searchOverlay")closeSearch();});
  document.querySelector("#searchInput")?.addEventListener("input",e=>showSearchResults(e.target.value));
}
function findCodeBlock(n, messageIndex) {
  const message=activeChat()?.messages?.[messageIndex];
  if(!message || message.role!=="assistant")return null;
  const re=/```([\w+-]*)\n?([\s\S]*?)```/g;let m,i=0;
  while((m=re.exec(message.content))){if(i++===n)return {lang:m[1]||"txt",code:m[2]};}
  return null;
}
async function sendMessage() {
  if(busy)return;
  const input=document.querySelector("#prompt"); const content=input?.value.trim(); if(!content)return;
  let chat=activeChat(); if(!chat){chat={id:id(),title:"Percakapan baru",messages:[],updated:Date.now()};chats.unshift(chat);activeId=chat.id;}
  chat.messages.push({role:"user",content});if(chat.messages.filter(m=>m.role==="user").length===1)chat.title=titleFrom(content);
  chat.updated=Date.now();save();busy=true;projectSourceVisible=false;render();
  try {
    const projectMode=currentMode==="project";
    const project=projectMode?projects[chat.id]:null;
    const projectSystem = `Kamu adalah Xyro Project Builder. Buat project web yang benar-benar dapat dijalankan. Balas HANYA JSON valid tanpa markdown, tanpa code fence, tanpa teks di luar JSON dengan bentuk: {"projectName":"nama singkat","summary":"ringkasan singkat","files":[{"path":"index.html","content":"..."},{"path":"style.css","content":"..."},{"path":"script.js","content":"..."}]}. Isi konten file harus berupa source code lengkap sebagai string JSON valid. Untuk project website minimal sertakan index.html; pisahkan CSS dan JavaScript bila sesuai. Buat UI responsif dan interaksi berfungsi, jangan hanya placeholder. Maksimal 25 file dan 120000 karakter per file. Gunakan path relatif sederhana, tanpa path absolut, tanpa .., tanpa node_modules, tanpa .env, tanpa API key/password rahasia. Jika mengubah project sebelumnya, pertahankan fitur yang ada dan sertakan semua file yang masih diperlukan. Jangan menyertakan penjelasan di luar JSON.`;
    const systemContent=projectMode?projectSystem+(project?`

PROJECT SAAT INI (ubah sesuai permintaan, sertakan file lengkap yang dibutuhkan):
${JSON.stringify({projectName:project.projectName,files:project.files})}`:""):SYSTEM_PROMPT+(currentMode==="code"?" Prioritaskan bantuan pemrograman, kode lengkap yang relevan, dan penjelasan implementasi.":"");
    const messages=[{role:"system",content:systemContent},...chat.messages.slice(-20).map(m=>({role:m.role,content:m.content}))];
    const response=await fetch(apiUrl("/api/chat"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:selectedModel,messages,temperature:0.4})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Permintaan gagal (${response.status}).`);
    if(projectMode){
      const parsed=parseProjectResponse(data.answer);
      if(!parsed)throw new Error("AI belum mengembalikan format project yang valid. Tekan kirim lagi dengan instruksi: buat ulang project dalam format file lengkap.");
      projects[chat.id]={...parsed,updated:Date.now()};saveProjects();
      selectedProjectPath=parsed.files.find(f=>/^index\.html$/i.test(f.path))?.path||parsed.files.find(f=>/\.html?$/i.test(f.path))?.path||parsed.files[0]?.path||"";
      chat.messages.push({role:"assistant",content:`Project “${parsed.projectName}” selesai dibuat. ${parsed.files.length} file siap. Gunakan Preview website untuk mencoba atau Unduh ZIP untuk menyimpan project.`});
    } else {
      chat.messages.push({role:"assistant",content:data.answer});
    }
    chat.updated=Date.now();save();
  } catch(err) {
    chat.messages.push({role:"assistant",content:currentMode==="project"?`Project belum berhasil dibuat. ${err.message}`:`Maaf, permintaan belum berhasil.

Detail: ${err.message}

Periksa konfigurasi backend dan API key, lalu coba lagi.`});chat.updated=Date.now();save();
  } finally {busy=false;render();}
}
function parseProjectResponse(answer) {
  if(typeof answer!=="string")return null;
  let candidate=answer.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");
  let parsed=null;
  try{parsed=JSON.parse(candidate);}catch{
    const a=candidate.indexOf("{");const b=candidate.lastIndexOf("}");if(a>=0&&b>a){try{parsed=JSON.parse(candidate.slice(a,b+1));}catch{}}
  }
  if(!parsed||!Array.isArray(parsed.files))return null;
  const files=[];const seen=new Set();
  for(const f of parsed.files.slice(0,25)){
    if(!f||typeof f.path!=="string"||typeof f.content!=="string")continue;
    let path=f.path.replace(/\\/g,"/").replace(/^\.\//,"").trim();
    if(!path||path.startsWith("/")||path.split("/").some(part=>!part||part==="..")||path.includes("\0")||/(^|\/)\.env($|\.)/i.test(path)||/(^|\/)node_modules(\/|$)/i.test(path))continue;
    if(f.content.length>120000||seen.has(path))continue;
    seen.add(path);files.push({path,content:f.content});
  }
  if(!files.length)return null;
  if(!files.some(f=>/\.html?$/i.test(f.path)))return null;
  return {projectName:String(parsed.projectName||"Xyro Project").slice(0,80),summary:String(parsed.summary||"Project web siap diuji.").slice(0,500),files};
}
function buildProjectPreview(project) {
  const files=project.files||[];
  const htmlFile=files.find(f=>/^index\.html$/i.test(f.path))||files.find(f=>/\.html?$/i.test(f.path));
  if(!htmlFile)return "<h1>File HTML tidak ditemukan</h1>";
  let html=htmlFile.content;
  for(const file of files){
    const base=file.path.split("/").pop();
    if(/\.css$/i.test(file.path)){
      const linkRe=new RegExp(String.raw`<link\b(?=[^>]*href=["'][^"']*${escapeRegExp(base)}["'])[^>]*>`,"i");
      if(linkRe.test(html))html=html.replace(linkRe,`<style>\n${file.content}\n</style>`);
      else if(/<\/head>/i.test(html))html=html.replace(/<\/head>/i,`<style>\n${file.content}\n</style></head>`);
    }
  }
  for(const file of files){
    if(/\.js$/i.test(file.path)){
      const base=file.path.split("/").pop();
      const scriptRe=new RegExp(String.raw`<script\b(?=[^>]*src=["'][^"']*${escapeRegExp(base)}["'])[^>]*>\s*</script>`,"i");
      const inline=file.content.replace(/<\/script/gi,"<\\/script");
      if(scriptRe.test(html))html=html.replace(scriptRe,`<script>\n${inline}\n</script>`);
      else if(/<\/body>/i.test(html))html=html.replace(/<\/body>/i,`<script>\n${inline}\n</script></body>`);
    }
  }
  return html;
}
function escapeRegExp(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
async function downloadProjectZip(project) {
  try {
    const files=[...(project.files||[])];
    if(!files.some(f=>/^README\.md$/i.test(f.path)))files.push({path:"README.md",content:`# ${project.projectName||"Xyro Project"}\n\n${project.summary||"Project web dibuat dengan Xyro AI."}\n\n## Cara menjalankan\n\nBuka index.html di browser atau jalankan menggunakan static hosting. Periksa dan uji kode sebelum deploy.\n`});
    const blob=makeZipBlob(files);
    downloadBlob(`${slugify(project.projectName||"xyro-project")}.zip`,blob);
    notify("ZIP project berhasil dibuat.");
  } catch(e){notify("Gagal membuat ZIP: "+e.message);}
}
function slugify(s){return String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"xyro-project";}
function downloadBlob(filename,blob){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function makeZipBlob(files){
  const enc=new TextEncoder();const localParts=[];const centralParts=[];let offset=0;const now=new Date();
  const dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(Math.floor(now.getSeconds()/2));const dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  const crcTable=makeCrcTable();
  const u16=n=>new Uint8Array([n&255,(n>>>8)&255]);const u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  const join=arr=>{const size=arr.reduce((n,x)=>n+x.length,0);const out=new Uint8Array(size);let at=0;for(const x of arr){out.set(x,at);at+=x.length;}return out;};
  for(const file of files){
    const name=enc.encode(file.path.replace(/\\/g,"/"));const data=enc.encode(file.content);const crc=crc32(data,crcTable);const flags=0x0800;
    const local=join([u32(0x04034b50),u16(20),u16(flags),u16(0),u16(dosTime),u16(dosDate),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);localParts.push(local);
    const central=join([u32(0x02014b50),u16(20),u16(20),u16(flags),u16(0),u16(dosTime),u16(dosDate),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centralParts.push(central);offset+=local.length;
  }
  const central=join(centralParts);const end=join([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(offset),u16(0)]);
  return new Blob([...localParts,central,end],{type:"application/zip"});
}
function makeCrcTable(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;}
function crc32(data,table){let c=0xffffffff;for(const b of data)c=table[(c^b)&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}

function download(filename, content, type="text/plain") {
  const blob=new Blob([content],{type:`${type};charset=utf-8`});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);notify("File berhasil disiapkan.");
}
async function copyText(text) { try{await navigator.clipboard.writeText(text);notify("Teks disalin.");}catch{const t=document.createElement("textarea");t.value=text;document.body.append(t);t.select();document.execCommand("copy");t.remove();notify("Teks disalin.");} }
function exportCurrentChat() {
  const chat=activeChat();if(!chat){notify("Belum ada percakapan untuk diekspor.");return;}
  const md=`# ${chat.title}\n\n`+chat.messages.map(m=>`## ${m.role==="user"?"Kamu":"Xyro"}\n\n${m.content}`).join("\n\n---\n\n");
  download(`${chat.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,40)||"xyro-chat"}.md`,md,"text/markdown");
}
let lastPreviewHtml = null;
function showHtmlPreview(html) {
  lastPreviewHtml=html;
  const overlay=document.querySelector("#previewOverlay");const frame=document.querySelector("#htmlPreview");
  if(!overlay||!frame)return;
  // Isolasi output yang belum dipercaya di iframe sandbox tanpa allow-same-origin.
  frame.srcdoc=String(html||"");overlay.hidden=false;
}
function closeHtmlPreview(){const overlay=document.querySelector("#previewOverlay");const frame=document.querySelector("#htmlPreview");if(overlay)overlay.hidden=true;if(frame)frame.srcdoc="about:blank";}
async function openSettings() {
  const modal=document.querySelector("#modal");modal.hidden=false;
  document.querySelector("#settingModel").value=selectedModel;
  const backendInput=document.querySelector("#backendUrl");if(backendInput)backendInput.value=localStorage.getItem(BACKEND_KEY)||"";
  renderModelControls();
  const passwordInput=document.querySelector("#adminPassword");if(passwordInput)passwordInput.value="";
  adminVerifiedFor="";
  const status=document.querySelector("#serverStatus");status.classList.remove("verified");status.textContent="Masukkan URL backend dan verifikasi admin untuk mengganti alamat.";
  const current=(localStorage.getItem(BACKEND_KEY)||"").trim().replace(/\/+$/, "");
  if(current){try{const r=await fetch(current+"/api/health",{cache:"no-store"});const d=await r.json();status.textContent=d.configured?"Backend dapat dijangkau dan API sudah dikonfigurasi.":"Backend dapat dijangkau, tetapi API key belum dikonfigurasi.";}catch{status.textContent="Backend belum dapat dijangkau. Pastikan URL benar dan server aktif.";}}
  await refreshModels(current);
}
function closeSettings(){document.querySelector("#modal").hidden=true;}
function openSearch(){const o=document.querySelector("#searchOverlay");o.hidden=false;document.querySelector("#searchInput").focus();showSearchResults("");}
function closeSearch(){document.querySelector("#searchOverlay").hidden=true;}
function showSearchResults(q) {
  const result=chats.filter(c=>c.title.toLowerCase().includes(q.toLowerCase()));
  document.querySelector("#searchResults").innerHTML=result.length?result.map(c=>`<button data-result="${c.id}">${icon("message",16)}<span>${escapeHTML(c.title)}</span></button>`).join(""):'<div class="no-results">Tidak ada percakapan yang cocok.</div>';
  document.querySelectorAll("[data-result]").forEach(b=>b.addEventListener("click",()=>{activeId=b.dataset.result;closeSearch();render();}));
}
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeSettings();if(!document.querySelector("#searchOverlay")?.hidden)closeSearch();}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat();}
});
render();
refreshModels();
