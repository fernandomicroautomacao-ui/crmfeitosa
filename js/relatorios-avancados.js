// ============================================
// RELATÓRIOS AVANÇADOS (camada isolada)
// Camada exclusiva de apresentação de relatórios.
// Não altera tabelas existentes do Supabase e possui
// fallback completo para localStorage quando a
// estrutura isolada ainda não foi aplicada.
// ============================================

// ============================================
// CONFIGURAÇÃO E ESTADO DA CAMADA DE RELATÓRIOS
// ============================================
const REL_AVAN_METAS_STORAGE_KEY = 'feitosaReportMetas';
const REL_AVAN_SNAPSHOTS_STORAGE_KEY = 'feitosaReportSnapshots';
const REL_AVAN_SCHEMA_NAME = 'rpt';
const REL_AVAN_SNAPSHOTS_TABLE = 'rpt_report_snapshots';
const REL_AVAN_METAS_TABLE = 'rpt_commission_ledger';

let relAvanMetas = { pedidoMensal: 0, pedidoAnual: 0 };

// -------------------------------------------
// Períodos curtos (hoje/semana) suportados
// somente pela camada de relatórios avançados,
// sem alterar getRangePeriodo do módulo original.
// -------------------------------------------
function relAvanGetRangePeriodo(periodo) {
    const hojeD = new Date();
    if (periodo === 'hoje') {
        const inicio = new Date(hojeD.getFullYear(), hojeD.getMonth(), hojeD.getDate());
        const fim = new Date(hojeD.getFullYear(), hojeD.getMonth(), hojeD.getDate(), 23, 59, 59);
        return { inicio, fim, label: 'Hoje' };
    }
    if (periodo === 'semana') {
        const fim = new Date(hojeD.getFullYear(), hojeD.getMonth(), hojeD.getDate(), 23, 59, 59);
        const inicio = new Date(fim.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { inicio, fim, label: 'Últimos 7 dias' };
    }
    if (periodo === 'trimestre') return getRangePeriodo('trimestre', 0);
    if (periodo === 'ano') return getRangePeriodo('ano', 0);
    if (periodo === 'todos') return getRangePeriodo('todos', 0);
    return getRangePeriodo('mes', 0);
}

function relAvanObterPeriodoAtual() {
    const tipo = document.getElementById('relPeriodoTipo')?.value || relPeriodoTipo || 'mes';
    return { tipo, ...getRangePeriodo(tipo, relPeriodoOffset) };
}

function relAvanMudarPeriodo(periodo) {
    const select = document.getElementById('relPeriodoTipo');
    if (select && periodo && select.querySelector(`option[value="${periodo}"]`)) {
        select.value = periodo;
        if (typeof mudarTipoPeriodo === 'function') mudarTipoPeriodo();
        return;
    }
    renderizarRelatoriosAvancados();
}

function relAvanRestaurarPeriodo() {
    // O painel avançado usa o mesmo período da aba Relatórios.
}

function relAvanAlternarVisao() {
    if (typeof mudarSubAbaRelatorio === 'function') {
        const activeTab = document.querySelector('.rel-fluid-tabs-bar .rel-tab-nav-btn.active');
        const currentTabId = activeTab ? activeTab.getAttribute('data-tab') : 'visao-geral';
        if (currentTabId === 'visao-geral') {
            mudarSubAbaRelatorio('visao-completa');
        } else {
            mudarSubAbaRelatorio('visao-geral');
        }
        return;
    }
    const painel = document.getElementById('relAvanPainel');
    const detalhado = document.getElementById('relAvanDetalhado');
    const botao = document.getElementById('relAvanToggleBtn');
    if (!painel || !detalhado) return;

    const mostrandoDetalhado = detalhado.style.display === 'none';
    painel.style.display = mostrandoDetalhado ? 'none' : 'block';
    detalhado.style.display = mostrandoDetalhado ? 'block' : 'none';
    if (botao) botao.textContent = mostrandoDetalhado ? 'Ver painel de análises' : 'Ver relatórios detalhados';

    if (mostrandoDetalhado) renderizarRelatorios();
    else renderizarRelatoriosAvancados();
}

function salvarMetaRelAvan() {
    const input = document.getElementById('relAvanMetaMensal');
    if (!input) return;
    const valor = parseFloat(input.value) || 0;
    relAvanMetas.pedidoMensal = valor;
    localStorage.setItem(relAvanStorageMetasKey(), JSON.stringify(relAvanMetas));
    renderizarRelatoriosAvancados();
}

function relAvanRestaurarMetaInput() {
    const input = document.getElementById('relAvanMetaMensal');
    if (input && relAvanMetas.pedidoMensal) input.value = relAvanMetas.pedidoMensal;
}

function relAvanStorageMetasKey() {
    return `feitosaReportMetas_${usuarioAtual?.id || 'anonimo'}`;
}

function carregarMetasRelatorios() {
    try {
        const salvo = JSON.parse(localStorage.getItem(relAvanStorageMetasKey()) || 'null');
        relAvanMetas = { pedidoMensal: 0, pedidoAnual: 0, ...(salvo || {}) };
    } catch (e) {
        relAvanMetas = { pedidoMensal: 0, pedidoAnual: 0 };
    }
}

// ============================================
// FORMATAÇÃO DE EIXOS
// ============================================
function relAvanNomeMesCurto(mesIdx) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mesIdx] || '';
}

// ============================================
// EVOLUÇÃO MENSAL DE VENDAS (últimos 12 meses)
// ============================================
function calcularEvolucaoMensal(leadsBase, meses = 12) {
    const series = [];
    const agora = new Date();
    for (let i = meses - 1; i >= 0; i--) {
        const totalMeses = agora.getMonth() - i;
        const ano = agora.getFullYear() + Math.floor(totalMeses / 12);
        const mesIdx = ((totalMeses % 12) + 12) % 12;
        const inicio = new Date(ano, mesIdx, 1);
        const fim = new Date(ano, mesIdx + 1, 0, 23, 59, 59);
        const leadsPedido = leadsBase.filter(l =>
            l.etapa === 'pedido' && dataNoPeriodo(getDataFechamentoPedido(l), inicio, fim)
        );
        series.push({
            label: `${relAvanNomeMesCurto(mesIdx)}/${String(ano).slice(2)}`,
            pedidos: leadsPedido.length,
            valor: leadsPedido.reduce((acc, l) => acc + (l.valor || 0), 0),
            clientes: new Set(leadsPedido.map(l => l.codigoUnico)).size
        });
    }
    return series;
}

