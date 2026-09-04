// ============================================
// SALVAR LEAD E ATIVIDADE
// ============================================
function abrirModalLead(leadId) {
    const form = document.getElementById('leadForm');
    form.reset();
    document.getElementById('leadId').value = '';
    document.getElementById('fPotencial').value = 'B';
    document.getElementById('fEtapa').value = 'leads';
    if (document.getElementById('fClassificacao')) document.getElementById('fClassificacao').value = 'outros';

    if (leadId) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
            showToast('Você não tem permissão para editar este lead.', 'error');
            return;
        }
        document.getElementById('modalTitle').textContent = 'Editar Lead';
        document.getElementById('leadId').value = lead.id;
        document.getElementById('fEmpresa').value = lead.empresa || '';
        document.getElementById('fCodigoUnico').value = lead.codigoUnico || '';
        document.getElementById('fCnpj').value = lead.cnpj || '';
        document.getElementById('fValor').value = lead.valor || '';
        document.getElementById('fDecisor').value = lead.decisor || '';
        document.getElementById('fTelefone').value = lead.telefone || '';
        document.getElementById('fWhatsApp').value = lead.whatsapp || '';
        document.getElementById('fEmail').value = lead.email || '';
        document.getElementById('fPotencial').value = lead.potencial || 'B';
        if (document.getElementById('fClassificacao')) document.getElementById('fClassificacao').value = lead.classificacao || 'outros';
        document.getElementById('fCidade').value = lead.cidade || '';
        document.getElementById('fEstado').value = lead.estado || '';
        document.getElementById('fEtapa').value = lead.etapa || 'leads';
        document.getElementById('fObservacoes').value = lead.observacoes || '';
    } else {
        document.getElementById('modalTitle').textContent = 'Novo Lead';
        const cnpjField = document.getElementById('fCnpj');
        if (cnpjField) cnpjField.value = '';
    }

    abrirModal('leadModal');
}

function salvarLead(event) {
    event.preventDefault();
    const id = document.getElementById('leadId').value;
    let codigoUnico = document.getElementById('fCodigoUnico').value.trim();
    const empresa = document.getElementById('fEmpresa').value.trim();

    if (!empresa) {
        showToast('Nome da empresa é obrigatório!', 'error');
        return;
    }

    if (!codigoUnico) {
        codigoUnico = empresa.toLowerCase().replace(/\s+/g, '-');
    }

    if (!id) {
        const duplicataCodigo = leads.find(l => l.codigoUnico.toLowerCase() === codigoUnico.toLowerCase());
        const duplicataNome = !duplicataCodigo && leads.find(l => l.empresa.trim().toLowerCase() === empresa.toLowerCase());
        const duplicata = duplicataCodigo || duplicataNome;
        if (duplicata) {
            const motivo = duplicataCodigo
                ? `o código único "${codigoUnico}" já está em uso por "${duplicata.empresa}"`
                : `já existe um lead chamado "${duplicata.empresa}" (código ${duplicata.codigoUnico})`;
            if (!confirm(`Possível duplicata: ${motivo}.\n\nSe for um novo negócio para o mesmo cliente, use o botão "+ Negócio" no perfil dele para manter o histórico junto.\n\nDeseja continuar e criar este lead mesmo assim?`)) {
                return;
            }
        }
    }

    const dados = {
        empresa,
        codigoUnico,
        cnpj: document.getElementById('fCnpj')?.value.trim() || '',
        valor: parseFloat(document.getElementById('fValor').value) || 0,
        telefone: document.getElementById('fTelefone').value.trim(),
        whatsapp: document.getElementById('fWhatsApp').value.trim(),
        email: document.getElementById('fEmail').value.trim(),
        decisor: document.getElementById('fDecisor').value.trim(),
        cidade: document.getElementById('fCidade').value.trim(),
        estado: document.getElementById('fEstado').value.trim(),
        potencial: document.getElementById('fPotencial').value,
        classificacao: document.getElementById('fClassificacao')?.value || 'outros',
        etapa: document.getElementById('fEtapa').value,
        observacoes: document.getElementById('fObservacoes').value.trim()
    };

    if (id) {
        const index = leads.findIndex(l => l.id === id);
        if (index !== -1) {
            const lead = leads[index];
            if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
                showToast('Você não tem permissão para editar este lead.', 'error');
                return;
            }
            const etapaAnterior = lead.etapa;
            leads[index] = { ...lead, ...dados };
            leads[index].cliente = (leads[index].etapa === 'pedido');
            if (dados.etapa !== etapaAnterior) {
                leads[index].dataEntradaEtapa = new Date().toISOString();
            }
            if (dados.etapa === 'pedido' && etapaAnterior !== 'pedido') {
                leads[index].dataEntradaPedido = new Date().toISOString();
                leads[index].dataPedido = hoje();
                if (!leads[index].pedidos || leads[index].pedidos.length === 0) {
                    leads[index].pedidos = leads[index].pedidos || [];
                    leads[index].pedidos.push({
                        numero: leads[index].numeroPedido || `PED-${new Date().getFullYear()}-001`,
                        data: hoje(),
                        valor: leads[index].valor || 0,
                        itens: leads[index].itens ? leads[index].itens.length : 0
                    });
                }
            }
            showToast(`"${dados.empresa}" atualizado!`);
            if (typeof registrarAuditoriaLocal === 'function') registrarAuditoriaLocal('Atualização', 'lead', leads[index].id, dados.empresa);
        }
    } else {
        const novoLead = {
            id: gerarId(),
            ...dados,
            dataCriacao: new Date().toISOString(),
            dataEntradaEtapa: new Date().toISOString(),
            cardObs: '',
            cliente: (dados.etapa === 'pedido'),
            recorrente: false,
            numeroPedido: '',
            obsOrcamento: '',
            condicoes: '',
            desconto: 0,
            frete: 0,
            itens: [],
            pedidos: dados.etapa === 'pedido' ? [{
                numero: `PED-${new Date().getFullYear()}-001`,
                data: hoje(),
                valor: dados.valor || 0,
                itens: 0
            }] : [],
            dataEntradaPedido: dados.etapa === 'pedido' ? new Date().toISOString() : '',
            dataPedido: dados.etapa === 'pedido' ? hoje() : '',
            proximaAcao: '',
            proximaData: '',
            tarefas: {},
            usuarioId: usuarioAtual.id,
            historico: [{
                data: hoje(),
                hora: new Date().toTimeString().slice(0, 5),
                tipo: 'Movimento',
                descricao: `Criado na etapa ${ETAPA_NOMES[dados.etapa]}`
            }]
        };
        leads.unshift(novoLead);
        showToast(`"${dados.empresa}" registrado!`);
        if (typeof registrarAuditoriaLocal === 'function') registrarAuditoriaLocal('Criação', 'lead', novoLead.id, dados.empresa);
    }

    salvarDados();
    fecharModal('leadModal');
    renderizarAll();
}

