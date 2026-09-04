// ============================================
// PERSISTÊNCIA
// ============================================
// leads vive no Supabase (tabela public.leads); o resto por enquanto continua em localStorage.
let leadsIdsCarregados = new Set(); // ids que vieram do banco na última carga, usado para detectar remoções

function leadParaLinhaSupabase(l) {
    return {
        id: l.id,
        codigo_unico: l.codigoUnico || '',
        cnpj: l.cnpj || '',
        empresa: l.empresa,
        cidade: l.cidade || '',
        estado: l.estado || '',
        telefone: l.telefone || '',
        whatsapp: l.whatsapp || '',
        email: l.email || '',
        decisor: l.decisor || '',
        valor: l.valor || 0,
        potencial: l.potencial || 'B',
        classificacao: l.classificacao || 'outros',
        etapa: l.etapa || 'leads',
        observacoes: l.observacoes || '',
        data_criacao: l.dataCriacao || new Date().toISOString(),
        cliente: !!l.cliente,
        recorrente: !!l.recorrente,
        numero_pedido: l.numeroPedido || '',
        obs_orcamento: l.obsOrcamento || '',
        condicoes: l.condicoes || '',
        desconto: l.desconto || 0,
        frete: l.frete || 0,
        itens: l.itens || [],
        pedidos: l.pedidos || [],
        data_pedido: l.dataPedido || '',
        proxima_acao: l.proximaAcao || '',
        proxima_data: l.proximaData || '',
        tarefas: l.tarefas || {},
        usuario_id: l.usuarioId || null,
        historico: l.historico || [],
        orcamento_anexos: l.orcamentoAnexos || [],
        data_entrada_etapa: l.dataEntradaEtapa || l.dataCriacao || new Date().toISOString(),
        card_obs: l.cardObs || '',
        autorizacao_pedido_id: l.autorizacaoPedidoId || null,
        autorizacao_pedido_status: l.autorizacaoPedidoStatus || null
    };
}

function linhaSupabaseParaLead(r) {
    return {
        id: r.id,
        codigoUnico: r.codigo_unico,
        cnpj: r.cnpj || '',
        empresa: r.empresa,
        cidade: r.cidade,
        estado: r.estado,
        telefone: r.telefone,
        whatsapp: r.whatsapp,
        email: r.email,
        decisor: r.decisor,
        valor: r.valor,
        potencial: r.potencial,
        classificacao: r.classificacao || 'outros',
        etapa: r.etapa,
        observacoes: r.observacoes,
        dataCriacao: r.data_criacao,
        cliente: r.cliente,
        recorrente: r.recorrente,
        numeroPedido: r.numero_pedido,
        obsOrcamento: r.obs_orcamento,
        condicoes: r.condicoes,
        desconto: r.desconto,
        frete: r.frete,
        itens: r.itens || [],
        pedidos: r.pedidos || [],
        dataPedido: r.data_pedido,
        proximaAcao: r.proxima_acao,
        proximaData: r.proxima_data,
        tarefas: r.tarefas || {},
        usuarioId: r.usuario_id,
        historico: r.historico || [],
        orcamentoAnexos: r.orcamento_anexos || [],
        dataEntradaEtapa: r.data_entrada_etapa,
        cardObs: r.card_obs || '',
        autorizacaoPedidoId: r.autorizacao_pedido_id || null,
        autorizacaoPedidoStatus: r.autorizacao_pedido_status || null
    };
}