function renderizarEvolucaoMensal(series, objetivoId) {
    const container = document.getElementById(objetivoId);
    if (!container) return;
    const maxValor = Math.max(1, ...series.map(s => s.valor));
    const maxPedidos = Math.max(1, ...series.map(s => s.pedidos));

    container.innerHTML = `
        <div class="rel-section-header">
            <div class="rel-section-titulo">Evolução mensal de vendas</div>
            <div class="text-muted" style="font-size:11px;">Contabiliza a entrada de cada card na etapa Pedido</div>
        </div>
        <div class="rel-evo-chart">
            ${series.map(s => {
        const altValor = Math.max(2, Math.round((s.valor / maxValor) * 100));
        const altPedidos = Math.max(2, Math.round((s.pedidos / maxPedidos) * 100));
        return `
                <div class="rel-evo-bar-group">
                    <div class="rel-evo-bar valor" style="height:${altValor}%;" title="${formatarMoeda(s.valor)}"></div>
                    <div class="rel-evo-bar pedidos" style="height:${altPedidos}%;"></div>
                    <div class="rel-evo-label">${s.label}</div>
                    <div class="rel-evo-mini">${formatarMoeda(s.valor)}<br>${s.pedidos} pedidos</div>
                </div>
            `;
    }).join('')}
        </div>
        <div class="rel-evo-legenda">
            <span class="rel-evo-leg valor"></span> Valor vendido
            <span class="rel-evo-leg pedidos"></span> Quantidade de pedidos
        </div>
    `;
}

// ============================================
// FUNIL DE CONVERSÃO POR ETAPA
// ============================================
function calcularFunilConversao(leadsBase) {
    const ordem = ETAPAS.map(e => e.id);
    const porEtapa = {};
    ordem.forEach(id => { porEtapa[id] = 0; });
    leadsBase.forEach(l => {
        if (porEtapa[l.etapa] !== undefined) porEtapa[l.etapa] += 1;
    });

    const etapas = [];
    let anterior = porEtapa[ordem[0]] || 0;
    ordem.forEach((id, i) => {
        const total = porEtapa[id] || 0;
        const taxaAnterior = anterior > 0 ? Math.round((total / anterior) * 100) : null;
        const taxaGeral = porEtapa[ordem[0]] > 0 ? Math.round((total / porEtapa[ordem[0]]) * 100) : 0;
        etapas.push({
            id,
            label: ETAPA_NOMES[id] || id,
            total,
            taxaAnterior,
            taxaGeral,
            largura: porEtapa[ordem[0]] > 0 ? Math.max(8, Math.round((total / porEtapa[ordem[0]]) * 100)) : 8
        });
        anterior = total || 1;
    });
    return etapas;
}

