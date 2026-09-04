// ============================================
// PIPELINE
// ============================================
function obterDataInsercaoPipeline(lead) {
    return lead.dataEntradaEtapa || lead.dataCriacao || '9999-12-31T23:59:59.999Z';
}

function leadNoPeriodoPipeline(lead, periodo) {
    if (periodo === 'todos') return true;
    const data = new Date(obterDataInsercaoPipeline(lead));
    if (Number.isNaN(data.getTime())) return true;
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    if (periodo === 'hoje') return data >= inicioHoje;
    if (periodo === '7dias') return data >= new Date(agora.getTime() - 7 * 86400000);
    if (periodo === '30dias') return data >= new Date(agora.getTime() - 30 * 86400000);
    if (periodo === 'mes') return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth();
    return true;
}

function ordenarCardsPipeline(items, ordenacao) {
    return [...items].sort((a, b) => {
        if (ordenacao === 'alfabetica') return String(a.empresa || '').localeCompare(String(b.empresa || ''), 'pt-BR', { sensitivity: 'base' });
        if (ordenacao === 'valor') return (Number(b.valor) || 0) - (Number(a.valor) || 0);
        const ordem = new Date(obterDataInsercaoPipeline(a)) - new Date(obterDataInsercaoPipeline(b));
        return (Number.isNaN(ordem) ? 0 : ordem) || String(a.id).localeCompare(String(b.id));
    });
}

function mudarFiltroPipeline() {
    const periodo = document.getElementById('pipelinePeriodo')?.value || 'todos';
    const classificacao = document.getElementById('pipelineClassificacao')?.value || 'todas';
    const ordenacao = document.getElementById('pipelineOrdenacao')?.value || 'insercao';
    localStorage.setItem('feitosaPipelineFiltrosV1', JSON.stringify({ periodo, classificacao, ordenacao }));
    renderizarPipeline();
}

function carregarFiltrosPipeline() {
    try {
        const saved = JSON.parse(localStorage.getItem('feitosaPipelineFiltrosV1') || '{}');
        const periodo = document.getElementById('pipelinePeriodo');
        const classificacao = document.getElementById('pipelineClassificacao');
        const ordenacao = document.getElementById('pipelineOrdenacao');
        if (periodo) periodo.value = saved.periodo || 'todos';
        if (classificacao) classificacao.value = saved.classificacao || 'todas';
        if (ordenacao) ordenacao.value = saved.ordenacao || 'insercao';
    } catch (_) {}
}

