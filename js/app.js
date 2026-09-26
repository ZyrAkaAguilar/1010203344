// ZyrIsland Eufonia Client Controller
let activeInstance = null;
let allEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
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

async function loadInstances() {
    try {
        const baseUrl = typeof ZYRISLAND_CONFIG !== 'undefined' ? ZYRISLAND_CONFIG.REMOTE_DATA_URL : './data';
        const res = await fetch(`${baseUrl}/events.json?t=${Date.now()}`);
        const data = await res.json();
        allEvents = data.events;

        renderSidebarIcons();
        if (allEvents.length > 0) selectInstance(allEvents[0]);
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

function selectInstance(eventData) {
    activeInstance = eventData;

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