function renderizarFunilConversao(etapas) {
    const container = document.getElementById('relFunilContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="rel-section-header">
            <div class="rel-section-titulo">Funil de conversão por etapa</div>
            <div class="text-muted" style="font-size:11px;">Distribuição atual dos leads entre as etapas do pipeline</div>
        </div>
        ${etapas.map((e, i) => `
            <div class="funil-step">
                <div class="funil-step-info">
                    <span class="funil-step-num">${i + 1}</span>
                    <span class="funil-step-label">${e.label}</span>
                </div>
                <div class="funil-bar-wrap">
                    <div class="funil-bar" style="width:${e.largura}%;"></div>
                    <div class="funil-bar-value">${e.total} <span class="text-muted">(${e.taxaGeral}%)</span></div>
                </div>
                <div class="funil-step-taxa">
                    ${e.taxaAnterior !== null ? `${e.taxaAnterior}% da etapa anterior` : 'etapa inicial'}
                </div>
            </div>
        `).join('')}
    `;
}

// ============================================
// RANKING DE VENDEDORES
// ============================================
function calcularRankingVendedores(leadsBase, perdidosBase) {
    if (usuarioAtual.papel !== 'admin') return [];
    const porUsuario = {};
    leadsBase.forEach(l => {
        const uid = l.usuarioId || 'sem-responsavel';
        if (!porUsuario[uid]) porUsuario[uid] = { leads: 0, pedidos: 0, valor: 0, perdidos: 0 };
        porUsuario[uid].leads += 1;
        if (l.etapa === 'pedido') {
            porUsuario[uid].pedidos += 1;
            porUsuario[uid].valor += (l.valor || 0);
        }
    });
    perdidosBase.forEach(p => {
        const uid = p.usuarioId || 'sem-responsavel';
        if (!porUsuario[uid]) porUsuario[uid] = { leads: 0, pedidos: 0, valor: 0, perdidos: 0 };
        porUsuario[uid].perdidos += 1;
    });
    const usuariosMap = new Map(usuarios.map(u => [u.id, u.nome]));
    return Object.entries(porUsuario)
        .map(([uid, d]) => ({ uid, nome: usuariosMap.get(uid) || 'Sem responsável', ...d }))
        .sort((a, b) => b.valor - a.valor);
}

function renderizarRankingVendedoresAvancado(ranking) {
    const container = document.getElementById('relRankingContainer');
    if (!container) return;
    if (usuarioAtual.papel !== 'admin' || ranking.length === 0) {
        container.innerHTML = usuarioAtual.papel === 'admin'
            ? '<div class="text-muted">Ainda não há leads para compor o ranking.</div>'
            : '';
        return;
    }
    const maxValor = Math.max(1, ...ranking.map(r => r.valor));
    container.innerHTML = `
        <div class="rel-section-header">
            <div class="rel-section-titulo">Ranking de vendas por vendedor</div>
            <div class="text-muted" style="font-size:11px;">Valor total de pedidos por responsável</div>
        </div>
        <table class="rel-rank-table">
            <thead><tr>
                <th>#</th><th>Vendedor</th><th>Leads</th><th>Pedidos</th>
                <th>Perdidos</th><th>Valor vendido</th><th style="min-width:120px;">Participação</th>
            </tr></thead>
            <tbody>${ranking.map((r, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${r.nome}</td>
                    <td>${r.leads}</td>
                    <td>${r.pedidos}</td>
                    <td>${r.perdidos}</td>
                    <td>${formatarMoeda(r.valor)}</td>
                    <td><div class="rel-rank-track"><div class="rel-rank-fill" style="width:${Math.round((r.valor / maxValor) * 100)}%;"></div></div></td>
                </tr>
            `).join('')}</tbody>
        </table>
    `;
}

// ============================================
// MOTIVOS DE PERDA DO PERÍODO
// ============================================
function calcularMotivosPerda(perdidosBase, inicio, fim) {
    const contagem = {};
    perdidosBase
        .filter(p => dataNoPeriodo(p.dataExclusao, inicio, fim))
        .forEach(p => {
            const motivo = (p.motivo || '').trim();
            const chave = motivo || 'Não informado';
            contagem[chave] = (contagem[chave] || 0) + 1;
        });
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]);
}

function renderizarMotivosPerda(motivos) {
    const container = document.getElementById('relMotivosContainer');
    if (!container) return;
    const total = motivos.reduce((acc, m) => acc + m[1], 0);
    if (total === 0) {
        container.innerHTML = '<div class="text-muted">Nenhuma perda registrada no período.</div>';
        return;
    }
    container.innerHTML = `
        <div class="rel-section-header">
            <div class="rel-section-titulo">Motivos de perda</div>
            <div class="text-muted" style="font-size:11px;">Total de ${total} registros no período</div>
        </div>
        ${motivos.map(([motivo, qtd]) => `
            <div class="rel-motivo-item">
                <span class="rel-motivo-nome">${motivo}</span>
                <div class="rel-motivo-track"><div class="rel-motivo-fill" style="width:${Math.max(4, Math.round((qtd / total) * 100))}%;"></div></div>
                <span class="rel-motivo-qtd">${qtd} <span class="text-muted">(${Math.round((qtd / total) * 100)}%)</span></span>
            </div>
        `).join('')}
    `;
}

// ============================================
// AÇÕES DE MELHORIA E RISCOS
// ============================================
function calcularAlertasRelatorio(leadsBase) {
    const agora = Date.now();
    const umMes = 30 * 24 * 60 * 60 * 1000;
    const semContato = leadsBase.filter(l => {
        const ultima = (l.historico || []).length > 0
            ? new Date((l.historico || []).slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0].data).getTime()
            : new Date(l.dataCriacao || 0).getTime();
        return agora - ultima > umMes;
    });
    const proximoAcao = leadsBase.filter(l => l.etapa !== 'pedido' && (l.proximaAcao || '').trim() === '');
    const orcamentoVelho = leadsBase.filter(l => {
        if (l.etapa !== 'orcamento') return false;
        const d = new Date(l.dataCriacao || 0).getTime();
        return agora - d > 30 * 24 * 60 * 60 * 1000;
    });
    return { semContato: semContato.length, proximoAcao: proximoAcao.length, orcamentoVelho: orcamentoVelho.length };
}

function renderizarAlertasRelatorio(alertas) {
    const container = document.getElementById('relAlertasContainer');
    if (!container) return;
    const linhas = [
        { rotulo: 'Leads sem contato há mais de 30 dias', valor: alertas.semContato, tipo: 'risco' },
        { rotulo: 'Leads sem próxima ação definida', valor: alertas.proximoAcao, tipo: 'atencao' },
        { rotulo: 'Orçamentos abertos há mais de 30 dias', valor: alertas.orcamentoVelho, tipo: 'atencao' }
    ].filter(l => l.valor > 0);
    if (linhas.length === 0) {
        container.innerHTML = '<div class="rel-alerta-ok">Nenhum alerta comercial no momento.</div>';
        return;
    }
    container.innerHTML = linhas.map(l => `
        <div class="rel-alerta-item ${l.tipo}">
            <span class="icon-sm" data-icone="${l.tipo === 'risco' ? 'alerta' : 'relogio'}"></span>
            <span>${l.rotulo}</span>
            <span class="rel-alerta-valor">${l.valor}</span>
        </div>
    `).join('');
}

// ============================================
// SAÚDE DO PIPELINE
// ============================================
function calcularSaudePipeline(leadsBase, inicio, fim) {
    const ativos = leadsBase.filter(l => l.etapa !== 'pedido' && dataNoPeriodo(l.dataCriacao, inicio, fim));
    const hojeD = new Date();
    return ETAPAS.filter(e => e.id !== 'pedido').map(e => {
        const etapa = ativos.filter(l => l.etapa === e.id);
        const idades = etapa.map(l => {
            const dataBase = l.dataEntradaEtapa || l.dataCriacao;
            const data = dataBase ? new Date(dataBase).getTime() : hojeD.getTime();
            return Math.max(0, Math.floor((hojeD.getTime() - data) / (24 * 60 * 60 * 1000)));
        });
        const comProximaAcao = etapa.filter(l => (l.proximaAcao || '').trim() && l.proximaData).length;
        const atrasados = etapa.filter(l => l.proximaData && new Date(`${l.proximaData}T23:59:59`).getTime() < hojeD.getTime()).length;
        return {
            id: e.id,
            label: e.label,
            count: etapa.length,
            valor: etapa.reduce((acc, l) => acc + (l.valor || 0), 0),
            idadeMedia: idades.length ? Math.round(idades.reduce((acc, d) => acc + d, 0) / idades.length) : 0,
            cobertura: etapa.length ? Math.round((comProximaAcao / etapa.length) * 100) : 0,
            atrasados
        };
    });
}

function renderizarSaudePipeline(saude) {
    const container = document.getElementById('relSaudePipelineContainer');
    if (!container) return;
    const total = saude.reduce((acc, e) => acc + e.count, 0);
    if (!total) {
        container.innerHTML = '<div class="text-muted">Nenhum lead em andamento no período.</div>';
        return;
    }
    container.innerHTML = `
        <div class="rel-section-header">
            <div class="rel-section-titulo">Saúde do pipeline</div>
            <div class="text-muted" style="font-size:11px;">Idade média, cobertura de próxima ação e pendências por etapa</div>
        </div>
        <div class="table-wrapper rel-table-scroll">
            <table class="rel-gestao-table">
                <thead><tr><th>Etapa</th><th>Leads</th><th>Valor</th><th>Idade média</th><th>Próxima ação</th><th>Atrasados</th></tr></thead>
                <tbody>${saude.map(e => `
                    <tr>
                        <td>${e.label}</td>
                        <td>${e.count}</td>
                        <td>${formatarMoeda(e.valor)}</td>
                        <td>${e.idadeMedia} dia(s)</td>
                        <td><span class="rel-status-pill ${e.cobertura >= 70 ? 'ok' : e.cobertura > 0 ? 'warn' : 'risk'}">${e.cobertura}% coberto</span></td>
                        <td>${e.atrasados > 0 ? `<span class="rel-alerta-valor">${e.atrasados}</span>` : '0'}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
        </div>
    `;
}

// ============================================
// POTENCIAL X PIPELINE
// ============================================
function calcularPotencialPipeline(leadsBase, inicio, fim) {
    const pesos = { A: 0.8, B: 0.5, C: 0.2 };
    const nomes = { A: 'A — Alto', B: 'B — Médio', C: 'C — Baixo' };
    const grupos = ['A', 'B', 'C'].map(chave => {
        const lista = leadsBase.filter(l => l.etapa !== 'pedido' && dataNoPeriodo(l.dataCriacao, inicio, fim) && (l.potencial || 'B').toUpperCase() === chave);
        const valor = lista.reduce((acc, l) => acc + (l.valor || 0), 0);
        return { chave, nome: nomes[chave], count: lista.length, valor, ponderado: valor * pesos[chave], peso: pesos[chave] };
    });
    return { grupos, totalPonderado: grupos.reduce((acc, g) => acc + g.ponderado, 0) };
}

function renderizarPotencialPipeline(resultado) {
    const container = document.getElementById('relPotencialGestaoContainer');
    if (!container) return;
    const total = resultado.grupos.reduce((acc, g) => acc + g.count, 0);
    if (!total) {
        container.innerHTML = '<div class="text-muted">Nenhum pipeline classificado por potencial no período.</div>';
        return;
    }
    const max = Math.max(...resultado.grupos.map(g => g.valor), 1);
    container.innerHTML = `
        <div class="rel-section-header">
            <div class="rel-section-titulo">Potencial x pipeline</div>
            <div class="text-muted" style="font-size:11px;">Previsão ponderada: A 80%, B 50% e C 20%</div>
        </div>
        <div class="rel-potencial-grid">
            ${resultado.grupos.map(g => `
                <div class="rel-potencial-item">
                    <div class="rel-potencial-top"><strong>${g.nome}</strong><span>${g.count} lead(s)</span></div>
                    <div class="rel-rank-track"><div class="rel-rank-fill" style="width:${Math.round((g.valor / max) * 100)}%;"></div></div>
                    <div class="rel-potencial-values"><span>${formatarMoeda(g.valor)}</span><strong>${formatarMoeda(g.ponderado)} provável</strong></div>
                </div>
            `).join('')}
        </div>
        <div class="rel-gestao-total">Valor provável do pipeline: <strong>${formatarMoeda(resultado.totalPonderado)}</strong></div>
    `;
}

// ============================================
// EXPORTAÇÃO E SNAPSHOT (camada isolada)
// ============================================
async function salvarSnapshotRelatorio() {
    const leadsBase = getLeadsVisiveis();
    const snapshot = {
        geradoEm: new Date().toISOString(),
        usuarioId: usuarioAtual?.id || null,
        seriesMensais: calcularEvolucaoMensal(leadsBase, 12),
        alertas: calcularAlertasRelatorio(leadsBase),
        funil: calcularFunilConversao(leadsBase),
        ranking: calcularRankingVendedores(leadsBase, getPerdidosVisiveis())
    };

    const snapshots = JSON.parse(localStorage.getItem(REL_AVAN_SNAPSHOTS_STORAGE_KEY) || '[]');
    snapshots.push(snapshot);
    while (snapshots.length > 24) snapshots.shift();
    localStorage.setItem(REL_AVAN_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));

    let sincronizado = false;
    try {
        if (typeof supabaseClient !== 'undefined' && usuarioAtual?.id) {
            const { error } = await supabaseClient.from(REL_AVAN_SNAPSHOTS_TABLE).insert({
                usuario_id: usuarioAtual.id,
                papel_usuario: usuarioAtual.papel || 'vendedor',
                dados: snapshot,
                criado_em: new Date().toISOString()
            });
            sincronizado = !error;
            if (error) console.warn('Snapshot não sincronizado (estrutura isolada ainda não aplicada):', error.message);
        }
    } catch (e) {
        console.warn('Falha ao salvar snapshot:', e);
    }
    return sincronizado;
}

function exportarRelatorioCsv() {
    const leadsBase = getLeadsVisiveis();
    const series = calcularEvolucaoMensal(leadsBase, 12);
    const linhas = ['Periodo,Pedidos,Valor,Clientes'];
    series.forEach(s => {
        linhas.push(`${s.label},${s.pedidos},${Math.round(s.valor)},${s.clientes}`);
    });
    baixarArquivoTexto(linhas.join('\n'), 'relatorio-evolucao-vendas.csv', 'text/csv');
    showToast('Relatório de evolução exportado em CSV.', 'success');
}

function baixarArquivoTexto(conteudo, nome, tipo) {
    const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// RENDERIZAÇÃO GERAL DA NOVA CAMADA
// ============================================
async function renderizarRelatoriosAvancados() {
    const leadsBase = typeof getLeadsRelatorio === 'function' ? getLeadsRelatorio() : getLeadsVisiveis();
    const perdidosBase = typeof getPerdidosRelatorio === 'function' ? getPerdidosRelatorio() : getPerdidosVisiveis();
    const periodoInfo = relAvanObterPeriodoAtual();
    const tipo = periodoInfo.tipo;
    const periodoValido = tipo !== 'personalizado' || Boolean(periodoInfo.inicio);
    const { inicio, fim } = periodoInfo;
    const leadsPeriodo = periodoValido ? leadsBase.filter(l => dataNoPeriodo(l.dataCriacao, inicio, fim)) : [];
    const perdidosPeriodo = periodoValido ? perdidosBase.filter(p => dataNoPeriodo(p.dataExclusao, inicio, fim)) : [];
    const metricas = periodoValido ? calcularMetricasPeriodo(leadsBase, inicio, fim) : calcularMetricasPeriodo([], null, null);
    const alertas = calcularAlertasRelatorio(leadsPeriodo);

    window.__relAvanLabelPeriodo = periodoInfo.label;
    const vinculo = document.getElementById('relAvanPeriodoVinculado');
    if (vinculo) vinculo.textContent = periodoValido ? `Período integrado: ${periodoInfo.label}` : 'Período personalizado incompleto';

    renderizarResumoRelatorioHierarquizado(metricas);
    renderizarEvolucaoMensal(calcularEvolucaoMensal(leadsBase, 12), 'relEvolucaoContainer');
    renderizarFunilConversao(calcularFunilConversao(leadsPeriodo));
    renderizarRankingVendedoresAvancado(calcularRankingVendedores(leadsPeriodo, perdidosPeriodo));
    renderizarMotivosPerda(calcularMotivosPerda(perdidosPeriodo, null, null));
    renderizarAlertasRelatorio(alertas);
    renderizarSaudePipeline(calcularSaudePipeline(leadsPeriodo, null, null));
    renderizarPotencialPipeline(calcularPotencialPipeline(leadsPeriodo, null, null));
    renderizarIndicadoresGestao(calcularIndicadoresGestao(leadsPeriodo, perdidosPeriodo));
    renderizarPipelineNecessario(relAvanMetas.pedidoMensal, leadsPeriodo, metricas.valorPorEtapa);

    if (!window.__relAvanSnapshotAgendado) {
        window.__relAvanSnapshotAgendado = true;
        try { await salvarSnapshotRelatorio(); } catch (e) { /* ignora falha silenciosa */ }
    }
}

// ============================================
// RESUMO HIERARQUIZADO (KPIs com destaque)
// ============================================
function renderizarResumoRelatorioHierarquizado(metricas) {
    const container = document.getElementById('relKpisHierContainer');
    if (!container) return;

    const principais = [
        { rotulo: 'Faturamento do período', valor: formatarMoeda(metricas.valorPedidos), destaque: true, sub: `${metricas.totalPedidos} pedidos fechados` },
        { rotulo: 'Taxa de conversão', valor: `${metricas.taxaConversao}%`, destaque: true, sub: `Leads convertidos em pedido` },
        { rotulo: 'Ticket médio', valor: formatarMoeda(metricas.ticketMedio), destaque: false, sub: 'Por pedido do período' },
        { rotulo: 'Clientes únicos', valor: String(metricas.clientesUnicos), destaque: false, sub: 'Compraram no período' },
        { rotulo: 'Novos leads', valor: String(metricas.total), destaque: false, sub: 'Criados no período' },
        { rotulo: 'Pipeline em orçamento', valor: formatarMoeda(metricas.valorPorEtapa.orcamento || 0), destaque: false, sub: `${metricas.porEtapa.orcamento || 0} orçamentos abertos` }
    ];

    const metaMensal = relAvanMetas.pedidoMensal || 0;
    const atingido = metaMensal > 0 ? Math.min(100, Math.round((metricas.valorPedidos / metaMensal) * 100)) : 0;
    const labelPeriodo = window.__relAvanLabelPeriodo || 'Este mês';

    container.innerHTML = `
        <div class="rel-kpi-principal" ${metaMensal > 0 ? 'style="flex-basis:100%;"' : ''}>
            ${principais.filter(p => p.destaque).map(p => `
                <div class="rel-kpi-card destaque">
                    <div class="rel-kpi-rotulo">${p.rotulo}</div>
                    <div class="rel-kpi-valor">${p.valor}</div>
                    <div class="rel-kpi-sub">${p.sub}</div>
                </div>
            `).join('')}
            ${metaMensal > 0 ? `
                <div class="rel-kpi-meta">
                    <div class="rel-kpi-rotulo">Meta do mês</div>
                    <div class="rel-kpi-valor">${formatarMoeda(metaMensal)}</div>
                    <div class="rel-meta-track"><div class="rel-meta-fill" style="width:${atingido}%;"></div></div>
                    <div class="rel-kpi-sub">${formatarMoeda(Math.max(0, metaMensal - metricas.valorPedidos))} restantes</div>
                </div>
            ` : ''}
        </div>
        <div class="rel-kpi-secundario">
            ${principais.filter(p => !p.destaque).map(p => `
                <div class="rel-kpi-card">
                    <div class="rel-kpi-rotulo">${p.rotulo}</div>
                    <div class="rel-kpi-valor">${p.valor}</div>
                    <div class="rel-kpi-sub">${p.sub}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// INICIALIZAÇÃO DA CAMADA
// ============================================
if (typeof aplicarIdentidadeEmpresa === 'undefined') { /* nada */ }
carregarMetasRelatorios();
window.renderizarRelatoriosAvancados = renderizarRelatoriosAvancados;
window.exportarRelatorioCsv = exportarRelatorioCsv;
window.relAvanMudarPeriodo = relAvanMudarPeriodo;
window.relAvanAlternarVisao = relAvanAlternarVisao;
window.salvarMetaRelAvan = salvarMetaRelAvan;

relAvanRestaurarPeriodo();
relAvanRestaurarMetaInput();


// ============================================
// INDICADORES COMPLEMENTARES DE GESTÃO
// ============================================
function calcularIndicadoresGestao(leadsPeriodo, perdidosPeriodo) {
    const pedidos = leadsPeriodo.filter(l => l.etapa === 'pedido');
    const perdasProposta = perdidosPeriodo.filter(p => p.etapaOrigem === 'orcamento');
    const decisoes = pedidos.length + perdasProposta.length;
    const interacoes = leadsPeriodo.reduce((acc, l) => acc + (l.historico || []).filter(h => (h.tipo || '').toLowerCase() !== 'movimento').length, 0);
    const pedidosComInteracao = pedidos.filter(l => (l.historico || []).length > 0);
    const touchpointsMedios = pedidos.length ? interacoes / pedidos.length : 0;
    const pendentes = leadsPeriodo.filter(l => (l.proximaAcao || '').trim() && l.proximaData).length;
    const executadas = leadsPeriodo.reduce((acc, l) => acc + (l.historico || []).filter(h => /concluíd|concluíd|executad/i.test(h.descricao || '')).length, 0);
    const canais = {};
    leadsPeriodo.forEach(l => (l.historico || []).forEach(h => {
        const tipo = (h.tipo || '').trim();
        if (!tipo || tipo.toLowerCase() === 'movimento') return;
        canais[tipo] = (canais[tipo] || 0) + 1;
    }));

    const agora = Date.now();
    const stale = leadsPeriodo.filter(l => {
        if (l.etapa === 'pedido') return false;
        const historico = (l.historico || []).slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
        const ultima = historico[0]?.data || l.dataCriacao;
        return ultima && agora - new Date(ultima).getTime() > 30 * 24 * 60 * 60 * 1000;
    }).length;

    const porLocal = {};
    leadsPeriodo.forEach(l => {
        const local = [l.cidade, l.estado].filter(Boolean).join('/') || 'Não informado';
        if (!porLocal[local]) porLocal[local] = { leads: 0, pedidos: 0, valor: 0 };
        porLocal[local].leads += 1;
        if (l.etapa === 'pedido') {
            porLocal[local].pedidos += 1;
            porLocal[local].valor += l.valor || 0;
        }
    });

    const porCliente = {};
    pedidos.forEach(l => {
        const id = l.codigoUnico || l.id;
        if (!porCliente[id]) porCliente[id] = { empresa: l.empresa, valor: 0 };
        porCliente[id].valor += l.valor || 0;
    });
    const clientes = Object.values(porCliente).sort((a, b) => b.valor - a.valor);
    const faturamento = clientes.reduce((acc, c) => acc + c.valor, 0);
    let acumulado = 0;
    const abc = { A: 0, B: 0, C: 0 };
    clientes.forEach(c => {
        const pctAntes = faturamento > 0 ? acumulado / faturamento : 0;
        const faixa = pctAntes < 0.8 ? 'A' : pctAntes < 0.95 ? 'B' : 'C';
        abc[faixa] += 1;
        acumulado += c.valor;
    });

    return {
        winRate: decisoes ? Math.round((pedidos.length / decisoes) * 100) : 0,
        lossRate: decisoes ? Math.round((perdasProposta.length / decisoes) * 100) : 0,
        touchpointsMedios: pedidos.length ? touchpointsMedios : 0,
        pendentes,
        executadas,
        stale,
        canais: Object.entries(canais).sort((a, b) => b[1] - a[1]),
        locais: Object.entries(porLocal).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5),
        abc,
        clientes: clientes.length,
        pedidosComInteracao: pedidosComInteracao.length
    };
}

function renderizarIndicadoresGestao(indicadores) {
    const container = document.getElementById('relIndicadoresGestaoContainer');
    if (!container) return;
    const totalCanais = indicadores.canais.reduce((acc, [, qtd]) => acc + qtd, 0);
    const taxaExecucao = indicadores.pendentes + indicadores.executadas > 0
        ? Math.round((indicadores.executadas / (indicadores.pendentes + indicadores.executadas)) * 100)
        : 0;
    const locaisHtml = indicadores.locais.length
        ? indicadores.locais.map(([local, d]) => `<tr><td>${local}</td><td>${d.leads}</td><td>${d.pedidos}</td><td>${formatarMoeda(d.valor)}</td></tr>`).join('')
        : '<tr><td colspan="4">Sem localização informada no período.</td></tr>';
    const canaisHtml = indicadores.canais.length
        ? indicadores.canais.map(([canal, qtd]) => `<div class="rel-indicador-row"><span>${canal}</span><strong>${qtd} ${totalCanais ? `<small>(${Math.round((qtd / totalCanais) * 100)}%)</small>` : ''}</strong></div>`).join('')
        : '<div class="text-muted">Nenhuma interação registrada.</div>';

    container.innerHTML = `
        <div class="rel-section-header">
            <div class="rel-section-titulo">Indicadores complementares de gestão</div>
            <div class="text-muted" style="font-size:11px;">Métricas calculadas a partir dos leads, histórico e pedidos do período</div>
        </div>
        <div class="rel-indicadores-grid">
            <button type="button" class="rel-indicador-box rel-indicador-interativo" onclick="abrirDetalheIndicadorGestao('win-rate')" title="Abrir detalhamento do win rate"><span>Win rate</span><strong>${indicadores.winRate}%</strong><small>propostas convertidas</small><em>Ver detalhes</em></button>
            <button type="button" class="rel-indicador-box rel-indicador-interativo" onclick="abrirDetalheIndicadorGestao('loss-rate')" title="Abrir detalhamento do loss rate"><span>Loss rate</span><strong>${indicadores.lossRate}%</strong><small>propostas perdidas</small><em>Ver detalhes</em></button>
            <button type="button" class="rel-indicador-box rel-indicador-interativo" onclick="abrirDetalheIndicadorGestao('touchpoints')" title="Abrir detalhamento dos touchpoints"><span>Touchpoints médios</span><strong>${indicadores.touchpointsMedios.toFixed(1)}</strong><small>interações por pedido</small><em>Ver detalhes</em></button>
            <button type="button" class="rel-indicador-box rel-indicador-interativo" onclick="abrirDetalheIndicadorGestao('stale')" title="Abrir detalhamento dos negócios estagnados"><span>Negócios estagnados</span><strong>${indicadores.stale}</strong><small>sem contato há mais de 30 dias</small><em>Ver detalhes</em></button>
            <button type="button" class="rel-indicador-box rel-indicador-interativo" onclick="abrirDetalheIndicadorGestao('tasks')" title="Abrir detalhamento da execução de tarefas"><span>Execução de tarefas</span><strong>${taxaExecucao}%</strong><small>${indicadores.executadas} executadas / ${indicadores.pendentes} pendentes</small><em>Ver detalhes</em></button>
            <button type="button" class="rel-indicador-box rel-indicador-interativo" onclick="abrirDetalheIndicadorGestao('abc')" title="Abrir detalhamento da curva ABC"><span>Clientes na curva ABC</span><strong>${indicadores.clientes}</strong><small>A: ${indicadores.abc.A} • B: ${indicadores.abc.B} • C: ${indicadores.abc.C}</small><em>Ver detalhes</em></button>
        </div>
        <div class="rel-indicadores-subgrid">
            <div>
                <h4>Atividades por canal</h4>
                ${canaisHtml}
            </div>
            <div class="rel-table-scroll">
                <h4>Distribuição geográfica</h4>
                <table class="rel-gestao-table"><thead><tr><th>Local</th><th>Leads</th><th>Pedidos</th><th>Valor</th></tr></thead><tbody>${locaisHtml}</tbody></table>
            </div>
        </div>
    `;
}


// ============================================
// DETALHAMENTO INTERATIVO DOS INDICADORES
// ============================================
function relAvanEscapar(valor) {
    return String(valor ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function relAvanDadosIndicadorAtual() {
    const leadsBase = typeof getLeadsRelatorio === 'function' ? getLeadsRelatorio() : getLeadsVisiveis();
    const perdidosBase = typeof getPerdidosRelatorio === 'function' ? getPerdidosRelatorio() : getPerdidosVisiveis();
    const periodo = relAvanObterPeriodoAtual();
    const valido = periodo.tipo !== 'personalizado' || Boolean(periodo.inicio);
    return {
        periodo,
        valido,
        leads: valido ? leadsBase.filter(l => dataNoPeriodo(l.dataCriacao, periodo.inicio, periodo.fim)) : [],
        perdidos: valido ? perdidosBase.filter(p => dataNoPeriodo(p.dataExclusao, periodo.inicio, periodo.fim)) : []
    };
}

function relAvanDataUltimaInteracao(lead) {
    const historico = (lead?.historico || []).filter(h => (h.tipo || '').toLowerCase() !== 'movimento').slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    return historico[0]?.data || lead?.dataCriacao || '';
}

function relAvanLinhaTabela(celulas, classe = '') {
    return `<tr class="${classe}">${celulas.map(c => `<td>${c}</td>`).join('')}</tr>`;
}

function relAvanTabelaDetalhe(titulo, cabecalho, linhas, vazio = 'Nenhum registro encontrado no período.') {
    return `<section class="rel-detalhe-bloco"><h3>${titulo}</h3>${linhas.length ? `<div class="rel-detalhe-tabela-scroll"><table class="rel-detalhe-table"><thead><tr>${cabecalho.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table></div>` : `<div class="text-muted">${vazio}</div>`}</section>`;
}

function relAvanMontarDetalheIndicador(chave, dados) {
    const { leads, perdidos, periodo } = dados;
    const labelPeriodo = periodo.label || 'Período selecionado';
    const pedidos = leads.filter(l => l.etapa === 'pedido');
    const perdasProposta = perdidos.filter(p => p.etapaOrigem === 'orcamento');
    const decisoes = pedidos.length + perdasProposta.length;
    const descricao = {
        'win-rate': 'Percentual de propostas originadas em Orçamento que foram convertidas em Pedido.',
        'loss-rate': 'Percentual de propostas originadas em Orçamento que foram perdidas.',
        touchpoints: 'Média de interações não relacionadas a movimento de etapa por pedido fechado.',
        stale: 'Leads ativos cuja última interação ou criação ocorreu há mais de 30 dias.',
        tasks: 'Resumo operacional de próximas ações cadastradas e atividades concluídas.',
        abc: 'Clientes ordenados pelo valor vendido e distribuídos pela contribuição acumulada.'
    }[chave] || 'Detalhamento calculado a partir dos registros do CRM.';

    let resumo = '';
    let conteudo = '';
    if (chave === 'win-rate' || chave === 'loss-rate') {
        const win = pedidos.length;
        const loss = perdasProposta.length;
        resumo = `<div class="rel-detalhe-kpis"><div><span>Decisões</span><strong>${decisoes}</strong></div><div><span>Pedidos</span><strong>${win}</strong></div><div><span>Perdas</span><strong>${loss}</strong></div><div><span>Taxa</span><strong>${decisoes ? Math.round(((chave === 'win-rate' ? win : loss) / decisoes) * 100) : 0}%</strong></div></div>`;
        const linhasPedidos = pedidos.map(l => relAvanLinhaTabela([relAvanEscapar(l.empresa), 'Pedido', relAvanEscapar(formatarMoeda(l.valor || 0)), relAvanEscapar(formatarData(l.dataPedido || l.dataCriacao))]));
        const linhasPerdas = perdasProposta.map(p => relAvanLinhaTabela([relAvanEscapar(p.empresa || '—'), 'Perdido', relAvanEscapar(p.motivo || 'Não informado'), relAvanEscapar(formatarData(p.dataExclusao))]));
        conteudo = relAvanTabelaDetalhe('Registros que compõem o cálculo', ['Empresa', 'Resultado', chave === 'win-rate' ? 'Valor' : 'Motivo', 'Data'], [...linhasPedidos, ...linhasPerdas]);
    } else if (chave === 'touchpoints') {
        const linhas = pedidos.map(l => {
            const interacoes = (l.historico || []).filter(h => (h.tipo || '').toLowerCase() !== 'movimento');
            const tipos = [...new Set(interacoes.map(h => h.tipo).filter(Boolean))].join(', ') || 'Sem interação';
            return relAvanLinhaTabela([relAvanEscapar(l.empresa), interacoes.length, relAvanEscapar(tipos), relAvanEscapar(formatarData(l.dataPedido || l.dataCriacao))]);
        });
        const total = pedidos.reduce((acc, l) => acc + (l.historico || []).filter(h => (h.tipo || '').toLowerCase() !== 'movimento').length, 0);
        resumo = `<div class="rel-detalhe-kpis"><div><span>Pedidos</span><strong>${pedidos.length}</strong></div><div><span>Interações</span><strong>${total}</strong></div><div><span>Média</span><strong>${pedidos.length ? (total / pedidos.length).toFixed(1) : '0.0'}</strong></div></div>`;
        conteudo = relAvanTabelaDetalhe('Interações por pedido', ['Empresa', 'Interações', 'Canais registrados', 'Data do pedido'], linhas);
    } else if (chave === 'stale') {
        const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const estagnados = leads.filter(l => l.etapa !== 'pedido' && new Date(relAvanDataUltimaInteracao(l)).getTime() < limite);
        const linhas = estagnados.map(l => relAvanLinhaTabela([relAvanEscapar(l.empresa), relAvanEscapar(ETAPA_NOMES[l.etapa] || l.etapa), relAvanEscapar(formatarData(relAvanDataUltimaInteracao(l))), relAvanEscapar(l.proximaAcao || 'Sem próxima ação')]));
        resumo = `<div class="rel-detalhe-kpis"><div><span>Estagnados</span><strong>${estagnados.length}</strong></div><div><span>Critério</span><strong>&gt; 30 dias</strong></div><div><span>Ativos analisados</span><strong>${leads.filter(l => l.etapa !== 'pedido').length}</strong></div></div>`;
        conteudo = relAvanTabelaDetalhe('Leads que precisam de acompanhamento', ['Empresa', 'Etapa', 'Última interação', 'Próxima ação'], linhas);
    } else if (chave === 'tasks') {
        const pendentes = leads.filter(l => l.etapa !== 'pedido' && l.proximaAcao && l.proximaData);
        const executadas = leads.reduce((acc, l) => acc + (l.historico || []).filter(h => /concluíd|executad/i.test(h.descricao || '')).length, 0);
        const linhas = pendentes.map(l => relAvanLinhaTabela([relAvanEscapar(l.empresa), relAvanEscapar(l.proximaAcao), relAvanEscapar(formatarData(l.proximaData)), new Date(`${l.proximaData}T23:59:59`).getTime() < Date.now() ? 'Atrasada' : 'Agendada']));
        resumo = `<div class="rel-detalhe-kpis"><div><span>Executadas</span><strong>${executadas}</strong></div><div><span>Pendentes</span><strong>${pendentes.length}</strong></div><div><span>Taxa operacional</span><strong>${executadas + pendentes.length ? Math.round((executadas / (executadas + pendentes.length)) * 100) : 0}%</strong></div></div>`;
        conteudo = relAvanTabelaDetalhe('Próximas ações cadastradas', ['Empresa', 'Ação', 'Data', 'Status'], linhas);
    } else if (chave === 'abc') {
        const porCliente = {};
        pedidos.forEach(l => {
            const id = l.codigoUnico || l.id;
            if (!porCliente[id]) porCliente[id] = { empresa: l.empresa, valor: 0, pedidos: 0 };
            porCliente[id].valor += l.valor || 0;
            porCliente[id].pedidos += 1;
        });
        const clientes = Object.values(porCliente).sort((a, b) => b.valor - a.valor);
        const total = clientes.reduce((acc, c) => acc + c.valor, 0);
        let acumulado = 0;
        const linhas = clientes.map(c => {
            const pctAntes = total ? acumulado / total : 0;
            const faixa = pctAntes < .8 ? 'A' : pctAntes < .95 ? 'B' : 'C';
            acumulado += c.valor;
            return relAvanLinhaTabela([relAvanEscapar(c.empresa || '—'), faixa, c.pedidos, relAvanEscapar(formatarMoeda(c.valor)), `${total ? Math.round((acumulado / total) * 100) : 0}%`]);
        });
        resumo = `<div class="rel-detalhe-kpis"><div><span>Clientes</span><strong>${clientes.length}</strong></div><div><span>Curva A</span><strong>${clientes.filter((_, i) => i === 0).length || 0}</strong></div><div><span>Faturamento</span><strong>${formatarMoeda(total)}</strong></div></div>`;
        conteudo = relAvanTabelaDetalhe('Clientes ordenados por contribuição', ['Empresa', 'Curva', 'Pedidos', 'Valor', 'Acumulado'], linhas);
    }
    return `<div class="rel-detalhe-intro"><span class="rel-detalhe-periodo">${relAvanEscapar(labelPeriodo)}</span><p>${descricao}</p></div>${resumo}${conteudo}`;
}

function abrirDetalheIndicadorGestao(chave) {
    const modal = document.getElementById('relIndicadorDetalheModal');
    const content = document.getElementById('relIndicadorDetalheContent');
    const titulo = document.getElementById('relIndicadorDetalheTitulo');
    if (!modal || !content || !titulo) return;
    const titulos = { 'win-rate': 'Detalhamento do Win rate', 'loss-rate': 'Detalhamento do Loss rate', touchpoints: 'Detalhamento dos Touchpoints', stale: 'Negócios estagnados', tasks: 'Execução de tarefas', abc: 'Clientes na curva ABC' };
    const dados = relAvanDadosIndicadorAtual();
    titulo.textContent = titulos[chave] || 'Detalhamento do indicador';
    content.innerHTML = dados.valido ? relAvanMontarDetalheIndicador(chave, dados) : '<div class="empty-state"><p>Informe as duas datas do período personalizado para visualizar o detalhamento.</p></div>';
    abrirModal('relIndicadorDetalheModal');
}

window.abrirDetalheIndicadorGestao = abrirDetalheIndicadorGestao;
