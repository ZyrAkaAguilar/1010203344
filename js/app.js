// ZyrIsland Client App Controller
let currentUser = null;
let activeInstance = null;
let allEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await SecurityManager.auditCurrentSession();
    
    if (!currentUser) {
        document.getElementById('login-modal').classList.remove('hidden');
    } else {
        updateUIState();
    }

    setupEventListeners();
    loadInstances();
    interceptExternalLinks();
});

function interceptExternalLinks() {
    document.addEventListener('click', (e) => {
        const targetAnchor = e.target.closest('a[target="_blank"]');
        if (targetAnchor && typeof require !== 'undefined') {
            e.preventDefault();
            const { shell } = require('electron');
            shell.openExternal(targetAnchor.href);
        }
    });
}

function setupEventListeners() {
    document.getElementById('home-tab-btn').addEventListener('click', () => {
        showHomeView();
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        SecurityManager.clearSession();
        currentUser = null;
        window.location.reload();
    });
}

async function handleLogin() {
    const userInput = document.getElementById('username').value.trim();
    const passInput = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('login-error');

    errorBox.classList.add('hidden');

    try {
        const baseUrl = typeof ZYRISLAND_CONFIG !== 'undefined' ? ZYRISLAND_CONFIG.REMOTE_DATA_URL : './data';
        const response = await fetch(`${baseUrl}/users.json?t=${Date.now()}`);
        const data = await response.json();
        const foundUser = data.users.find(u => u.username.toLowerCase() === userInput.toLowerCase() && u.password === passInput);

        if (!foundUser) {
            showLoginError('Credenciales inválidas.');
            return;
        }

        if (foundUser.status === 'banned' || foundUser.status === 'suspended') {
            showLoginError(`CUENTA ${foundUser.status.toUpperCase()}. Razón: ${foundUser.suspendReason || 'Bloqueado'}`);
            return;
        }

        SecurityManager.setSessionCookie(foundUser);
        currentUser = foundUser;

        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('login-form').reset();
        
        updateUIState();
        showHomeView();

    } catch (err) {
        console.error('Error durante autenticación:', err);
        showLoginError('Error de servidor al validar credenciales.');
    }
}

function showLoginError(msg) {
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

function updateUIState() {
    const profileWidget = document.getElementById('user-profile-widget');
    if (currentUser) {
        profileWidget.classList.remove('hidden');
        document.getElementById('user-name-display').textContent = currentUser.username;
        document.getElementById('user-sidebar-avatar').src = `https://mc-heads.net/avatar/${currentUser.username}/48`;
    } else {
        profileWidget.classList.add('hidden');
    }
}

async function loadInstances() {
    try {
        const baseUrl = typeof ZYRISLAND_CONFIG !== 'undefined' ? ZYRISLAND_CONFIG.REMOTE_DATA_URL : './data';
        const res = await fetch(`${baseUrl}/events.json?t=${Date.now()}`);
        const data = await res.json();
        allEvents = data.events;

        renderSidebarIcons();
        renderHomeGrid();
    } catch (e) {
        console.error('Error cargando instancias:', e);
    }
}

function renderSidebarIcons() {
    const container = document.getElementById('instance-sidebar-list');
    container.innerHTML = '';

    allEvents.forEach(ev => {
        const icon = document.createElement('div');
        icon.className = 'instance-sidebar-icon';
        icon.style.backgroundImage = `url('${ev.coverImage}')`;
        icon.title = ev.title;
        icon.onclick = () => selectInstance(ev);
        container.appendChild(icon);
    });
}

function renderHomeGrid() {
    const grid = document.getElementById('home-events-grid');
    grid.innerHTML = '';

    allEvents.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'home-event-card';
        card.innerHTML = `
            <div class="card-img-box" style="background-image: url('${ev.coverImage}')"></div>
            <div class="card-body">
                <div class="card-title">${ev.title}</div>
                <div class="card-desc">${ev.description}</div>
            </div>
        `;
        card.onclick = () => selectInstance(ev);
        grid.appendChild(card);
    });
}

