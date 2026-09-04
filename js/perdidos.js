// ============================================
// EXCLUSÃO DE CARDS (PERDIDOS)
// ============================================
function abrirModalMotivo(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (lead.etapa === 'pedido' || lead.cliente === true || lead.dataPedido) {
        showToast('Pedidos não podem ser excluídos. Registre o cancelamento ou devolução no histórico.', 'error');
        return;
    }
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não pode excluir este card.', 'error');
        return;
    }
    document.getElementById('motivoLeadId').value = leadId;
    document.getElementById('motivoEmpresaNome').textContent = lead.empresa;
    document.getElementById('motivoSelect').value = 'Perdido por preço';
    document.getElementById('motivoDetalhe').value = '';
    document.getElementById('motivoOutroWrap').style.display = 'none';
    abrirModal('motivoModal');
}

function confirmarExclusaoLead(event) {
    event.preventDefault();
    const leadId = document.getElementById('motivoLeadId').value;
    const index = leads.findIndex(l => l.id === leadId);
    if (index === -1) return;

    const lead = leads[index];
    if (lead.etapa === 'pedido' || lead.cliente === true || lead.dataPedido) {
        showToast('Pedidos não podem ser excluídos. Registre o cancelamento ou devolução no histórico.', 'error');
        return;
    }
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não pode excluir este card.', 'error');
        return;
    }

    const motivoSel = document.getElementById('motivoSelect').value;
    const motivoDetalhe = document.getElementById('motivoDetalhe').value.trim();

    perdidos.unshift({
        ...lead,
        etapaOrigem: lead.etapa,
        motivo: motivoSel,
        motivoDetalhe,
        dataExclusao: new Date().toISOString(),
        usuarioId: lead.usuarioId
    });

    leads.splice(index, 1);
    salvarDados();
    fecharModal('motivoModal');
    renderizarAll();
    showToast(`"${lead.empresa}" movido para Perdidos (${motivoSel})`);
}

function obterFiltroPerdidos() {
    const tipoSelect = document.getElementById('perdidosFiltroPeriodoTipo');
    const motivoSelect = document.getElementById('perdidosFiltroMotivo');
    const tipo = tipoSelect ? tipoSelect.value : (perdidosFiltroPeriodoTipo || 'todos');
    const motivo = motivoSelect ? motivoSelect.value : (perdidosFiltroMotivo || '');
    let inicio = null;
    let fim = null;
    let label = 'Todo o período';
    let invalido = false;

    if (tipo === 'personalizado') {
        const inicioStr = document.getElementById('perdidosDataInicio')?.value || '';
        const fimStr = document.getElementById('perdidosDataFim')?.value || '';
        if (!inicioStr || !fimStr) {
            label = 'Selecione as duas datas';
            invalido = true;
        } else if (inicioStr > fimStr) {
            label = 'Data inicial posterior à data final';
            invalido = true;
        } else {
            inicio = new Date(`${inicioStr}T00:00:00`);
            fim = new Date(`${fimStr}T23:59:59`);
            label = `${formatarData(inicioStr)} a ${formatarData(fimStr)}`;
        }
    } else if (tipo !== 'todos' && typeof getRangePeriodo === 'function') {
        const range = getRangePeriodo(tipo, 0);
        inicio = range.inicio;
        fim = range.fim;
        label = range.label;
    }

    return {
        tipo,
        motivo,
        motivoLabel: motivo === '__sem_motivo__' ? 'Sem motivo informado' : (motivo || 'Todos os motivos'),
        inicio,
        fim,
        label,
        invalido
    };
}

function obterPerdidosFiltrados() {
    const filtro = obterFiltroPerdidos();
    let lista = getPerdidosVisiveis();

    if (filtro.invalido) return { filtro, lista: [] };
    if (filtro.inicio) lista = lista.filter(p => dataNoPeriodo(p.dataExclusao, filtro.inicio, filtro.fim));
    if (filtro.motivo) {
        lista = lista.filter(p => (p.motivo || '__sem_motivo__') === filtro.motivo);
    }
    lista.sort((a, b) => (b.dataExclusao || '').localeCompare(a.dataExclusao || ''));
    return { filtro, lista };
}

