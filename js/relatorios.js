// ============================================
// RELATÓRIOS
// ============================================
const RELATORIO_KPIS = [
    { key: 'total', label: 'Total Leads', formato: 'numero' },
    { key: 'clientesUnicos', label: 'Clientes', formato: 'numero' },
    { key: 'totalOrcamentos', label: 'Orçamentos', formato: 'numero' },
    { key: 'valorOrcamentos', label: 'Valor Orçamentos', formato: 'moeda' },
    { key: 'totalPedidos', label: 'Pedidos', formato: 'numero' },
    { key: 'valorPedidos', label: 'Valor Pedidos', formato: 'moeda' },
    { key: 'taxaConversao', label: 'Taxa Conversão', formato: 'percentual' },
    { key: 'ticketMedio', label: 'Ticket Médio', formato: 'moeda' }
];

function getRangePeriodo(tipo, offset) {
    const hojeD = new Date();
    let inicio, fim, label, indice, ano;

    if (tipo === 'hoje') {
        const d = new Date(hojeD.getFullYear(), hojeD.getMonth(), hojeD.getDate() + (offset || 0));
        inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        const iso = d.toISOString().split('T')[0];
        label = (offset || 0) === 0 ? 'Hoje' : formatarData(iso);
        indice = null;
        ano = d.getFullYear();
    } else if (tipo === 'semana') {
        const base = new Date(hojeD.getFullYear(), hojeD.getMonth(), hojeD.getDate() + ((offset || 0) * 7));
        const diaSemana = base.getDay();
        const inicioSemana = new Date(base.getFullYear(), base.getMonth(), base.getDate() - diaSemana, 0, 0, 0);
        const fimSemana = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 6, 23, 59, 59);
        inicio = inicioSemana;
        fim = fimSemana;
        const d1 = inicioSemana.toISOString().split('T')[0];
        const d2 = fimSemana.toISOString().split('T')[0];
        label = (offset || 0) === 0 ? 'Últimos 7 dias' : `${formatarData(d1).slice(0, 5)} a ${formatarData(d2).slice(0, 5)}`;
        indice = null;
        ano = inicio.getFullYear();
    } else if (tipo === 'mes') {
        const totalMeses = hojeD.getMonth() + offset;
        ano = hojeD.getFullYear() + Math.floor(totalMeses / 12);
        const mesIdx = ((totalMeses % 12) + 12) % 12;
        inicio = new Date(ano, mesIdx, 1);
        fim = new Date(ano, mesIdx + 1, 0, 23, 59, 59);
        label = `${MESES_ABREV[mesIdx]}/${ano}`;
        indice = mesIdx + 1;
    } else if (tipo === 'trimestre') {
        const trimAtual = Math.floor(hojeD.getMonth() / 3) + offset;
        ano = hojeD.getFullYear() + Math.floor(trimAtual / 4);
        const trimIdx = ((trimAtual % 4) + 4) % 4;
        inicio = new Date(ano, trimIdx * 3, 1);
        fim = new Date(ano, trimIdx * 3 + 3, 0, 23, 59, 59);
        label = `${trimIdx + 1}º Trim/${ano}`;
        indice = trimIdx + 1;
    } else if (tipo === 'semestre') {
        const semAtual = Math.floor(hojeD.getMonth() / 6) + offset;
        ano = hojeD.getFullYear() + Math.floor(semAtual / 2);
        const semIdx = ((semAtual % 2) + 2) % 2;
        inicio = new Date(ano, semIdx * 6, 1);
        fim = new Date(ano, semIdx * 6 + 6, 0, 23, 59, 59);
        label = `${semIdx + 1}º Sem/${ano}`;
        indice = semIdx + 1;
    } else if (tipo === 'ano') {
        ano = hojeD.getFullYear() + offset;
        inicio = new Date(ano, 0, 1);
        fim = new Date(ano, 11, 31, 23, 59, 59);
        label = `${ano}`;
        indice = null;
    } else if (tipo === 'personalizado') {
        const inicioInput = document.getElementById('relDataInicio');
        const fimInput = document.getElementById('relDataFim');
        const inicioStr = inicioInput ? inicioInput.value : '';
        const fimStr = fimInput ? fimInput.value : '';
        if (!inicioStr || !fimStr) {
            return { inicio: null, fim: null, label: 'Selecione o período', indice: null, ano: null };
        }
        inicio = new Date(inicioStr + 'T00:00:00');
        fim = new Date(fimStr + 'T23:59:59');
        label = `${formatarData(inicioStr)} a ${formatarData(fimStr)}`;
        indice = null;
        ano = null;
    } else {
        return { inicio: null, fim: null, label: 'Todo o período', indice: null, ano: null };
    }
    return { inicio, fim, label, indice, ano };
}

function dataNoPeriodo(dataStr, inicio, fim) {
    if (!inicio) return true;
    if (!dataStr) return false;
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return false;
    return d >= inicio && d <= fim;
}

function getDataFechamentoPedido(lead) {
    // A venda pertence ao período em que o card entrou em Pedido.
    if (lead.dataPedido) return lead.dataPedido;
    if (lead.dataEntradaPedido) return lead.dataEntradaPedido;
    const movs = (lead.historico || []).filter(h =>
        h.tipo === 'Movimento' && h.descricao && h.descricao.includes(`para ${ETAPA_NOMES.pedido}`)
    );
    if (movs.length > 0) return movs[movs.length - 1].data;
    // Compatibilidade com registros antigos sem histórico de conversão.
    return (lead.dataCriacao || '').split('T')[0];
}

// ============================================
// FILTRO POR USUÁRIO (exclusivo da aba Relatórios)
// ============================================
function getLeadsRelatorio() {
    if (!usuarioAtual) return [];
    if (usuarioAtual.papel === 'admin') {
        if (relFiltroUsuarioId) {
            return leads.filter(l => l.usuarioId === relFiltroUsuarioId);
        }
        return leads;
    }
    return leads.filter(l => l.usuarioId === usuarioAtual.id);
}

