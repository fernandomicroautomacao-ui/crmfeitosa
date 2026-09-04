// ============================================
// CLIENTES
// ============================================

function renderizarClientes() {
    const tbody = document.getElementById('clientesTableBody');
    const search = document.getElementById('searchInput').value.toLowerCase();
    const potencialFilter = document.getElementById('filterPotencial').value;
    const leadsVisiveis = getLeadsVisiveis();

    const agrupados = {};
    leadsVisiveis.forEach(l => {
        if (l.etapa === 'pedido' || l.cliente) {
            const codigo = l.codigoUnico;
            if (!agrupados[codigo]) {
                agrupados[codigo] = {
                    id: l.id,
                    codigoUnico: codigo,
                    empresa: l.empresa,
                    cidade: l.cidade || '—',
                    estado: l.estado || '—',
                    telefone: l.telefone || '',
                    whatsapp: l.whatsapp || '',
                    email: l.email || '',
                    potencial: l.potencial || 'B',
                    numeroPedido: l.numeroPedido || '',
                    valorTotal: 0,
                    contagem: 0
                };
            }
            agrupados[codigo].valorTotal += (l.valor || 0);
            agrupados[codigo].contagem++;
            if (l.numeroPedido && !agrupados[codigo].numeroPedido.includes(l.numeroPedido)) {
                agrupados[codigo].numeroPedido = l.numeroPedido;
            }
        }
    });

    let lista = Object.values(agrupados).filter(c => {
        const matchSearch = c.empresa.toLowerCase().includes(search) ||
            c.codigoUnico.toLowerCase().includes(search) ||
            c.cidade.toLowerCase().includes(search);
        const matchPotencial = !potencialFilter || c.potencial === potencialFilter;
        return matchSearch && matchPotencial;
    });

    if (lista.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="6"><div class="empty-state compact"><span class="emoji-big"><span data-icone="busca"></span></span><p class="text-sm">Nenhum cliente encontrado</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr class="clickable" tabindex="0" role="button" onclick="abrirModalCliente('${c.id}')"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirModalCliente('${c.id}')}">
            <td>
                <strong>${c.empresa}</strong>
                <div class="text-xs text-muted">${c.cidade}/${c.estado}</div>
            </td>
            <td>
                ${c.whatsapp ? `${c.whatsapp}<br>` : ''}
                ${c.email ? `${c.email}` : ''}
            </td>
            <td><span class="numero-pedido" style="font-family:monospace;font-weight:600;">${c.codigoUnico || 'N/A'}</span></td>
            <td style="font-weight:700;color:var(--stage-pedido);">
                ${formatarMoeda(c.valorTotal)}
                <div class="text-muted" style="font-size:10px;font-weight:400;">${c.contagem} pedido(s)</div>
            </td>
            <td><span class="badge-etapa pedido">Cliente</span></td>
            <td>
                <div class="flex gap-8">
                    <button class="btn btn-primary btn-xs" onclick="event.stopPropagation();abrirAtividade('${c.id}')"><span data-icone="nota"></span></button>
                    <button class="btn btn-pink btn-xs" onclick="event.stopPropagation();abrirEnvioEmail('${c.id}')"><span data-icone="marketing"></span></button>
                    <button class="btn btn-success btn-xs" onclick="event.stopPropagation();abrirEnvioWhatsApp('${c.id}')"><span data-icone="whatsapp"></span></button>
                    <button class="btn btn-success btn-xs" onclick="event.stopPropagation();gerarNovoNegocio('${c.id}')"><span data-icone="atualizar"></span></button>
                    <button class="btn btn-info btn-xs" onclick="event.stopPropagation();abrirModalCliente('${c.id}')"><span data-icone="perfil"></span></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function resetarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterPotencial').value = '';
    renderizarClientes();
}