async function carregarDados() {
    const saved = localStorage.getItem('ploomesLeadsV5');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            modelos = data.modelos || [];
            campanhas = data.campanhas || [];
            emailLog = data.emailLog || [];
            modelosWhatsapp = data.modelosWhatsapp || [];
            whatsappLog = data.whatsappLog || [];
            whatsappCampanhas = data.whatsappCampanhas || [];
            whatsappOptOut = data.whatsappOptOut || [];
            whatsappConsentimentos = data.whatsappConsentimentos || {};
            whatsappFilaAtual = data.whatsappFilaAtual || null;
            perdidos = data.perdidos || [];
            metas = data.metas || {};
            coletorListas = data.coletorListas || [];
            coletorListaAtivaId = data.coletorListaAtivaId || null;
            segmentosBusca = data.segmentosBusca || [];
        } catch (e) {
            modelos = [];
            campanhas = [];
            emailLog = [];
            modelosWhatsapp = [];
            whatsappLog = [];
            whatsappCampanhas = [];
            whatsappOptOut = [];
            whatsappConsentimentos = {};
            whatsappFilaAtual = null;
            perdidos = [];
        }
    }

    const { data: linhas, error } = await supabaseClient.from('leads').select('*');
    if (error) {
        console.error('Erro ao carregar leads do Supabase:', error);
        showToast('Não foi possível carregar os leads do banco de dados.', 'error');
        leads = [];
    } else {
        leads = (linhas || []).map(linhaSupabaseParaLead);
    }
    leadsIdsCarregados = new Set(leads.map(l => l.id));

    leads = leads.map(l => {
        if (!l.codigoUnico) l.codigoUnico = l.empresa ? l.empresa.trim().toLowerCase().replace(
            /\s+/g, '-') : l.id;
        if (!l.historico) l.historico = [];
        if (!l.dataCriacao) l.dataCriacao = new Date().toISOString();
        if (!l.etapa) l.etapa = 'leads';
        if (!l.valor) l.valor = 0;
        if (!l.classificacao) l.classificacao = 'outros';
        if (!l.itens) l.itens = [];
        if (!l.numeroPedido) l.numeroPedido = '';
        if (!l.obsOrcamento) l.obsOrcamento = '';
        if (!l.condicoes) l.condicoes = '';
        if (!l.desconto) l.desconto = 0;
        if (!l.frete) l.frete = 0;
        if (!l.cliente) l.cliente = (l.etapa === 'pedido');
        if (!l.pedidos) l.pedidos = [];
        if (!l.proximaAcao) l.proximaAcao = '';
        if (!l.proximaData) l.proximaData = '';
        if (!l.tarefas) l.tarefas = {};
        if (!l.dataPedido) {
            l.dataPedido = (l.pedidos && l.pedidos.length > 0) ?
                l.pedidos[l.pedidos.length - 1].data :
                (l.etapa === 'pedido' ? (l.dataCriacao || '').split('T')[0] : '');
        }
        if (!l.usuarioId) {
            const admin = usuarios.find(u => u.papel === 'admin');
            l.usuarioId = admin ? admin.id : (usuarios[0] ? usuarios[0].id : null);
        }
        return l;
    });
    perdidos = perdidos.map(p => {
        if (!p.usuarioId) {
            const admin = usuarios.find(u => u.papel === 'admin');
            p.usuarioId = admin ? admin.id : (usuarios[0] ? usuarios[0].id : null);
        }
        return p;
    });

    if (perdidos.length === 0) {
        carregarExemplosPerdidos();
    }

    if (modelos.length === 0) {
        carregarModelosExemplo();
    }
    if (modelosWhatsapp.length === 0) {
        carregarModelosWhatsappExemplo();
    }
    if (coletorListas.length === 0) {
        coletorListas = [{ id: gerarId(), nome: 'Minha lista', linhas: [] }];
        coletorListaAtivaId = coletorListas[0].id;
    }
    if (!coletorListas.some(p => p.id === coletorListaAtivaId)) {
        coletorListaAtivaId = coletorListas[0].id;
    }
    if (segmentosBusca.length === 0) {
        carregarSegmentosExemplo();
    }
}

async function salvarDados() {
    localStorage.setItem('ploomesLeadsV5', JSON.stringify({
        modelos,
        campanhas,
        emailLog,
        modelosWhatsapp,
        whatsappLog,
        whatsappCampanhas,
        whatsappOptOut,
        whatsappConsentimentos,
        whatsappFilaAtual,
        perdidos,
        metas,
        coletorListas,
        coletorListaAtivaId,
        segmentosBusca
    }));
    atualizarContadores();

    const idsAtuais = new Set(leads.map(l => l.id));
    const idsParaExcluir = [...leadsIdsCarregados].filter(id => !idsAtuais.has(id));
    leadsIdsCarregados = idsAtuais;

    if (leads.length > 0) {
        const linhas = leads.map(leadParaLinhaSupabase);
        const { error } = await supabaseClient.from('leads').upsert(linhas, { onConflict: 'id' });
        if (error) {
            console.error('Erro ao salvar leads no Supabase:', error);
            if (/cnpj|classificacao|column .* does not exist|schema cache/i.test(error.message || '')) {
                const linhasCompatibilidade = linhas.map(linha => {
                    const clone = { ...linha };
                    delete clone.cnpj;
                    delete clone.classificacao;
                    return clone;
                });
                const retry = await supabaseClient.from('leads').upsert(linhasCompatibilidade, { onConflict: 'id' });
                if (retry.error) showToast('Erro ao salvar no banco de dados: ' + retry.error.message, 'error');
                else showToast('Lead salvo. Para persistir novas colunas no Supabase, execute o script SQL de migração.', 'warning');
            } else {
                showToast('Erro ao salvar no banco de dados: ' + error.message, 'error');
            }
        }
    }
    if (idsParaExcluir.length > 0) {
        const { error } = await supabaseClient.from('leads').delete().in('id', idsParaExcluir);
        if (error) {
            console.error('Erro ao excluir leads no Supabase:', error);
        }
    }
}

