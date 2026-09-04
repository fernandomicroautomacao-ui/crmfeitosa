// ============================================
// METAS MENSAIS (VENDAS E ORÇAMENTO)
// ============================================
function anoMesKey(ano, mes) {
    return `${ano}-${String(mes).padStart(2, '0')}`;
}

function getMetaMes(anoMes) {
    return metas[anoMes] || { vendas: 0, orcamento: 0 };
}

function valorRealizadoMesEmLeads(leadsBase, anoMes, categoria) {
    let total = 0;
    leadsBase.forEach(l => {
        if (categoria === 'vendas') {
            if (l.pedidos && l.pedidos.length > 0) {
                l.pedidos.forEach(p => {
                    if ((p.data || '').startsWith(anoMes)) total += p.valor || 0;
                });
            } else if (l.etapa === 'pedido') {
                const d = getDataFechamentoPedido(l);
                if (d && d.startsWith(anoMes)) total += l.valor || 0;
            }
        } else if (categoria === 'orcamento') {
            const gerouNoMes = (l.historico || []).some(h => h.tipo === 'Orçamento' && h.data && h.data.startsWith(anoMes));
            if (gerouNoMes) {
                total += l.valor || 0;
            } else if (l.etapa === 'orcamento' && (l.dataCriacao || '').startsWith(anoMes)) {
                total += l.valor || 0;
            }
        }
    });
    return total;
}

function valorRealizadoMes(anoMes, categoria) {
    return valorRealizadoMesEmLeads(getLeadsVisiveis(), anoMes, categoria);
}

function valorRealizadoMesUsuario(anoMes, categoria, usuarioId) {
    return valorRealizadoMesEmLeads(leads.filter(l => l.usuarioId === usuarioId), anoMes, categoria);
}

// ============================================
// METAS INDIVIDUAIS POR VENDEDOR
// ============================================
function getMetaVendedorMes(anoMes, usuarioId) {
    const m = metas[anoMes];
    return (m && m.vendedores && m.vendedores[usuarioId]) || { vendas: 0, orcamento: 0 };
}

function getMetasVendedorAgregadas(inicio, fim, usuarioId, categoria) {
    let total = 0;
    let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (d <= fimMes) {
        const anoMes = anoMesKey(d.getFullYear(), d.getMonth() + 1);
        total += getMetaVendedorMes(anoMes, usuarioId)[categoria] || 0;
        d.setMonth(d.getMonth() + 1);
    }
    return total;
}

