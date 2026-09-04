// ==========================================================================
// RELATÓRIOS DETALHADOS:
// 1. Orçamentos Perdidos e Motivos por Período a Escolher
// 2. Orçamentos em Aberto com Riqueza de Detalhes (Número de Dias em Orçamento)
// ==========================================================================

// Estado dos filtros de Orçamentos Perdidos
const relPerdidosFiltro = {
    periodoTipo: 'todos', // Padrão: Todo o período para visualização imediata e completa
    offset: 0,
    dataInicio: '',
    dataFim: '',
    motivo: '',
    vendedorId: '',
    apenasOrcamento: false,
    busca: '',
    ordenacao: 'dataDesc'
};

// Estado dos filtros de Orçamentos em Aberto
const relAbertosFiltro = {
    modoPeriodo: 'todos_abertos', // 'todos_abertos' ou 'periodo_entrada'
    periodoTipo: 'mes',
    offset: 0,
    dataInicio: '',
    dataFim: '',
    faixaDias: 'todas', // 'todas', '0-7', '8-15', '16-30', '30+'
    vendedorId: '',
    potencial: '',
    ordenacao: 'diasDesc', // 'diasDesc', 'diasAsc', 'valorDesc', 'nomeAsc'
    busca: ''
};

// ==========================================================================
// PARTE 1: RELATÓRIO DE ORÇAMENTOS PERDIDOS E MOTIVOS POR PERÍODO A ESCOLHER
// ==========================================================================

function obterRangePeriodoPerdidos() {
    if (typeof getRangePeriodo === 'function') {
        if (relPerdidosFiltro.periodoTipo === 'personalizado') {
            const inicioStr = relPerdidosFiltro.dataInicio;
            const fimStr = relPerdidosFiltro.dataFim;
            if (!inicioStr || !fimStr) {
                return { inicio: null, fim: null, label: 'Selecione as duas datas', invalido: true };
            }
            if (inicioStr > fimStr) {
                return { inicio: null, fim: null, label: 'Data inicial posterior à final', invalido: true };
            }
            return {
                inicio: new Date(`${inicioStr}T00:00:00`),
                fim: new Date(`${fimStr}T23:59:59`),
                label: `${formatarData(inicioStr)} a ${formatarData(fimStr)}`,
                invalido: false
            };
        }
        const range = getRangePeriodo(relPerdidosFiltro.periodoTipo, relPerdidosFiltro.offset);
        return { ...range, invalido: false };
    }
    return { inicio: null, fim: null, label: 'Todo o período', invalido: false };
}

function filtrarPerdidosComDetalhes() {
    const range = obterRangePeriodoPerdidos();
    let lista = (typeof getPerdidosRelatorio === 'function' ? getPerdidosRelatorio() : (perdidos || []));

    // Filtro de vendedor específico no painel de perdidos
    if (relPerdidosFiltro.vendedorId) {
        lista = lista.filter(p => p.usuarioId === relPerdidosFiltro.vendedorId);
    }

    // Filtro por período
    if (range && range.inicio && range.fim && !range.invalido && relPerdidosFiltro.periodoTipo !== 'todos') {
        lista = lista.filter(p => {
            const dataRef = p.dataExclusao || p.dataPerda || p.dataCancelamento || p.dataModificacao || p.dataCriacao;
            return dataNoPeriodo(dataRef, range.inicio, range.fim);
        });
    }

    // Filtro apenas orçamentos perdidos (cards que estavam em 'orcamento' ou que tinham proposta/valor)
    if (relPerdidosFiltro.apenasOrcamento) {
        lista = lista.filter(p => p.etapaOrigem === 'orcamento' || (Number(p.valor) > 0));
    }

    // Filtro por motivo
    if (relPerdidosFiltro.motivo) {
        lista = lista.filter(p => (p.motivo || '__sem_motivo__') === relPerdidosFiltro.motivo);
    }

    // Busca textual
    if (relPerdidosFiltro.busca) {
        const termo = relPerdidosFiltro.busca.toLowerCase().trim();
        lista = lista.filter(p =>
            (p.empresa && p.empresa.toLowerCase().includes(termo)) ||
            (p.decisor && p.decisor.toLowerCase().includes(termo)) ||
            (p.motivo && p.motivo.toLowerCase().includes(termo)) ||
            (p.motivoDetalhe && p.motivoDetalhe.toLowerCase().includes(termo)) ||
            (p.cardObs && p.cardObs.toLowerCase().includes(termo))
        );
    }

    // Ordenação
    lista = [...lista].sort((a, b) => {
        if (relPerdidosFiltro.ordenacao === 'valorDesc') {
            return (Number(b.valor) || 0) - (Number(a.valor) || 0);
        }
        if (relPerdidosFiltro.ordenacao === 'nomeAsc') {
            return String(a.empresa || '').localeCompare(String(b.empresa || ''), 'pt-BR');
        }
        if (relPerdidosFiltro.ordenacao === 'diasDesc') {
            const diasA = calcularDiasAtePerda(a);
            const diasB = calcularDiasAtePerda(b);
            return diasB - diasA;
        }
        // Padrão: data da perda decrescente
        const dataA = a.dataExclusao || a.dataPerda || a.dataModificacao || a.dataCriacao || '';
        const dataB = b.dataExclusao || b.dataPerda || b.dataModificacao || b.dataCriacao || '';
        return String(dataB).localeCompare(String(dataA));
    });

    return { range, lista };
}

