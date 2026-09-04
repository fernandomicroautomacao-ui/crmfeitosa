// ============================================
// MARKETING - MODELOS
// ============================================
function abrirModalModelo(modeloId = null) {
    const form = document.getElementById('modeloForm');
    form.reset();

    if (modeloId) {
        const modelo = modelos.find(m => m.id === modeloId);
        if (!modelo) return;
        document.getElementById('modeloModalTitle').textContent = 'Editar Modelo';
        document.getElementById('modeloId').value = modeloId;
        document.getElementById('mNome').value = modelo.nome || '';
        document.getElementById('mAssunto').value = modelo.assunto || '';
        document.getElementById('mConteudo').value = modelo.conteudo || '';
    } else {
        document.getElementById('modeloModalTitle').textContent = 'Novo Modelo de Email';
        document.getElementById('modeloId').value = '';
    }

    abrirModal('modeloModal');
}

function salvarModelo(event) {
    event.preventDefault();
    const id = document.getElementById('modeloId').value;
    const nome = document.getElementById('mNome').value.trim();
    const assunto = document.getElementById('mAssunto').value.trim();
    const conteudo = document.getElementById('mConteudo').value.trim();

    if (!nome || !assunto || !conteudo) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }

    if (id) {
        const index = modelos.findIndex(m => m.id === id);
        if (index !== -1) {
            modelos[index] = { ...modelos[index], nome, assunto, conteudo };
            showToast('Modelo atualizado!');
        }
    } else {
        modelos.push({ id: gerarId(), nome, assunto, conteudo });
        showToast('Modelo criado!');
    }

    salvarDados();
    fecharModal('modeloModal');
    renderizarMarketing();
}

function excluirModelo(id) {
    if (!confirm('Remover este modelo?')) return;
    modelos = modelos.filter(m => m.id !== id);
    salvarDados();
    renderizarMarketing();
    showToast('Modelo removido!');
}

function inserirTag(tag) {
    const textarea = document.getElementById('mConteudo');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + tag + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
}

// ============================================
// MARKETING - CAMPANHAS
// ============================================
function abrirModalCampanha(campanhaId = null) {
    const form = document.getElementById('campanhaForm');
    form.reset();

    const select = document.getElementById('cModelo');
    select.innerHTML = '<option value="">Selecione um modelo</option>' +
        modelos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');

    if (campanhaId) {
        const campanha = campanhas.find(c => c.id === campanhaId);
        if (!campanha) return;
        document.getElementById('campanhaModalTitle').textContent = 'Editar Campanha';
        document.getElementById('campanhaId').value = campanhaId;
        document.getElementById('cNome').value = campanha.nome || '';
        document.getElementById('cModelo').value = campanha.modeloId || '';
        document.getElementById('cStatus').value = campanha.status || 'ativa';
        document.getElementById('cDataInicio').value = campanha.dataInicio || '';
        document.getElementById('cDataFim').value = campanha.dataFim || '';
        document.getElementById('cDescricao').value = campanha.descricao || '';
        if (campanha.alvo) {
            const opts = document.getElementById('cAlvo').options;
            for (let opt of opts) {
                opt.selected = campanha.alvo.includes(opt.value);
            }
        }
        if (campanha.classificacoes && document.getElementById('cClassificacao')) {
            const opts = document.getElementById('cClassificacao').options;
            for (let opt of opts) {
                opt.selected = campanha.classificacoes.includes(opt.value);
            }
        }
    } else {
        document.getElementById('campanhaModalTitle').textContent = 'Nova Campanha';
        document.getElementById('campanhaId').value = '';
        document.getElementById('cStatus').value = 'ativa';
        if (document.getElementById('cClassificacao')) {
            const opts = document.getElementById('cClassificacao').options;
            for (let opt of opts) opt.selected = false;
        }
    }

    abrirModal('campanhaModal');
}

function salvarCampanha(event) {
    event.preventDefault();
    const id = document.getElementById('campanhaId').value;
    const nome = document.getElementById('cNome').value.trim();
    const modeloId = document.getElementById('cModelo').value;
    const status = document.getElementById('cStatus').value;
    const dataInicio = document.getElementById('cDataInicio').value;
    const dataFim = document.getElementById('cDataFim').value;
    const descricao = document.getElementById('cDescricao').value.trim();

    const alvoSelect = document.getElementById('cAlvo');
    const alvo = Array.from(alvoSelect.selectedOptions).map(opt => opt.value);

    const classifSelect = document.getElementById('cClassificacao');
    const classificacoes = classifSelect ? Array.from(classifSelect.selectedOptions).map(opt => opt.value) : [];

    if (!nome || !modeloId) {
        showToast('Preencha nome e modelo!', 'error');
        return;
    }

    if (id) {
        const index = campanhas.findIndex(c => c.id === id);
        if (index !== -1) {
            campanhas[index] = { ...campanhas[index], nome, modeloId, status, dataInicio, dataFim, descricao,
                alvo, classificacoes };
            showToast('Campanha atualizada!');
        }
    } else {
        campanhas.push({
            id: gerarId(),
            nome,
            modeloId,
            status,
            dataInicio,
            dataFim,
            descricao,
            alvo,
            classificacoes,
            criadaEm: new Date().toISOString(),
            emailsEnviados: 0,
            usuarioId: usuarioAtual.id
        });
        showToast('Campanha criada!');
    }

    salvarDados();
    fecharModal('campanhaModal');
    renderizarMarketing();
}