function carregarExemplos() {
    const adminId = usuarios.find(u => u.papel === 'admin')?.id || (usuarios[0]?.id || 'admin');
    const exemplos = [{
        id: '1',
        codigoUnico: '99.999.999/0001-11',
        empresa: 'Tech Solutions Ltda',
        cidade: 'São Paulo',
        estado: 'SP',
        telefone: '(11) 99999-1111',
        whatsapp: '(11) 98888-1111',
        email: 'contato@techsolutions.com',
        decisor: 'Carlos Silva',
        valor: 150000,
        potencial: 'A',
        etapa: 'oportunidades',
        observacoes: 'Cliente estratégico',
        dataCriacao: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        cliente: false,
        recorrente: false,
        numeroPedido: '',
        obsOrcamento: '',
        condicoes: '',
        desconto: 0,
        frete: 0,
        itens: [{ descricao: 'Serviço de Consultoria', quantidade: 10, preco: 0, observacao: '' }],
        pedidos: [],
        proximaAcao: 'Enviar proposta',
        proximaData: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tarefas: {},
        usuarioId: adminId,
        historico: [{
            data: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: '10:00',
            tipo: 'Ligação',
            descricao: 'Primeiro contato'
        }]
    }, {
        id: '2',
        codigoUnico: '88.888.888/0002-22',
        empresa: 'Distribuidora Norte',
        cidade: 'Recife',
        estado: 'PE',
        telefone: '(81) 99999-2222',
        whatsapp: '(81) 98888-2222',
        email: 'contato@distribuidoranorte.com',
        decisor: 'Mariana Santos',
        valor: 45000,
        potencial: 'B',
        etapa: 'qualificacao',
        observacoes: 'Em processo de qualificação',
        dataCriacao: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        cliente: false,
        recorrente: false,
        numeroPedido: '',
        obsOrcamento: '',
        condicoes: '',
        desconto: 0,
        frete: 0,
        itens: [],
        pedidos: [],
        proximaAcao: 'Agendar reunião',
        proximaData: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tarefas: {},
        usuarioId: adminId,
        historico: [{
            data: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: '11:00',
            tipo: 'Ligação',
            descricao: 'Apresentação inicial'
        }]
    }, {
        id: '3',
        codigoUnico: '77.777.777/0003-33',
        empresa: 'Construtora Alpha',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        telefone: '(31) 99999-3333',
        whatsapp: '(31) 98888-3333',
        email: 'contato@construtoraalpha.com',
        decisor: 'Roberto Almeida',
        valor: 320000,
        potencial: 'A',
        etapa: 'orcamento',
        observacoes: 'Orçamento em análise',
        dataCriacao: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        cliente: false,
        recorrente: false,
        numeroPedido: 'ORC-2024-001',
        obsOrcamento: 'Desconto de 10% para pagamento à vista',
        condicoes: '30 dias para pagamento',
        desconto: 10,
        frete: 1500,
        itens: [
            { descricao: 'Estrutura Metálica', quantidade: 500, preco: 450, observacao: 'Aço galvanizado' },
            { descricao: 'Telhas', quantidade: 1000, preco: 95, observacao: 'Telhas termoacústicas' }
        ],
        pedidos: [],
        proximaAcao: 'Ligar para feedback',
        proximaData: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tarefas: {},
        usuarioId: adminId,
        historico: [{
            data: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: '09:00',
            tipo: 'Ligação',
            descricao: 'Primeiro contato'
        }, {
            data: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: '16:30',
            tipo: 'Orçamento',
            descricao: 'Enviei orçamento detalhado'
        }]
    }, {
        id: '4',
        codigoUnico: '66.666.666/0004-44',
        empresa: 'Startup Inovação',
        cidade: 'Florianópolis',
        estado: 'SC',
        telefone: '(48) 99999-4444',
        whatsapp: '(48) 98888-4444',
        email: 'contato@startupinovacao.com',
        decisor: 'Ana Paula',
        valor: 28000,
        potencial: 'B',
        etapa: 'leads',
        observacoes: 'Lead frio',
        dataCriacao: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
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
        usuarioId: adminId,
        historico: []
    }, {
        id: '5',
        codigoUnico: '55.555.555/0005-55',
        empresa: 'Indústria Sul',
        cidade: 'Porto Alegre',
        estado: 'RS',
        telefone: '(51) 99999-5555',
        whatsapp: '(51) 98888-5555',
        email: 'contato@industriasul.com',
        decisor: 'Fernando Lima',
        valor: 210000,
        potencial: 'A',
        etapa: 'pedido',
        observacoes: 'Pedido confirmado',
        dataCriacao: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        cliente: true,
        recorrente: true,
        numeroPedido: 'PED-2024-002',
        obsOrcamento: 'Entrega em 30 dias',
        condicoes: '50% entrada, 50% na entrega',
        desconto: 5,
        frete: 2000,
        itens: [{ descricao: 'Máquinas Industriais', quantidade: 3, preco: 70000, observacao: 'Modelo X-2000' }],
        pedidos: [
            { numero: 'PED-2024-001', data: '2024-01-15', valor: 180000, itens: 2 },
            { numero: 'PED-2024-002', data: '2024-02-20', valor: 210000, itens: 3 }
        ],
        proximaAcao: 'Agendar visita de pós-venda',
        proximaData: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tarefas: {},
        usuarioId: adminId,
        historico: [{
            data: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: '10:00',
            tipo: 'Ligação',
            descricao: 'Apresentação'
        }, {
            data: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: '11:30',
            tipo: 'Orçamento',
            descricao: 'Enviei orçamento'
        }, {
            data: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: '16:00',
            tipo: 'Pedido',
            descricao: 'Pedido confirmado!'
        }]
    }];
    leads = exemplos;
    carregarExemplosPerdidos();
    salvarDados();
}

