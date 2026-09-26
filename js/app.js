let currentUser = null;
let db = {
    users: [],
    servers: [],
    events: [],
    notifications: []
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadDatabase();
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
        console.error("Error cargando archivos JSON:", err);
    }
}

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const userVal = document.getElementById('username').value.trim();
        const passVal = document.getElementById('password').value.trim();
        
        const foundUser = db.users.find(u => u.username === userVal && u.password === passVal);
        const errorEl = document.getElementById('login-error');

        if (!foundUser) {
            errorEl.textContent = "Usuario o contraseña incorrectos.";
            return;
        }

        if (foundUser.estado === "baneado") {
            errorEl.textContent = "TU CUENTA HA SIDO BANEADA PERMANENTEMENTE.";
            return;
        }

        if (foundUser.estado === "suspendido") {
            errorEl.textContent = "TU CUENTA SE ENCUENTRA SUSPENDIDA TEMPORALMENTE.";
            return;
        }

        currentUser = foundUser;
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        document.getElementById('user-display-name').textContent = currentUser.nombre;
        document.getElementById('user-role-badge').textContent = currentUser.rol.toUpperCase();

        renderHome();
        renderServers();
        renderEvents();
        renderNotifications();
    });
}

function logout() {
    currentUser = null;
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
}

function showSection(sectionId) {
    const sections = ['home', 'servers', 'events', 'notifications', 'event-detail'];
    sections.forEach(s => {
        document.getElementById(`section-${s}`).classList.add('hidden');
    });
    
    document.getElementById(`section-${sectionId}`).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('onclick')?.includes(sectionId));
    if (activeLink) activeLink.classList.add('active');
}

function renderHome() {
    const newsGrid = document.getElementById('news-grid');
    newsGrid.innerHTML = db.events.map(ev => `
        <div class="card" onclick="openEventDetail('${ev.id}')">
            <img src="${ev.imagen}" class="card-img" alt="${ev.titulo}">
            <div class="card-body">
                <h3 class="card-title">${ev.titulo}</h3>
                <p class="card-text">${ev.descripcionCorta}</p>
                <div class="card-footer">
                    <span class="btn btn-sm btn-primary">VER EVENTO</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderServers() {
    const serversGrid = document.getElementById('servers-grid');
    const allowedServers = db.servers.filter(srv => currentUser.servidoresPermitidos.includes(srv.id));

    if (allowedServers.length === 0) {
        serversGrid.innerHTML = `<p class="section-desc">No tienes permisos para acceder a ningún servidor.</p>`;
        return;
    }

    serversGrid.innerHTML = allowedServers.map(srv => `
        <div class="card">
            <img src="${srv.imagen}" class="card-img" alt="${srv.nombre}">
            <div class="card-body">
                <h3 class="card-title">${srv.nombre}</h3>
                <p class="card-text">${srv.descripcion}</p>
                <div class="card-footer">
                    <span class="status-indicator ${srv.online ? 'online' : 'offline'}"></span>
                    <span>${srv.online ? 'ONLINE' : 'OFFLINE'} - ${srv.jugadores} jugadores</span>
                </div>
                <div class="ip-box" style="margin-top:15px; text-align:center;">
                    <code>${srv.ip}</code>
                </div>
            </div>
        </div>
    `).join('');
}

function renderEvents() {
    const eventsGrid = document.getElementById('events-grid');
    eventsGrid.innerHTML = db.events.map(ev => `
        <div class="card" onclick="openEventDetail('${ev.id}')">
            <img src="${ev.imagen}" class="card-img" alt="${ev.titulo}">
            <div class="card-body">
                <h3 class="card-title">${ev.titulo}</h3>
                <p class="card-text">${ev.descripcionCorta}</p>
                <div class="card-footer">
                    <span class="btn btn-sm btn-action">DETALLES Y ASSETS</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderNotifications() {
    const list = document.getElementById('notifications-list');
    list.innerHTML = db.notifications.map(n => `
        <div class="notification-item ${n.urgente ? 'urgent' : ''}">
            <h3>${n.titulo}</h3>
            <p>${n.mensaje}</p>
            <div class="notification-date">${n.fecha}</div>
        </div>
    `).join('');
}

function openEventDetail(eventId) {
    const eventData = db.events.find(e => e.id === eventId);
    if (!eventData) return;

    const container = document.getElementById('event-detail-content');

    let ipSection = '';
    if (eventData.ip && eventData.ip.trim() !== "") {
        ipSection = `
            <div class="ip-box">
                <p>IP del Servidor de Evento:</p>
                <code>${eventData.ip}</code>
                <p style="font-size:0.8rem; color:#00ff88; margin-top:5px;">
                    ${eventData.online ? '● Servidor en Línea' : '● Servidor Fuera de Línea'}
                </p>
            </div>
        `;
    }

    let assetsSection = '';
    if (eventData.assetsExtra && eventData.assetsExtra.length > 0) {
        const assetsList = eventData.assetsExtra.map(asset => `
            <div class="asset-card">
                <h4>${asset.nombre}</h4>
                <p style="font-size:0.8rem; color:#a0aec0;">${asset.peso}</p>
                <button class="btn btn-sm btn-primary" onclick="startAnimatedDownload('${asset.nombre}', '${asset.url}')">
                    Descargar
                </button>
            </div>
        `).join('');

        assetsSection = `
            <div class="assets-section">
                <h3>Assets Extras Disponibles (${eventData.assetsExtra.length})</h3>
                <div class="assets-grid">
                    ${assetsList}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="detail-header">
            <img src="${eventData.imagen}" class="detail-img" alt="${eventData.titulo}">
            <div class="detail-info">
                <h2>${eventData.titulo}</h2>
                <p style="margin-top:15px; line-height:1.6; color:#cbd5e0;">${eventData.descripcionLarga}</p>
                ${ipSection}
            </div>
        </div>
        ${assetsSection}
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