function getPerdidosRelatorio() {
    if (!usuarioAtual) return [];
    if (usuarioAtual.papel === 'admin') {
        if (relFiltroUsuarioId) {
            return perdidos.filter(p => p.usuarioId === relFiltroUsuarioId);
        }
        return perdidos;
    }
    return perdidos.filter(p => p.usuarioId === usuarioAtual.id);
}

function popularFiltroUsuarioRelatorio() {
    const select = document.getElementById('relFiltroUsuario');
    if (!select) return;

    if (usuarioAtual.papel !== 'admin') {
        select.style.display = 'none';
        return;
    }

    select.style.display = 'inline-block';
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todos os vendedores</option>' +
        usuarios.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
    select.value = valorAtual || relFiltroUsuarioId;
}

function mudarFiltroUsuarioRelatorio() {
    relFiltroUsuarioId = document.getElementById('relFiltroUsuario').value;
    renderizarRelatorios();
}

// ============================================
// CÁLCULO PADRÃO DE MÉTRICAS DE UM PERÍODO
// ============================================
function calcularMetricasPeriodo(leadsBase, inicio, fim) {
    const leadsPeriodo = leadsBase.filter(l => dataNoPeriodo(l.dataCriacao, inicio, fim));
    const total = leadsPeriodo.length;
    // Pedidos são filtrados pela data de entrada em Pedido, não pela criação do lead.
    const leadsPedido = leadsBase.filter(l => l.etapa === 'pedido' && dataNoPeriodo(getDataFechamentoPedido(l), inicio, fim));
    const clientesUnicos = new Set(leadsPedido.map(l => l.codigoUnico)).size;

    const leadsOrcamento = leadsPeriodo.filter(l => l.etapa === 'orcamento');
    const valorOrcamentos = leadsOrcamento.reduce((acc, l) => acc + (l.valor || 0), 0);

    // Pedidos/Vendas = soma do valor dos leads que estão hoje na etapa Pedido
    // (mesmo critério do Pipeline e do gráfico "Valor por Etapa" — antes esse
    // total somava também o histórico de pedidos[] de clientes recorrentes,
    // o que inflava o número além do que aparece no board).
    const totalPedidos = leadsPedido.length;
    const valorPedidos = leadsPedido.reduce((acc, l) => acc + (l.valor || 0), 0);

    const taxaConversao = total > 0 ? Math.round((leadsPedido.length / total) * 100) : 0;
    const valorTotalPedidosCriados = leadsPedido.reduce((acc, l) => acc + (l.valor || 0), 0);
    const ticketMedio = leadsPedido.length > 0 ? valorTotalPedidosCriados / leadsPedido.length : 0;

    const porEtapa = {};
    const valorPorEtapa = {};
    ETAPAS.forEach(e => {
        const doEtapa = e.id === 'pedido'
            ? leadsPedido
            : leadsPeriodo.filter(l => l.etapa === e.id);
        porEtapa[e.id] = doEtapa.length;
        valorPorEtapa[e.id] = doEtapa.reduce((acc, l) => acc + (l.valor || 0), 0);
    });

    return {
        total, clientesUnicos,
        totalOrcamentos: leadsOrcamento.length, valorOrcamentos: valorOrcamentos + valorPedidos,
        totalPedidos, valorPedidos,
        taxaConversao, ticketMedio,
        porEtapa, valorPorEtapa
    };
}

// ============================================
// PERDIDOS E STATUS DE ORÇAMENTO NO PERÍODO
// ============================================
function calcularPerdidosPeriodo(perdidosBase, inicio, fim) {
    return perdidosBase
        .filter(p => dataNoPeriodo(p.dataExclusao, inicio, fim))
        .sort((a, b) => (b.dataExclusao || '').localeCompare(a.dataExclusao || ''));
}

function calcularStatusOrcamento(leadsBase, perdidosBase, inicio, fim) {
    const abertos = leadsBase.filter(l => l.etapa === 'orcamento' && dataNoPeriodo(l.dataCriacao, inicio, fim));
    const convertidos = leadsBase.filter(l => l.etapa === 'pedido' && dataNoPeriodo(getDataFechamentoPedido(l), inicio, fim));
    const perdidosOrcamento = perdidosBase.filter(p => p.etapaOrigem === 'orcamento' && dataNoPeriodo(p.dataExclusao, inicio, fim));

    const somar = (lista) => lista.reduce((acc, l) => acc + (l.valor || 0), 0);
    return {
        abertos: { count: abertos.length, valor: somar(abertos) },
        convertidos: { count: convertidos.length, valor: somar(convertidos) },
        perdidos: { count: perdidosOrcamento.length, valor: somar(perdidosOrcamento) }
    };
}

function calcularVariacao(atual, anterior) {
    if (!anterior) {
        if (!atual) return null;
        return { pct: null, dir: 'up', novo: true };
    }
    const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
    return { pct, dir: pct >= 0 ? 'up' : 'down', novo: false };
}

function formatarValorKpi(valor, formato) {
    if (formato === 'moeda') return formatarMoeda(valor);
    if (formato === 'percentual') return `${valor}%`;
    return String(valor);
}

function formatarVariacaoHtml(variacao) {
    if (!variacao) return '<div class="kpi-delta neutro">sem dado no período anterior</div>';
    if (variacao.novo) return '<div class="kpi-delta up">▲ novo no período</div>';
    const seta = variacao.dir === 'up' ? '▲' : '▼';
    const classe = variacao.dir === 'up' ? 'up' : 'down';
    return `<div class="kpi-delta ${classe}">${seta} ${Math.abs(variacao.pct).toFixed(0)}% vs período anterior</div>`;
}