function excluirCampanha(id) {
    if (!confirm('Remover esta campanha?')) return;
    campanhas = campanhas.filter(c => c.id !== id);
    salvarDados();
    renderizarMarketing();
    showToast('Campanha removida!');
}

async function executarCampanha(id) {
    const campanha = campanhas.find(c => c.id === id);
    if (!campanha) return;

    const modelo = modelos.find(m => m.id === campanha.modeloId);
    if (!modelo) {
        showToast('Modelo não encontrado!', 'error');
        return;
    }

    // Verificar integração
    const provedor = localStorage.getItem('ploomesEmailProvider');
    if (!provedor) {
        showToast('Conecte-se ao Gmail ou Outlook primeiro!', 'warning');
        return;
    }

    // Filtrar leads (apenas os visíveis)
    let alvos = [];
    const leadsVisiveis = getLeadsVisiveis();
    alvos = leadsVisiveis.filter(l => {
        if (!l.email) return false;
        if (campanha.alvo && campanha.alvo.length > 0 && !campanha.alvo.includes(l.etapa)) return false;
        if (campanha.classificacoes && campanha.classificacoes.length > 0 && !campanha.classificacoes.includes(l.classificacao || 'outros')) return false;
        return true;
    });

    if (alvos.length === 0) {
        showToast('Nenhum lead com email encontrado!', 'warning');
        return;
    }

    if (!confirm(`Enviar "${campanha.nome}" para ${alvos.length} leads via ${provedor === 'google' ? 'Gmail' : 'Outlook'}?`))
        return;

    let enviados = 0;
    let erros = 0;
    const total = alvos.length;
    const btnExecutar = document.querySelector(`button[data-campanha-executar="${id}"]`);
    const progressoEl = document.getElementById('campanhaProgresso-' + id);
    if (btnExecutar) { btnExecutar.disabled = true; btnExecutar.textContent = 'Enviando...'; }
    if (progressoEl) progressoEl.style.display = 'block';

    for (const lead of alvos) {
        const classifTexto = typeof CLASSIFICACAO_NOMES !== 'undefined' && CLASSIFICACAO_NOMES[lead.classificacao] ? CLASSIFICACAO_NOMES[lead.classificacao] : (lead.classificacao || 'Outros');
        let assunto = modelo.assunto
            .replace(/\{\{empresa\}\}/g, lead.empresa || '')
            .replace(/\{\{decisor\}\}/g, lead.decisor || '')
            .replace(/\{\{valor\}\}/g, formatarMoeda(lead.valor || 0))
            .replace(/\{\{email\}\}/g, lead.email || '')
            .replace(/\{\{telefone\}\}/g, lead.telefone || '')
            .replace(/\{\{classificacao\}\}/g, classifTexto);

        let conteudo = modelo.conteudo
            .replace(/\{\{empresa\}\}/g, lead.empresa || '')
            .replace(/\{\{decisor\}\}/g, lead.decisor || '')
            .replace(/\{\{valor\}\}/g, formatarMoeda(lead.valor || 0))
            .replace(/\{\{email\}\}/g, lead.email || '')
            .replace(/\{\{telefone\}\}/g, lead.telefone || '')
            .replace(/\{\{classificacao\}\}/g, classifTexto);

        let result = null;
        if (provedor === 'google') {
            result = await enviarEmailGmailReal(lead.email, assunto, conteudo);
        } else if (provedor === 'outlook') {
            result = await enviarEmailOutlookReal(lead.email, assunto, conteudo);
        }

        if (result) {
            const log = {
                id: gerarId(),
                data: hoje(),
                hora: new Date().toTimeString().slice(0, 5),
                leadId: lead.id,
                empresa: lead.empresa,
                email: lead.email,
                assunto: assunto,
                campanha: campanha.nome,
                provedor: provedor,
                status: 'enviado',
                usuarioId: usuarioAtual.id
            };
            emailLog.unshift(log);
            campanha.emailsEnviados = (campanha.emailsEnviados || 0) + 1;

            if (!lead.historico) lead.historico = [];
            lead.historico.push({
                data: hoje(),
                hora: new Date().toTimeString().slice(0, 5),
                tipo: 'Campanha (API)',
                descricao: `Campanha "${campanha.nome}" via ${provedor === 'google' ? 'Gmail' : 'Outlook'}`
            });
            enviados++;
        } else {
            erros++;
        }

        const feitos = enviados + erros;
        if (progressoEl) {
            const pct = Math.round((feitos / total) * 100);
            progressoEl.innerHTML = `
                <div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${pct}%;height:100%;"></div></div>
                <span class="text-xs text-muted">${feitos}/${total} processados (${enviados} ok, ${erros} erro)</span>
            `;
        }

        // Pequeno delay para não sobrecarregar
        await new Promise(r => setTimeout(r, 1000));
    }

    if (btnExecutar) { btnExecutar.disabled = false; btnExecutar.textContent = 'Executar'; }
    if (progressoEl) progressoEl.style.display = 'none';

    salvarDados();
    renderizarAll();
    showToast(`${enviados} emails enviados, ${erros} erros`);
}

