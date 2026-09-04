// ============================================
// ÍCONES (SVG em linha, sem dependência externa)
// ============================================
const ICONES = {
    dashboard: '<rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>',
    pipeline: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="9.5" y="3" width="5" height="11" rx="1"/><rect x="16" y="3" width="5" height="14" rx="1"/>',
    marketing: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>',
    whatsapp: '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/>',
    coletor: '<path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 3h4"/><path d="M14 3h4"/><path d="M6 7h4"/><path d="M14 7h4"/>',
    calendario: '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="9" x2="21" y2="9"/>',
    comunicacao: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
    clientes: '<circle cx="9" cy="8" r="3.2"/><path d="M3.3 20a5.7 5.7 0 0 1 11.4 0"/><circle cx="17.5" cy="9.5" r="2.4"/><path d="M15 14.3a4.6 4.6 0 0 1 6.2 4.3"/>',
    relatorios: '<polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/>',
    historico: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    importar: '<path d="M12 3v10"/><polyline points="8 9 12 13 16 9"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    perdidos: '<polyline points="3 7 9 13 13 9 21 18"/><polyline points="21 12 21 18 15 18"/>',
    exportar: '<path d="M12 13V3"/><polyline points="8 7 12 3 16 7"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    admin: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/>',
    valor: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M15 9.8c0-1.5-1.3-2.6-3-2.6s-3 1-3 2.3c0 3 6 1.4 6 4.4 0 1.4-1.3 2.4-3 2.4s-3-1.1-3-2.4"/>',
    lembrete: '<circle cx="12" cy="12" r="9"/><polyline points="8 12.5 10.5 15 16 9"/>',
    excluir: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    nota: '<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
    perfil: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    telefone: '<path d="M5.5 4h3.6l1.6 4.4-2.1 1.7a11.4 11.4 0 0 0 5.3 5.3l1.7-2.1 4.4 1.6v3.6a1.7 1.7 0 0 1-1.8 1.7A16.5 16.5 0 0 1 3.8 5.8 1.7 1.7 0 0 1 5.5 4z"/>',
    site: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/>',
    camera: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.6"/><path d="M8 6l1.4-2h5.2L16 6"/>',
    link: '<path d="M9.5 14.5a4 4 0 0 0 5.7 0l2-2a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14.5 9.5a4 4 0 0 0-5.7 0l-2 2a4 4 0 0 0 5.7 5.7l1-1"/>',
    atualizar: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><polyline points="21 3 21 8 16 8"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="3 21 3 16 8 16"/>',
    trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5a3 3 0 0 0 3 5"/><path d="M16 5h3a3 3 0 0 1-3 5"/><line x1="12" y1="13" x2="12" y2="17"/><path d="M8 20h8"/><path d="M9 20v-3h6v3"/>',
    mapa: '<polygon points="3 5 9 3 15 5 21 3 21 19 15 21 9 19 3 21"/><line x1="9" y1="3" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="21"/>',
    maleta: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="13" x2="21" y2="13"/>',
    jornal: '<path d="M4 4h13v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v11a2 2 0 0 1-2 2"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="11" x2="14" y2="11"/><line x1="7" y1="14" x2="11" y2="14"/>',
    estrela: '<polygon points="12 2.5 15 9 22 10 17 15 18.3 21.5 12 18.3 5.7 21.5 7 15 2 10 9 9"/>',
    predio: '<rect x="4" y="3" width="16" height="18" rx="1"/><line x1="8" y1="7" x2="8" y2="7.01"/><line x1="12" y1="7" x2="12" y2="7.01"/><line x1="16" y1="7" x2="16" y2="7.01"/><line x1="8" y1="11" x2="8" y2="11.01"/><line x1="12" y1="11" x2="12" y2="11.01"/><line x1="16" y1="11" x2="16" y2="11.01"/><line x1="8" y1="15" x2="8" y2="15.01"/><line x1="16" y1="15" x2="16" y2="15.01"/><path d="M10 21v-4h4v4"/>',
    alerta: '<path d="M12 3.5 22 20H2z"/><line x1="12" y1="9.5" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/>',
    olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    ocultar: '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.6 10.6 0 0 1 22 12s-1.1 2.2-3.2 4"/><path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    caixa: '<path d="M21 8L12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><line x1="12" y1="13" x2="12" y2="21"/>',
    tema: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    busca: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.01"/>'
};

function svgIcone(nome) {
    const conteudo = ICONES[nome];
    if (!conteudo) return '';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${conteudo}</svg>`;
}

function aplicarIcones(raiz) {
    raiz.querySelectorAll('[data-icone]').forEach(el => {
        el.innerHTML = svgIcone(el.getAttribute('data-icone'));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    aplicarIcones(document);

    // O resto do sistema re-renderiza tabelas/listas via innerHTML depois do
    // carregamento inicial (Pipeline, Coletor, Clientes, etc.) — este observer
    // garante que os ícones apareçam em qualquer conteúdo inserido depois.
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.hasAttribute('data-icone')) {
                    node.innerHTML = svgIcone(node.getAttribute('data-icone'));
                }
                aplicarIcones(node);
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