function abrirAtividade(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para registrar atividade neste lead.', 'error');
        return;
    }

    document.getElementById('atividadeLeadId').value = leadId;
    document.getElementById('aData').value = hoje();
    document.getElementById('aHora').value = new Date().toTimeString().slice(0, 5);
    document.getElementById('aTipo').value = 'Ligação';
    document.getElementById('aDescricao').value = '';
    document.getElementById('aMarcarTarefa').checked = false;
    document.getElementById('aTarefaDataWrap').style.display = 'none';
    document.getElementById('aTarefaData').value = '';

    abrirModal('atividadeModal');
}

function salvarAtividade(event) {
    event.preventDefault();
    const leadId = document.getElementById('atividadeLeadId').value;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para registrar atividade neste lead.', 'error');
        return;
    }

    const data = document.getElementById('aData').value;
    const hora = document.getElementById('aHora').value;
    const tipo = document.getElementById('aTipo').value;
    const descricao = document.getElementById('aDescricao').value.trim();
    const marcarTarefa = document.getElementById('aMarcarTarefa').checked;
    const tarefaData = document.getElementById('aTarefaData').value;

    if (!data || !descricao) {
        showToast('Preencha Data e Descrição!', 'error');
        return;
    }

    if (marcarTarefa && !tarefaData) {
        showToast('Informe a data prevista da tarefa!', 'error');
        return;
    }

    lead.historico.push({
        data,
        hora,
        tipo,
        descricao
    });

    if (marcarTarefa) {
        lead.proximaAcao = descricao;
        lead.proximaData = tarefaData;
        if (!lead.tarefas) lead.tarefas = {};
        lead.tarefas[tarefaData] = { status: 'pendente' };
        showToast('Atividade vinculada como tarefa do card!');
    }

    if (tipo === 'Pedido' && lead.etapa !== 'pedido') {
        lead.etapa = 'pedido';
        lead.cliente = true;
        const numPed = `PED-${new Date().getFullYear()}-${String(lead.pedidos.length + 1).padStart(3, '0')}`;
        lead.numeroPedido = numPed;
        lead.pedidos.push({
            numero: numPed,
            data,
            valor: lead.valor || 0,
            itens: lead.itens ? lead.itens.length : 0
        });
        lead.dataEntradaPedido = new Date().toISOString();
        lead.dataPedido = data;
        lead.dataEntradaEtapa = new Date().toISOString();
        lead.historico.push({ data, hora, tipo: 'Movimento', descricao: `Movido para ${ETAPA_NOMES.pedido}` });
        showToast('Pedido gerado com sucesso!');
    } else if (tipo === 'Orçamento' && lead.etapa !== 'pedido') {
        lead.etapa = 'orcamento';
        showToast('Movido para Orçamento');
    }

    salvarDados();
    if (typeof registrarAuditoriaLocal === 'function') registrarAuditoriaLocal('Atividade registrada', 'lead', lead.id, tipo);
    fecharModal('atividadeModal');
    renderizarAll();
}
