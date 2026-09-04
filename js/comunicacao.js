// ============================================
// CENTRAL DE COMUNICAÇÃO (linha do tempo unificada + cadência atrasada)
// ============================================
function popularFiltroVendedorComunicacao() {
    const select = document.getElementById('comFiltroVendedor');
    if (!select) return;
    if (usuarioAtual.papel === 'admin') {
        select.style.display = 'inline-block';
        const valorAtual = select.value;
        select.innerHTML = '<option value="">Todos os vendedores</option>' +
            usuarios.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
        select.value = valorAtual;
    } else {
        select.style.display = 'none';
    }
}

function getComunicacoesUnificadas() {
    const leadsVisiveis = getLeadsVisiveis();
    const leadsIds = new Set(leadsVisiveis.map(l => l.id));
    const itens = [];

    emailLog.forEach(log => {
        if (!leadsIds.has(log.leadId)) return;
        itens.push({
            canal: 'email',
            data: log.data,
            hora: log.hora || '',
            empresa: log.empresa,
            leadId: log.leadId,
            usuarioId: log.usuarioId,
            resumo: log.assunto || '(sem assunto)'
        });
    });

    whatsappLog.forEach(log => {
        if (!leadsIds.has(log.leadId)) return;
        itens.push({
            canal: 'whatsapp',
            data: log.data,
            hora: log.hora || '',
            empresa: log.empresa,
            leadId: log.leadId,
            usuarioId: log.usuarioId,
            resumo: (log.mensagem || '').substring(0, 90) + ((log.mensagem || '').length > 90 ? '...' : '')
        });
    });

    return itens;
}

