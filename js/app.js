// ZyrIsland Client App Engine
let currentUser = null;
let autoRefreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    const storedUser = localStorage.getItem('zyrisland_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }

    updateUIState();
    loadAllData();

    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        console.log('[ZyrIsland Sync] Sincronizando datos JSON...');
        loadAllData();
    }, 30000);
}

function setupEventListeners() {
    // Notification Drawer Toggle
    const notifBtn = document.getElementById('notif-toggle-btn');
    const drawer = document.getElementById('notification-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');

    if (notifBtn && drawer) {
        notifBtn.addEventListener('click', () => {
            drawer.classList.toggle('hidden');
        });
    }

    if (closeDrawerBtn && drawer) {
        closeDrawerBtn.addEventListener('click', () => {
            drawer.classList.add('hidden');
        });
    }

    // Modal
    document.getElementById('login-open-btn').addEventListener('click', () => {
        document.getElementById('login-modal').classList.remove('hidden');
    });

    document.getElementById('modal-close-btn').addEventListener('click', () => {
        document.getElementById('login-modal').classList.add('hidden');
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('zyrisland_user');
        initApp();
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
        const btnIcon = document.querySelector('#refresh-btn i');
        btnIcon.classList.add('fa-spin');
        loadAllData().then(() => {
            setTimeout(() => btnIcon.classList.remove('fa-spin'), 600);
        });
    });
}

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
            showLoginError('Credenciales incorrectas en ZyrIsland System.');
            return;
        }

        if (foundUser.status === 'banned') {
            showLoginError('CUENTA BANEADA PERMANENTEMENTE.');
            return;
        }

        if (foundUser.status === 'suspended') {
            showLoginError(`CUENTA SUSPENDIDA. Razón: ${foundUser.suspendReason || 'Infracción'}`);
            return;
        }

        currentUser = foundUser;
        localStorage.setItem('zyrisland_user', JSON.stringify(currentUser));
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('login-form').reset();
        
        initApp();

    } catch (err) {
        console.error('Error al conectar con users.json:', err);
        showLoginError('Error al validar credenciales.');
    }
}

function showLoginError(msg) {
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

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

        if (currentUser.status === 'banned' || currentUser.status === 'suspended') {
            alertBox.classList.remove('hidden');
            document.getElementById('alert-title').textContent = `ESTADO: CUENTA ${currentUser.status.toUpperCase()}`;
            document.getElementById('alert-message').textContent = `Tu cuenta no tiene autorización para ingresar a instancias.`;
        } else {
            alertBox.classList.add('hidden');
        }
    } else {
        loginBtn.classList.remove('hidden');
        profileBar.classList.add('hidden');
        
        alertBox.classList.remove('hidden');
        document.getElementById('alert-title').textContent = 'Acceso Restringido';
        document.getElementById('alert-message').textContent = 'Inicia sesión con tu cuenta de ZyrIsland Client para sincronizar tus instancias y eventos autorizados.';
    }
}

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
                    <span>${notif.author || 'ZyrIsland'}</span>
                    <span>${notif.date}</span>
                </div>
                <div class="notif-title">${notif.title}</div>
                <div class="notif-msg">${notif.message}</div>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error('Error cargando notificaciones:', e);
    }
}

async function loadEvents() {
    const grid = document.getElementById('events-grid');
    const alertBox = document.getElementById('event-access-alert');
    const heroCard = document.getElementById('featured-hero-card');
    const heroSideCard = document.getElementById('hero-side-card');

    if (!currentUser || currentUser.status !== 'active') {
        grid.innerHTML = '';
        return;
    }

    try {
        const res = await fetch('data/events.json?t=' + Date.now());
        const data = await res.json();
        grid.innerHTML = '';

        const userEvents = data.events.filter(ev => currentUser.allowedEvents.includes(ev.id));

        if (userEvents.length === 0) {
            alertBox.classList.remove('hidden');
            document.getElementById('alert-title').textContent = 'Sin Eventos Autorizados';
            document.getElementById('alert-message').textContent = 'No hay eventos asignados a tu cuenta de ZyrIsland Client. Comunícate en Discord si crees que es un error.';
            return;
        } else {
            alertBox.classList.add('hidden');
        }

        // Update Hero with first available user event
        const primaryEvent = userEvents[0];
        if (primaryEvent) {
            heroCard.style.backgroundImage = `url('${primaryEvent.banner || primaryEvent.coverImage}')`;
            document.getElementById('hero-title').textContent = primaryEvent.title;
            document.getElementById('hero-desc').textContent = primaryEvent.description;
            
            document.getElementById('side-card-title').textContent = primaryEvent.title;
            document.getElementById('side-card-desc').textContent = primaryEvent.description;
            document.getElementById('side-card-status').textContent = primaryEvent.availability.toUpperCase();
            document.getElementById('hero-action-btn').href = primaryEvent.detailPage;
        }

        // Populate Steam Cards Grid
        userEvents.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'steam-event-card';
            card.innerHTML = `
                <div class="card-image-box" style="background-image: url('${ev.coverImage}')">
                    <span class="card-badge-top">${ev.availability}</span>
                </div>
                <div class="card-info-box">
                    <div class="card-title">${ev.title}</div>
                    <div class="card-date"><i class="fa-solid fa-calendar"></i> ${ev.date}</div>
                    <div class="card-desc">${ev.description}</div>
                    <a href="${ev.detailPage}" class="steam-btn btn-orange btn-block">
                        <i class="fa-solid fa-download"></i> Assets
                    </a>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (e) {
        console.error('Error cargando eventos:', e);
    }
}