function carregarExemplosPerdidos() {
    const adminId = (typeof usuarios !== 'undefined' && usuarios.find(u => u.papel === 'admin')?.id) || (usuarios?.[0]?.id || 'admin');
    const vendedorId = (typeof usuarios !== 'undefined' && usuarios.find(u => u.papel === 'vendedor')?.id) || adminId;
    const agora = Date.now();
    const diaMs = 24 * 60 * 60 * 1000;

    perdidos = [
        {
            id: 'perd-ex-1',
            empresa: 'Logística TransBrasil S.A.',
            decisor: 'Marcos Vinícius (Diretor de Operações)',
            telefone: '(11) 98765-4321',
            cidade: 'Campinas',
            estado: 'SP',
            email: 'marcos@transbrasil.com.br',
            valor: 85000,
            potencial: 'A',
            etapaOrigem: 'orcamento',
            motivo: 'Perdido por preço',
            motivoDetalhe: 'Concorrente ofereceu desconto agressivo de 18% para pagamento à vista.',
            dataCriacao: new Date(agora - 28 * diaMs).toISOString(),
            dataExclusao: new Date(agora - 2 * diaMs).toISOString(),
            dataEntradaEtapa: new Date(agora - 24 * diaMs).toISOString(),
            usuarioId: adminId,
            cardObs: 'Proposta inicial R$ 92.000, ajustada para R$ 85.000.',
            itens: [
                { descricao: 'Sistema de Rastreamento e Gestão de Frotas', quantidade: 50, preco: 1700, observacao: 'Módulos IoT' }
            ],
            historico: [
                { data: new Date(agora - 25 * diaMs).toISOString().split('T')[0], hora: '10:00', tipo: 'Ligação', descricao: 'Apresentação da proposta' },
                { data: new Date(agora - 10 * diaMs).toISOString().split('T')[0], hora: '14:30', tipo: 'Follow-up', descricao: 'Negociação de valores' }
            ]
        },
        {
            id: 'perd-ex-2',
            empresa: 'Supermercados Alvorada',
            decisor: 'Renata Figueiredo (Gerente de Compras)',
            telefone: '(21) 99123-4567',
            cidade: 'Rio de Janeiro',
            estado: 'RJ',
            email: 'compras@alvorada.com.br',
            valor: 142000,
            potencial: 'A',
            etapaOrigem: 'orcamento',
            motivo: 'Concorrente com melhor prazo',
            motivoDetalhe: 'Concorrente prometeu entrega em 10 dias úteis, nosso prazo era de 30 dias.',
            dataCriacao: new Date(agora - 45 * diaMs).toISOString(),
            dataExclusao: new Date(agora - 8 * diaMs).toISOString(),
            dataEntradaEtapa: new Date(agora - 40 * diaMs).toISOString(),
            usuarioId: vendedorId,
            cardObs: 'Necessidade urgente para inauguração da filial Barra da Tijuca.',
            itens: [
                { descricao: 'Gôndolas e Estruturas Metálicas de Exposição', quantidade: 200, preco: 710, observacao: 'Pintura eletrostática branca' }
            ],
            historico: [
                { data: new Date(agora - 40 * diaMs).toISOString().split('T')[0], hora: '11:00', tipo: 'Orçamento', descricao: 'Envio de orçamento completo' },
                { data: new Date(agora - 12 * diaMs).toISOString().split('T')[0], hora: '16:00', tipo: 'Ligação', descricao: 'Cobrança de posicionamento da diretoria' }
            ]
        },
        {
            id: 'perd-ex-3',
            empresa: 'Metalúrgica Imperial Ltda',
            decisor: 'Eng. Cláudio Fontes',
            telefone: '(31) 98456-7890',
            cidade: 'Belo Horizonte',
            estado: 'MG',
            email: 'engenharia@metimperial.ind.br',
            valor: 64500,
            potencial: 'B',
            etapaOrigem: 'orcamento',
            motivo: 'Cliente sem orçamento aprovado',
            motivoDetalhe: 'Diretoria congelou investimentos de Capex para o semestre atual.',
            dataCriacao: new Date(agora - 60 * diaMs).toISOString(),
            dataExclusao: new Date(agora - 15 * diaMs).toISOString(),
            dataEntradaEtapa: new Date(agora - 52 * diaMs).toISOString(),
            usuarioId: adminId,
            cardObs: 'Retomar contato no próximo trimestre para reavaliação de verba.',
            itens: [
                { descricao: 'Pintura Industrial e Tratamento Anticorrosivo', quantidade: 1, preco: 64500, observacao: 'Tanques de decapagem' }
            ],
            historico: [
                { data: new Date(agora - 50 * diaMs).toISOString().split('T')[0], hora: '09:30', tipo: 'Reunião', descricao: 'Visita técnica realizada na planta' }
            ]
        },
        {
            id: 'perd-ex-4',
            empresa: 'Hospitalar Medic Prime',
            decisor: 'Dra. Beatriz Moura',
            telefone: '(41) 97890-1234',
            cidade: 'Curitiba',
            estado: 'PR',
            email: 'compras@medicprime.med.br',
            valor: 198000,
            potencial: 'A',
            etapaOrigem: 'orcamento',
            motivo: 'Condições de pagamento',
            motivoDetalhe: 'Exigiam parcelamento em 12x sem juros faturado, nosso limite era de 4x.',
            dataCriacao: new Date(agora - 35 * diaMs).toISOString(),
            dataExclusao: new Date(agora - 22 * diaMs).toISOString(),
            dataEntradaEtapa: new Date(agora - 30 * diaMs).toISOString(),
            usuarioId: vendedorId,
            cardObs: 'Cliente de grande porte, mas política de crédito não flexibilizou.',
            itens: [
                { descricao: 'Lote de Equipamentos e Acessórios Clínicos', quantidade: 12, preco: 16500, observacao: 'Garantia estendida 24 meses' }
            ],
            historico: [
                { data: new Date(agora - 30 * diaMs).toISOString().split('T')[0], hora: '15:00', tipo: 'Orçamento', descricao: 'Envio de condições comerciais' }
            ]
        },
        {
            id: 'perd-ex-5',
            empresa: 'Construtora Horizonte Nobre',
            decisor: 'Ricardo Antunes (Suprimentos)',
            telefone: '(19) 99345-6789',
            cidade: 'Campinas',
            estado: 'SP',
            email: 'suprimentos@horizonteobras.com',
            valor: 48900,
            potencial: 'C',
            etapaOrigem: 'orcamento',
            motivo: 'Desistiu do projeto',
            motivoDetalhe: 'Obra cancelada pelo investidor do condomínio fechado.',
            dataCriacao: new Date(agora - 20 * diaMs).toISOString(),
            dataExclusao: new Date(agora - 5 * diaMs).toISOString(),
            dataEntradaEtapa: new Date(agora - 18 * diaMs).toISOString(),
            usuarioId: adminId,
            cardObs: 'Projeto cancelado sem previsão de retomada.',
            itens: [
                { descricao: 'Cobertura em Policarbonato Alveolar e Perfis de Alumínio', quantidade: 1, preco: 48900, observacao: 'Área externa' }
            ],
            historico: [
                { data: new Date(agora - 18 * diaMs).toISOString().split('T')[0], hora: '14:00', tipo: 'WhatsApp', descricao: 'Esclarecimento de especificações do projeto' }
            ]
        }
    ];
}

