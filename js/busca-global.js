// ============================================
// BUSCA GLOBAL (leads e clientes em qualquer etapa)
// ============================================
function inicializarBuscaGlobal() {
    const input = document.getElementById('globalSearchInput');
    if (!input) return;

    input.addEventListener('input', () => renderizarBuscaGlobal(input.value));
    input.addEventListener('focus', () => renderizarBuscaGlobal(input.value));

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.global-search-wrap')) {
            const results = document.getElementById('globalSearchResults');
            if (results) results.style.display = 'none';
        }
    });
}

function renderizarBuscaGlobal(termo) {
    const resultsEl = document.getElementById('globalSearchResults');
    if (!resultsEl) return;

    const q = termo.trim().toLowerCase();
    if (!q) {
        resultsEl.style.display = 'none';
        resultsEl.innerHTML = '';
        return;
    }

    const leadsVisiveis = getLeadsVisiveis();
    const encontrados = leadsVisiveis.filter(l =>
        (l.empresa || '').toLowerCase().includes(q) ||
        (l.codigoUnico || '').toLowerCase().includes(q) ||
        (l.cnpj || '').toLowerCase().includes(q) ||
        (l.telefone || '').toLowerCase().includes(q) ||
        (l.whatsapp || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.decisor || '').toLowerCase().includes(q)
    ).slice(0, 8);

    if (encontrados.length === 0) {
        resultsEl.innerHTML = `<div class="global-search-empty">Nenhum resultado para "${termo}"</div>`;
        resultsEl.style.display = 'block';
        return;
    }

    resultsEl.innerHTML = encontrados.map(l => {
        const etapaInfo = ETAPAS.find(e => e.id === l.etapa);
        return `
            <div class="global-search-item" onclick="selecionarBuscaGlobal('${l.id}')">
                <span class="etapa-dot" style="background:${etapaInfo ? etapaInfo.cor : '#8a9bb0'};"></span>
                <div>
                    <strong>${l.empresa}</strong>
                    <div class="text-xs text-muted">${ETAPA_NOMES[l.etapa] || l.etapa} • ${l.decisor || '—'}</div>
                </div>
            </div>
        `;
    }).join('');
    resultsEl.style.display = 'block';
}

function selecionarBuscaGlobal(leadId) {
    document.getElementById('globalSearchResults').style.display = 'none';
    document.getElementById('globalSearchInput').value = '';
    abrirModalCliente(leadId);
}