function renderizarPipeline() {
    const container = document.getElementById('pipelineContainer');
    carregarFiltrosPipeline();
    const periodo = document.getElementById('pipelinePeriodo')?.value || 'todos';
    const classificacao = document.getElementById('pipelineClassificacao')?.value || 'todas';
    const ordenacao = document.getElementById('pipelineOrdenacao')?.value || 'insercao';
    let leadsVisiveis = getLeadsVisiveis().filter(lead => leadNoPeriodoPipeline(lead, periodo));
    if (classificacao && classificacao !== 'todas') {
        leadsVisiveis = leadsVisiveis.filter(lead => (lead.classificacao || 'outros') === classificacao);
    }
    const ativos = leadsVisiveis.filter(l => l.etapa === 'oportunidades' || l.etapa === 'orcamento');
    const totalValor = ativos.reduce((acc, l) => acc + (l.valor || 0), 0);

    document.getElementById('pipelineValorTotal').textContent = formatarMoeda(totalValor);
    document.getElementById('pipelineQtdOportunidades').textContent = `${ativos.length} ativas`;

    let html = '';
    ETAPAS.forEach(etapa => {
        const items = ordenarCardsPipeline(leadsVisiveis.filter(l => l.etapa === etapa.id), ordenacao);
        const totalEtapa = items.reduce((acc, l) => acc + (l.valor || 0), 0);

        html += `
            <div class="pipeline-column" data-etapa="${etapa.id}"
                 ondragover="permitirDrop(event)"
                 ondragenter="destacarDrop(event)"
                 ondragleave="removerDestacar(event)"
                 ondrop="executarDrop(event, '${etapa.id}')">
                <div class="column-header">
                    <span class="column-title">${etapa.label}</span>
                    <span class="column-count">${items.length}</span>
                </div>
                <div class="column-total">${totalEtapa > 0 ? formatarMoeda(totalEtapa) : 'R$ 0,00'}</div>
                ${items.map(lead => {
                    const showItens = ['oportunidades', 'orcamento', 'pedido'].includes(lead.etapa);
                    const isLeadEtapa = lead.etapa === 'leads';
                    const contadorOrcamentoHtml = renderizarContadorOrcamento(lead);
                    // Botão de editar só aparece na etapa leads
                    const editarBtn = isLeadEtapa ? `<button class="btn btn-warning btn-xs" onclick="abrirModalLead('${lead.id}')" title="Editar"><span data-icone="editar"></span></button>` : '';
                    const vendedor = usuarios.find(u => u.id === lead.usuarioId);
                    const vendedorBadge = vendedor
                        ? `<div class="card-vendedor-badge" style="background:${corAvatar(vendedor.nome)};" title="Vendedor: ${vendedor.nome}">${iniciais(vendedor.nome)}</div>`
                        : '';
                    const classifObj = CLASSIFICACOES_LEAD.find(c => c.id === (lead.classificacao || 'outros')) || CLASSIFICACOES_LEAD[4];
                    const classifBadge = `<span class="card-classif-badge" style="color:${classifObj.cor};background:${classifObj.bg};border:1px solid ${classifObj.cor}33;" title="Classificação: ${classifObj.label}">${classifObj.label}</span>`;
                    return `
                    <div class="pipeline-card ${lead.etapa}"
                         draggable="true"
                         ondragstart="iniciarDrag(event, '${lead.id}')"
                         ondragend="finalizarDrag(event)">
                        ${vendedorBadge}
                        <div class="card-title" style="margin:0;">${lead.empresa}</div>
                        <div class="card-sub">${lead.decisor || '—'} • ${lead.cidade || '—'}</div>
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
                            <span style="font-weight:700;color:var(--stage-pedido);font-size:13px;">
                                ${formatarMoeda(lead.valor || 0)}
                            </span>
                            ${classifBadge}
                        </div>
                        ${lead.codigoUnico ? `<div class="card-badge">${lead.codigoUnico}</div>` : ''}
                        ${lead.autorizacaoPedidoStatus === 'assinado' ? `<div class="card-assinado-badge" title="Pedido assinado pelo cliente">✓ Pedido assinado</div>` : ''}
                        <div class="card-data-row">
                            <span>Nesta etapa desde ${formatarData(lead.dataEntradaEtapa || lead.dataCriacao)}</span>
                            ${lead.cardObs ? `<span class="card-obs-tag">${lead.cardObs}</span>` : ''}
                        </div>
                        ${contadorOrcamentoHtml}
                        ${lead.proximaData ? `<div style="font-size:10px;color:#8a5a3c;margin-top:4px;">${formatarData(lead.proximaData)}</div>` : ''}
                        <div class="card-actions">
                            ${isLeadEtapa ? `
                                <button class="btn btn-info btn-xs" onclick="abrirPesquisa('${lead.id}')" title="Pesquisar"><span data-icone="busca"></span></button>
                                ${editarBtn}
                                <button class="btn btn-outline btn-xs" onclick="editarObsCard('${lead.id}')" title="Observação rápida"><span data-icone="nota"></span></button>
                                <button class="btn btn-danger btn-xs" onclick="abrirModalMotivo('${lead.id}')" title="Excluir"><span data-icone="excluir"></span></button>
                            ` : `
                                <button class="btn btn-primary btn-xs" onclick="abrirAtividade('${lead.id}')" title="Atividade"><span data-icone="nota"></span></button>
                                <button class="btn btn-success btn-xs" onclick="abrirModalCliente('${lead.id}')" title="Perfil"><span data-icone="perfil"></span></button>
                                <div class="card-menu-wrap">
                                    <button class="btn btn-outline btn-xs" onclick="toggleCardMenu(event, '${lead.id}')" title="Mais ações">⋮</button>
                                    <div class="card-menu" id="cardMenu-${lead.id}">
                                        <button onclick="fecharCardMenus();abrirEnvioEmail('${lead.id}')">Enviar Email</button>
                                        <button onclick="fecharCardMenus();abrirEnvioWhatsApp('${lead.id}')">Enviar WhatsApp</button>
                                        ${showItens ? `<button onclick="fecharCardMenus();abrirItens('${lead.id}','${lead.etapa}')">Itens/Orçamento</button>` : ''}
                                        <button onclick="fecharCardMenus();editarObsCard('${lead.id}')">Observação rápida</button>
                                        ${lead.etapa === 'orcamento' ? `<button onclick="fecharCardMenus();resetarContagemOrcamento('${lead.id}')">Resetar contagem Orçamento</button>` : ''}
                                        <button onclick="fecharCardMenus();abrirModalMotivo('${lead.id}')" class="danger">Excluir</button>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================
// CONTADOR DE DIAS NA ETAPA ORÇAMENTO
// ============================================
const ORCAMENTO_DIAS_LIMITE = 30;

// Retorna um objeto { dias, limiteExcedido } calculado com base na
// data de entrada na etapa Orçamento ou na data de reset manual.
function calcularDiasOrcamento(lead) {
    const base = lead.orcamentoResetEm || lead.dataEntradaEtapa || lead.dataCriacao;
    if (!base) return { dias: 0, limiteExcedido: false };
    const entrada = new Date(base);
    if (isNaN(entrada.getTime())) return { dias: 0, limiteExcedido: false };
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(entrada.getFullYear(), entrada.getMonth(), entrada.getDate());
    const dias = Math.max(0, Math.floor((hoje - inicio) / (24 * 60 * 60 * 1000)));
    return { dias, limiteExcedido: dias >= ORCAMENTO_DIAS_LIMITE };
}

// Cor evolui gradualmente do branco/cartão para o vermelho em 30 dias.
function corContadorOrcamento(dias) {
    if (!dias) return 'var(--text-muted)';
    const progresso = Math.min(1, dias / ORCAMENTO_DIAS_LIMITE);
    // Interpola do cinza neutro para o vermelho de alerta.
    const cinza = [139, 149, 161]; // var(--text-muted)
    const vermelho = [179, 65, 58]; // var(--danger)
    const r = Math.round(cinza[0] + (vermelho[0] - cinza[0]) * progresso);
    const g = Math.round(cinza[1] + (vermelho[1] - cinza[1]) * progresso);
    const b = Math.round(cinza[2] + (vermelho[2] - cinza[2]) * progresso);
    return `rgb(${r}, ${g}, ${b})`;
}

// Bloco do contador exibido no card quando a etapa é Orçamento.
function renderizarContadorOrcamento(lead) {
    if (lead.etapa !== 'orcamento') return '';
    const { dias, limiteExcedido } = calcularDiasOrcamento(lead);
    const cor = corContadorOrcamento(dias);
    const unidade = dias === 1 ? 'dia' : 'dias';
    const classe = limiteExcedido ? 'orcamento-contador expirado' : 'orcamento-contador';
    return `
        <div class="${classe}" style="color:${cor};" title="${limiteExcedido ? 'Orçamento no limite de ' + ORCAMENTO_DIAS_LIMITE + ' dias! Considere resetar a contagem ou converter em pedido.' : 'Dias desde a entrada na etapa Orçamento'}">
            <span data-icone="historico"></span>
            <span>${dias} ${unidade} em orçamento</span>
            ${limiteExcedido ? `<span class="orcamento-aviso">⚠ Limite de ${ORCAMENTO_DIAS_LIMITE} dias atingido</span>` : ''}
        </div>
    `;
}

// Reseta a contagem de dias do orçamento registrando a data atual.
function resetarContagemOrcamento(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.etapa !== 'orcamento') return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para alterar este card.', 'error');
        return;
    }
    lead.orcamentoResetEm = new Date().toISOString();
    if (!Array.isArray(lead.historico)) lead.historico = [];
    lead.historico.push({
        tipo: 'registro',
        data: new Date().toISOString(),
        descricao: `Contagem de dias na etapa Orçamento resetada manualmente por ${usuarioAtual.nome || usuarioAtual.email}`
    });
    salvarDados();
    renderizarAll();
    showToast('Contagem de dias do orçamento resetada.', 'success');
}

// ============================================
// OBSERVAÇÃO RÁPIDA DO CARD
// ============================================
function editarObsCard(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para editar este card.', 'error');
        return;
    }
    const valor = prompt('Observação rápida (máx. 14 caracteres):', lead.cardObs || '');
    if (valor === null) return;
    lead.cardObs = valor.trim().slice(0, 14);
    salvarDados();
    renderizarAll();
}

// ============================================
// MENU DE AÇÕES DO CARD
// ============================================
function toggleCardMenu(e, leadId) {
    e.stopPropagation();
    const menu = document.getElementById('cardMenu-' + leadId);
    if (!menu) return;
    const jaAberto = menu.classList.contains('open');
    fecharCardMenus();
    if (!jaAberto) {
        menu.classList.add('open');
        menu.closest('.pipeline-card')?.classList.add('menu-aberto');
    }
}

function fecharCardMenus() {
    document.querySelectorAll('.card-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.pipeline-card.menu-aberto').forEach(c => c.classList.remove('menu-aberto'));
}

// ============================================
// DRAG AND DROP
// ============================================
function iniciarDrag(e, leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    // Verificar permissão para mover (admin ou dono)
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não pode mover este card.', 'error');
        e.preventDefault();
        return;
    }
    currentDrag = leadId;
    e.target.closest('.pipeline-card')?.classList.add('dragging');
}

function finalizarDrag(e) {
    document.querySelectorAll('.pipeline-card').forEach(c => c.classList.remove('dragging'));
    document.querySelectorAll('.pipeline-column').forEach(col => col.classList.remove('drag-over'));
    currentDrag = null;
}

function permitirDrop(e) { e.preventDefault(); }

function destacarDrop(e) {
    document.querySelectorAll('.pipeline-column').forEach(col => col.classList.remove('drag-over'));
    e.target.closest('.pipeline-column')?.classList.add('drag-over');
}

function removerDestacar(e) {
    e.target.closest('.pipeline-column')?.classList.remove('drag-over');
}

function executarDrop(e, etapaId) {
    e.preventDefault();
    document.querySelectorAll('.pipeline-column').forEach(col => col.classList.remove('drag-over'));

    if (!currentDrag) return;
    const lead = leads.find(l => l.id === currentDrag);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não pode mover este card.', 'error');
        return;
    }
    if (lead.etapa === etapaId) return;

    const etapaAnterior = lead.etapa;
    const leadIdMovido = lead.id;
    currentDrag = null;

    // Venda já registrada: exigir senha antes de retirar de Pedido.
    if (etapaAnterior === 'pedido' && etapaId !== 'pedido') {
        abrirAutorizacaoMovimento(leadIdMovido, etapaAnterior, etapaId);
        return;
    }

    aplicarMovimentoPipeline(leadIdMovido, etapaAnterior, etapaId);
}

function abrirAutorizacaoMovimento(leadId, etapaAnterior, etapaDestino) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const modal = document.getElementById('autorizacaoMovimentoModal');
    if (!modal) return;
    document.getElementById('autorizacaoMovimentoLeadId').value = leadId;
    document.getElementById('autorizacaoMovimentoEtapaAnterior').value = etapaAnterior;
    document.getElementById('autorizacaoMovimentoEtapaDestino').value = etapaDestino;
    document.getElementById('autorizacaoMovimentoEmpresa').textContent = lead.empresa || '';
    const emailLabel = document.getElementById('autorizacaoMovimentoEmailLabel');
    if (emailLabel) emailLabel.innerHTML = `Senha de ${usuarioAtual.email || 'autorização'} <span class="required">*</span>`;
    document.getElementById('autorizacaoMovimentoSenha').value = '';
    document.getElementById('autorizacaoMovimentoErro').style.display = 'none';
    document.getElementById('btnConfirmarMovimento').disabled = false;
    abrirModal('autorizacaoMovimentoModal');
    setTimeout(() => document.getElementById('autorizacaoMovimentoSenha')?.focus(), 50);
}

function cancelarAutorizacaoMovimento() {
    fecharModal('autorizacaoMovimentoModal');
    currentDrag = null;
    renderizarPipeline();
}

async function confirmarMovimentoAutorizado(event) {
    event.preventDefault();
    const senha = document.getElementById('autorizacaoMovimentoSenha').value;
    const leadId = document.getElementById('autorizacaoMovimentoLeadId').value;
    const etapaAnterior = document.getElementById('autorizacaoMovimentoEtapaAnterior').value;
    const etapaDestino = document.getElementById('autorizacaoMovimentoEtapaDestino').value;
    const erroEl = document.getElementById('autorizacaoMovimentoErro');
    const btn = document.getElementById('btnConfirmarMovimento');
    if (!senha) return;
    btn.disabled = true;
    btn.textContent = 'Validando...';
    erroEl.style.display = 'none';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: usuarioAtual.email,
            password: senha
        });
        if (error || !data?.session) throw new Error('Senha inválida.');
        fecharModal('autorizacaoMovimentoModal');
        aplicarMovimentoPipeline(leadId, etapaAnterior, etapaDestino, true);
    } catch (err) {
        erroEl.textContent = 'Senha inválida ou não foi possível validar a autorização.';
        erroEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Confirmar e mover';
    }
}

function aplicarMovimentoPipeline(leadId, etapaAnterior, etapaId, autorizado = false) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.etapa !== etapaAnterior) return;
    if (etapaAnterior === 'pedido' && etapaId !== 'pedido' && !autorizado) {
        abrirAutorizacaoMovimento(leadId, etapaAnterior, etapaId);
        return;
    }
    lead.etapa = etapaId;
    lead.dataEntradaEtapa = new Date().toISOString();
    lead.cliente = (etapaId === 'pedido');
    if (etapaId === 'pedido' && etapaAnterior !== 'pedido') {
        lead.dataEntradaPedido = new Date().toISOString();
        lead.dataPedido = hoje();
        lead.pedidos = lead.pedidos || [];
        if (lead.pedidos.length === 0) {
            lead.pedidos.push({
                numero: lead.numeroPedido || `PED-${new Date().getFullYear()}-${String(lead.pedidos.length + 1).padStart(3, '0')}`,
                data: hoje(),
                valor: lead.valor || 0,
                itens: lead.itens ? lead.itens.length : 0
            });
        }
    }
    lead.historico = lead.historico || [];
    lead.historico.push({
        data: hoje(),
        hora: new Date().toTimeString().slice(0, 5),
        tipo: 'Movimento',
        descricao: etapaAnterior === 'pedido'
            ? `Venda desfeita: movido de ${ETAPA_NOMES[etapaAnterior]} para ${ETAPA_NOMES[etapaId]} com autorização`
            : `Movido de ${ETAPA_NOMES[etapaAnterior]} para ${ETAPA_NOMES[etapaId]}`
    });
    salvarDados();
    const leadIdMovido = lead.id;
    showToast(`Movido para ${ETAPA_NOMES[etapaId]}`, 'success', 'Desfazer', () => desfazerMovimentoPipeline(leadIdMovido, etapaAnterior));
    renderizarAll();
}

function desfazerMovimentoPipeline(leadId, etapaOriginal) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não pode desfazer este movimento.', 'error');
        return;
    }

    const etapaAtual = lead.etapa;
    lead.etapa = etapaOriginal;
    lead.dataEntradaEtapa = new Date().toISOString();
    if (etapaAtual === 'pedido' && etapaOriginal !== 'pedido') {
        lead.dataEntradaPedido = '';
        lead.dataPedido = '';
    }
    lead.cliente = (etapaOriginal === 'pedido');
    lead.historico.push({
        data: hoje(),
        hora: new Date().toTimeString().slice(0, 5),
        tipo: 'Movimento',
        descricao: `Movimento desfeito: voltou de ${ETAPA_NOMES[etapaAtual]} para ${ETAPA_NOMES[etapaOriginal]}`
    });

    salvarDados();
    renderizarAll();
    showToast('Movimento desfeito!');
}