function renderizarComunicacao() {
    popularFiltroVendedorComunicacao();

    const canalFiltro = document.getElementById('comFiltroCanal').value;
    const vendedorFiltro = usuarioAtual.papel === 'admin' ? document.getElementById('comFiltroVendedor').value : '';
    const diasFiltro = parseInt(document.getElementById('comFiltroPeriodo').value) || 0;

    let itens = getComunicacoesUnificadas();

    if (canalFiltro) itens = itens.filter(i => i.canal === canalFiltro);
    if (vendedorFiltro) itens = itens.filter(i => i.usuarioId === vendedorFiltro);
    if (diasFiltro > 0) {
        const limite = new Date();
        limite.setDate(limite.getDate() - diasFiltro);
        const limiteStr = limite.toISOString().split('T')[0];
        itens = itens.filter(i => i.data >= limiteStr);
    }

    itens.sort((a, b) => (b.data + 'T' + (b.hora || '00:00')).localeCompare(a.data + 'T' + (a.hora || '00:00')));

    const totalEmail = itens.filter(i => i.canal === 'email').length;
    const totalWhatsapp = itens.filter(i => i.canal === 'whatsapp').length;
    document.getElementById('comunicacaoResumoContainer').innerHTML = `
        <div class="resumo-item"><div class="valor">${itens.length}</div><div class="label">Total de Contatos</div></div>
        <div class="resumo-item"><div class="valor">${totalEmail}</div><div class="label">E-mails</div></div>
        <div class="resumo-item"><div class="valor">${totalWhatsapp}</div><div class="label">WhatsApp</div></div>
    `;

    const timelineContainer = document.getElementById('comunicacaoTimelineList');
    if (itens.length === 0) {
        timelineContainer.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="comunicacao"></span></span><p class="text-sm">Nenhum contato no período/filtro selecionado</p></div>`;
    } else {
        timelineContainer.innerHTML = itens.slice(0, 100).map(i => {
            const vendedor = usuarios.find(u => u.id === i.usuarioId);
            const icone = svgIcone(i.canal === 'email' ? 'marketing' : 'whatsapp');
            const tagVendedor = (vendedor && usuarioAtual.papel === 'admin')
                ? ` <span class="text-xs text-muted">(${vendedor.nome})</span>` : '';
            return `
            <div class="historico-item">
                <div class="h-data">${formatarData(i.data)} ${i.hora} • <strong>${i.empresa}</strong>${tagVendedor}</div>
                <div class="h-tipo"><span class="icon-sm">${icone}</span> ${i.canal === 'email' ? 'E-mail' : 'WhatsApp'}</div>
                <div class="h-desc">${i.resumo}</div>
            </div>
            `;
        }).join('');
    }

    renderizarContatosAtrasados();
}

// ---------- Cadência atrasada (quem não recebe contato há mais tempo que o limite do potencial) ----------
function calcularContatosAtrasados() {
    if (!usuarioAtual) return [];
    const leadsVisiveis = getLeadsVisiveis();
    const hojeD = new Date();
    const agrupados = {};

    leadsVisiveis.forEach(l => {
        if (l.etapa !== 'pedido' && !l.cliente) return; // só acompanha clientes ativos, igual à Cadência
        const codigo = l.codigoUnico;
        if (!agrupados[codigo]) {
            agrupados[codigo] = {
                empresa: l.empresa,
                potencial: (l.potencial || 'B').toUpperCase(),
                ultimaData: null,
                leadId: l.id,
                usuarioId: l.usuarioId
            };
        }
        (l.historico || []).forEach(h => {
            if (h.data && (!agrupados[codigo].ultimaData || h.data > agrupados[codigo].ultimaData)) {
                agrupados[codigo].ultimaData = h.data;
            }
        });
    });

    emailLog.forEach(log => {
        const lead = leadsVisiveis.find(l => l.id === log.leadId);
        if (!lead || !agrupados[lead.codigoUnico]) return;
        if (!agrupados[lead.codigoUnico].ultimaData || log.data > agrupados[lead.codigoUnico].ultimaData) {
            agrupados[lead.codigoUnico].ultimaData = log.data;
        }
    });
    whatsappLog.forEach(log => {
        const lead = leadsVisiveis.find(l => l.id === log.leadId);
        if (!lead || !agrupados[lead.codigoUnico]) return;
        if (!agrupados[lead.codigoUnico].ultimaData || log.data > agrupados[lead.codigoUnico].ultimaData) {
            agrupados[lead.codigoUnico].ultimaData = log.data;
        }
    });

    const resultado = [];
    Object.values(agrupados).forEach(c => {
        const limite = DIAS_LIMITE_CONTATO[c.potencial] || DIAS_LIMITE_CONTATO.B;
        const diasSemContato = c.ultimaData
            ? Math.floor((hojeD - new Date(c.ultimaData)) / (1000 * 60 * 60 * 24))
            : null;
        if (diasSemContato === null || diasSemContato >= limite) {
            resultado.push({ ...c, diasSemContato, limite });
        }
    });

    resultado.sort((a, b) => (b.diasSemContato ?? 99999) - (a.diasSemContato ?? 99999));
    return resultado;
}

function renderizarContatosAtrasados() {
    const container = document.getElementById('comunicacaoAtrasadosList');
    if (!container) return;
    const atrasados = calcularContatosAtrasados();

    if (atrasados.length === 0) {
        container.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="lembrete"></span></span><p class="text-sm">Nenhum cliente atrasado na cadência de contato!</p></div>`;
        return;
    }

    container.innerHTML = atrasados.map(c => `
        <div class="cadencia-row">
            <div>
                <strong>${c.empresa}</strong>
                <span class="role-badge ${c.potencial === 'C' ? '' : 'vendedor'}" style="${c.potencial === 'C' ? 'background:#94a3b8;' : ''}">${c.potencial}</span>
                <div style="font-size:11px;color:var(--text-muted);">
                    ${c.diasSemContato === null ? 'Nunca contatado' : `${c.diasSemContato} dia(s) sem contato (limite: ${c.limite})`}
                </div>
            </div>
            <div class="flex gap-8">
                <button class="btn btn-primary btn-xs" onclick="abrirEnvioEmail('${c.leadId}')" title="Enviar e-mail"><span data-icone="marketing"></span></button>
                <button class="btn btn-success btn-xs" onclick="abrirEnvioWhatsApp('${c.leadId}')" title="Enviar WhatsApp"><span data-icone="whatsapp"></span></button>
            </div>
        </div>
    `).join('');
}