function calcularDiasAtePerda(perdido) {
    const dataFimStr = perdido.dataExclusao || perdido.dataPerda || perdido.dataCancelamento || perdido.dataModificacao || new Date().toISOString();
    const dataCriacaoStr = perdido.dataEntradaEtapa || perdido.dataCriacao || dataFimStr;
    const dIni = new Date(dataCriacaoStr);
    const dFim = new Date(dataFimStr);
    if (isNaN(dIni.getTime()) || isNaN(dFim.getTime())) return 0;
    const diff = Math.floor((dFim.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

function renderizarRelatorioPerdidosMotivos() {
    const container = document.getElementById('relPerdidosMotivosPainel');
    if (!container) return;

    popularControlesPerdidos();

    const { range, lista } = filtrarPerdidosComDetalhes();
    const totalQtd = lista.length;
    const totalValor = lista.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const ticketMedio = totalQtd > 0 ? totalValor / totalQtd : 0;

    // Agrupamento por Motivo
    const motivosMap = {};
    let somaDiasAtePerda = 0;

    lista.forEach(p => {
        const mot = p.motivo || 'Sem motivo informado';
        if (!motivosMap[mot]) {
            motivosMap[mot] = { motivo: mot, count: 0, valor: 0, diasTotal: 0 };
        }
        motivosMap[mot].count += 1;
        motivosMap[mot].valor += (Number(p.valor) || 0);
        const dias = calcularDiasAtePerda(p);
        motivosMap[mot].diasTotal += dias;
        somaDiasAtePerda += dias;
    });

    const motivosArray = Object.values(motivosMap).sort((a, b) => b.count - a.count || b.valor - a.valor);
    const topMotivo = motivosArray[0] || null;
    const mediaDiasGeral = totalQtd > 0 ? (somaDiasAtePerda / totalQtd).toFixed(1) : 0;

    // Cabeçalho de KPIs
    let kpiHtml = `
        <div class="rel-kpis-grid-4 mb-16">
            <div class="rel-kpi-card">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Orçamentos Perdidos</span>
                    <span class="kpi-card-icon" style="background:rgba(179,65,58,0.12);color:var(--danger);">📉</span>
                </div>
                <div class="kpi-card-val">${totalQtd}</div>
                <div class="kpi-card-sub">Descartados no período</div>
            </div>

            <div class="rel-kpi-card">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Valor Total Perdido</span>
                    <span class="kpi-card-icon" style="background:rgba(179,65,58,0.12);color:var(--danger);">💰</span>
                </div>
                <div class="kpi-card-val" style="color:var(--danger);">${formatarMoeda(totalValor)}</div>
                <div class="kpi-card-sub">Volume financeiro que não converteu</div>
            </div>

            <div class="rel-kpi-card">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Ticket Médio Perdido</span>
                    <span class="kpi-card-icon" style="background:rgba(45,72,99,0.12);color:var(--accent-color);">🏷️</span>
                </div>
                <div class="kpi-card-val">${formatarMoeda(ticketMedio)}</div>
                <div class="kpi-card-sub">Média por oportunidade perdida</div>
            </div>

            <div class="rel-kpi-card">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Principal Motivo</span>
                    <span class="kpi-card-icon" style="background:rgba(169,118,31,0.12);color:#a9761f;">🎯</span>
                </div>
                <div class="kpi-card-val" style="font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${topMotivo ? topMotivo.motivo : 'Nenhum'}">
                    ${topMotivo ? topMotivo.motivo : '—'}
                </div>
                <div class="kpi-card-sub">
                    ${topMotivo ? `${topMotivo.count} perda(s) • ${totalQtd > 0 ? Math.round((topMotivo.count / totalQtd) * 100) : 0}% do total` : 'Sem perdas registradas'}
                </div>
            </div>
        </div>
    `;

    // Gráfico de barras por motivo
    let graficosHtml = '';
    if (motivosArray.length > 0) {
        const barrasHtml = motivosArray.map(m => {
            const pctQtd = totalQtd > 0 ? Math.round((m.count / totalQtd) * 100) : 0;
            const pctValor = totalValor > 0 ? Math.round((m.valor / totalValor) * 100) : 0;
            return `
                <div class="rel-motivo-item" onclick="filtrarPorMotivoRapido('${m.motivo.replace(/'/g, "\\'")}')" title="Clique para filtrar por este motivo">
                    <div class="rel-motivo-header">
                        <span class="rel-motivo-nome">
                            <strong>${m.motivo}</strong>
                            <span class="rel-motivo-badge">${m.count} card(s) (${pctQtd}%)</span>
                        </span>
                        <span class="rel-motivo-valor">${formatarMoeda(m.valor)} <small class="text-muted">(${pctValor}% do valor)</small></span>
                    </div>
                    <div class="rel-motivo-track">
                        <div class="rel-motivo-fill" style="width:${Math.max(pctQtd, 2)}%;"></div>
                    </div>
                </div>
            `;
        }).join('');

        graficosHtml = `
            <div class="rel-fluid-card mb-16">
                <div class="rel-fluid-card-title">
                    <span>Distribuição e Impacto por Motivo de Perda</span>
                    <span class="text-muted text-xs">Ciclo médio até o descarte: <strong>${mediaDiasGeral} dias</strong></span>
                </div>
                <div class="rel-motivos-list">
                    ${barrasHtml}
                </div>
            </div>
        `;
    }

    // Tabela detalhada
    let tabelaHtml = '';
    if (lista.length === 0) {
        const totalBase = (typeof getPerdidosRelatorio === 'function' ? getPerdidosRelatorio() : (perdidos || [])).length;
        if (totalBase > 0) {
            tabelaHtml = `
                <div class="empty-state" style="padding:36px 16px;text-align:center;">
                    <span class="emoji-big">🔍</span>
                    <h4 style="margin:8px 0 4px;font-size:16px;">Nenhum orçamento perdido neste período (${range.label})</h4>
                    <p class="text-muted text-xs mb-16">Existem <strong>${totalBase}</strong> orçamento(s) perdido(s) cadastrado(s) em outros períodos ou filtros.</p>
                    <div class="flex gap-8 justify-center" style="display:inline-flex;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="mudarPeriodoPerdidosRapido('todos')">
                            Ver Todo o Período (${totalBase} perdas)
                        </button>
                    </div>
                </div>
            `;
        } else {
            tabelaHtml = `
                <div class="empty-state" style="padding:36px 16px;text-align:center;">
                    <span class="emoji-big">📉</span>
                    <h4 style="margin:8px 0 4px;font-size:16px;">Nenhum orçamento descartado no sistema</h4>
                    <p class="text-muted text-xs mb-16">Quando você descarta um card que estava na etapa de Orçamento, ele é registrado aqui com seus motivos e dias de permanência.</p>
                    <div class="flex gap-8 justify-center" style="display:inline-flex;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="carregarExemplosPerdidosEAtualizar()">
                            ⚡ Carregar 5 Exemplos de Orçamentos Perdidos
                        </button>
                    </div>
                </div>
            `;
        }
    } else {
        const linhas = lista.map((p, idx) => {
            const vendedor = (usuarios || []).find(u => u.id === p.usuarioId);
            const diasAtePerda = calcularDiasAtePerda(p);
            const etapaOrigemNome = (typeof ETAPA_NOMES !== 'undefined' && ETAPA_NOMES[p.etapaOrigem]) || p.etapaOrigem || 'Orçamento';
            const decisorTexto = p.decisor || '—';
            const fone = p.telefone || p.celular || '';
            const whatsLink = fone ? `https://wa.me/55${fone.replace(/\D/g, '')}` : '';

            return `
                <tr>
                    <td style="font-weight:600;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="avatar-circle" style="background:${corAvatar(p.empresa)};width:28px;height:28px;font-size:11px;">
                                ${iniciais(p.empresa)}
                            </div>
                            <div>
                                <div>${p.empresa}</div>
                                <div class="text-muted text-xs">${p.cidade ? `${p.cidade}/${p.estado || ''}` : ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>${decisorTexto}</div>
                        ${fone ? `<div class="text-muted text-xs"><a href="${whatsLink}" target="_blank" style="color:var(--accent-color);text-decoration:none;">📱 ${fone}</a></div>` : ''}
                    </td>
                    <td>
                        <span class="badge" style="background:rgba(45,72,99,0.08);color:var(--text-primary);font-size:11px;">
                            ${vendedor ? vendedor.nome : '—'}
                        </span>
                    </td>
                    <td>
                        <span class="badge" style="background:var(--bg-primary);border:1px solid var(--border-color);font-size:11px;">
                            ${etapaOrigemNome}
                        </span>
                    </td>
                    <td style="white-space:nowrap;font-size:12px;">
                        ${formatarData(p.dataExclusao)}
                    </td>
                    <td style="text-align:center;">
                        <span class="badge" style="background:rgba(0,0,0,0.05);font-size:11px;" title="Tempo que o lead permaneceu antes do descarte">
                            ⏱️ ${diasAtePerda}d
                        </span>
                    </td>
                    <td>
                        <span class="rel-badge-motivo">
                            ${p.motivo || 'Sem motivo'}
                        </span>
                        ${p.motivoDetalhe ? `<div class="text-muted text-xs" style="margin-top:2px;">${p.motivoDetalhe}</div>` : ''}
                        ${p.cardObs ? `<div class="text-muted text-xs" style="font-style:italic;">Obs: ${p.cardObs}</div>` : ''}
                    </td>
                    <td style="text-align:right;font-weight:700;color:var(--danger);white-space:nowrap;">
                        ${formatarMoeda(p.valor || 0)}
                    </td>
                    <td style="text-align:center;white-space:nowrap;">
                        ${(usuarioAtual && (usuarioAtual.papel === 'admin' || p.usuarioId === usuarioAtual.id)) ? `
                            <button type="button" class="btn btn-outline btn-xs" onclick="restaurarLead('${p.id}')" title="Restaurar este lead para o funil">
                                ↺ Restaurar
                            </button>
                        ` : '—'}
                    </td>
                </tr>
            `;
        }).join('');

        tabelaHtml = `
            <div class="table-wrapper" style="border:1px solid var(--border-color);border-radius:var(--radius);overflow-x:auto;">
                <table class="table-rel-detalhada">
                    <thead>
                        <tr>
                            <th>Cliente / Empresa</th>
                            <th>Contato / Decisor</th>
                            <th>Vendedor</th>
                            <th>Etapa Origem</th>
                            <th>Data Perda</th>
                            <th style="text-align:center;">Ciclo</th>
                            <th>Motivo & Detalhes</th>
                            <th style="text-align:right;">Valor Perdido</th>
                            <th style="text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7" style="font-weight:700;text-align:right;">Total Perdido no Período (${totalQtd} orçamentos):</td>
                            <td style="text-align:right;font-weight:700;color:var(--danger);">${formatarMoeda(totalValor)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    container.innerHTML = `
        ${kpiHtml}
        ${graficosHtml}
        <div class="rel-fluid-card">
            <div class="rel-fluid-card-title">
                <span>Detalhamento dos Orçamentos Perdidos</span>
                <span class="text-muted text-xs">Exibindo ${totalQtd} registro(s)</span>
            </div>
            ${tabelaHtml}
        </div>
    `;
}

function popularControlesPerdidos() {
    // Sincroniza selects de período rápido de perdidos
    const pills = document.querySelectorAll('.rel-perdidos-pills .rel-pill-btn');
    pills.forEach(btn => {
        if (btn.getAttribute('data-periodo') === relPerdidosFiltro.periodoTipo) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const labelPeriodo = document.getElementById('relPerdidosPeriodoLabel');
    if (labelPeriodo) {
        const range = obterRangePeriodoPerdidos();
        labelPeriodo.textContent = range.label;
    }

    const containerPersonalizado = document.getElementById('relPerdidosPersonalizadoBox');
    if (containerPersonalizado) {
        containerPersonalizado.style.display = relPerdidosFiltro.periodoTipo === 'personalizado' ? 'inline-flex' : 'none';
        const inInicio = document.getElementById('relPerdidosDataInicio');
        const inFim = document.getElementById('relPerdidosDataFim');
        if (inInicio && inFim) {
            if (!inInicio.value && relPerdidosFiltro.dataInicio) inInicio.value = relPerdidosFiltro.dataInicio;
            if (!inFim.value && relPerdidosFiltro.dataFim) inFim.value = relPerdidosFiltro.dataFim;
        }
    }

    // Popular select de vendedores
    const selVendedor = document.getElementById('relPerdidosFiltroVendedor');
    if (selVendedor && selVendedor.options.length <= 1) {
        const opcoes = (usuarios || []).map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
        selVendedor.innerHTML = `<option value="">Todos os vendedores</option>${opcoes}`;
        selVendedor.value = relPerdidosFiltro.vendedorId;
    }

    // Popular select de motivos
    const selMotivo = document.getElementById('relPerdidosFiltroMotivo');
    if (selMotivo) {
        const valorAtual = relPerdidosFiltro.motivo;
        const listaTotal = (typeof getPerdidosRelatorio === 'function' ? getPerdidosRelatorio() : (perdidos || []));
        const motivosUnicos = [...new Set(listaTotal.map(p => p.motivo || '__sem_motivo__'))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));

        selMotivo.innerHTML = '<option value="">Todos os motivos</option>' + motivosUnicos.map(m =>
            `<option value="${m}">${m === '__sem_motivo__' ? 'Sem motivo informado' : m}</option>`
        ).join('');
        selMotivo.value = valorAtual;
    }
}

function mudarPeriodoPerdidosRapido(tipo) {
    relPerdidosFiltro.periodoTipo = tipo;
    relPerdidosFiltro.offset = 0;
    renderizarRelatorioPerdidosMotivos();
}

function mudarOffsetPerdidos(delta) {
    relPerdidosFiltro.offset += delta;
    renderizarRelatorioPerdidosMotivos();
}

function aplicarFiltroPerdidosPersonalizado() {
    const inInicio = document.getElementById('relPerdidosDataInicio');
    const inFim = document.getElementById('relPerdidosDataFim');
    if (inInicio && inFim) {
        relPerdidosFiltro.dataInicio = inInicio.value;
        relPerdidosFiltro.dataFim = inFim.value;
    }
    renderizarRelatorioPerdidosMotivos();
}

function filtrarPorMotivoRapido(motivo) {
    relPerdidosFiltro.motivo = motivo;
    const sel = document.getElementById('relPerdidosFiltroMotivo');
    if (sel) sel.value = motivo;
    renderizarRelatorioPerdidosMotivos();
}

function mudarFiltrosPerdidosPainel() {
    const selVendedor = document.getElementById('relPerdidosFiltroVendedor');
    const selMotivo = document.getElementById('relPerdidosFiltroMotivo');
    const selOrdenacao = document.getElementById('relPerdidosOrdenacao');
    const chkApenasOrc = document.getElementById('relPerdidosApenasOrcamento');
    const inBusca = document.getElementById('relPerdidosBusca');

    if (selVendedor) relPerdidosFiltro.vendedorId = selVendedor.value;
    if (selMotivo) relPerdidosFiltro.motivo = selMotivo.value;
    if (selOrdenacao) relPerdidosFiltro.ordenacao = selOrdenacao.value;
    if (chkApenasOrc) relPerdidosFiltro.apenasOrcamento = chkApenasOrc.checked;
    if (inBusca) relPerdidosFiltro.busca = inBusca.value;

    renderizarRelatorioPerdidosMotivos();
}

function exportarCsvPerdidosMotivos() {
    const { range, lista } = filtrarPerdidosComDetalhes();
    if (lista.length === 0) {
        showToast('Nenhum dado encontrado para exportar com os filtros atuais.', 'error');
        return;
    }

    const headers = [
        'Cliente/Empresa',
        'Decisor/Contato',
        'Telefone',
        'Cidade/UF',
        'Vendedor Responsável',
        'Etapa de Origem',
        'Data de Entrada',
        'Data da Perda/Descarte',
        'Dias até Perda',
        'Motivo da Perda',
        'Detalhes do Motivo',
        'Observações do Card',
        'Valor Perdido (R$)'
    ];

    const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    const rows = lista.map(p => {
        const vendedor = (usuarios || []).find(u => u.id === p.usuarioId);
        const dias = calcularDiasAtePerda(p);
        const etapaNome = (typeof ETAPA_NOMES !== 'undefined' && ETAPA_NOMES[p.etapaOrigem]) || p.etapaOrigem || 'Orçamento';
        return [
            escapeCsv(p.empresa),
            escapeCsv(p.decisor),
            escapeCsv(p.telefone || p.celular),
            escapeCsv(`${p.cidade || ''}/${p.estado || ''}`),
            escapeCsv(vendedor ? vendedor.nome : ''),
            escapeCsv(etapaNome),
            escapeCsv(formatarData(p.dataEntradaEtapa || p.dataCriacao)),
            escapeCsv(formatarData(p.dataExclusao)),
            dias,
            escapeCsv(p.motivo || 'Sem motivo'),
            escapeCsv(p.motivoDetalhe),
            escapeCsv(p.cardObs),
            (Number(p.valor) || 0).toFixed(2).replace('.', ',')
        ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Orcamentos_Perdidos_${range.label.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exportação de CSV concluída com sucesso!');
}

function imprimirRelatorioPerdidosMotivos() {
    const { range, lista } = filtrarPerdidosComDetalhes();
    if (lista.length === 0) {
        showToast('Nenhum dado encontrado para gerar o PDF com os filtros atuais.', 'error');
        return;
    }

    const totalValor = lista.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const marcaEmpresa = (typeof empresaAtual !== 'undefined' && empresaAtual) ? empresaAtual : { nome: 'Feitosa CRM', cnpj: '' };

    // Agrupamento de motivos para o sumário impresso
    const motivosMap = {};
    lista.forEach(p => {
        const mot = p.motivo || 'Sem motivo informado';
        if (!motivosMap[mot]) motivosMap[mot] = { count: 0, valor: 0 };
        motivosMap[mot].count += 1;
        motivosMap[mot].valor += (Number(p.valor) || 0);
    });
    const resumoMotivos = Object.entries(motivosMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([motivo, dados]) => `
            <tr>
                <td><strong>${motivo}</strong></td>
                <td style="text-align:center;">${dados.count} (${Math.round((dados.count / lista.length) * 100)}%)</td>
                <td style="text-align:right;">${formatarMoeda(dados.valor)}</td>
            </tr>
        `).join('');

    const linhas = lista.map((p, i) => {
        const vendedor = (usuarios || []).find(u => u.id === p.usuarioId);
        const dias = calcularDiasAtePerda(p);
        const etapaNome = (typeof ETAPA_NOMES !== 'undefined' && ETAPA_NOMES[p.etapaOrigem]) || p.etapaOrigem || 'Orçamento';
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${p.empresa}</strong><br><span style="font-size:10px;color:#666;">${p.decisor || ''}</span></td>
                <td>${vendedor ? vendedor.nome : '—'}</td>
                <td>${etapaNome}</td>
                <td style="text-align:center;">${formatarData(p.dataExclusao)}</td>
                <td style="text-align:center;">${dias} dias</td>
                <td><strong>${p.motivo || 'Sem motivo'}</strong>${p.motivoDetalhe ? `<br><small style="color:#555;">${p.motivoDetalhe}</small>` : ''}</td>
                <td style="text-align:right;font-weight:700;color:#b3413a;">${formatarMoeda(p.valor || 0)}</td>
            </tr>
        `;
    }).join('');

    const htmlImpressao = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Orçamentos Perdidos e Motivos — ${range.label}</title>
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1a2332; line-height: 1.4; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #2d4863; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #2d4863; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    tr:nth-child(even) { background: #f8fafc; }
    tfoot td { font-weight: 700; background: #e2e8f0; }
    .grid-resumo { display: flex; gap: 16px; margin-bottom: 16px; }
    .card-kpi { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; flex: 1; background: #fafafa; }
    .card-kpi strong { display: block; font-size: 15px; margin-top: 4px; color: #b3413a; }
    @media print { body { padding: 0; } @page { margin: 1cm; size: landscape; } }
</style>
</head><body>
    <h1>Relatório de Orçamentos Perdidos e Motivos — ${marcaEmpresa.nome || 'CRM'}</h1>
    ${marcaEmpresa.cnpj ? `<div class="meta">CNPJ: ${marcaEmpresa.cnpj}</div>` : ''}
    <div class="meta">
        Período analisado: <strong>${range.label}</strong> • Total de perdas: <strong>${lista.length}</strong> • Gerado em ${formatarData(hoje())} às ${new Date().toTimeString().slice(0, 5)}
    </div>

    <div class="grid-resumo">
        <div class="card-kpi"><span>Total Perdido</span><strong>${formatarMoeda(totalValor)}</strong></div>
        <div class="card-kpi"><span>Quantidade</span><strong>${lista.length} orçamentos</strong></div>
        <div class="card-kpi"><span>Ticket Médio Perdido</span><strong>${formatarMoeda(lista.length > 0 ? totalValor / lista.length : 0)}</strong></div>
    </div>

    <h2>Consolidado por Motivo de Perda</h2>
    <table style="max-width:600px;">
        <thead><tr><th>Motivo da Perda</th><th style="text-align:center;">Quantidade</th><th style="text-align:right;">Valor Perdido</th></tr></thead>
        <tbody>${resumoMotivos}</tbody>
        <tfoot><tr><td>Total</td><td style="text-align:center;">${lista.length}</td><td style="text-align:right;">${formatarMoeda(totalValor)}</td></tr></tfoot>
    </table>

    <h2>Detalhamento das Perdas no Período</h2>
    <table>
        <thead>
            <tr>
                <th style="width:30px;">#</th>
                <th>Cliente / Contato</th>
                <th>Vendedor</th>
                <th>Etapa Origem</th>
                <th style="text-align:center;">Data Perda</th>
                <th style="text-align:center;">Ciclo</th>
                <th>Motivo & Detalhes</th>
                <th style="text-align:right;">Valor</th>
            </tr>
        </thead>
        <tbody>${linhas}</tbody>
        <tfoot>
            <tr>
                <td colspan="7" style="text-align:right;">VALOR TOTAL PERDIDO:</td>
                <td style="text-align:right;color:#b3413a;">${formatarMoeda(totalValor)}</td>
            </tr>
        </tfoot>
    </table>
</body></html>`;

    imprimirRelatorioHtmlSeguro(htmlImpressao, `Relatório de Orçamentos Perdidos - ${range.label}`);
}

function imprimirRelatorioHtmlSeguro(htmlImpressao, titulo) {
    try {
        let printFrame = document.getElementById('relatorioImpressaoIframe');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'relatorioImpressaoIframe';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            printFrame.style.visibility = 'hidden';
            document.body.appendChild(printFrame);
        }

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(htmlImpressao);
        doc.close();

        setTimeout(() => {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                if (typeof showToast === 'function') {
                    showToast('Documento pronto para impressão ou salvar como PDF!');
                }
            } catch (errIframe) {
                abrirImpressaoFallback(htmlImpressao, titulo);
            }
        }, 400);
    } catch (e) {
        abrirImpressaoFallback(htmlImpressao, titulo);
    }
}

function abrirImpressaoFallback(htmlImpressao, titulo) {
    try {
        const janela = window.open('', '_blank');
        if (janela) {
            janela.document.write(htmlImpressao);
            janela.document.close();
            setTimeout(() => { janela.focus(); janela.print(); }, 400);
            return;
        }
    } catch (e) {}

    let modal = document.getElementById('relatorioImpressaoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'relatorioImpressaoModal';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:960px;width:95%;max-height:92vh;display:flex;flex-direction:column;padding:16px;">
                <div class="flex flex-between flex-wrap gap-8 mb-12" style="align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:10px;">
                    <h3 style="margin:0;font-size:16px;" id="relatorioImpressaoModalTitulo">${titulo || 'Relatório para Impressão'}</h3>
                    <div class="flex gap-8">
                        <button type="button" class="btn btn-primary btn-sm" onclick="imprimirIframeModal()">🖨️ Imprimir / Salvar PDF</button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="fecharModal('relatorioImpressaoModal')">✕ Fechar</button>
                    </div>
                </div>
                <iframe id="relatorioImpressaoModalFrame" style="width:100%;flex:1;min-height:550px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:#fff;"></iframe>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const frame = document.getElementById('relatorioImpressaoModalFrame');
    if (frame) {
        const fdoc = frame.contentWindow.document;
        fdoc.open();
        fdoc.write(htmlImpressao);
        fdoc.close();
    }
    window.imprimirIframeModal = function() {
        if (frame && frame.contentWindow) {
            frame.contentWindow.focus();
            frame.contentWindow.print();
        }
    };
    if (typeof abrirModal === 'function') {
        abrirModal('relatorioImpressaoModal');
    }
}

window.imprimirRelatorioHtmlSeguro = imprimirRelatorioHtmlSeguro;


// ==========================================================================
// PARTE 2: RELATÓRIO DE ORÇAMENTOS EM ABERTO COM RIQUEZA DE DETALHES (DIAS EM ORÇAMENTO)
// ==========================================================================

function obterFaixaDiasOrcamento(dias) {
    if (dias <= 7) return { key: '0-7', label: '0 a 7 dias', badgeClass: 'rel-aging-recente', icon: '🟢', status: 'Recente' };
    if (dias <= 15) return { key: '8-15', label: '8 a 15 dias', badgeClass: 'rel-aging-moderado', icon: '🟡', status: 'Em negociação' };
    if (dias <= 30) return { key: '16-30', label: '16 a 30 dias', badgeClass: 'rel-aging-alerta', icon: '🟠', status: 'Atenção' };
    return { key: '30+', label: 'Mais de 30 dias', badgeClass: 'rel-aging-critico', icon: '🔴', status: 'Crítico / Estagnado' };
}

function filtrarOrcamentosAbertosComDetalhes() {
    let base = (typeof getLeadsRelatorio === 'function' ? getLeadsRelatorio() : (leads || []));
    // Filtro essencial: etapa de orçamentos em aberto
    let lista = base.filter(l => l.etapa === 'orcamento');

    // Filtro de período se não for 'todos_abertos'
    let rangeLabel = 'Todos os orçamentos em aberto';
    if (relAbertosFiltro.modoPeriodo === 'periodo_entrada') {
        const range = getRangePeriodo(relAbertosFiltro.periodoTipo, relAbertosFiltro.offset);
        rangeLabel = `Entrados em: ${range.label}`;
        if (range.inicio && range.fim) {
            lista = lista.filter(l => dataNoPeriodo(l.dataEntradaEtapa || l.dataCriacao, range.inicio, range.fim));
        }
    }

    // Filtro por vendedor
    if (relAbertosFiltro.vendedorId) {
        lista = lista.filter(l => l.usuarioId === relAbertosFiltro.vendedorId);
    }

    // Filtro por potencial
    if (relAbertosFiltro.potencial) {
        lista = lista.filter(l => l.potencial === relAbertosFiltro.potencial);
    }

    // Adiciona dias em orçamento a cada lead
    lista = lista.map(lead => {
        const infoDias = typeof calcularDiasOrcamento === 'function' ? calcularDiasOrcamento(lead) : { dias: 0, limiteExcedido: false };
        const faixa = obterFaixaDiasOrcamento(infoDias.dias);
        return {
            ...lead,
            diasOrcamento: infoDias.dias,
            limiteExcedido: infoDias.limiteExcedido,
            faixaAging: faixa
        };
    });

    // Filtro por faixa de dias
    if (relAbertosFiltro.faixaDias && relAbertosFiltro.faixaDias !== 'todas') {
        lista = lista.filter(l => l.faixaAging.key === relAbertosFiltro.faixaDias);
    }

    // Busca rápida
    if (relAbertosFiltro.busca) {
        const termo = relAbertosFiltro.busca.toLowerCase().trim();
        lista = lista.filter(l =>
            (l.empresa && l.empresa.toLowerCase().includes(termo)) ||
            (l.decisor && l.decisor.toLowerCase().includes(termo)) ||
            (l.cidade && l.cidade.toLowerCase().includes(termo)) ||
            (l.telefone && l.telefone.includes(termo)) ||
            (l.cardObs && l.cardObs.toLowerCase().includes(termo))
        );
    }

    // Ordenação
    lista.sort((a, b) => {
        if (relAbertosFiltro.ordenacao === 'diasDesc') {
            return b.diasOrcamento - a.diasOrcamento; // Mais dias em aberto primeiro (urgência)
        }
        if (relAbertosFiltro.ordenacao === 'diasAsc') {
            return a.diasOrcamento - b.diasOrcamento; // Mais recentes primeiro
        }
        if (relAbertosFiltro.ordenacao === 'valorDesc') {
            return (Number(b.valor) || 0) - (Number(a.valor) || 0);
        }
        if (relAbertosFiltro.ordenacao === 'nomeAsc') {
            return String(a.empresa || '').localeCompare(String(b.empresa || ''), 'pt-BR');
        }
        return b.diasOrcamento - a.diasOrcamento;
    });

    return { lista, rangeLabel };
}

function renderizarRelatorioOrcamentosAbertos() {
    const container = document.getElementById('relOrcamentosAbertosPainel');
    if (!container) return;

    popularControlesAbertos();

    const { lista, rangeLabel } = filtrarOrcamentosAbertosComDetalhes();
    const totalQtd = lista.length;
    const totalValor = lista.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const ticketMedio = totalQtd > 0 ? totalValor / totalQtd : 0;
    const somaDias = lista.reduce((acc, l) => acc + l.diasOrcamento, 0);
    const mediaDias = totalQtd > 0 ? (somaDias / totalQtd).toFixed(1) : 0;
    const estagnados = lista.filter(l => l.diasOrcamento > 30);
    const estagnadosValor = estagnados.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);

    // Contagem por faixa para os mini-cards de Aging
    const todasFaixas = [
        { key: '0-7', label: '0 a 7 dias', cor: '#215a41', bg: 'rgba(33,90,65,0.08)', desc: 'Recente' },
        { key: '8-15', label: '8 a 15 dias', cor: '#a9761f', bg: 'rgba(169,118,31,0.08)', desc: 'Em andamento' },
        { key: '16-30', label: '16 a 30 dias', cor: '#b85d19', bg: 'rgba(184,93,25,0.08)', desc: 'Atenção' },
        { key: '30+', label: '> 30 dias', cor: '#b3413a', bg: 'rgba(179,65,58,0.08)', desc: 'Crítico / Estagnado' }
    ];

    const estatisticasFaixas = todasFaixas.map(f => {
        const itensFaixa = lista.filter(l => l.faixaAging.key === f.key);
        const valorFaixa = itensFaixa.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
        const pct = totalQtd > 0 ? Math.round((itensFaixa.length / totalQtd) * 100) : 0;
        return {
            ...f,
            qtd: itensFaixa.length,
            valor: valorFaixa,
            pct
        };
    });

    // Bloco de KPIs no Topo
    const kpisHtml = `
        <div class="rel-kpis-grid-4 mb-16">
            <div class="rel-kpi-card">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Orçamentos em Aberto</span>
                    <span class="kpi-card-icon" style="background:rgba(45,72,99,0.12);color:var(--accent-color);">⏳</span>
                </div>
                <div class="kpi-card-val">${totalQtd}</div>
                <div class="kpi-card-sub">Aguardando retorno do cliente</div>
            </div>

            <div class="rel-kpi-card">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Valor Total em Aberto</span>
                    <span class="kpi-card-icon" style="background:rgba(33,90,65,0.12);color:var(--stage-pedido);">💰</span>
                </div>
                <div class="kpi-card-val" style="color:var(--stage-pedido);">${formatarMoeda(totalValor)}</div>
                <div class="kpi-card-sub">Ticket médio: ${formatarMoeda(ticketMedio)}</div>
            </div>

            <div class="rel-kpi-card">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Tempo Médio em Aberto</span>
                    <span class="kpi-card-icon" style="background:rgba(169,118,31,0.12);color:#a9761f;">⏱️</span>
                </div>
                <div class="kpi-card-val">${mediaDias} dias</div>
                <div class="kpi-card-sub">Média de dias desde o envio</div>
            </div>

            <div class="rel-kpi-card" style="border-left:3px solid var(--danger);">
                <div class="kpi-card-header">
                    <span class="kpi-card-title">Críticos (> 30 dias)</span>
                    <span class="kpi-card-icon" style="background:rgba(179,65,58,0.12);color:var(--danger);">🚨</span>
                </div>
                <div class="kpi-card-val" style="color:var(--danger);">${estagnados.length}</div>
                <div class="kpi-card-sub">${formatarMoeda(estagnadosValor)} em risco de perda</div>
            </div>
        </div>
    `;

    // Blocos de Faixas de Dias (Aging Breakdown Interativo)
    const faixasHtml = `
        <div class="rel-aging-cards-grid mb-16">
            ${estatisticasFaixas.map(f => `
                <div class="rel-aging-card ${relAbertosFiltro.faixaDias === f.key ? 'active' : ''}"
                     onclick="filtrarPorFaixaDiasRapido('${f.key}')"
                     title="Clique para filtrar apenas esta faixa de dias">
                    <div class="rel-aging-card-head">
                        <span class="rel-aging-dot" style="background:${f.cor};"></span>
                        <span class="rel-aging-label">${f.label}</span>
                        <span class="rel-aging-desc">${f.desc}</span>
                    </div>
                    <div class="rel-aging-card-body">
                        <div class="rel-aging-qtd" style="color:${f.cor};">${f.qtd} <small class="text-muted text-xs">(${f.pct}%)</small></div>
                        <div class="rel-aging-val">${formatarMoeda(f.valor)}</div>
                    </div>
                    <div class="rel-aging-card-bar">
                        <div style="width:${Math.max(f.pct, 2)}%;background:${f.cor};height:4px;border-radius:2px;"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Tabela detalhada de Orçamentos em Aberto
    let tabelaHtml = '';
    if (lista.length === 0) {
        tabelaHtml = `
            <div class="empty-state" style="padding:32px 16px;">
                <span class="emoji-big">⏳</span>
                <h4 style="margin:8px 0 4px;font-size:16px;">Nenhum orçamento em aberto encontrado</h4>
                <p class="text-muted text-xs">Ajuste os filtros de vendedor, busca ou faixa de dias para visualizar os registros.</p>
            </div>
        `;
    } else {
        const linhas = lista.map((l, i) => {
            const vendedor = (usuarios || []).find(u => u.id === l.usuarioId);
            const dias = l.diasOrcamento;
            const faixa = l.faixaAging;
            const decisorTexto = l.decisor || '—';
            const fone = l.telefone || l.celular || '';
            const whatsLink = fone ? `https://wa.me/55${fone.replace(/\D/g, '')}` : '';
            const dataEntrada = formatarData(l.dataEntradaEtapa || l.dataCriacao);
            const resetado = !!l.orcamentoResetEm;

            // Potencial badge
            let potBadge = '';
            if (l.potencial === 'alto') potBadge = '<span class="badge" style="background:rgba(33,90,65,0.12);color:#215a41;font-size:10px;">Alto</span>';
            else if (l.potencial === 'medio') potBadge = '<span class="badge" style="background:rgba(169,118,31,0.12);color:#a9761f;font-size:10px;">Médio</span>';
            else if (l.potencial === 'baixo') potBadge = '<span class="badge" style="background:rgba(100,116,139,0.12);color:#64748b;font-size:10px;">Baixo</span>';

            return `
                <tr>
                    <td style="font-weight:600;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="avatar-circle" style="background:${corAvatar(l.empresa)};width:28px;height:28px;font-size:11px;">
                                ${iniciais(l.empresa)}
                            </div>
                            <div>
                                <a href="javascript:void(0)" onclick="abrirModalLead('${l.id}')" style="color:var(--text-primary);text-decoration:none;font-weight:700;" title="Abrir card deste lead">
                                    ${l.empresa}
                                </a>
                                <div class="text-muted text-xs">${l.cidade ? `${l.cidade}/${l.estado || ''}` : ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>${decisorTexto}</div>
                        ${fone ? `<div class="text-muted text-xs"><a href="${whatsLink}" target="_blank" style="color:var(--accent-color);text-decoration:none;">💬 ${fone}</a></div>` : ''}
                    </td>
                    <td>
                        <span class="badge" style="background:rgba(45,72,99,0.08);color:var(--text-primary);font-size:11px;">
                            ${vendedor ? vendedor.nome : '—'}
                        </span>
                    </td>
                    <td style="white-space:nowrap;font-size:12px;">
                        ${dataEntrada}
                        ${resetado ? `<div class="text-muted text-xs" style="font-size:10px;color:#a9761f;">↺ contagem resetada</div>` : ''}
                    </td>
                    <td style="text-align:center;">
                        <div class="rel-aging-badge ${faixa.badgeClass}" title="Nesta etapa há ${dias} dias">
                            <span class="rel-aging-badge-num">${dias} ${dias === 1 ? 'dia' : 'dias'}</span>
                            <span class="rel-aging-badge-status">${faixa.status}</span>
                        </div>
                        ${dias >= 30 ? `<div style="font-size:10px;color:var(--danger);font-weight:700;margin-top:2px;">⚠ Limite atingido</div>` : ''}
                    </td>
                    <td style="text-align:center;">
                        ${potBadge || '<span class="text-muted text-xs">—</span>'}
                    </td>
                    <td>
                        ${l.cardObs ? `<span class="card-obs-tag" style="max-width:160px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.cardObs}">${l.cardObs}</span>` : '<span class="text-muted text-xs">—</span>'}
                    </td>
                    <td style="text-align:right;font-weight:700;color:var(--stage-pedido);white-space:nowrap;font-size:13px;">
                        ${formatarMoeda(l.valor || 0)}
                    </td>
                    <td style="text-align:center;white-space:nowrap;">
                        <div class="flex gap-4" style="justify-content:center;">
                            <button type="button" class="btn btn-outline btn-xs" onclick="abrirModalLead('${l.id}')" title="Ver detalhes completos do card">
                                👁️ Ver
                            </button>
                            ${fone ? `
                                <a href="${whatsLink}" target="_blank" class="btn btn-success btn-xs" title="Enviar mensagem no WhatsApp" style="text-decoration:none;">
                                    💬
                                </a>
                            ` : ''}
                            ${typeof resetarContagemOrcamento === 'function' ? `
                                <button type="button" class="btn btn-outline btn-xs" onclick="resetarContagemOrcamento('${l.id}');renderizarRelatorioOrcamentosAbertos();" title="Resetar contagem de dias em orçamento">
                                    ↺
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tabelaHtml = `
            <div class="table-wrapper" style="border:1px solid var(--border-color);border-radius:var(--radius);overflow-x:auto;">
                <table class="table-rel-detalhada">
                    <thead>
                        <tr>
                            <th>Cliente / Empresa</th>
                            <th>Contato / Telefone</th>
                            <th>Vendedor</th>
                            <th>Data Entrada</th>
                            <th style="text-align:center;">Dias em Orçamento (Aging)</th>
                            <th style="text-align:center;">Potencial</th>
                            <th>Observação</th>
                            <th style="text-align:right;">Valor</th>
                            <th style="text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7" style="font-weight:700;text-align:right;">Total em Aberto (${totalQtd} orçamentos):</td>
                            <td style="text-align:right;font-weight:700;color:var(--stage-pedido);">${formatarMoeda(totalValor)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    container.innerHTML = `
        ${kpisHtml}
        ${faixasHtml}
        <div class="rel-fluid-card">
            <div class="rel-fluid-card-title">
                <span>Orçamentos Aguardando Decisão (${rangeLabel})</span>
                <span class="text-muted text-xs">Exibindo ${totalQtd} registro(s)</span>
            </div>
            ${tabelaHtml}
        </div>
    `;
}

function popularControlesAbertos() {
    // Select de vendedores
    const selVendedor = document.getElementById('relAbertosFiltroVendedor');
    if (selVendedor && selVendedor.options.length <= 1) {
        const opcoes = (usuarios || []).map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
        selVendedor.innerHTML = `<option value="">Todos os vendedores</option>${opcoes}`;
        selVendedor.value = relAbertosFiltro.vendedorId;
    }

    // Select de faixas de dias
    const selFaixa = document.getElementById('relAbertosFiltroFaixa');
    if (selFaixa) selFaixa.value = relAbertosFiltro.faixaDias;

    // Ordenação
    const selOrd = document.getElementById('relAbertosOrdenacao');
    if (selOrd) selOrd.value = relAbertosFiltro.ordenacao;
}

function filtrarPorFaixaDiasRapido(faixaKey) {
    if (relAbertosFiltro.faixaDias === faixaKey) {
        relAbertosFiltro.faixaDias = 'todas'; // Desmarca ao clicar novamente
    } else {
        relAbertosFiltro.faixaDias = faixaKey;
    }
    const sel = document.getElementById('relAbertosFiltroFaixa');
    if (sel) sel.value = relAbertosFiltro.faixaDias;
    renderizarRelatorioOrcamentosAbertos();
}

function mudarFiltrosAbertosPainel() {
    const selVendedor = document.getElementById('relAbertosFiltroVendedor');
    const selFaixa = document.getElementById('relAbertosFiltroFaixa');
    const selPotencial = document.getElementById('relAbertosFiltroPotencial');
    const selOrd = document.getElementById('relAbertosOrdenacao');
    const inBusca = document.getElementById('relAbertosBusca');

    if (selVendedor) relAbertosFiltro.vendedorId = selVendedor.value;
    if (selFaixa) relAbertosFiltro.faixaDias = selFaixa.value;
    if (selPotencial) relAbertosFiltro.potencial = selPotencial.value;
    if (selOrd) relAbertosFiltro.ordenacao = selOrd.value;
    if (inBusca) relAbertosFiltro.busca = inBusca.value;

    renderizarRelatorioOrcamentosAbertos();
}

function exportarCsvOrcamentosAbertos() {
    const { lista, rangeLabel } = filtrarOrcamentosAbertosComDetalhes();
    if (lista.length === 0) {
        showToast('Nenhum orçamento em aberto para exportar.', 'error');
        return;
    }

    const headers = [
        'Cliente/Empresa',
        'Contato/Decisor',
        'Telefone',
        'Cidade/UF',
        'Vendedor Responsável',
        'Data Entrada Orçamento',
        'Dias em Orçamento',
        'Faixa de Aging',
        'Limite 30 Dias Excedido',
        'Potencial',
        'Observações do Card',
        'Valor do Orçamento (R$)'
    ];

    const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    const rows = lista.map(l => {
        const vendedor = (usuarios || []).find(u => u.id === l.usuarioId);
        return [
            escapeCsv(l.empresa),
            escapeCsv(l.decisor),
            escapeCsv(l.telefone || l.celular),
            escapeCsv(`${l.cidade || ''}/${l.estado || ''}`),
            escapeCsv(vendedor ? vendedor.nome : ''),
            escapeCsv(formatarData(l.dataEntradaEtapa || l.dataCriacao)),
            l.diasOrcamento,
            escapeCsv(l.faixaAging.label),
            l.limiteExcedido ? 'Sim' : 'Não',
            escapeCsv(l.potencial || '—'),
            escapeCsv(l.cardObs),
            (Number(l.valor) || 0).toFixed(2).replace('.', ',')
        ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Orcamentos_Em_Aberto_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exportação de Orçamentos em Aberto concluída!');
}

function imprimirRelatorioOrcamentosAbertosRico() {
    const { lista, rangeLabel } = filtrarOrcamentosAbertosComDetalhes();
    if (lista.length === 0) {
        showToast('Nenhum orçamento em aberto para imprimir com os filtros atuais.', 'error');
        return;
    }

    const totalValor = lista.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const marcaEmpresa = (typeof empresaAtual !== 'undefined' && empresaAtual) ? empresaAtual : { nome: 'Feitosa CRM', cnpj: '' };

    // Tabela resumo por faixa
    const contagemFaixas = {
        '0 a 7 dias': { count: 0, valor: 0 },
        '8 a 15 dias': { count: 0, valor: 0 },
        '16 a 30 dias': { count: 0, valor: 0 },
        'Mais de 30 dias (Crítico)': { count: 0, valor: 0 }
    };
    lista.forEach(l => {
        const k = l.diasOrcamento <= 7 ? '0 a 7 dias' : (l.diasOrcamento <= 15 ? '8 a 15 dias' : (l.diasOrcamento <= 30 ? '16 a 30 dias' : 'Mais de 30 dias (Crítico)'));
        contagemFaixas[k].count += 1;
        contagemFaixas[k].valor += (Number(l.valor) || 0);
    });

    const linhasAging = Object.entries(contagemFaixas).map(([faixa, d]) => `
        <tr>
            <td><strong>${faixa}</strong></td>
            <td style="text-align:center;">${d.count} (${Math.round((d.count / lista.length) * 100)}%)</td>
            <td style="text-align:right;">${formatarMoeda(d.valor)}</td>
        </tr>
    `).join('');

    const linhas = lista.map((l, i) => {
        const vendedor = (usuarios || []).find(u => u.id === l.usuarioId);
        const dias = l.diasOrcamento;
        const faixa = l.faixaAging;
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${l.empresa}</strong><br><span style="font-size:10px;color:#666;">${l.decisor || ''} • ${l.telefone || ''}</span></td>
                <td>${vendedor ? vendedor.nome : '—'}</td>
                <td>${l.cidade || '—'}/${l.estado || '—'}</td>
                <td style="text-align:center;">${formatarData(l.dataEntradaEtapa || l.dataCriacao)}</td>
                <td style="text-align:center;font-weight:700;color:${dias >= 30 ? '#b3413a' : (dias > 15 ? '#b85d19' : '#215a41')};">
                    ${dias} dias (${faixa.status})
                </td>
                <td><small>${l.cardObs || '—'}</small></td>
                <td style="text-align:right;font-weight:700;color:#215a41;">${formatarMoeda(l.valor || 0)}</td>
            </tr>
        `;
    }).join('');

    const htmlImpressao = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Orçamentos em Aberto (com Dias de Aging)</title>
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1a2332; line-height: 1.4; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #2d4863; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #2d4863; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    tr:nth-child(even) { background: #f8fafc; }
    tfoot td { font-weight: 700; background: #e2e8f0; }
    .grid-resumo { display: flex; gap: 16px; margin-bottom: 16px; }
    .card-kpi { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; flex: 1; background: #fafafa; }
    .card-kpi strong { display: block; font-size: 15px; margin-top: 4px; color: #215a41; }
    @media print { body { padding: 0; } @page { margin: 1cm; size: landscape; } }
</style>
</head><body>
    <h1>Relatório de Orçamentos em Aberto — ${marcaEmpresa.nome || 'CRM'}</h1>
    ${marcaEmpresa.cnpj ? `<div class="meta">CNPJ: ${marcaEmpresa.cnpj}</div>` : ''}
    <div class="meta">
        Visualização: <strong>${rangeLabel}</strong> • Total em aberto: <strong>${lista.length} orçamentos</strong> • Gerado em ${formatarData(hoje())} às ${new Date().toTimeString().slice(0, 5)}
    </div>

    <div class="grid-resumo">
        <div class="card-kpi"><span>Valor Total em Carteira</span><strong>${formatarMoeda(totalValor)}</strong></div>
        <div class="card-kpi"><span>Quantidade em Aberto</span><strong>${lista.length} orçamentos</strong></div>
        <div class="card-kpi"><span>Tempo Médio em Aberto</span><strong style="color:#a9761f;">${(lista.reduce((acc, l) => acc + l.diasOrcamento, 0) / (lista.length || 1)).toFixed(1)} dias</strong></div>
    </div>

    <h2>Distribuição por Faixa de Dias em Orçamento (Aging)</h2>
    <table style="max-width:600px;">
        <thead><tr><th>Faixa de Tempo</th><th style="text-align:center;">Quantidade</th><th style="text-align:right;">Volume em Aberto</th></tr></thead>
        <tbody>${linhasAging}</tbody>
        <tfoot><tr><td>Total</td><td style="text-align:center;">${lista.length}</td><td style="text-align:right;">${formatarMoeda(totalValor)}</td></tr></tfoot>
    </table>

    <h2>Relação Detalhada de Orçamentos em Aberto</h2>
    <table>
        <thead>
            <tr>
                <th style="width:30px;">#</th>
                <th>Cliente / Contato / Telefone</th>
                <th>Vendedor</th>
                <th>Cidade/UF</th>
                <th style="text-align:center;">Entrada</th>
                <th style="text-align:center;">Dias em Orçamento</th>
                <th>Observação</th>
                <th style="text-align:right;">Valor</th>
            </tr>
        </thead>
        <tbody>${linhas}</tbody>
        <tfoot>
            <tr>
                <td colspan="7" style="text-align:right;">VALOR TOTAL EM ABERTO:</td>
                <td style="text-align:right;color:#215a41;">${formatarMoeda(totalValor)}</td>
            </tr>
        </tfoot>
    </table>
</body></html>`;

    imprimirRelatorioHtmlSeguro(htmlImpressao, `Relatório de Orçamentos em Aberto - ${new Date().toLocaleDateString('pt-BR')}`);
}

// Exportações globais
window.relPerdidosFiltro = relPerdidosFiltro;
window.relAbertosFiltro = relAbertosFiltro;
window.renderizarRelatorioPerdidosMotivos = renderizarRelatorioPerdidosMotivos;
window.mudarPeriodoPerdidosRapido = mudarPeriodoPerdidosRapido;
window.mudarOffsetPerdidos = mudarOffsetPerdidos;
window.aplicarFiltroPerdidosPersonalizado = aplicarFiltroPerdidosPersonalizado;
window.filtrarPorMotivoRapido = filtrarPorMotivoRapido;
window.mudarFiltrosPerdidosPainel = mudarFiltrosPerdidosPainel;
window.exportarCsvPerdidosMotivos = exportarCsvPerdidosMotivos;
window.imprimirRelatorioPerdidosMotivos = imprimirRelatorioPerdidosMotivos;

window.renderizarRelatorioOrcamentosAbertos = renderizarRelatorioOrcamentosAbertos;
window.filtrarPorFaixaDiasRapido = filtrarPorFaixaDiasRapido;
window.mudarFiltrosAbertosPainel = mudarFiltrosAbertosPainel;
window.exportarCsvOrcamentosAbertos = exportarCsvOrcamentosAbertos;
window.imprimirRelatorioOrcamentosAbertosRico = imprimirRelatorioOrcamentosAbertosRico;
