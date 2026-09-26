// ZyrIsland Web Asset Controller
document.addEventListener('DOMContentLoaded', async () => {
    setupDownloadEngine();
});

function setupDownloadEngine() {
    const actionBtn = document.getElementById('start-download-btn');
    if (!actionBtn) return;

    actionBtn.addEventListener('click', async () => {
        alert('Instancia descargada. Inicia tu cliente ZyrIsland para ejecutar la sesión.');
    });
}