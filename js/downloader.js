// ZyrIsland Asset Download Simulation Engine
document.addEventListener('DOMContentLoaded', () => {
    loadEventBackgroundFromJSON();
    setupDownloadEngine();
});

// Automatically set the background image of the card box based on events.json banner
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
        console.error('Error sincronizando fondo de evento desde JSON:', e);
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
    // Random total duration between 6 and 14 seconds
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
        { text: "Conectando con servidores de Eufonia Studio...", threshold: 0.10 },
        { text: "Verificando firmas de seguridad de ZyrIsland...", threshold: 0.25 },
        { text: "Cargando paquete de texturas e instancias...", threshold: 0.50 },
        { text: "Descargando ZyrIsland software & mods...", threshold: 0.80 },
        { text: "Verificando integridad del archivo .zip...", threshold: 0.95 },
        { text: "Finalizando desempaquetado...", threshold: 1.0 }
    ];

    let startTime = Date.now();
    let currentStepIndex = 0;

    // Fluid Update Loop using requestAnimationFrame
    function updateProgress() {
        const elapsedTime = Date.now() - startTime;
        let progressRatio = elapsedTime / totalDurationMs;

        if (progressRatio > 1) progressRatio = 1;

        // Add non-linear fluctuation to progress (realistic download spikes)
        let visualProgressRatio = progressRatio;
        if (progressRatio < 0.95) {
            visualProgressRatio += (Math.sin(elapsedTime / 200) * 0.015);
            if (visualProgressRatio < 0) visualProgressRatio = 0;
        }

        // Percentage calculations
        const overallPercent = Math.min(100, Math.floor(visualProgressRatio * 100));
        const remainingSeconds = Math.max(0, Math.ceil((totalDurationMs - elapsedTime) / 1000));

        // Update Bar 2 (Dynamic Download Progress)
        bar2Inner.style.width = `${overallPercent}%`;
        timerRemaining.textContent = remainingSeconds > 0 ? `${remainingSeconds}s restantes` : 'Completado';

        // Update Speed simulation (random float between 12.4 MB/s and 28.9 MB/s)
        const currentSpeed = (Math.random() * 16.5 + 12.4).toFixed(1);
        speedIndicator.textContent = remainingSeconds > 0 ? `${currentSpeed} MB/s` : '0.0 MB/s';

        // Update Steps & Bar 1 (Status Phase Progress)
        if (currentStepIndex < downloadSteps.length) {
            statusStepText.innerHTML = `<i class="fa-solid fa-gear fa-spin"></i> ${downloadSteps[currentStepIndex].text}`;
            
            if (progressRatio >= downloadSteps[currentStepIndex].threshold) {
                currentStepIndex++;
            }
        }

        // Bar 1 Progress mapped to completed steps
        const stepPercent = Math.floor((currentStepIndex / downloadSteps.length) * 100);
        bar1Inner.style.width = `${stepPercent}%`;
        bar1Percent.textContent = `${stepPercent}%`;

        if (progressRatio < 1) {
            requestAnimationFrame(updateProgress);
        } else {
            // Finish Download
            setTimeout(() => {
                document.getElementById('download-progress-view').classList.add('hidden');
                document.getElementById('download-success-view').classList.remove('hidden');
                triggerAutomaticZipDownload();
            }, 500);
        }
    }

    requestAnimationFrame(updateProgress);
}

// Generates an actual downloadable mock file on completion
function triggerAutomaticZipDownload() {
    const dummyContent = "ZyrIsland Client - Eufonia Studio Asset Pack File";
    const blob = new Blob([dummyContent], { type: 'application/zip' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "ZyrIsland_Assets_Package.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}