function popularFiltrosPerdidos() {
    const periodoSelect = document.getElementById('perdidosFiltroPeriodoTipo');
    const personalizadoContainer = document.getElementById('perdidosFiltroPersonalizadoContainer');
    const motivoSelect = document.getElementById('perdidosFiltroMotivo');
    if (periodoSelect) periodoSelect.value = perdidosFiltroPeriodoTipo || 'todos';
    if (personalizadoContainer) personalizadoContainer.style.display = perdidosFiltroPeriodoTipo === 'personalizado' ? 'flex' : 'none';
    if (!motivoSelect) return;

    const valorAtual = perdidosFiltroMotivo || motivoSelect.value || '';
    const motivos = [...new Set(getPerdidosVisiveis().map(p => p.motivo || '__sem_motivo__'))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    motivoSelect.innerHTML = '<option value="">Todos os motivos</option>' + motivos.map(motivo =>
        `<option value="${motivo}">${motivo === '__sem_motivo__' ? 'Sem motivo informado' : motivo}</option>`
    ).join('');
    if (motivos.includes(valorAtual)) {
        motivoSelect.value = valorAtual;
        perdidosFiltroMotivo = valorAtual;
    } else {
        motivoSelect.value = '';
        perdidosFiltroMotivo = '';
    }
}

function mudarFiltroPerdidos() {
    perdidosFiltroPeriodoTipo = document.getElementById('perdidosFiltroPeriodoTipo')?.value || 'todos';
    perdidosFiltroMotivo = document.getElementById('perdidosFiltroMotivo')?.value || '';
    const container = document.getElementById('perdidosFiltroPersonalizadoContainer');
    if (container) container.style.display = perdidosFiltroPeriodoTipo === 'personalizado' ? 'flex' : 'none';

    const filtro = obterFiltroPerdidos();
    if (filtro.invalido && filtro.tipo === 'personalizado' && filtro.label === 'Data inicial posterior à data final') {
        showToast('A data inicial não pode ser posterior à data final.', 'error');
    }
    renderizarPerdidos();
}

function renderizarPerdidos() {
    const container = document.getElementById('perdidosContainer');
    if (!container) return;

    popularFiltrosPerdidos();
    const { filtro, lista: perdidosVisiveis } = obterPerdidosFiltrados();
    const resumo = document.getElementById('perdidosFiltroResumo');
    if (resumo) {
        resumo.textContent = filtro.invalido
            ? `Filtro incompleto: ${filtro.label}.`
            : `${perdidosVisiveis.length} card(s) encontrado(s) • ${filtro.label} • ${filtro.motivoLabel}`;
    }

    if (perdidosVisiveis.length === 0) {
        container.innerHTML = filtro.invalido
            ? `<div class="empty-state"><span class="emoji-big"><span data-icone="calendario"></span></span><p>Informe um período personalizado válido para consultar os cards.</p></div>`
            : `<div class="empty-state"><span class="emoji-big"><span data-icone="perdidos"></span></span><p>Nenhum card perdido encontrado com os filtros atuais.</p></div>`;
        return;
    }

    container.innerHTML = perdidosVisiveis.map(p => `
        <div class="perdido-item">
            <div style="display:flex;align-items:center;gap:10px;">
                <div class="avatar-circle" style="background:${corAvatar(p.empresa)};">${iniciais(p.empresa)}</div>
                <div>
                    <div style="font-weight:700;">${p.empresa}</div>
                    <div style="font-size:11px;color:var(--text-muted);">Etapa original: ${ETAPA_NOMES[p.etapaOrigem] || p.etapaOrigem} • Excluído em ${formatarData(p.dataExclusao)}</div>
                    <div class="perdido-motivo">Motivo: ${p.motivo || 'Sem motivo informado'}${p.motivoDetalhe ? ' — ' + p.motivoDetalhe : ''}</div>
                </div>
            </div>
            <div class="flex gap-8">
                <button class="btn btn-success btn-xs" onclick="restaurarLead('${p.id}')" title="Restaurar">Restaurar</button>
                <button class="btn btn-danger btn-xs" onclick="excluirPerdidoDefinitivo('${p.id}')" title="Excluir definitivamente">Excluir</button>
            </div>
        </div>
    `).join('');
}

function imprimirRelatorioPerdidos() {
    const { filtro, lista: perdidosVisiveis } = obterPerdidosFiltrados();
    if (filtro.invalido) {
        showToast('Informe um período personalizado válido antes de gerar o relatório.', 'error');
        return;
    }
    if (perdidosVisiveis.length === 0) {
        showToast('Nenhum card perdido encontrado com os filtros atuais.', 'error');
        return;
    }

    const linhas = perdidosVisiveis.map(p => `
        <tr>
            <td>${p.empresa}</td>
            <td>${p.decisor || '—'}</td>
            <td>${ETAPA_NOMES[p.etapaOrigem] || p.etapaOrigem}</td>
            <td>${p.motivo || 'Sem motivo informado'}${p.motivoDetalhe ? ' — ' + p.motivoDetalhe : ''}</td>
            <td>${formatarData(p.dataExclusao)}</td>
            <td>${p.cardObs || '—'}</td>
            <td style="text-align:right;">${formatarMoeda(p.valor || 0)}</td>
        </tr>
    `).join('');

    const valorTotal = perdidosVisiveis.reduce((acc, p) => acc + (p.valor || 0), 0);
    const marcaEmpresa = (typeof empresaAtual !== 'undefined' && empresaAtual) ? empresaAtual : { nome: 'Feitosa CRM', cnpj: '' };

    const htmlImpressao = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Cards Perdidos</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #1a2332; }
    h1 { font-size: 22px; margin-bottom: 2px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 22px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #ccc; padding: 7px 10px; font-size: 12px; text-align: left; }
    th { background: #f0f2f5; }
    tr:nth-child(even) { background: #fafafa; }
    tfoot td { font-weight: 700; background: #f0f2f5; }
    @media print { body { padding: 0; } }
</style>
</head><body>
    <h1>Relatório de Cards Perdidos — ${marcaEmpresa.nome || 'CRM'}</h1>
    ${marcaEmpresa.cnpj ? `<div class="meta">CNPJ: <strong>${marcaEmpresa.cnpj}</strong></div>` : ''}
    <div class="meta">
        Período: <strong>${filtro.label}</strong> • Motivo: <strong>${filtro.motivoLabel}</strong><br>
        ${perdidosVisiveis.length} card(s) • Gerado em ${formatarData(hoje())} às ${new Date().toTimeString().slice(0, 5)}
    </div>
    <table>
        <thead>
            <tr><th>Empresa</th><th>Contato</th><th>Etapa de Origem</th><th>Motivo</th><th>Data</th><th>Observação</th><th>Valor</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
        <tfoot><tr><td colspan="6">Valor Total Perdido</td><td style="text-align:right;">${formatarMoeda(valorTotal)}</td></tr></tfoot>
    </table>
</body></html>`;

    if (typeof imprimirRelatorioHtmlSeguro === 'function') {
        imprimirRelatorioHtmlSeguro(htmlImpressao, 'Relatório de Cards Perdidos');
    } else {
        const janela = window.open('', '_blank');
        if (janela) {
            janela.document.write(htmlImpressao);
            janela.document.close();
            setTimeout(() => { janela.focus(); janela.print(); }, 350);
        }
    }
}

function restaurarLead(id) {
    const index = perdidos.findIndex(p => p.id === id);
    if (index === -1) return;
    const p = perdidos[index];
    if (usuarioAtual.papel !== 'admin' && p.usuarioId !== usuarioAtual.id) {
        showToast('Você não pode restaurar este card.', 'error');
        return;
    }
    const { etapaOrigem, motivo, motivoDetalhe, dataExclusao, ...leadRestaurado } = p;
    leadRestaurado.etapa = etapaOrigem || 'leads';
    leadRestaurado.historico = leadRestaurado.historico || [];
    leadRestaurado.historico.push({
        data: hoje(),
        hora: new Date().toTimeString().slice(0, 5),
        tipo: 'Movimento',
        descricao: 'Card restaurado de Perdidos'
    });
    leads.unshift(leadRestaurado);
    perdidos.splice(index, 1);
    salvarDados();
    renderizarAll();
    showToast(`"${leadRestaurado.empresa}" restaurado!`);
}

function excluirPerdidoDefinitivo(id) {
    const p = perdidos.find(p => p.id === id);
    if (!p) return;
    if (usuarioAtual.papel !== 'admin' && p.usuarioId !== usuarioAtual.id) {
        showToast('Você não pode excluir definitivamente este card.', 'error');
        return;
    }
    if (!confirm('Excluir definitivamente este card? Essa ação não pode ser desfeita.')) return;
    perdidos = perdidos.filter(p => p.id !== id);
    salvarDados();
    renderizarAll();
    showToast('Card excluído definitivamente.');
}