// ============================================
// MEDIDOR RADIAL DE META (meta x realizado)
// ============================================
function medidorMetaHtml(titulo, meta, realizado) {
    const temMeta = meta > 0;
    const pct = temMeta ? Math.round((realizado / meta) * 100) : 0;
    const pctVisual = Math.min(pct, 100);
    const raio = 52;
    const circunferencia = 2 * Math.PI * raio;
    const offset = circunferencia * (1 - (temMeta ? pctVisual : 0) / 100);
    const cor = pct >= 100 ? 'var(--stage-pedido)' : 'var(--stage-leads)';
    const faltaOuExcesso = temMeta
        ? (realizado >= meta
            ? `<span style="color:var(--stage-pedido);font-weight:700;">+${formatarMoeda(realizado - meta)} acima da meta</span>`
            : `faltam <strong>${formatarMoeda(meta - realizado)}</strong>`)
        : 'defina uma meta para acompanhar';

    return `
        <div class="meta-medidor-card">
            <div class="meta-medidor-titulo">${titulo}</div>
            <div class="meta-medidor-radial">
                <svg width="130" height="130" viewBox="0 0 130 130">
                    <circle cx="65" cy="65" r="${raio}" fill="none" stroke="var(--border-color)" stroke-width="14"/>
                    <circle cx="65" cy="65" r="${raio}" fill="none" stroke="${cor}" stroke-width="14"
                        stroke-dasharray="${circunferencia}" stroke-dashoffset="${offset}"
                        transform="rotate(-90 65 65)" style="transition:stroke-dashoffset 0.6s ease;"/>
                </svg>
                <div class="meta-medidor-pct">${temMeta ? pct + '%' : '—'}</div>
            </div>
            <div class="meta-medidor-valores">
                <div><span class="label">Realizado</span><span class="valor">${formatarMoeda(realizado)}</span></div>
                <div><span class="label">Meta</span><span class="valor">${temMeta ? formatarMoeda(meta) : '—'}</span></div>
            </div>
            <div class="meta-medidor-obs">${faltaOuExcesso}</div>
        </div>
    `;
}

function renderizarResumoRelatorio(atual, anterior) {
    const container = document.getElementById('relatorioResumoContainer');
    container.innerHTML = RELATORIO_KPIS.map(kpi => {
        const valorAtual = atual[kpi.key];
        const deltaHtml = anterior ? formatarVariacaoHtml(calcularVariacao(valorAtual, anterior[kpi.key])) : '';
        return `
            <div class="resumo-item">
                <div class="valor">${formatarValorKpi(valorAtual, kpi.formato)}</div>
                <div class="label">${kpi.label}</div>
                ${deltaHtml}
            </div>
        `;
    }).join('');
}

// ============================================
// PIPELINE NECESSÁRIO (cobertura de funil para bater a meta)
// ============================================
function calcularConversaoValorFunil(leadsBase) {
    const ordem = ETAPAS.map(e => e.id);
    const valorPorEtapaAtual = {};
    ordem.forEach(id => valorPorEtapaAtual[id] = 0);
    leadsBase.forEach(l => {
        if (valorPorEtapaAtual[l.etapa] !== undefined) valorPorEtapaAtual[l.etapa] += (l.valor || 0);
    });

    let acumulado = 0;
    const valorAcumulado = {};
    for (let i = ordem.length - 1; i >= 0; i--) {
        acumulado += valorPorEtapaAtual[ordem[i]];
        valorAcumulado[ordem[i]] = acumulado;
    }

    const taxas = {};
    for (let i = 0; i < ordem.length - 1; i++) {
        const atual = ordem[i];
        const proxima = ordem[i + 1];
        taxas[atual] = valorAcumulado[atual] > 0 ? valorAcumulado[proxima] / valorAcumulado[atual] : null;
    }

    return { valorAcumulado, taxas };
}

function calcularPipelineNecessario(metaPedido, taxas) {
    const ordem = ETAPAS.map(e => e.id);
    const necessario = {};
    necessario.pedido = metaPedido;

    for (let i = ordem.length - 2; i >= 0; i--) {
        const atual = ordem[i];
        const proxima = ordem[i + 1];
        const taxa = taxas[atual];
        necessario[atual] = (taxa && taxa > 0) ? necessario[proxima] / taxa : null;
    }
    return necessario;
}

