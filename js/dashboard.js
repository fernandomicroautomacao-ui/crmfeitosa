// ============================================
// RENDERIZAR TUDO
// ============================================
function renderizarAll() {
    renderizarDashboard();
    renderizarPipeline();
    renderizarMarketing();
    renderizarWhatsapp();
    renderizarCalendario();
    renderizarClientes();
    renderizarRelatorios();
    if (typeof renderizarRelatoriosAvancados === 'function') renderizarRelatoriosAvancados();
    renderizarHistorico();
    renderizarPerdidos();
    if (typeof renderizarCentral === 'function') renderizarCentral();
    if (typeof renderizarFinanceiro === 'function') renderizarFinanceiro();
    if (typeof renderizarCadencias === 'function') renderizarCadencias();
    atualizarContadores();
}

// ============================================
// DASHBOARD
// ============================================
function renderizarDashboard() {
    const leadsVisiveis = getLeadsVisiveis();
    const total = leadsVisiveis.length;
    const porEtapa = {};
    ETAPAS.forEach(e => porEtapa[e.id] = 0);

    leadsVisiveis.forEach(l => {
        porEtapa[l.etapa] = (porEtapa[l.etapa] || 0) + 1;
    });

    const codigosClientes = new Set(leadsVisiveis.filter(l => l.etapa === 'pedido').map(l => l.codigoUnico));

    let valorOportunidades = 0;
    let valorOrcamentos = 0;
    let totalOrcamentos = 0;
    let totalPedidosMes = 0;
    let valorPedidosMes = 0;
    const mesAtual = getMesAtual();

    leadsVisiveis.forEach(l => {
        if (l.etapa === 'oportunidades' || l.etapa === 'orcamento') {
            valorOportunidades += l.valor || 0;
        }
        if (l.etapa === 'orcamento') {
            valorOrcamentos += l.valor || 0;
            totalOrcamentos++;
        }
        if (l.etapa === 'pedido') {
            const data = new Date(typeof getDataFechamentoPedido === 'function' ? getDataFechamentoPedido(l) : (l.dataPedido || l.dataCriacao));
            const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            if (mes === mesAtual) {
                totalPedidosMes++;
                valorPedidosMes += l.valor || 0;
            }
        }
    });

    document.getElementById('totalLeads').textContent = total;
    document.getElementById('totalClientes').textContent = codigosClientes.size;
    document.getElementById('totalEmailsEnviados').textContent = emailLog.length;
    document.getElementById('totalLeadsEtapa').textContent = porEtapa.leads || 0;
    document.getElementById('totalQualificacao').textContent = porEtapa.qualificacao || 0;
    document.getElementById('totalOportunidades').textContent = porEtapa.oportunidades || 0;
    document.getElementById('totalOrcamento').textContent = totalOrcamentos;
    document.getElementById('totalOrcamentoValor').textContent = formatarMoeda(valorOrcamentos);
    document.getElementById('totalPedido').textContent = totalPedidosMes;
    document.getElementById('totalPedidoValor').textContent = formatarMoeda(valorPedidosMes);
    document.getElementById('valorPipeline').textContent = formatarMoeda(valorOportunidades);

    const ativos = leadsVisiveis.filter(l => l.etapa === 'oportunidades' || l.etapa === 'orcamento');
    document.getElementById('pipelinePrevisao').textContent = `${ativos.length} negócios ativos`;

    renderizarFunil(porEtapa, total);
    renderizarMeuDia();
}

function renderizarFunil(porEtapa, total) {
    const container = document.getElementById('funilItens');
    const totalValido = total || 1;
    const cores = {
        leads: '#2d4863',
        qualificacao: '#3c6e91',
        oportunidades: '#a9761f',
        orcamento: '#8a5a3c',
        pedido: '#2f7d5b'
    };

    let html = '';
    ETAPAS.forEach((etapa, index) => {
        const count = porEtapa[etapa.id] || 0;
        const percent = Math.round((count / totalValido) * 100);
        const leadsVisiveis = getLeadsVisiveis();
        const valorEtapa = leadsVisiveis.filter(l => l.etapa === etapa.id).reduce((acc, l) => acc + (l.valor ||
            0), 0);

        let conversao = '—';
        if (index > 0) {
            const anterior = porEtapa[ETAPAS[index - 1].id] || 0;
            conversao = anterior > 0 ? `${Math.round((count / anterior) * 100)}%` : '0%';
        }

        html += `
            <div class="funil-item" onclick="navegarPara('pipeline')">
                <span class="funil-label"><span class="legend-dot" style="background:${cores[etapa.id]};"></span> ${etapa.label}</span>
                <div class="funil-bar">
                    <div class="funil-fill" style="width:${Math.max(percent, 6)}%;background:${cores[etapa.id]};">
                        ${count}
                    </div>
                </div>
                <span class="funil-count">${count}</span>
                <span class="funil-valor">${valorEtapa > 0 ? formatarMoeda(valorEtapa) : '—'}</span>
                <span class="funil-conversao">${conversao}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}