function abrirModalCliente(leadId) {
    const leadRef = leads.find(l => l.id === leadId);
    if (!leadRef) return;
    if (usuarioAtual.papel !== 'admin' && leadRef.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para visualizar este cliente.', 'error');
        return;
    }

    const codigo = leadRef.codigoUnico;
    const companheiros = leads.filter(l => l.codigoUnico === codigo);
    const principal = companheiros.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao))[0];

    document.getElementById('clienteModalTitle').textContent = `Perfil Corporativo: ${principal.empresa}`;

    const totalNegocios = companheiros.length;
    const fechados = companheiros.filter(l => l.etapa === 'pedido');
    const totalValor = companheiros.reduce((acc, l) => acc + (l.valor || 0), 0);

    let negociosHtml = `<h4 class="subsection-title">Oportunidades &amp; Vendas (${totalNegocios})</h4>
        <div class="flex" style="flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;margin-bottom:12px;">`;
    companheiros.forEach(c => {
        const etapa = ETAPAS.find(e => e.id === c.etapa);
        negociosHtml += `
            <div class="negocio-row">
                <div>
                    <strong>${c.empresa}</strong>
                    <span class="text-xs font-bold" style="background:${etapa?.cor || '#2d4863'};color:#fff;padding:2px 8px;border-radius:4px;margin-left:6px;">${ETAPA_NOMES[c.etapa]}</span>
                    <div class="text-xs text-muted mt-4">Criado: ${formatarData(c.dataCriacao)} ${c.numeroPedido ? `• N°: ${c.numeroPedido}` : ''}</div>
                </div>
                <div class="text-center">
                    <span class="font-bold" style="color:var(--stage-pedido);">${formatarMoeda(c.valor || 0)}</span>
                    <div>
                        <button class="btn btn-warning btn-xs" onclick="fecharModal('clienteModal');abrirModalLead('${c.id}')"><span data-icone="editar"></span></button>
                        <button class="btn btn-primary btn-xs" onclick="fecharModal('clienteModal');abrirAtividade('${c.id}')"><span data-icone="nota"></span></button>
                    </div>
                </div>
            </div>
        `;
    });
    negociosHtml += `</div>`;

    const html = `
        <div class="cliente-info-grid">
            <div class="info-item"><span class="info-item-label">Código Único</span><span class="info-item-value"><span class="info-badge">${codigo}</span></span></div>
            <div class="info-item"><span class="info-item-label">Empresa</span><span class="info-item-value">${principal.empresa}</span></div>
            <div class="info-item"><span class="info-item-label">Decisor</span><span class="info-item-value">${principal.decisor || '—'}</span></div>
            <div class="info-item"><span class="info-item-label">Telefone</span><span class="info-item-value">${principal.telefone || '—'}</span></div>
            <div class="info-item"><span class="info-item-label">WhatsApp</span><span class="info-item-value">${principal.whatsapp || '—'}</span></div>
            <div class="info-item"><span class="info-item-label">Email</span><span class="info-item-value">${principal.email || '—'}</span></div>
            <div class="info-item"><span class="info-item-label">Localização</span><span class="info-item-value">${principal.cidade || '—'} / ${principal.estado || '—'}</span></div>
            <div class="info-item"><span class="info-item-label">Potencial</span><span class="info-item-value">${principal.potencial || 'B'}</span></div>
            <div class="info-item"><span class="info-item-label">Negócios</span><span class="info-item-value">${totalNegocios} abertos</span></div>
            <div class="info-item"><span class="info-item-label">Pedidos</span><span class="info-item-value">${fechados.length}</span></div>
            <div class="info-item highlight-box" style="grid-column:1 / -1;">
                <span class="info-item-label">Volume Total</span><span class="highlight-value">${formatarMoeda(totalValor)}</span>
            </div>
        </div>

        <h4 class="subsection-title" style="margin-top:20px;">Ações Rápidas</h4>
        <div class="cliente-actions-grid">
            <a href="tel:${principal.telefone || ''}" class="cliente-action-btn" target="_blank">
                <span class="icon"><span data-icone="telefone"></span></span><span class="label">Ligar</span>
            </a>
            <a href="https://wa.me/55${(principal.whatsapp || '').replace(/\D/g, '')}" class="cliente-action-btn" target="_blank">
                <span class="icon"><span data-icone="whatsapp"></span></span><span class="label">WhatsApp</span>
            </a>
            <button class="cliente-action-btn" onclick="fecharModal('clienteModal');abrirAtividade('${principal.id}')">
                <span class="icon"><span data-icone="nota"></span></span><span class="label">Atividade</span>
            </button>
            <button class="cliente-action-btn" onclick="fecharModal('clienteModal');abrirEnvioEmail('${principal.id}')">
                <span class="icon"><span data-icone="marketing"></span></span><span class="label">Enviar Email</span>
            </button>
            <button class="cliente-action-btn" onclick="fecharModal('clienteModal');gerarNovoNegocio('${principal.id}')">
                <span class="icon"><span data-icone="atualizar"></span></span><span class="label">+ Negócio</span>
            </button>
        </div>

        ${negociosHtml}
    `;

    document.getElementById('clienteModalContent').innerHTML = html;
    abrirModal('clienteModal');
}

function gerarNovoNegocio(leadId) {
    const leadPai = leads.find(l => l.id === leadId);
    if (!leadPai) return;
    if (usuarioAtual.papel !== 'admin' && leadPai.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para criar um novo negócio para este cliente.', 'error');
        return;
    }

    if (!confirm(`Abrir nova venda para "${leadPai.empresa}"?`)) return;

    const novoLead = {
        id: gerarId(),
        codigoUnico: leadPai.codigoUnico,
        empresa: `${leadPai.empresa} (Novo Negócio)`,
        cidade: leadPai.cidade || '',
        estado: leadPai.estado || '',
        telefone: leadPai.telefone || '',
        whatsapp: leadPai.whatsapp || '',
        email: leadPai.email || '',
        decisor: leadPai.decisor || '',
        valor: 0,
        potencial: leadPai.potencial || 'B',
        etapa: 'leads',
        observacoes: `Nova oportunidade vinculada ao cliente ${leadPai.codigoUnico}`,
        dataCriacao: new Date().toISOString(),
        cliente: false,
        recorrente: false,
        numeroPedido: '',
        obsOrcamento: '',
        condicoes: '',
        desconto: 0,
        frete: 0,
        itens: [],
        pedidos: [],
        proximaAcao: '',
        proximaData: '',
        tarefas: {},
        usuarioId: usuarioAtual.id,
        historico: [{
            data: hoje(),
            hora: new Date().toTimeString().slice(0, 5),
            tipo: 'Movimento',
            descricao: `Nova oportunidade vinculada ao código ${leadPai.codigoUnico}`
        }]
    };

    leads.unshift(novoLead);
    salvarDados();
    showToast('Novo negócio vinculado!');
    renderizarAll();
}
