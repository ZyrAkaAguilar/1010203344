// ZyrIsland Asset Download Engine
document.addEventListener('DOMContentLoaded', () => {
    loadEventBackgroundFromJSON();
    setupDownloadEngine();
});

async function loadEventBackgroundFromJSON() {
    const cardBox = document.getElementById('event-card-box');
    const currentPath = window.location.pathname;
    
    try {
        const res = await fetch('../data/events.json?t=' + Date.now());
        const data = await res.json();
        
        let matchEvent = data.events.find(ev => currentPath.includes(ev.id));
        if (!matchEvent && data.events.length > 0) {
            matchEvent = data.events[0];
        }

        if (matchEvent && matchEvent.banner) {
            cardBox.style.backgroundImage = `url('${matchEvent.banner}')`;
        }
    } catch (e) {
        console.error('Error sincronizando fondo de evento:', e);
    }
}

function setupDownloadEngine() {
    const startBtn = document.getElementById('start-download-btn');
    if (!startBtn) return;

    startBtn.addEventListener('click', () => {
        document.getElementById('initial-download-view').classList.add('hidden');
        document.getElementById('download-progress-view').classList.remove('hidden');

        startRealisticDownloadProcess();
    });
}

function startRealisticDownloadProcess() {
    const minSeconds = 6;
    const maxSeconds = 14;
    const totalDurationMs = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;

    const statusStepText = document.getElementById('status-step-text');
    const speedIndicator = document.getElementById('speed-indicator');
    const timerRemaining = document.getElementById('timer-remaining');
    const bar1Inner = document.getElementById('bar1-inner');
    const bar2Inner = document.getElementById('bar2-inner');
    const bar1Percent = document.getElementById('bar1-percent');

    const downloadSteps = [
        { text: "Cargando paquete... / ZyrIsland software...", threshold: 0.15 },
        { text: "Conectando con servidores de ZyrIsland...", threshold: 0.35 },
        { text: "Cargando modpacks y texturas...", threshold: 0.60 },
        { text: "Verificando firmas de seguridad...", threshold: 0.85 },
        { text: "Desempaquetando archivos .zip...", threshold: 1.0 }
    ];

    let startTime = Date.now();
    let currentStepIndex = 0;

    function updateProgress() {
        const elapsedTime = Date.now() - startTime;
        let progressRatio = elapsedTime / totalDurationMs;

        if (progressRatio > 1) progressRatio = 1;

        let visualProgressRatio = progressRatio;
        if (progressRatio < 0.95) {
            visualProgressRatio += (Math.sin(elapsedTime / 200) * 0.015);
            if (visualProgressRatio < 0) visualProgressRatio = 0;
        }

        const overallPercent = Math.min(100, Math.floor(visualProgressRatio * 100));
        const remainingSeconds = Math.max(0, Math.ceil((totalDurationMs - elapsedTime) / 1000));

        bar2Inner.style.width = `${overallPercent}%`;
        timerRemaining.textContent = remainingSeconds > 0 ? `${remainingSeconds}s restantes` : 'Completado';

        const currentSpeed = (Math.random() * 16.5 + 12.4).toFixed(1);
        speedIndicator.textContent = remainingSeconds > 0 ? `${currentSpeed} MB/s` : '0.0 MB/s';

        if (currentStepIndex < downloadSteps.length) {
            statusStepText.innerHTML = `<i class="fa-solid fa-gear fa-spin"></i> ${downloadSteps[currentStepIndex].text}`;
            
            if (progressRatio >= downloadSteps[currentStepIndex].threshold) {
                currentStepIndex++;
            }
        }

        const stepPercent = Math.floor((currentStepIndex / downloadSteps.length) * 100);
        bar1Inner.style.width = `${stepPercent}%`;
        bar1Percent.textContent = `${stepPercent}%`;

        if (progressRatio < 1) {
            requestAnimationFrame(updateProgress);
        } else {
            setTimeout(() => {
                document.getElementById('download-progress-view').classList.add('hidden');
                document.getElementById('download-success-view').classList.remove('hidden');
                triggerAutomaticZipDownload();
            }, 500);
        }
    }

    requestAnimationFrame(updateProgress);
}

function triggerAutomaticZipDownload() {
    const dummyContent = "ZyrIsland Client Asset Pack Package File";
    const blob = new Blob([dummyContent], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "ZyrIsland_Assets_Package.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}