function showHomeView() {
    document.getElementById('home-tab-btn').classList.add('active');
    document.querySelectorAll('.instance-sidebar-icon').forEach(i => i.classList.remove('active'));
    
    document.getElementById('home-view-canvas').classList.remove('hidden');
    document.getElementById('instance-view-canvas').classList.add('hidden');
}

function selectInstance(eventData) {
    if (!currentUser) {
        document.getElementById('login-modal').classList.remove('hidden');
        return;
    }

    activeInstance = eventData;
    document.getElementById('home-tab-btn').classList.remove('active');

    document.getElementById('home-view-canvas').classList.add('hidden');
    document.getElementById('instance-view-canvas').classList.remove('hidden');

    document.getElementById('hero-title').textContent = eventData.title;
    document.getElementById('action-card-title').textContent = eventData.title;
    document.getElementById('action-card-thumb').style.backgroundImage = `url('${eventData.coverImage}')`;
    document.getElementById('instance-view-canvas').style.backgroundImage = `url('${eventData.banner}')`;

    checkInstanceStatus(eventData);
}

function checkInstanceStatus(eventData) {
    const statusText = document.getElementById('action-card-status');
    const primaryBtn = document.getElementById('action-primary-btn');
    const uninstallBtn = document.getElementById('uninstall-btn');

    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');

        // Pasa el usuario actual para lanzar Minecraft con su Nickname
        eventData.username = currentUser ? currentUser.username : 'Jugador';

        ipcRenderer.send('check-instance-status', eventData);
        ipcRenderer.once('instance-status-reply', (event, res) => {
            if (res.installed) {
                if (res.needsUpdate) {
                    statusText.textContent = 'Actualización Disponible';
                    primaryBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> ACTUALIZAR';
                } else {
                    statusText.textContent = 'Listo para jugar';
                    primaryBtn.innerHTML = '<i class="fa-solid fa-play"></i> JUGAR';
                }
                uninstallBtn.classList.remove('hidden');
            } else {
                statusText.textContent = 'No Instalado';
                primaryBtn.innerHTML = '<i class="fa-solid fa-download"></i> INSTALAR';
                uninstallBtn.classList.add('hidden');
            }
        });
    } else {
        statusText.textContent = 'Instalación disponible en App';
        primaryBtn.innerHTML = '<i class="fa-solid fa-download"></i> DESCARGAR';
    }

    primaryBtn.onclick = () => handlePrimaryAction(eventData);
    uninstallBtn.onclick = () => handleUninstall(eventData);
}

function handlePrimaryAction(eventData) {
    if (typeof require === 'undefined') {
        alert('Debes usar ZyrIsland Client (.exe) para jugar las instancias.');
        return;
    }

    const { ipcRenderer } = require('electron');
    document.getElementById('progress-box').classList.remove('hidden');
    document.getElementById('action-card-status').textContent = 'Procesando archivos...';

    eventData.username = currentUser ? currentUser.username : 'Jugador';
    ipcRenderer.send('install-or-launch-instance', eventData);

    ipcRenderer.on('instance-progress-update', (event, data) => {
        document.getElementById('progress-fill').style.width = `${data.percent}%`;
        document.getElementById('action-card-status').textContent = data.message;

        if (data.status === 'completed') {
            setTimeout(() => {
                document.getElementById('progress-box').classList.add('hidden');
                checkInstanceStatus(eventData);
            }, 1000);
        }
    });
}

function handleUninstall(eventData) {
    if (confirm(`¿Seguro que deseas desinstalar ${eventData.title}?`)) {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('uninstall-instance', eventData);
        ipcRenderer.once('uninstall-reply', () => {
            alert('Instancia desinstalada correctamente.');
            checkInstanceStatus(eventData);
        });
    }
}