function getMetasAgregadas(inicio, fim, categoria) {
    if (!inicio) return 0;
    let total = 0;
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    while (cursor <= fim) {
        const key = anoMesKey(cursor.getFullYear(), cursor.getMonth() + 1);
        total += (metas[key] && metas[key][categoria]) || 0;
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return total;
}

// ============================================
// META ANUAL COM DISTRIBUIÇÃO AUTOMÁTICA
// ============================================
function calcularPesosSazonais(mesesAlvo, categoria) {
    const anoAtual = new Date().getFullYear();
    const totalPorMes = {};
    mesesAlvo.forEach(m => totalPorMes[m] = 0);

    for (let anoHist = anoAtual - 3; anoHist < anoAtual; anoHist++) {
        mesesAlvo.forEach(m => {
            totalPorMes[m] += valorRealizadoMes(anoMesKey(anoHist, m), categoria);
        });
    }

    const soma = Object.values(totalPorMes).reduce((a, b) => a + b, 0);
    const pesos = {};
    if (soma <= 0) {
        mesesAlvo.forEach(m => pesos[m] = 1 / mesesAlvo.length);
    } else {
        mesesAlvo.forEach(m => pesos[m] = totalPorMes[m] / soma);
    }
    return pesos;
}

function distribuirMetaAnual() {
    const ano = parseInt(document.getElementById('metaAnoSelect').value) || new Date().getFullYear();
    const metaAnualVendas = parseFloat(document.getElementById('metaAnualVendas').value) || 0;
    const metaAnualOrcamento = parseFloat(document.getElementById('metaAnualOrcamento').value) || 0;

    if (!metaAnualVendas && !metaAnualOrcamento) {
        showToast('Informe ao menos uma meta anual para distribuir.', 'error');
        return;
    }

    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    const mesInicial = ano === anoAtual ? mesAtual : (ano > anoAtual ? 1 : 13);

    const mesesRestantes = [];
    for (let m = mesInicial; m <= 12; m++) mesesRestantes.push(m);

    if (mesesRestantes.length === 0) {
        showToast('Esse ano já terminou — não há meses restantes para distribuir.', 'warning');
        return;
    }

    let vendasJaRealizadas = 0;
    let orcamentoJaRealizado = 0;
    for (let m = 1; m < mesInicial; m++) {
        vendasJaRealizadas += valorRealizadoMes(anoMesKey(ano, m), 'vendas');
        orcamentoJaRealizado += valorRealizadoMes(anoMesKey(ano, m), 'orcamento');
    }

    const restanteVendas = Math.max(metaAnualVendas - vendasJaRealizadas, 0);
    const restanteOrcamento = Math.max(metaAnualOrcamento - orcamentoJaRealizado, 0);

    const pesosVendas = calcularPesosSazonais(mesesRestantes, 'vendas');
    const pesosOrcamento = calcularPesosSazonais(mesesRestantes, 'orcamento');

    mesesRestantes.forEach(m => {
        const anoMes = anoMesKey(ano, m);
        if (metaAnualVendas) {
            const inputVendas = document.querySelector(`#metasTableBody .meta-input[data-anomes="${anoMes}"][data-cat="vendas"]`);
            if (inputVendas) inputVendas.value = Math.round(restanteVendas * pesosVendas[m]);
        }
        if (metaAnualOrcamento) {
            const inputOrcamento = document.querySelector(`#metasTableBody .meta-input[data-anomes="${anoMes}"][data-cat="orcamento"]`);
            if (inputOrcamento) inputOrcamento.value = Math.round(restanteOrcamento * pesosOrcamento[m]);
        }
    });

    showToast(`Meta distribuída em ${mesesRestantes.length} mês(es) restante(s)! Revise e clique em "Salvar Alterações".`);
}

function popularAnoMetas() {
    const select = document.getElementById('metaAnoSelect');
    if (!select) return;
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let a = anoAtual - 1; a <= anoAtual + 1; a++) anos.push(a);
    select.innerHTML = anos.map(a => `<option value="${a}" ${a === anoAtual ? 'selected' : ''}>${a}</option>`).join('');
}

function renderizarMetasAdmin() {
    const tbody = document.getElementById('metasTableBody');
    if (!tbody) return;
    const ano = parseInt(document.getElementById('metaAnoSelect').value) || new Date().getFullYear();

    tbody.innerHTML = MESES_ABREV.map((mesNome, i) => {
        const mes = i + 1;
        const anoMes = anoMesKey(ano, mes);
        const metaMes = getMetaMes(anoMes);
        const realizadoVendas = valorRealizadoMes(anoMes, 'vendas');
        const realizadoOrcamento = valorRealizadoMes(anoMes, 'orcamento');
        const pctVendas = metaMes.vendas > 0 ? Math.round((realizadoVendas / metaMes.vendas) * 100) : 0;
        const pctOrcamento = metaMes.orcamento > 0 ? Math.round((realizadoOrcamento / metaMes.orcamento) * 100) : 0;

        return `
        <tr>
            <td><strong>${mesNome}/${ano}</strong></td>
            <td><input type="number" class="meta-input" data-anomes="${anoMes}" data-cat="vendas" step="0.01" min="0" value="${metaMes.vendas || ''}" placeholder="0"></td>
            <td>${formatarMoeda(realizadoVendas)}</td>
            <td><span class="meta-pct ${pctVendas >= 100 ? 'ok' : 'warn'}">${metaMes.vendas > 0 ? pctVendas + '%' : '—'}</span></td>
            <td><input type="number" class="meta-input" data-anomes="${anoMes}" data-cat="orcamento" step="0.01" min="0" value="${metaMes.orcamento || ''}" placeholder="0"></td>
            <td>${formatarMoeda(realizadoOrcamento)}</td>
            <td><span class="meta-pct ${pctOrcamento >= 100 ? 'ok' : 'warn'}">${metaMes.orcamento > 0 ? pctOrcamento + '%' : '—'}</span></td>
        </tr>
        `;
    }).join('');
}