function renderizarPipelineNecessario(metaPedido, leadsBase, valorPorEtapaAtual) {
    const container = document.getElementById('pipelineNecessarioContainer');
    if (!container) return;

    if (!metaPedido || metaPedido <= 0) {
        container.innerHTML = '';
        return;
    }

    const { taxas } = calcularConversaoValorFunil(leadsBase);
    const necessario = calcularPipelineNecessario(metaPedido, taxas);
    const etapasPipeline = ETAPAS.filter(e => e.id !== 'pedido');

    const linhas = etapasPipeline.map(e => {
        const valorNecessario = necessario[e.id];
        const valorAtual = valorPorEtapaAtual[e.id] || 0;

        if (valorNecessario === null) {
            return `
                <div class="bar-item">
                    <span class="bar-label">${e.label}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:0%;"></div></div>
                    <span class="bar-value text-muted" style="font-size:11px;">sem histórico suficiente</span>
                </div>
            `;
        }

        const pct = Math.round((valorAtual / valorNecessario) * 100);
        const statusIcon = svgIcone(pct >= 100 ? 'lembrete' : 'alerta');
        const cor = pct >= 100 ? 'linear-gradient(90deg,#215a41,#2f7d5b)' : 'linear-gradient(90deg,#8a5a3c,#a9761f)';

        return `
            <div class="bar-item">
                <span class="bar-label">${e.label}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.min(pct, 100)}%;background:${cor};"></div></div>
                <span class="bar-value" style="font-size:11px;"><span class="icon-sm">${statusIcon}</span> ${formatarMoeda(valorAtual)} / ${formatarMoeda(valorNecessario)}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">
            Pipeline Necessário para Bater a Meta de Pedido
            <span class="text-muted" style="font-weight:400;">— cobertura de funil, com base na distribuição atual de valor entre etapas</span>
        </div>
        ${linhas}
    `;
}

// ============================================
// METAS RÁPIDAS
// ============================================
function salvarMetaRapida(event) {
    event.preventDefault();
    const anoMes = document.getElementById('metaProgressoCard').dataset.anoMes;
    if (!anoMes) return;
    const valorVendas = parseFloat(document.getElementById('metaRapidaVendas').value) || 0;
    const valorOrcamento = parseFloat(document.getElementById('metaRapidaOrcamento').value) || 0;

    if (!metas[anoMes]) metas[anoMes] = { vendas: 0, orcamento: 0 };
    metas[anoMes].vendas = valorVendas;
    metas[anoMes].orcamento = valorOrcamento;

    salvarDados();
    renderizarRelatorios();
    showToast('Meta atualizada!');
}

function mudarTipoPeriodo() {
    const sel = document.getElementById('relPeriodoTipo');
    if (sel) relPeriodoTipo = sel.value;
    relPeriodoOffset = 0;

    const containerPersonalizado = document.getElementById('relPeriodoPersonalizadoContainer');
    if (containerPersonalizado) {
        containerPersonalizado.style.display = relPeriodoTipo === 'personalizado' ? 'inline-flex' : 'none';
    }

    if (typeof relPerdidosFiltro !== 'undefined') {
        relPerdidosFiltro.periodoTipo = relPeriodoTipo;
        relPerdidosFiltro.offset = 0;
    }

    atualizarUiPeriodoRelatorio();
    renderizarRelatorios();
}

function selecionarPeriodoRapido(tipo) {
    relPeriodoTipo = tipo;
    relPeriodoOffset = 0;

    const select = document.getElementById('relPeriodoTipo');
    if (select) select.value = tipo;

    const containerPersonalizado = document.getElementById('relPeriodoPersonalizadoContainer');
    if (containerPersonalizado) {
        containerPersonalizado.style.display = tipo === 'personalizado' ? 'inline-flex' : 'none';
    }

    if (typeof relPerdidosFiltro !== 'undefined') {
        relPerdidosFiltro.periodoTipo = tipo;
        relPerdidosFiltro.offset = 0;
    }

    atualizarUiPeriodoRelatorio();
    renderizarRelatorios();
}

function atualizarUiPeriodoRelatorio() {
    const pills = document.querySelectorAll('.rel-pills-container .rel-pill-btn');
    pills.forEach(btn => {
        if (btn.getAttribute('data-periodo') === relPeriodoTipo) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const badge = document.getElementById('relPeriodoBadge');
    if (badge) {
        const nomes = {
            hoje: 'Hoje',
            semana: 'Últimos 7 dias',
            mes: 'Mensal',
            trimestre: 'Trimestral',
            semestre: 'Semestral',
            ano: 'Anual',
            todos: 'Todo o período',
            personalizado: 'Personalizado'
        };
        badge.textContent = nomes[relPeriodoTipo] || 'Período';
    }
}

function mudarSubAbaRelatorio(tabId) {
    if (tabId === 'perdas-orcamentos') {
        tabId = 'orcamentos-perdidos';
    }

    const tabs = document.querySelectorAll('.rel-fluid-tabs-bar .rel-tab-nav-btn');
    tabs.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const panes = document.querySelectorAll('.rel-tab-pane');
    panes.forEach(pane => {
        if (tabId === 'visao-completa') {
            pane.classList.add('active');
            pane.classList.add('rel-pane-full-view');
        } else {
            pane.classList.remove('rel-pane-full-view');
            if (pane.id === `rel-pane-${tabId}` || (tabId === 'orcamentos-perdidos' && pane.id === 'rel-pane-orcamentos-perdidos')) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        }
    });

    try {
        localStorage.setItem('feitosaRelatorioSubAba', tabId);
    } catch (e) {}

    if (tabId === 'orcamentos-abertos' || tabId === 'visao-completa') {
        if (typeof renderizarRelatorioOrcamentosAbertos === 'function') {
            renderizarRelatorioOrcamentosAbertos();
        }
    }
    if (tabId === 'orcamentos-perdidos' || tabId === 'visao-completa') {
        if (typeof renderizarRelatorioPerdidosMotivos === 'function') {
            renderizarRelatorioPerdidosMotivos();
        }
    }
}

function inicializarSubAbasRelatorio() {
    let saved = 'visao-geral';
    try {
        saved = localStorage.getItem('feitosaRelatorioSubAba') || 'visao-geral';
    } catch (e) {}
    if (saved === 'perdas-orcamentos') saved = 'orcamentos-perdidos';
    mudarSubAbaRelatorio(saved);
}

function aplicarPeriodoPersonalizado() {
    const inicioInput = document.getElementById('relDataInicio');
    const fimInput = document.getElementById('relDataFim');
    if (inicioInput && fimInput && inicioInput.value && fimInput.value && inicioInput.value > fimInput.value) {
        showToast('A data início não pode ser depois da data fim!', 'error');
        return;
    }
    renderizarRelatorios();
}

function mudarPeriodoOffset(delta) {
    relPeriodoOffset += delta;
    if (typeof relPerdidosFiltro !== 'undefined') {
        relPerdidosFiltro.offset = relPeriodoOffset;
    }
    renderizarRelatorios();
}

// ============================================
// RENDERIZAÇÃO PRINCIPAL
// ============================================
function renderizarRelatorios() {
    const tipoSelect = document.getElementById('relPeriodoTipo');
    if (tipoSelect) tipoSelect.value = relPeriodoTipo;
    popularFiltroUsuarioRelatorio();

    const semNavegacao = relPeriodoTipo === 'todos' || relPeriodoTipo === 'personalizado';
    document.getElementById('btnPeriodoAnterior').style.visibility = semNavegacao ? 'hidden' : 'visible';
    document.getElementById('btnPeriodoProximo').style.visibility = semNavegacao ? 'hidden' : 'visible';

    const { inicio, fim, label, indice, ano } = getRangePeriodo(relPeriodoTipo, relPeriodoOffset);
    document.getElementById('relPeriodoLabel').textContent = label;

    const leadsBase = getLeadsRelatorio();
    const metricasAtuais = calcularMetricasPeriodo(leadsBase, inicio, fim);
    const metricasAnteriores = semNavegacao ? null : (() => {
        const rangeAnterior = getRangePeriodo(relPeriodoTipo, relPeriodoOffset - 1);
        return calcularMetricasPeriodo(leadsBase, rangeAnterior.inicio, rangeAnterior.fim);
    })();

    renderizarResumoRelatorio(metricasAtuais, metricasAnteriores);

    // Metas
    const metaCard = document.getElementById('metaProgressoCard');
    const metaFormEl = metaCard.querySelector('form');
    let metaVendasAtual = 0;
    if (relPeriodoTipo !== 'todos' && !(relPeriodoTipo === 'personalizado' && !inicio)) {
        metaCard.style.display = 'block';
        document.getElementById('metaPeriodoNome').textContent = label;

        let metaVendas, metaOrcamento;
        if (relPeriodoTipo === 'mes') {
            const anoMes = anoMesKey(ano, indice);
            const m = getMetaMes(anoMes);
            metaVendas = m.vendas;
            metaOrcamento = m.orcamento;
            metaCard.dataset.anoMes = anoMes;
            document.getElementById('metaRapidaVendas').value = metaVendas || '';
            document.getElementById('metaRapidaOrcamento').value = metaOrcamento || '';
            metaFormEl.style.display = 'flex';
            document.getElementById('metaObsPeriodo').textContent = '';
        } else {
            metaVendas = getMetasAgregadas(inicio, fim, 'vendas');
            metaOrcamento = getMetasAgregadas(inicio, fim, 'orcamento');
            metaFormEl.style.display = 'none';
            document.getElementById('metaObsPeriodo').textContent =
                'Soma das metas mensais definidas em Administração para este período. Para editar, ajuste mês a mês.';
        }
        metaVendasAtual = metaVendas;

        document.getElementById('metaComparativoChart').innerHTML = `
            <div class="meta-medidor-grid">
                ${medidorMetaHtml('Vendas', metaVendas, metricasAtuais.valorPedidos)}
                ${medidorMetaHtml('Orçamento', metaOrcamento, metricasAtuais.valorOrcamentos)}
            </div>
        `;

        renderizarPipelineNecessario(metaVendas, leadsBase, metricasAtuais.valorPorEtapa);
    } else {
        metaCard.style.display = 'none';
    }

    renderizarRankingVendedores(leadsBase, inicio, fim);
    renderizarGraficoEtapas(metricasAtuais.porEtapa);
    renderizarGraficoValorEtapas(metricasAtuais.valorPorEtapa);
    renderizarEvolucaoPedidos(leadsBase);
    const topClientes = renderizarTopClientes(leadsBase);
    renderizarGraficoPotencial(leadsBase);
    renderizarFunilAcumulado(metricasAtuais.porEtapa, metricasAtuais.total);

    const perdidosBase = getPerdidosRelatorio();
    const perdidosPeriodo = calcularPerdidosPeriodo(perdidosBase, inicio, fim);
    const statusOrcamento = calcularStatusOrcamento(leadsBase, perdidosBase, inicio, fim);
    renderizarPerdidosPeriodo(perdidosPeriodo);
    renderizarStatusOrcamento(statusOrcamento);

    const filtroUsuario = usuarios.find(u => u.id === relFiltroUsuarioId);
    ultimoRelatorio = {
        label,
        filtroUsuarioNome: filtroUsuario ? filtroUsuario.nome : null,
        atual: metricasAtuais,
        anterior: metricasAnteriores,
        topClientes,
        perdidosPeriodo,
        statusOrcamento
    };

    atualizarUiPeriodoRelatorio();
    if (typeof renderizarRelatoriosAvancados === 'function' && !window.__executandoRelAvan) {
        window.__executandoRelAvan = true;
        try {
            renderizarRelatoriosAvancados();
        } finally {
            window.__executandoRelAvan = false;
        }
    }

    if (typeof renderizarRelatorioOrcamentosAbertos === 'function') {
        renderizarRelatorioOrcamentosAbertos();
    }
    if (typeof renderizarRelatorioPerdidosMotivos === 'function') {
        renderizarRelatorioPerdidosMotivos();
    }
}

function renderizarPerdidosPeriodo(perdidosPeriodo) {
    const container = document.getElementById('relPerdidosContainer') || document.getElementById('perdidosContainer');
    if (!container) return;
    if (perdidosPeriodo.length === 0) {
        container.innerHTML = `<p class="text-sm text-muted">Nenhum card perdido no período.</p>`;
        return;
    }
    container.innerHTML = `
        <table>
            <thead><tr><th>Empresa</th><th>Motivo</th><th>Data</th><th>Valor</th></tr></thead>
            <tbody>
                ${perdidosPeriodo.slice(0, 20).map(p => `
                    <tr>
                        <td>${p.empresa}</td>
                        <td>${p.motivo}${p.motivoDetalhe ? ' — ' + p.motivoDetalhe : ''}</td>
                        <td>${formatarData(p.dataExclusao)}</td>
                        <td>${formatarMoeda(p.valor || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${perdidosPeriodo.length > 20 ? `<p class="text-xs text-muted mt-4">Mostrando 20 de ${perdidosPeriodo.length}.</p>` : ''}
    `;
}

function renderizarStatusOrcamento(status) {
    const container = document.getElementById('relStatusOrcamentoContainer');
    if (!container) return;
    container.innerHTML = `
        <table>
            <thead><tr><th>Status</th><th>Quantidade</th><th>Valor</th></tr></thead>
            <tbody>
                <tr><td>Em aberto</td><td>${status.abertos.count}</td><td>${formatarMoeda(status.abertos.valor)}</td></tr>
                <tr><td>Convertidos em pedido</td><td>${status.convertidos.count}</td><td>${formatarMoeda(status.convertidos.valor)}</td></tr>
                <tr><td>Perdidos</td><td>${status.perdidos.count}</td><td>${formatarMoeda(status.perdidos.valor)}</td></tr>
            </tbody>
        </table>
    `;
}

function renderizarRankingVendedores(leadsBase, inicio, fim) {
    const card = document.getElementById('relRankingVendedoresCard');
    const container = document.getElementById('relRankingVendedores');
    if (!card || !container) return;
    if (usuarioAtual.papel !== 'admin' || relFiltroUsuarioId) {
        card.style.display = 'none';
        return;
    }
    const vendedores = usuarios.filter(u => u.papel === 'vendedor');
    if (vendedores.length === 0) {
        card.style.display = 'none';
        return;
    }

    const ranking = vendedores.map(v => {
        const leadsDoVendedor = leadsBase.filter(l => l.usuarioId === v.id);
        const valor = calcularMetricasPeriodo(leadsDoVendedor, inicio, fim).valorPedidos;
        return { nome: v.nome, valor };
    }).sort((a, b) => b.valor - a.valor);

    card.style.display = 'block';
    if (ranking.every(r => r.valor === 0)) {
        container.innerHTML = `<div class="empty-state compact"><span class="emoji-big"><span data-icone="trofeu"></span></span><p class="text-sm">Nenhuma venda no período</p></div>`;
        return;
    }

    const max = Math.max(...ranking.map(r => r.valor), 1);
    container.innerHTML = ranking.map((r, i) => `
        <div class="bar-item">
            <span class="bar-label"><span class="rank-badge">${i + 1}º</span> ${r.nome}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${(r.valor / max) * 100}%;"></div></div>
            <span class="bar-value">${formatarMoeda(r.valor)}</span>
        </div>
    `).join('');
}

function renderizarGraficoEtapas(porEtapa) {
    const container = document.getElementById('relEtapasChart');
    const max = Math.max(...Object.values(porEtapa), 1);

    container.innerHTML = ETAPAS.map(e => `
        <div class="bar-item">
            <span class="bar-label">${e.label}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width:${(porEtapa[e.id] || 0) / max * 100}%;background:${e.cor};"></div>
            </div>
            <span class="bar-value">${porEtapa[e.id] || 0}</span>
        </div>
    `).join('');
}

function renderizarGraficoValorEtapas(valorPorEtapa) {
    const container = document.getElementById('relValorEtapasChart');
    const max = Math.max(...Object.values(valorPorEtapa), 1);

    container.innerHTML = ETAPAS.map(e => `
        <div class="bar-item">
            <span class="bar-label">${e.label}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width:${(valorPorEtapa[e.id] || 0) / max * 100}%;background:${e.cor};"></div>
            </div>
            <span class="bar-value">${formatarMoeda(valorPorEtapa[e.id] || 0)}</span>
        </div>
    `).join('');
}

function renderizarEvolucaoPedidos(leadsBase) {
    const container = document.getElementById('relEvolucaoPedidos');
    const registros = [];

    leadsBase.forEach(l => {
        if (l.pedidos && l.pedidos.length > 0) {
            l.pedidos.forEach(p => registros.push({ data: p.data, valor: p.valor || 0 }));
        } else if (l.etapa === 'pedido') {
            const dataFallback = (l.dataCriacao || '').split('T')[0] || hoje();
            registros.push({ data: dataFallback, valor: l.valor || 0 });
        }
    });

    const hojeDate = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hojeDate.getFullYear(), hojeDate.getMonth() - i, 1);
        meses.push({
            chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: `${MESES_ABREV[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        });
    }

    const contagemPorMes = meses.map(m => {
        const doMes = registros.filter(r => (r.data || '').startsWith(m.chave));
        return { ...m, count: doMes.length, valor: doMes.reduce((acc, r) => acc + (r.valor || 0), 0) };
    });

    if (registros.length === 0) {
        container.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="relatorios"></span></span><p class="text-sm">Nenhum pedido registrado</p></div>`;
        return;
    }

    const max = Math.max(...contagemPorMes.map(m => m.count), 1);
    container.innerHTML = contagemPorMes.map(m => `
        <div class="bar-item">
            <span class="bar-label">${m.label}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width:${(m.count / max) * 100}%;"></div>
            </div>
            <span class="bar-value" title="${formatarMoeda(m.valor)}">${m.count}</span>
        </div>
    `).join('');
}

function renderizarTopClientes(leadsBase) {
    const container = document.getElementById('relTopClientes');
    const agrupados = {};

    leadsBase.forEach(l => {
        if (l.etapa === 'pedido' || l.cliente) {
            if (!agrupados[l.codigoUnico]) {
                agrupados[l.codigoUnico] = { empresa: l.empresa, valor: 0 };
            }
            agrupados[l.codigoUnico].valor += (l.valor || 0);
        }
    });

    const top5 = Object.values(agrupados).sort((a, b) => b.valor - a.valor).slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="trofeu"></span></span><p class="text-sm">Nenhum cliente fechado</p></div>`;
        return top5;
    }

    const max = Math.max(...top5.map(c => c.valor), 1);
    container.innerHTML = top5.map(c => `
        <div class="bar-item">
            <span class="bar-label" title="${c.empresa}">${c.empresa}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width:${(c.valor / max) * 100}%;"></div>
            </div>
            <span class="bar-value">${formatarMoeda(c.valor)}</span>
        </div>
    `).join('');

    return top5;
}

function renderizarGraficoPotencial(leadsBase) {
    const container = document.getElementById('relPotencialChart');
    const cores = { A: '#2f7d5b', B: '#a9761f', C: '#b3413a' };
    const labels = { A: 'A - Alto', B: 'B - Médio', C: 'C - Baixo' };
    const porPotencial = { A: 0, B: 0, C: 0 };

    leadsBase.forEach(l => {
        const p = (l.potencial || 'B').toUpperCase();
        if (porPotencial[p] === undefined) porPotencial[p] = 0;
        porPotencial[p]++;
    });

    const max = Math.max(...Object.values(porPotencial), 1);
    container.innerHTML = Object.keys(porPotencial).map(p => `
        <div class="bar-item">
            <span class="bar-label">${labels[p] || p}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width:${(porPotencial[p] / max) * 100}%;background:${cores[p] || '#2d4863'};"></div>
            </div>
            <span class="bar-value">${porPotencial[p]}</span>
        </div>
    `).join('');
}

function renderizarFunilAcumulado(porEtapa, total) {
    const container = document.getElementById('relPerformanceChart');
    if (total === 0) {
        container.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="dashboard"></span></span><p class="text-sm">Sem leads suficientes</p></div>`;
        return;
    }

    let acumulado = 0;
    const ordemInversa = [...ETAPAS].reverse();
    const percentuais = [];
    ordemInversa.forEach(e => {
        acumulado += porEtapa[e.id] || 0;
        percentuais.unshift({ etapa: e, pct: Math.round((acumulado / total) * 100) });
    });

    container.innerHTML = percentuais.map(({ etapa, pct }) => `
        <div class="bar-item">
            <span class="bar-label">${etapa.label}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width:${pct}%;background:${etapa.cor};"></div>
            </div>
            <span class="bar-value">${pct}%</span>
        </div>
    `).join('');
}

// ============================================
// IMPRESSÃO DO RELATÓRIO
// ============================================
function imprimirRelatorio() {
    if (!ultimoRelatorio) {
        showToast('Nenhum relatório carregado ainda!', 'error');
        return;
    }

    const { label, filtroUsuarioNome, atual, anterior, topClientes, perdidosPeriodo, statusOrcamento } = ultimoRelatorio;
    const marcaEmpresa = (typeof empresaAtual !== 'undefined' && empresaAtual) ? empresaAtual : { nome: 'Feitosa CRM', cnpj: '' };

    const linhasKpi = RELATORIO_KPIS.map(kpi => {
        const valorAtual = formatarValorKpi(atual[kpi.key], kpi.formato);
        const valorAnterior = anterior ? formatarValorKpi(anterior[kpi.key], kpi.formato) : '—';
        let variacaoTexto = '—';
        if (anterior) {
            const variacao = calcularVariacao(atual[kpi.key], anterior[kpi.key]);
            if (variacao && variacao.novo) variacaoTexto = 'novo';
            else if (variacao) variacaoTexto = `${variacao.dir === 'up' ? '▲' : '▼'} ${Math.abs(variacao.pct).toFixed(0)}%`;
            else variacaoTexto = '—';
        }
        return `<tr><td>${kpi.label}</td><td>${valorAtual}</td><td>${valorAnterior}</td><td>${variacaoTexto}</td></tr>`;
    }).join('');

    const linhasFunil = ETAPAS.map(e => `
        <tr>
            <td>${e.label.replace(/^[^\s]+\s/, '')}</td>
            <td>${atual.porEtapa[e.id] || 0}</td>
            <td>${formatarMoeda(atual.valorPorEtapa[e.id] || 0)}</td>
        </tr>
    `).join('');

    const linhasTop = (topClientes || []).map((c, i) => `
        <tr><td>${i + 1}º</td><td>${c.empresa}</td><td>${formatarMoeda(c.valor)}</td></tr>
    `).join('') || '<tr><td colspan="3">Nenhum cliente fechado no filtro atual.</td></tr>';

    const linhasStatusOrc = statusOrcamento ? `
        <tr><td>Em aberto</td><td>${statusOrcamento.abertos.count}</td><td>${formatarMoeda(statusOrcamento.abertos.valor)}</td></tr>
        <tr><td>Convertidos em pedido</td><td>${statusOrcamento.convertidos.count}</td><td>${formatarMoeda(statusOrcamento.convertidos.valor)}</td></tr>
        <tr><td>Perdidos</td><td>${statusOrcamento.perdidos.count}</td><td>${formatarMoeda(statusOrcamento.perdidos.valor)}</td></tr>
    ` : '';

    const linhasPerdidos = (perdidosPeriodo || []).map(p => `
        <tr>
            <td>${p.empresa}</td>
            <td>${p.motivo}${p.motivoDetalhe ? ' — ' + p.motivoDetalhe : ''}</td>
            <td>${formatarData(p.dataExclusao)}</td>
            <td>${formatarMoeda(p.valor || 0)}</td>
        </tr>
    `).join('') || '<tr><td colspan="4">Nenhum card perdido no período.</td></tr>';

    const htmlImpressao = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório - ${label}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #1a2332; }
    h1 { font-size: 22px; margin-bottom: 2px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 22px; }
    h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #2d4863; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #ccc; padding: 7px 10px; font-size: 12px; text-align: left; }
    th { background: #f0f2f5; }
    tr:nth-child(even) { background: #fafafa; }
    @media print { body { padding: 0; } }
</style>
</head><body>
    <h1>Relatório de Vendas — ${marcaEmpresa.nome || 'CRM'}</h1>
    ${marcaEmpresa.cnpj ? `<div class="meta">CNPJ: <strong>${marcaEmpresa.cnpj}</strong></div>` : ''}
    <div class="meta">
        Período: <strong>${label}</strong>
        ${filtroUsuarioNome ? ` • Vendedor: <strong>${filtroUsuarioNome}</strong>` : ' • Todos os vendedores'}
        • Gerado em ${formatarData(hoje())} às ${new Date().toTimeString().slice(0, 5)}
    </div>

    <h2>Resumo do Período${anterior ? ' (comparado ao período anterior)' : ''}</h2>
    <table>
        <thead><tr><th>Métrica</th><th>Período Atual</th><th>Período Anterior</th><th>Variação</th></tr></thead>
        <tbody>${linhasKpi}</tbody>
    </table>

    <h2>Distribuição por Etapa</h2>
    <table>
        <thead><tr><th>Etapa</th><th>Quantidade</th><th>Valor</th></tr></thead>
        <tbody>${linhasFunil}</tbody>
    </table>

    <h2>Top 5 Clientes por Valor</h2>
    <table>
        <thead><tr><th>#</th><th>Cliente</th><th>Valor</th></tr></thead>
        <tbody>${linhasTop}</tbody>
    </table>

    <h2>Status de Orçamento</h2>
    <table>
        <thead><tr><th>Status</th><th>Quantidade</th><th>Valor</th></tr></thead>
        <tbody>${linhasStatusOrc}</tbody>
    </table>

    <h2>Perdidos no Período</h2>
    <table>
        <thead><tr><th>Empresa</th><th>Motivo</th><th>Data</th><th>Valor</th></tr></thead>
        <tbody>${linhasPerdidos}</tbody>
    </table>
</body></html>`;

    const janela = window.open('', '_blank');
    if (!janela) {
        showToast('Permita pop-ups para gerar o PDF!', 'error');
        return;
    }
    janela.document.write(htmlImpressao);
    janela.document.close();
    setTimeout(() => { janela.focus(); janela.print(); }, 350);
}

// ============================================
// IMPRESSÃO — ORÇAMENTOS EM ABERTO (coluna Orçamento do Pipeline)
// ============================================
function imprimirRelatorioOrcamentosAbertos() {
    const tipoPeriodo = document.getElementById('relPeriodoTipo')?.value || relPeriodoTipo;
    const periodo = getRangePeriodo(tipoPeriodo, relPeriodoOffset);
    if (tipoPeriodo === 'personalizado' && !periodo.inicio) {
        showToast('Informe um período personalizado válido antes de gerar o PDF.', 'error');
        return;
    }

    const abertos = getLeadsRelatorio().filter(l =>
        l.etapa === 'orcamento' && dataNoPeriodo(l.dataEntradaEtapa || l.dataCriacao, periodo.inicio, periodo.fim)
    );
    if (abertos.length === 0) {
        showToast('Nenhum orçamento em aberto no período selecionado!', 'error');
        return;
    }

    const ehAdmin = usuarioAtual.papel === 'admin';
    const filtroUsuario = usuarios.find(u => u.id === relFiltroUsuarioId);
    const linhas = abertos.map(l => {
        const vendedor = usuarios.find(u => u.id === l.usuarioId);
        return `
        <tr>
            <td>${l.empresa}</td>
            <td>${l.decisor || '—'}</td>
            <td>${l.cidade || '—'}/${l.estado || '—'}</td>
            ${ehAdmin ? `<td>${vendedor ? vendedor.nome : '—'}</td>` : ''}
            <td>${formatarData(l.dataEntradaEtapa || l.dataCriacao)}</td>
            <td>${l.cardObs || '—'}</td>
            <td style="text-align:right;">${formatarMoeda(l.valor || 0)}</td>
        </tr>
    `;
    }).join('');

    const valorTotal = abertos.reduce((acc, l) => acc + (l.valor || 0), 0);
    const colspanTotal = ehAdmin ? 6 : 5;

    const htmlImpressao = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Orçamentos em Aberto — ${periodo.label}</title>
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
    <h1>Orçamentos em Aberto</h1>
    <div class="meta">
        Período: <strong>${periodo.label}</strong>${filtroUsuario ? ` • Vendedor: <strong>${filtroUsuario.nome}</strong>` : ' • Todos os vendedores'}<br>
        ${abertos.length} orçamento(s) na coluna Orçamento do Pipeline • Gerado em ${formatarData(hoje())} às ${new Date().toTimeString().slice(0, 5)}
    </div>
    <table>
        <thead>
            <tr>
                <th>Empresa</th><th>Contato</th><th>Cidade/UF</th>
                ${ehAdmin ? '<th>Vendedor</th>' : ''}
                <th>Nesta etapa desde</th><th>Observação</th><th>Valor</th>
            </tr>
        </thead>
        <tbody>${linhas}</tbody>
        <tfoot><tr><td colspan="${colspanTotal}">Valor Total em Orçamentos Abertos</td><td style="text-align:right;">${formatarMoeda(valorTotal)}</td></tr></tfoot>
    </table>
</body></html>`;

    const janela = window.open('', '_blank');
    if (!janela) {
        showToast('Permita pop-ups para gerar o PDF!', 'error');
        return;
    }
    janela.document.write(htmlImpressao);
    janela.document.close();
    setTimeout(() => { janela.focus(); janela.print(); }, 350);
}

// Exportações globais para a interface fluida de relatórios
window.selecionarPeriodoRapido = selecionarPeriodoRapido;
window.atualizarUiPeriodoRelatorio = atualizarUiPeriodoRelatorio;
window.mudarSubAbaRelatorio = mudarSubAbaRelatorio;
window.inicializarSubAbasRelatorio = inicializarSubAbasRelatorio;

