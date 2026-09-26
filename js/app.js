// ZyrIsland Client Controller
let currentUser = null;
let readNotificationIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    // Restore read notification state from localStorage
    const savedReadIds = localStorage.getItem('zyrisland_read_notifs');
    if (savedReadIds) {
        readNotificationIds = new Set(JSON.parse(savedReadIds));
    }

    currentUser = await SecurityManager.auditCurrentSession();
    
    initApp();
    setupEventListeners();
    setupNavigationTabs();
});

function initApp() {
    updateUIState();
    loadAllData();

    setInterval(async () => {
        if (currentUser) {
            currentUser = await SecurityManager.auditCurrentSession();
            updateUIState();
        }
        loadAllData();
    }, 30000);
}

function setupNavigationTabs() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const tabContents = document.querySelectorAll('.tab-content');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            if (!targetTab) return;

            menuItems.forEach(m => m.classList.remove('active'));
            tabContents.forEach(t => t.classList.add('hidden-tab'));

            item.classList.add('active');
            const target = document.getElementById(targetTab);
            target.classList.remove('hidden-tab');
        });
    });
}

function setupEventListeners() {
    const notifBtn = document.getElementById('notif-toggle-btn');
    const drawer = document.getElementById('notification-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const markAllBtn = document.getElementById('mark-all-read-btn');

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

    if (markAllBtn) {
        markAllBtn.addEventListener('click', () => {
            markAllNotificationsAsRead();
        });
    }

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
        SecurityManager.clearSession();
        currentUser = null;
        initApp();
    });

    document.getElementById('refresh-btn').addEventListener('click', async () => {
        const btnIcon = document.querySelector('#refresh-btn i');
        btnIcon.classList.add('fa-spin');
        if (currentUser) currentUser = await SecurityManager.auditCurrentSession();
        await loadAllData();
        setTimeout(() => btnIcon.classList.remove('fa-spin'), 600);
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
            showLoginError('Credenciales inválidas en ZyrIsland System.');
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
        
        initApp();

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
    const loginBtn = document.getElementById('login-open-btn');
    const profileBar = document.getElementById('user-profile-bar');
    const alertBox = document.getElementById('event-access-alert');

    if (currentUser) {
        loginBtn.classList.add('hidden');
        profileBar.classList.remove('hidden');
        document.getElementById('user-name').textContent = currentUser.username;
        document.getElementById('user-role').textContent = currentUser.role || 'Jugador';
        document.getElementById('user-avatar').src = `https://mc-heads.net/avatar/${currentUser.username}/40`;
        alertBox.classList.add('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        profileBar.classList.add('hidden');
        alertBox.classList.remove('hidden');
        document.getElementById('alert-title').textContent = 'Acceso Restringido';
        document.getElementById('alert-message').textContent = 'Inicia sesión con tu cuenta de ZyrIsland Client para autenticar tu cookie y ver tus instancias.';
    }
}

async function loadAllData() {
    await Promise.all([
        loadNotifications(),
        loadEventsAndLibrary(),
        loadCommunityGrid()
    ]);
}

// Unread Notifications Management
async function loadNotifications() {
    try {
        const res = await fetch('data/notifications.json?t=' + Date.now());
        const data = await res.json();
        const container = document.getElementById('notif-feed');
        const badge = document.getElementById('notif-count');
        container.innerHTML = '';

        let unreadCount = 0;

        data.notifications.forEach(notif => {
            const isRead = readNotificationIds.has(notif.id);
            if (!isRead) unreadCount++;

            const item = document.createElement('div');
            item.className = `notif-item ${isRead ? 'read-notif' : 'unread-notif'}`;
            item.innerHTML = `
                <div class="notif-header">
                    <span>${notif.author || 'ZyrIsland'}</span>
                    <span>${notif.date}</span>
                </div>
                <div class="notif-title">${notif.title}</div>
                <div class="notif-msg">${notif.message}</div>
            `;

            // Click item to mark as read
            item.addEventListener('click', () => {
                if (!readNotificationIds.has(notif.id)) {
                    readNotificationIds.add(notif.id);
                    saveReadNotifications();
                    loadNotifications();
                }
            });

            container.appendChild(item);
        });

        // Update Badge Count
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

    } catch (e) {
        console.error('Error cargando notificaciones:', e);
    }
}

function markAllNotificationsAsRead() {
    fetch('data/notifications.json?t=' + Date.now())
        .then(res => res.json())
        .then(data => {
            data.notifications.forEach(n => readNotificationIds.add(n.id));
            saveReadNotifications();
            loadNotifications();
        });
}

function saveReadNotifications() {
    localStorage.setItem('zyrisland_read_notifs', JSON.stringify(Array.from(readNotificationIds)));
}

async function loadEventsAndLibrary() {
    const inicioGrid = document.getElementById('events-grid-inicio');
    const libraryContainer = document.getElementById('library-events-container');

    inicioGrid.innerHTML = '';
    libraryContainer.innerHTML = '';

    if (!currentUser || currentUser.status !== 'active') {
        libraryContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px;">Debes iniciar sesión para ver tu Biblioteca de Eventos.</p>`;
        return;
    }

    try {
        const res = await fetch('data/events.json?t=' + Date.now());
        const data = await res.json();

        const userEvents = data.events.filter(ev => currentUser.allowedEvents.includes(ev.id));

        if (userEvents.length === 0) {
            libraryContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px;">No tienes instancias autorizadas actualmente.</p>`;
            return;
        }

        userEvents.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'steam-event-card hover-lift';
            card.innerHTML = `
                <div class="card-image-box" style="background-image: url('${ev.coverImage}')">
                    <span class="card-badge-top">${ev.availability}</span>
                </div>
                <div class="card-info-box">
                    <div class="card-title">${ev.title}</div>
                    <div class="card-date"><i class="fa-solid fa-calendar"></i> ${ev.date}</div>
                    <div class="card-desc">${ev.description}</div>
                    <a href="${ev.detailPage}" class="steam-btn btn-orange btn-block">
                        <i class="fa-solid fa-download"></i> Descargar Assets
                    </a>
                </div>
            `;
            inicioGrid.appendChild(card);

            const libItem = document.createElement('div');
            libItem.className = 'library-item-card';
            libItem.innerHTML = `
                <div class="library-item-img" style="background-image: url('${ev.coverImage}')"></div>
                <div class="library-item-details">
                    <h3>${ev.title}</h3>
                    <p>${ev.description}</p>
                    <span style="font-size: 0.8rem; color: var(--steam-orange);"><i class="fa-solid fa-calendar"></i> ${ev.date}</span>
                </div>
                <div>
                    <a href="${ev.detailPage}" class="steam-btn btn-orange hover-bounce">
                        <i class="fa-solid fa-download"></i> Acceder a Instancia
                    </a>
                </div>
            `;
            libraryContainer.appendChild(libItem);
        });

    } catch (e) {
        console.error('Error cargando eventos:', e);
    }
}

async function loadCommunityGrid() {
    const grid = document.getElementById('community-users-grid');
    if (!grid) return;

    try {
        const res = await fetch('data/users.json?t=' + Date.now());
        const data = await res.json();
        grid.innerHTML = '';

        data.users.forEach(u => {
            let roleClass = 'role-player';
            if (u.role.toLowerCase().includes('admin') || u.role.toLowerCase().includes('oficial')) roleClass = 'role-admin';
            if (u.role.toLowerCase().includes('vip') || u.role.toLowerCase().includes('streamer')) roleClass = 'role-vip';
            if (u.status === 'banned' || u.status === 'suspended') roleClass = 'role-banned';

            const userCard = document.createElement('div');
            userCard.className = 'user-card hover-lift';
            userCard.innerHTML = `
                <img src="https://mc-heads.net/avatar/${u.username}/50" alt="${u.username}" class="user-head-avatar">
                <div class="user-card-info">
                    <h4>${u.username}</h4>
                    <span class="role-badge ${roleClass}">${u.status === 'active' ? u.role : u.status.toUpperCase()}</span>
                </div>
            `;
            grid.appendChild(userCard);
        });

    } catch (e) {
        console.error('Error cargando la comunidad:', e);
    }
}