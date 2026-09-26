// ZyrIsland Web Asset & Launcher Controller
document.addEventListener('DOMContentLoaded', async () => {
    setupDownloadEngine();
});

function setupDownloadEngine() {
    const actionBtn = document.getElementById('start-download-btn');
    if (!actionBtn) return;

    const isElectron = (typeof require !== 'undefined');

    actionBtn.addEventListener('click', async () => {
        if (!isElectron) {
            alert('Para descargar instancias y lanzar Minecraft, debes usar ZyrIsland Client (.exe)');
            return;
        }

        const { ipcRenderer } = require('electron');

        const currentPath = window.location.pathname;
        let eventId = currentPath.includes('nether') ? 'nether-speedrun' : 'craftia-championship';

        const res = await fetch('../data/events.json?t=' + Date.now());
        const data = await res.json();
        const eventData = data.events.find(e => e.id === eventId) || data.events[0];

        ipcRenderer.send('install-and-launch-instance', {
            eventId: eventData.id,
            downloadUrl: eventData.downloadUrl,
            instanceFolder: eventData.instanceFolder,
            mcVersion: eventData.mcVersion,
            fabricVersion: eventData.fabricVersion
        });

        document.getElementById('initial-download-view').classList.add('hidden');
        document.getElementById('download-progress-view').classList.remove('hidden');
    });

    if (isElectron) {
        const { ipcRenderer } = require('electron');

        ipcRenderer.on('instance-progress', (event, data) => {
            const stepText = document.getElementById('status-step-text');
            const bar1Inner = document.getElementById('bar1-inner');
            const bar2Inner = document.getElementById('bar2-inner');
            const timerRemaining = document.getElementById('timer-remaining');

            stepText.innerHTML = `<i class="fa-solid fa-gear fa-spin"></i> ${data.message}`;
            bar1Inner.style.width = `${data.stepPercent}%`;
            bar2Inner.style.width = `${data.overallPercent}%`;
            timerRemaining.textContent = `${data.overallPercent}%`;

            if (data.status === 'completed') {
                document.getElementById('download-progress-view').classList.add('hidden');
                document.getElementById('download-success-view').classList.remove('hidden');
            }
        });
    }
}