window.carregarExemplosPerdidos = carregarExemplosPerdidos;
window.carregarExemplosPerdidosEAtualizar = function() {
    carregarExemplosPerdidos();
    if (typeof salvarDados === 'function') salvarDados();
    if (typeof renderizarAll === 'function') renderizarAll();
    if (typeof showToast === 'function') showToast('5 exemplos de orçamentos perdidos foram carregados com sucesso!');
};

function carregarModelosExemplo() {
    modelos = [{
        id: 'm1',
        nome: 'Proposta Comercial',
        assunto: 'Proposta para {{empresa}}',
        conteudo: 'Olá {{decisor}},\n\nSegue nossa proposta comercial para {{empresa}}.\n\nValor: {{valor}}\n\nAguardamos seu retorno.\n\nAtenciosamente,\nEquipe Comercial'
    }, {
        id: 'm2',
        nome: 'Follow-up',
        assunto: 'Acompanhamento - {{empresa}}',
        conteudo: 'Olá {{decisor}},\n\nGostaríamos de saber se você teve a oportunidade de analisar nossa proposta.\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente,\nEquipe Comercial'
    }, {
        id: 'm3',
        nome: 'Newsletter',
        assunto: 'Novidades para {{empresa}}',
        conteudo: 'Olá {{decisor}},\n\nTemos novidades que podem interessar à {{empresa}}.\n\nEntre em contato para mais informações.\n\nAtenciosamente,\nEquipe de Marketing'
    }];
    salvarDados();
}

