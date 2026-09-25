// Eufonia Client - Application Logic
let currentUser = null;
let autoRefreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    // Restore session if exists
    const storedUser = localStorage.getItem('eufonia_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }

    updateUIState();
    loadAllData();

    // Auto verify JSON changes every 30 seconds
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        console.log('[Auto-Sync] Verificando cambios en archivos JSON...');
        loadAllData();
    }, 30000);
}

function setupEventListeners() {
    // Login Modal Triggers
    document.getElementById('login-open-btn').addEventListener('click', () => {
        document.getElementById('login-modal').classList.remove('hidden');
    });

    document.getElementById('modal-close-btn').addEventListener('click', () => {
        document.getElementById('login-modal').classList.add('hidden');
    });

    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('eufonia_user');
        initApp();
    });

    // Manual Refresh Button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const btnIcon = document.querySelector('#refresh-btn i');
        btnIcon.classList.add('fa-spin');
        loadAllData().then(() => {
            setTimeout(() => btnIcon.classList.remove('fa-spin'), 600);
        });
    });
}

// Authentication Logic against users.json
async function handleLogin() {
    const userInput = document.getElementById('username').value.trim();
    const passInput = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('login-error');

    errorBox.classList.add('hidden');

    try {
        const response = await fetch('data/users.json?t=' + Date.now());
        const data = await response.json();
        const foundUser = data.users.find(u => u.username.toLowerCase() === userInput.toLowerCase() && u.password === passInput);

        if (!foundUser) {
            showLoginError('Usuario o contraseña incorrectos.');
            return;
        }

        // Check Account Status
        if (foundUser.status === 'banned') {
            showLoginError('TU CUENTA HA SIDO BANEADA PERMANENTEMENTE.');
            return;
        }

        if (foundUser.status === 'suspended') {
            showLoginError(`CUENTA SUSPENDIDA. Razon: ${foundUser.suspendReason || 'Infraccion de normas'}`);
            return;
        }

        // Login Success
        currentUser = foundUser;
        localStorage.setItem('eufonia_user', JSON.stringify(currentUser));
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('login-form').reset();
        
        initApp();

    } catch (err) {
        console.error('Error al conectar con la BD de usuarios:', err);
        showLoginError('Error de servidor al validar credenciales.');
    }
}

function showLoginError(msg) {
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

// Update Interface based on login status
function updateUIState() {
    const loginBtn = document.getElementById('login-open-btn');
    const profileBar = document.getElementById('user-profile-bar');
    const alertBox = document.getElementById('event-access-alert');

    if (currentUser) {
        loginBtn.classList.add('hidden');
        profileBar.classList.remove('hidden');
        document.getElementById('user-name').textContent = currentUser.username;
        document.getElementById('user-role').textContent = currentUser.role || 'Jugador';
        document.getElementById('user-avatar').src = `https://mc-heads.net/avatar/${currentUser.username}/40`;

        // Check if current user is banned/suspended live
        if (currentUser.status === 'banned' || currentUser.status === 'suspended') {
            alertBox.classList.remove('hidden');
            document.getElementById('alert-title').textContent = `CUENTA ${currentUser.status.toUpperCase()}`;
            document.getElementById('alert-message').textContent = `Tu cuenta no puede participar en eventos. Si crees que es un error, contáctanos.`;
        } else {
            alertBox.classList.add('hidden');
        }
    } else {
        loginBtn.classList.remove('hidden');
        profileBar.classList.add('hidden');
        
        // Default guest alert
        alertBox.classList.remove('hidden');
        document.getElementById('alert-title').textContent = 'Sesión Requerida';
        document.getElementById('alert-message').textContent = 'Inicia sesión con tu cuenta de Eufonia Client para sincronizar tus instancias y eventos autorizados.';
    }
}

// Fetch and render JSON Data
async function loadAllData() {
    await Promise.all([
        loadNotifications(),
        loadEvents()
    ]);
}

async function loadNotifications() {
    try {
        const res = await fetch('data/notifications.json?t=' + Date.now());
        const data = await res.json();
        const container = document.getElementById('notif-feed');
        container.innerHTML = '';

        document.getElementById('notif-count').textContent = data.notifications.length;

        data.notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notif-item ${notif.type || ''}`;
            item.innerHTML = `
                <div class="notif-header">
                    <span>${notif.author || 'Sistema'}</span>
                    <span>${notif.date}</span>
                </div>
                <div class="notif-title">${notif.title}</div>
                <div class="notif-msg">${notif.message}</div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error('Error al cargar notificaciones:', e);
    }
}

async function loadEvents() {
    const grid = document.getElementById('events-grid');
    const alertBox = document.getElementById('event-access-alert');

    if (!currentUser || currentUser.status !== 'active') {
        grid.innerHTML = '';
        return;
    }

    try {
        const res = await fetch('data/events.json?t=' + Date.now());
        const data = await res.json();
        grid.innerHTML = '';

        // Filter events assigned to current user
        const userEvents = data.events.filter(ev => currentUser.allowedEvents.includes(ev.id));

        if (userEvents.length === 0) {
            alertBox.classList.remove('hidden');
            document.getElementById('alert-title').textContent = 'Sin Eventos Asignados';
            document.getElementById('alert-message').textContent = 'No hay eventos autorizados para tu cuenta en este momento. Si crees que es un error, comunícate en Discord.';
            return;
        } else {
            alertBox.classList.add('hidden');
        }

        userEvents.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <div class="event-cover" style="background-image: url('${ev.coverImage}')">
                    <span class="event-status-tag" style="color: ${ev.availability === 'Disponible' ? '#00ff88' : '#ffbe00'}">${ev.availability}</span>
                </div>
                <div class="event-body">
                    <div class="event-title">${ev.title}</div>
                    <div class="event-date"><i class="fa-solid fa-calendar"></i> ${ev.date}</div>
                    <div class="event-desc">${ev.description}</div>
                    <a href="${ev.detailPage}" class="mcc-btn mcc-btn-gold mcc-btn-block">
                        <i class="fa-solid fa-download"></i> Entrar a Instancia
                    </a>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (e) {
        console.error('Error al cargar eventos:', e);
    }
}