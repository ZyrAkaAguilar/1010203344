const Security = {
    sanitize(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    },

    setCookie(name, value, days = 7) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Strict; Secure`;
    },

    getCookie(name) {
        const cname = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(cname) === 0) {
                return c.substring(cname.length, c.length);
            }
        }
        return "";
    },

    eraseCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure`;
    }
};

let currentUser = null;
let db = { users: [], servers: [], events: [], notifications: [] };

document.addEventListener('DOMContentLoaded', async () => {
    await loadDatabase();
    checkSessionCookie();
    setupEventListeners();
});

async function loadDatabase() {
    try {
        const [usersRes, serversRes, eventsRes, notifRes] = await Promise.all([
            fetch('data/cuentas.json'),
            fetch('data/servidores.json'),
            fetch('data/eventos.json'),
            fetch('data/notificaciones.json')
        ]);

        db.users = await usersRes.json();
        db.servers = await serversRes.json();
        db.events = await eventsRes.json();
        db.notifications = await notifRes.json();
    } catch (err) {
        console.error("Error al cargar la base de datos JSON:", err);
    }
}

function checkSessionCookie() {
    const sessionToken = Security.getCookie("zyr_session");
    if (sessionToken) {
        const user = db.users.find(u => u.id === sessionToken);
        if (user && user.estado === "activo") {
            loginUser(user, false);
        } else {
            Security.eraseCookie("zyr_session");
        }
    }
}

function setupEventListeners() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawUser = document.getElementById('username').value;
        const rawPass = document.getElementById('password').value;

        const userVal = Security.sanitize(rawUser.trim());
        const passVal = Security.sanitize(rawPass.trim());

        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';

        const foundUser = db.users.find(u => u.username === userVal && u.password === passVal);

        if (!foundUser) {
            errorEl.textContent = "Usuario o contraseña inválidos.";
            return;
        }

        if (foundUser.estado === "baneado") {
            errorEl.textContent = "ACCESO DENEGADO: Tu cuenta está baneada.";
            return;
        }

        if (foundUser.estado === "suspendido") {
            errorEl.textContent = "ACCESO RESTRINGIDO: Tu cuenta está suspendida.";
            return;
        }

        loginUser(foundUser, true);
    });
}

function loginUser(user, setCookie = true) {
    currentUser = user;
    if (setCookie) {
        Security.setCookie("zyr_session", user.id, 7);
    }

    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');

    document.getElementById('user-display-name').textContent = Security.sanitize(user.nombre);
    document.getElementById('user-role-badge').textContent = Security.sanitize(user.rol);
    document.getElementById('user-avatar').textContent = user.nombre.charAt(0).toUpperCase();

    renderServers();
    renderEvents();
    renderNotifications();
}

function logout() {
    currentUser = null;
    Security.eraseCookie("zyr_session");
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
}

function showSection(sectionId) {
    const sections = ['servers', 'events', 'notifications', 'event-detail'];
    sections.forEach(s => {
        const el = document.getElementById(`section-${s}`);
        if (el) el.classList.add('hidden');
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) targetSection.classList.remove('hidden');

    document.querySelectorAll('.dock-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.dock-btn')).find(b => b.getAttribute('onclick')?.includes(sectionId));
    if (activeBtn) activeBtn.classList.add('active');
}

function renderServers() {
    const grid = document.getElementById('servers-grid');
    if (!grid) return;

    const allowedServers = db.servers.filter(srv => currentUser.servidoresPermitidos.includes(srv.id));

    if (allowedServers.length === 0) {
        grid.innerHTML = `<p class="subtitle">No tienes servidores autorizados actualmente.</p>`;
        return;
    }

    grid.innerHTML = allowedServers.map(srv => `
        <div class="round-card">
            <img src="${Security.sanitize(srv.imagen)}" class="card-thumb" alt="${Security.sanitize(srv.nombre)}">
            <div class="card-title">${Security.sanitize(srv.nombre)}</div>
            <div class="card-desc">${Security.sanitize(srv.descripcion)}</div>
            <div class="ip-pill">${Security.sanitize(srv.ip)}</div>
        </div>
    `).join('');
}