function carregarModelosWhatsappExemplo() {
    modelosWhatsapp = [{
        id: 'w1',
        nome: 'Primeiro Contato',
        conteudo: 'Olá {{decisor}}! Aqui é da equipe comercial. Tudo bem? Gostaríamos de apresentar uma proposta para a {{empresa}}. Podemos conversar?'
    }, {
        id: 'w2',
        nome: 'Follow-up',
        conteudo: 'Oi {{decisor}}, passando para saber se conseguiu ver nossa proposta para a {{empresa}} (valor: {{valor}}). Fico à disposição!'
    }, {
        id: 'w3',
        nome: 'Confirmação de Pedido',
        conteudo: 'Olá {{decisor}}! Seu pedido para a {{empresa}} foi confirmado. Qualquer dúvida, estou por aqui. Obrigado pela confiança!'
    }];
    salvarDados();
}

function carregarSegmentosExemplo() {
    segmentosBusca = [
        { id: gerarId(), termo: 'indústria metalúrgica' },
        { id: gerarId(), termo: 'usinagem CNC' },
        { id: gerarId(), termo: 'fábrica de embalagens' },
        { id: gerarId(), termo: 'indústria de plásticos' },
        { id: gerarId(), termo: 'fundição' },
        { id: gerarId(), termo: 'marcenaria industrial' },
        { id: gerarId(), termo: 'indústria alimentícia' }
    ];
    salvarDados();
}

function confirmarCarregarExemplos() {
    if (leads.length > 0) {
        if (!confirm('Isso irá SUBSTITUIR todos os dados atuais. Deseja continuar?')) return;
        if (!confirm('Tem certeza? Os dados atuais serão PERDIDOS!')) return;
    }
    carregarExemplos();
    renderizarAll();
    showToast('Exemplos carregados com sucesso!');
}