// ============================================
// RENDERIZAR MARKETING
// ============================================
function renderizarMarketing() {
    document.getElementById('totalCampanhas').textContent = campanhas.length;
    document.getElementById('totalModelos').textContent = modelos.length;

    const hojeStr = hoje();
    const enviadosHoje = emailLog.filter(log => log.data === hojeStr);
    document.getElementById('totalEnviadosHoje').textContent = enviadosHoje.length;

    const totalEnvios = emailLog.length;
    const abertos = emailLog.filter(log => log.aberto).length || 0;
    const taxa = totalEnvios > 0 ? Math.round((abertos / totalEnvios) * 100) : 0;
    document.getElementById('taxaAbertura').textContent = taxa + '%';

    // Modelos
    const modelosContainer = document.getElementById('modelosList');
    if (modelos.length === 0) {
        modelosContainer.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="nota"></span></span><p class="text-sm">Nenhum modelo criado</p></div>`;
    } else {
        modelosContainer.innerHTML = modelos.map(m => `
            <div class="template-item">
                <div class="template-info">
                    <div class="name">${m.nome}</div>
                    <div class="desc">${m.assunto}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-info btn-xs" onclick="abrirModalModelo('${m.id}')"><span data-icone="editar"></span></button>
                    <button class="btn btn-danger btn-xs" onclick="excluirModelo('${m.id}')"><span data-icone="excluir"></span></button>
                </div>
            </div>
        `).join('');
    }

    // Campanhas
    const campanhasContainer = document.getElementById('campanhasList');
    if (campanhas.length === 0) {
        campanhasContainer.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="marketing"></span></span><p class="text-sm">Nenhuma campanha criada</p></div>`;
    } else {
        campanhasContainer.innerHTML = campanhas.map(c => {
            const modelo = modelos.find(m => m.id === c.modeloId);
            const statusClass = c.status === 'ativa' ? 'ativa' : c.status === 'pausada' ? 'pausada' :
                'finalizada';
            const statusLabel = c.status === 'ativa' ? 'Ativa' : c.status === 'pausada' ? 'Pausada' :
                'Finalizada';
            const alvoLabel = c.alvo && c.alvo.length > 0 ? c.alvo.map(e => ETAPA_NOMES[e] || e).join(', ') :
                'Todas as etapas';
            const classifLabel = c.classificacoes && c.classificacoes.length > 0
                ? c.classificacoes.map(cl => (typeof CLASSIFICACAO_NOMES !== 'undefined' ? CLASSIFICACAO_NOMES[cl] : cl)).join(', ')
                : 'Todas as classificações';

            return `
                <div class="campaign-item">
                    <div class="campaign-header">
                        <span class="campaign-name">${c.nome}</span>
                        <span class="campaign-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="campaign-details">
                        Modelo: ${modelo ? modelo.nome : '—'} • Etapas: ${alvoLabel} • Classificação: ${classifLabel}
                        ${c.emailsEnviados !== undefined ? ` • ${c.emailsEnviados} enviados` : ''}
                    </div>
                    <div class="campaign-actions">
                        <button class="btn btn-success btn-xs" data-campanha-executar="${c.id}" onclick="executarCampanha('${c.id}')">Executar</button>
                        <button class="btn btn-info btn-xs" onclick="abrirModalCampanha('${c.id}')"><span data-icone="editar"></span></button>
                        <button class="btn btn-danger btn-xs" onclick="excluirCampanha('${c.id}')"><span data-icone="excluir"></span></button>
                    </div>
                    <div class="campanha-progresso" id="campanhaProgresso-${c.id}" style="display:none;"></div>
                </div>
            `;
        }).join('');
    }

    // Log
    const logContainer = document.getElementById('emailLogList');
    document.getElementById('logCount').textContent = emailLog.length;

    if (emailLog.length === 0) {
        logContainer.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="exportar"></span></span><p class="text-sm">Nenhum email enviado</p></div>`;
    } else {
        logContainer.innerHTML = emailLog.slice(0, 15).map(log => `
            <div class="email-log-item">
                <div>
                    <strong>${log.empresa}</strong>
                    <span class="text-xs text-muted">${log.email}</span>
                    <div class="text-xs text-muted">${formatarData(log.data)} ${log.hora || ''}</div>
                </div>
                <div>
                    <span class="log-status ${log.status}">${log.status === 'enviado' ? 'Enviado' : log.status === 'manual' ? 'Aberto p/ envio' : log.status === 'erro' ? 'Erro' : 'Pendente'}</span>
                    <span class="text-xs text-muted">${nomeProvedorEmail(log.provedor)}</span>
                </div>
            </div>
        `).join('');

    }

    document.getElementById('marketingCount').textContent = campanhas.filter(c => c.status === 'ativa').length;
}
