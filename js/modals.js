// ============================================
// MODAIS
// ============================================
function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('open');
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
}

function fecharTodosModais() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
}

function mostrarGuiaConfig() {
    abrirModal('configModal');
}