function renderEvents() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    grid.innerHTML = db.events.map(ev => `
        <div class="round-card" onclick="openEventDetail('${Security.sanitize(ev.id)}')">
            <img src="${Security.sanitize(ev.imagen)}" class="card-thumb" alt="${Security.sanitize(ev.titulo)}">
            <div class="card-title">${Security.sanitize(ev.titulo)}</div>
            <div class="card-desc">${Security.sanitize(ev.descripcionCorta)}</div>
        </div>
    `).join('');
}

function renderNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    list.innerHTML = db.notifications.map(n => `
        <div class="glass-panel" style="padding:20px; margin-bottom:15px;">
            <h3>${Security.sanitize(n.titulo)}</h3>
            <p style="margin-top:5px; color:var(--text-secondary);">${Security.sanitize(n.mensaje)}</p>
            <span style="font-size:0.75rem; color:rgba(255,255,255,0.6); display:block; margin-top:10px;">${Security.sanitize(n.fecha)}</span>
        </div>
    `).join('');
}

function openEventDetail(eventId) {
    const eventData = db.events.find(e => e.id === eventId);
    if (!eventData) return;

    const container = document.getElementById('event-detail-content');

    let ipBlock = '';
    if (eventData.ip && eventData.ip.trim() !== "") {
        ipBlock = `<div class="ip-pill">IP: ${Security.sanitize(eventData.ip)}</div>`;
    }

    let assetsBlock = '';
    if (eventData.assetsExtra && eventData.assetsExtra.length > 0) {
        const assetsList = eventData.assetsExtra.map(asset => `
            <div class="glass-panel" style="padding:15px; display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <div>
                    <strong>${Security.sanitize(asset.nombre)}</strong>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">${Security.sanitize(asset.peso)}</div>
                </div>
                <button class="btn btn-primary" style="width:auto;" onclick="startAnimatedDownload('${Security.sanitize(asset.nombre)}', '${Security.sanitize(asset.url)}')">
                    Descargar
                </button>
            </div>
        `).join('');

        assetsBlock = `<div style="margin-top:20px;"><h4>Assets Extra</h4>${assetsList}</div>`;
    }

    container.innerHTML = `
        <h2>${Security.sanitize(eventData.titulo)}</h2>
        <img src="${Security.sanitize(eventData.imagen)}" class="card-thumb" style="max-width:500px; margin:20px 0;" alt="${Security.sanitize(eventData.titulo)}">
        <p style="line-height:1.6; color:var(--text-secondary);">${Security.sanitize(eventData.descripcionLarga)}</p>
        ${ipBlock}
        ${assetsBlock}
    `;

    showSection('event-detail');
}

function startAnimatedDownload(filename, url) {
    const downloadModal = document.getElementById('download-modal');
    const filenameEl = document.getElementById('download-filename');
    const progressEl = document.getElementById('download-progress');
    const percentageEl = document.getElementById('download-percentage');

    filenameEl.textContent = filename;
    progressEl.style.width = '0%';
    percentageEl.textContent = '0%';
    downloadModal.classList.remove('hidden');

    const durationSeconds = Math.floor(Math.random() * (25 - 8 + 1)) + 8;
    const intervalTime = 100;
    const totalSteps = (durationSeconds * 1000) / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
        currentStep++;
        const percent = Math.min(Math.round((currentStep / totalSteps) * 100), 100);
        
        progressEl.style.width = `${percent}%`;
        percentageEl.textContent = `${percent}%`;

        if (currentStep >= totalSteps) {
            clearInterval(interval);
            setTimeout(() => {
                downloadModal.classList.add('hidden');
                triggerActualDownload(url, filename);
            }, 500);
        }
    }, intervalTime);
}

function triggerActualDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