function salvarTodasMetas() {
    document.querySelectorAll('#metasTableBody .meta-input').forEach(input => {
        const anoMes = input.dataset.anomes;
        const cat = input.dataset.cat;
        const valor = parseFloat(input.value) || 0;
        if (!metas[anoMes]) metas[anoMes] = { vendas: 0, orcamento: 0 };
        metas[anoMes][cat] = valor;
    });
    salvarDados();
    renderizarMetasAdmin();
    renderizarRelatorios();
    showToast('Metas salvas com sucesso!');
}

// ============================================
// ADMIN: METAS INDIVIDUAIS POR VENDEDOR
// ============================================
function popularMesMetasVendedor() {
    const select = document.getElementById('metaVendedorMesSelect');
    if (!select) return;
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    if (select.dataset.populated === '1') return;
    select.innerHTML = MESES_ABREV.map((nome, i) => {
        const mes = i + 1;
        return `<option value="${anoMesKey(anoAtual, mes)}" ${mes === mesAtual ? 'selected' : ''}>${nome}/${anoAtual}</option>`;
    }).join('');
    select.dataset.populated = '1';
}

function renderizarMetasVendedores() {
    const tbody = document.getElementById('metasVendedorTableBody');
    const select = document.getElementById('metaVendedorMesSelect');
    if (!tbody || !select) return;
    const anoMes = select.value || getMesAtual();

    const vendedores = usuarios.filter(u => u.papel === 'vendedor');
    if (vendedores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state compact"><span class="emoji-big"><span data-icone="trofeu"></span></span><p class="text-sm">Nenhum vendedor cadastrado</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = vendedores.map(v => {
        const metaV = getMetaVendedorMes(anoMes, v.id);
        const realizadoVendas = valorRealizadoMesUsuario(anoMes, 'vendas', v.id);
        const realizadoOrcamento = valorRealizadoMesUsuario(anoMes, 'orcamento', v.id);
        const pctVendas = metaV.vendas > 0 ? Math.round((realizadoVendas / metaV.vendas) * 100) : 0;
        const pctOrcamento = metaV.orcamento > 0 ? Math.round((realizadoOrcamento / metaV.orcamento) * 100) : 0;

        return `
        <tr>
            <td><strong>${v.nome}</strong></td>
            <td><input type="number" class="meta-input" data-usuario="${v.id}" data-cat="vendas" step="0.01" min="0" value="${metaV.vendas || ''}" placeholder="0"></td>
            <td>${formatarMoeda(realizadoVendas)}</td>
            <td><span class="meta-pct ${pctVendas >= 100 ? 'ok' : 'warn'}">${metaV.vendas > 0 ? pctVendas + '%' : '—'}</span></td>
            <td><input type="number" class="meta-input" data-usuario="${v.id}" data-cat="orcamento" step="0.01" min="0" value="${metaV.orcamento || ''}" placeholder="0"></td>
            <td>${formatarMoeda(realizadoOrcamento)}</td>
            <td><span class="meta-pct ${pctOrcamento >= 100 ? 'ok' : 'warn'}">${metaV.orcamento > 0 ? pctOrcamento + '%' : '—'}</span></td>
        </tr>
        `;
    }).join('');
}

function salvarMetasVendedores() {
    const select = document.getElementById('metaVendedorMesSelect');
    const anoMes = select.value;
    if (!metas[anoMes]) metas[anoMes] = { vendas: 0, orcamento: 0 };
    if (!metas[anoMes].vendedores) metas[anoMes].vendedores = {};

    document.querySelectorAll('#metasVendedorTableBody .meta-input').forEach(input => {
        const usuarioId = input.dataset.usuario;
        const cat = input.dataset.cat;
        const valor = parseFloat(input.value) || 0;
        if (!metas[anoMes].vendedores[usuarioId]) metas[anoMes].vendedores[usuarioId] = { vendas: 0, orcamento: 0 };
        metas[anoMes].vendedores[usuarioId][cat] = valor;
    });

    salvarDados();
    renderizarMetasVendedores();
    renderizarRelatorios();
    showToast('Metas por vendedor salvas com sucesso!');
}
