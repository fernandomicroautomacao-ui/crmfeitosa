// ============================================
// WHATSAPP - MODELOS DE MENSAGEM
// ============================================
let wmImagemAtual = null; // base64 (JPEG) da imagem do modelo em edição

function abrirModalModeloWhatsapp(modeloId = null) {
    const form = document.getElementById('whatsappModeloForm');
    form.reset();
    wmImagemAtual = null;

    if (modeloId) {
        const modelo = modelosWhatsapp.find(m => m.id === modeloId);
        if (!modelo) return;
        document.getElementById('whatsappModeloModalTitle').textContent = 'Editar Modelo';
        document.getElementById('wmId').value = modeloId;
        document.getElementById('wmNome').value = modelo.nome || '';
        document.getElementById('wmConteudo').value = modelo.conteudo || '';
        wmImagemAtual = modelo.imagem || null;
    } else {
        document.getElementById('whatsappModeloModalTitle').textContent = 'Novo Modelo de WhatsApp';
        document.getElementById('wmId').value = '';
    }

    atualizarPreviewImagemModeloWhatsapp();
    abrirModal('whatsappModeloModal');
}

// ---------- Imagem do modelo (upload por arquivo ou colar do clipboard) ----------
function atualizarPreviewImagemModeloWhatsapp() {
    const wrap = document.getElementById('wmImagemPreviewWrap');
    const placeholder = document.getElementById('wmImagemPlaceholder');
    const img = document.getElementById('wmImagemPreview');
    if (wmImagemAtual) {
        img.src = wmImagemAtual;
        wrap.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        wrap.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

function redimensionarImagem(file, maxLado, qualidade) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let largura = img.width;
                let altura = img.height;
                if (largura > maxLado || altura > maxLado) {
                    if (largura > altura) {
                        altura = Math.round(altura * maxLado / largura);
                        largura = maxLado;
                    } else {
                        largura = Math.round(largura * maxLado / altura);
                        altura = maxLado;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = largura;
                canvas.height = altura;
                canvas.getContext('2d').drawImage(img, 0, 0, largura, altura);
                resolve(canvas.toDataURL('image/jpeg', qualidade));
            };
            img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
        reader.readAsDataURL(file);
    });
}

async function processarImagemModeloWhatsapp(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
        showToast('Selecione um arquivo de imagem.', 'error');
        return;
    }
    try {
        wmImagemAtual = await redimensionarImagem(file, 1280, 0.82);
        atualizarPreviewImagemModeloWhatsapp();
    } catch (e) {
        showToast('Não foi possível carregar essa imagem.', 'error');
    }
    document.getElementById('wmImagemInput').value = '';
}

function handlePasteImagemModeloWhatsapp(event) {
    const itens = event.clipboardData && event.clipboardData.items;
    if (!itens) return;
    for (const item of itens) {
        if (item.type && item.type.startsWith('image/')) {
            event.preventDefault();
            processarImagemModeloWhatsapp(item.getAsFile());
            return;
        }
    }
}

function removerImagemModeloWhatsapp() {
    wmImagemAtual = null;
    atualizarPreviewImagemModeloWhatsapp();
}

function salvarModeloWhatsapp(event) {
    event.preventDefault();
    const id = document.getElementById('wmId').value;
    const nome = document.getElementById('wmNome').value.trim();
    const conteudo = document.getElementById('wmConteudo').value.trim();

    if (!nome || !conteudo) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }

    if (id) {
        const index = modelosWhatsapp.findIndex(m => m.id === id);
        if (index !== -1) {
            modelosWhatsapp[index] = { ...modelosWhatsapp[index], nome, conteudo, imagem: wmImagemAtual };
            showToast('Modelo atualizado!');
        }
    } else {
        modelosWhatsapp.push({ id: gerarId(), nome, conteudo, imagem: wmImagemAtual });
        showToast('Modelo criado!');
    }

    salvarDados();
    fecharModal('whatsappModeloModal');
    renderizarWhatsapp();
}

function excluirModeloWhatsapp(id) {
    if (!confirm('Remover este modelo?')) return;
    modelosWhatsapp = modelosWhatsapp.filter(m => m.id !== id);
    salvarDados();
    renderizarWhatsapp();
    showToast('Modelo removido!');
}

function inserirTagWhatsapp(tag) {
    const textarea = document.getElementById('wmConteudo');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + tag + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
}

// ============================================
// WHATSAPP - ENVIO (via link wa.me)
// ============================================
let wEnvioImagemAtual = null; // base64 (JPEG) da imagem do modelo selecionado no envio

function abrirEnvioWhatsApp(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para enviar WhatsApp deste lead.', 'error');
        return;
    }

    document.getElementById('wEnvioLeadId').value = leadId;
    document.getElementById('wEnvioEmpresa').textContent = lead.empresa;
    document.getElementById('wEnvioTelefone').value = lead.whatsapp || lead.telefone || '';

    const select = document.getElementById('wEnvioModelo');
    select.innerHTML = '<option value="">Selecionar modelo</option>' +
        modelosWhatsapp.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');

    document.getElementById('wEnvioConteudo').value = '';
    wEnvioImagemAtual = null;
    document.getElementById('wEnvioImagemWrap').style.display = 'none';

    abrirModal('whatsappModal');
}

function previsualizarEnvioWhatsApp() {
    const modeloId = document.getElementById('wEnvioModelo').value;
    const leadId = document.getElementById('wEnvioLeadId').value;
    const lead = leads.find(l => l.id === leadId);

    if (!modeloId || !lead) return;

    const modelo = modelosWhatsapp.find(m => m.id === modeloId);
    if (!modelo) return;

    const conteudo = typeof whatsappFilaVariaveis === 'function'
        ? whatsappFilaVariaveis(modelo.conteudo, lead)
        : modelo.conteudo
            .replace(/\{\{empresa\}\}/g, lead.empresa || '')
            .replace(/\{\{decisor\}\}/g, lead.decisor || '')
            .replace(/\{\{valor\}\}/g, formatarMoeda(lead.valor || 0))
            .replace(/\{\{telefone\}\}/g, lead.telefone || '');

    document.getElementById('wEnvioConteudo').value = conteudo;

    wEnvioImagemAtual = modelo.imagem || null;
    const wrap = document.getElementById('wEnvioImagemWrap');
    if (wEnvioImagemAtual) {
        document.getElementById('wEnvioImagemPreview').src = wEnvioImagemAtual;
        wrap.style.display = 'block';
    } else {
        wrap.style.display = 'none';
    }
}

function baixarImagemModeloWhatsapp() {
    if (!wEnvioImagemAtual) return;
    const a = document.createElement('a');
    a.href = wEnvioImagemAtual;
    a.download = 'imagem-whatsapp.jpg';
    a.click();
}

// Converte a imagem (JPEG) pra PNG e copia pra área de transferência do sistema,
// pra colar (Ctrl+V) direto na conversa do WhatsApp Web que abrir.
async function copiarImagemParaAreaTransferencia(dataUrlJpeg) {
    if (!navigator.clipboard || !window.ClipboardItem) return false;
    try {
        const pngBlob = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao converter imagem.')), 'image/png');
            };
            img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
            img.src = dataUrlJpeg;
        });
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        return true;
    } catch (e) {
        console.error('Falha ao copiar imagem para a área de transferência:', e);
        return false;
    }
}

async function enviarWhatsApp(event) {
    event.preventDefault();

    const leadId = document.getElementById('wEnvioLeadId').value;
    const telefone = document.getElementById('wEnvioTelefone').value.trim();
    const conteudo = document.getElementById('wEnvioConteudo').value.trim();
    const salvarHist = document.getElementById('wEnvioSalvarHistorico').checked;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
        showToast('Lead não encontrado!', 'error');
        return;
    }

    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para enviar WhatsApp deste lead.', 'error');
        return;
    }

    if (!telefone || !conteudo) {
        showToast('Preencha telefone e mensagem!', 'error');
        return;
    }

    const digitos = telefone.replace(/\D/g, '');
    const url = `https://wa.me/${CONFIG.WHATSAPP_COUNTRY_CODE}${digitos}?text=${encodeURIComponent(conteudo)}`;
    window.open(url, '_blank');

    const imagemParaCopiar = wEnvioImagemAtual;
    const imagemCopiada = imagemParaCopiar ? await copiarImagemParaAreaTransferencia(imagemParaCopiar) : false;

    const log = {
        id: gerarId(),
        data: hoje(),
        hora: new Date().toTimeString().slice(0, 5),
        leadId: lead.id,
        empresa: lead.empresa,
        telefone: telefone,
        mensagem: conteudo,
        status: 'aberto',
        usuarioId: usuarioAtual.id
    };
    whatsappLog.unshift(log);

    if (salvarHist) {
        if (!lead.historico) lead.historico = [];
        lead.historico.push({
            data: hoje(),
            hora: new Date().toTimeString().slice(0, 5),
            tipo: 'WhatsApp',
            descricao: `Mensagem preparada para ${telefone}: "${conteudo.substring(0, 80)}${conteudo.length > 80 ? '...' : ''}"`
        });
    }

    salvarDados();
    fecharModal('whatsappModal');
    renderizarAll();

    if (imagemParaCopiar && imagemCopiada) {
        showToast(`WhatsApp aberto! Imagem copiada — cole com Ctrl+V na conversa.`);
    } else if (imagemParaCopiar && !imagemCopiada) {
        showToast(`WhatsApp aberto! Não consegui copiar a imagem automaticamente neste navegador — use "Baixar imagem".`, 'warning');
    } else {
        showToast(`WhatsApp aberto para ${lead.empresa}!`);
    }
}

// ============================================
// RENDERIZAR WHATSAPP
// ============================================
function renderizarWhatsapp() {
    document.getElementById('totalModelosWhatsapp').textContent = modelosWhatsapp.length;

    const hojeStr = hoje();
    const abertosHoje = whatsappLog.filter(log => log.data === hojeStr);
    document.getElementById('totalWhatsappHoje').textContent = abertosHoje.length;
    document.getElementById('totalWhatsappGeral').textContent = whatsappLog.length;

    // Modelos
    const modelosContainer = document.getElementById('whatsappModelosList');
    if (modelosWhatsapp.length === 0) {
        modelosContainer.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="whatsapp"></span></span><p class="text-sm">Nenhum modelo criado</p></div>`;
    } else {
        modelosContainer.innerHTML = modelosWhatsapp.map(m => `
            <div class="template-item">
                <div class="template-info">
                    <div class="name">${m.nome}</div>
                    <div class="desc">${m.conteudo.substring(0, 60)}${m.conteudo.length > 60 ? '...' : ''}</div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-info btn-xs" onclick="abrirModalModeloWhatsapp('${m.id}')"><span data-icone="editar"></span></button>
                    <button class="btn btn-danger btn-xs" onclick="excluirModeloWhatsapp('${m.id}')"><span data-icone="excluir"></span></button>
                </div>
            </div>
        `).join('');
    }

    // Log
    const logContainer = document.getElementById('whatsappLogList');
    document.getElementById('whatsappLogCount').textContent = whatsappLog.length;

    if (whatsappLog.length === 0) {
        logContainer.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="whatsapp"></span></span><p class="text-sm">Nenhuma mensagem registrada</p></div>`;
    } else {
        logContainer.innerHTML = whatsappLog.slice(0, 15).map(log => `
            <div class="email-log-item">
                <div>
                    <strong>${log.empresa}</strong>
                    <span class="text-xs text-muted">${log.telefone}</span>
                    <div class="text-xs text-muted">${formatarData(log.data)} ${log.hora || ''}</div>
                </div>
                <div>
                    <span class="log-status ${log.status === 'confirmado' ? 'enviado' : log.status === 'pulado' ? 'cancelado' : 'enviado'}">${log.status === 'confirmado' ? 'Confirmado' : log.status === 'aberto' ? 'Aberto' : 'Pulado'}</span>
                </div>
            </div>
        `).join('');
    }

    setBadge('whatsappCount', abertosHoje.length);
    inicializarFilaWhatsapp();
}


// ============================================
// FILA ASSISTIDA DE CAMPANHAS WHATSAPP
// ============================================
// Sem API oficial, cada item abre um link wa.me para confirmação manual.
// Não há disparo automático nem temporização para simular comportamento humano.

function whatsappEscapar(valor) {
    return String(valor ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function whatsappTelefoneLead(lead) {
    return String(lead?.whatsapp || lead?.telefone || '').replace(/\D/g, '');
}

function whatsappTemOptOut(leadId) {
    return Array.isArray(whatsappOptOut) && whatsappOptOut.includes(leadId);
}

function whatsappTemConsentimento(leadId) {
    return whatsappConsentimentos && whatsappConsentimentos[leadId] === true;
}

function whatsappOpcoesModelo() {
    return '<option value="">Selecionar modelo</option>' + modelosWhatsapp.map(m => `<option value="${whatsappEscapar(m.id)}">${whatsappEscapar(m.nome)}</option>`).join('');
}

function whatsappFiltrosFila() {
    return {
        etapa: document.getElementById('wFilaEtapa')?.value || '',
        classificacao: document.getElementById('wFilaClassificacao')?.value || '',
        potencial: document.getElementById('wFilaPotencial')?.value || '',
        usuarioId: document.getElementById('wFilaVendedor')?.value || '',
        estado: (document.getElementById('wFilaEstado')?.value || '').trim().toLowerCase(),
        cidade: (document.getElementById('wFilaCidade')?.value || '').trim().toLowerCase()
    };
}

function whatsappLeadCombinaFiltros(lead, filtros) {
    if (filtros.etapa && lead.etapa !== filtros.etapa) return false;
    if (filtros.classificacao && (lead.classificacao || 'outros') !== filtros.classificacao) return false;
    if (filtros.potencial && lead.potencial !== filtros.potencial) return false;
    if (filtros.usuarioId && String(lead.usuarioId || '') !== String(filtros.usuarioId)) return false;
    if (filtros.estado && String(lead.estado || '').trim().toLowerCase() !== filtros.estado) return false;
    if (filtros.cidade && !String(lead.cidade || '').toLowerCase().includes(filtros.cidade)) return false;
    return true;
}

function whatsappLeadsSegmento(filtros, incluirSemConsentimento = false) {
    return leads.filter(lead => {
        if (usuarioAtual?.papel !== 'admin' && lead.usuarioId !== usuarioAtual?.id) return false;
        if (!whatsappTelefoneLead(lead)) return false;
        if (!whatsappLeadCombinaFiltros(lead, filtros)) return false;
        if (whatsappTemOptOut(lead.id)) return false;
        if (!incluirSemConsentimento && !whatsappTemConsentimento(lead.id)) return false;
        return true;
    });
}

function whatsappFilaVariaveis(conteudo, lead) {
    const classifTexto = typeof CLASSIFICACAO_NOMES !== 'undefined' && CLASSIFICACAO_NOMES[lead.classificacao] ? CLASSIFICACAO_NOMES[lead.classificacao] : (lead.classificacao || 'Outros');
    return String(conteudo || '')
        .replace(/\{\{empresa\}\}/g, lead.empresa || '')
        .replace(/\{\{decisor\}\}/g, lead.decisor || '')
        .replace(/\{\{valor\}\}/g, formatarMoeda(lead.valor || 0))
        .replace(/\{\{telefone\}\}/g, lead.telefone || '')
        .replace(/\{\{cidade\}\}/g, lead.cidade || '')
        .replace(/\{\{estado\}\}/g, lead.estado || '')
        .replace(/\{\{potencial\}\}/g, lead.potencial || '')
        .replace(/\{\{classificacao\}\}/g, classifTexto);
}

function whatsappFilaAtualizarVendedores() {
    const select = document.getElementById('wFilaVendedor');
    if (!select) return;
    const atual = select.value;
    const disponiveis = usuarioAtual?.papel === 'admin' ? usuarios : usuarios.filter(u => u.id === usuarioAtual?.id);
    select.innerHTML = '<option value="">Todos os vendedores</option>' + disponiveis.map(u => `<option value="${whatsappEscapar(u.id)}">${whatsappEscapar(u.nome)}</option>`).join('');
    if (disponiveis.some(u => u.id === atual)) select.value = atual;
}

function whatsappFilaAtualizarModeloSelects() {
    ['wFilaModeloV1', 'wFilaModeloV2', 'wFilaModeloV3'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const atual = select.value;
        select.innerHTML = whatsappOpcoesModelo();
        if (modelosWhatsapp.some(m => m.id === atual)) select.value = atual;
    });
}

function whatsappFilaRenderizarCandidatos() {
    const container = document.getElementById('wFilaCandidatos');
    if (!container) return;
    const leadsSegmento = whatsappLeadsSegmento(whatsappFiltrosFila(), true);
    if (!leadsSegmento.length) {
        container.innerHTML = '<div class="empty-state compact"><p>Nenhum contato com telefone/WhatsApp encontrado para os filtros atuais.</p></div>';
        return;
    }
    const visiveis = leadsSegmento.slice(0, 100);
    const usuarioMap = new Map(usuarios.map(u => [u.id, u.nome]));
    container.innerHTML = `
        <div class="flex flex-between flex-wrap gap-8 mb-8">
            <span class="text-xs text-muted">${leadsSegmento.length} contato(s) com telefone; ${visiveis.length} exibido(s)</span>
            <span class="text-xs text-muted">Somente contatos autorizados entram na fila.</span>
        </div>
        <div class="table-wrapper w-fila-table-wrap"><table class="w-fila-table"><thead><tr><th>Empresa</th><th>Contato</th><th>Segmento</th><th>Consentimento</th><th>Ação</th></tr></thead><tbody>
            ${visiveis.map(lead => {
                const consentiu = whatsappTemConsentimento(lead.id);
                const classifTexto = typeof CLASSIFICACAO_NOMES !== 'undefined' && CLASSIFICACAO_NOMES[lead.classificacao] ? CLASSIFICACAO_NOMES[lead.classificacao] : (lead.classificacao || 'Outros');
                return `<tr>
                    <td><strong>${whatsappEscapar(lead.empresa)}</strong><div class="text-xs text-muted">${whatsappEscapar(lead.cidade || '—')}/${whatsappEscapar(lead.estado || '—')}</div></td>
                    <td>${whatsappEscapar(lead.decisor || '—')}<div class="text-xs text-muted">${whatsappEscapar(lead.whatsapp || lead.telefone)}</div></td>
                    <td>${whatsappEscapar(ETAPA_NOMES[lead.etapa] || lead.etapa)} • <span class="badge-classificacao badge-classificacao-${whatsappEscapar(lead.classificacao || 'outros')}">${whatsappEscapar(classifTexto)}</span><div class="text-xs text-muted">Potencial ${whatsappEscapar(lead.potencial || '—')} • ${whatsappEscapar(usuarioMap.get(lead.usuarioId) || 'Sem responsável')}</div></td>
                    <td><span class="w-consent-badge ${consentiu ? 'ok' : 'pendente'}">${consentiu ? 'Autorizado' : 'Não autorizado'}</span></td>
                    <td>${consentiu
                        ? `<button class="btn btn-outline btn-xs" onclick="whatsappRemoverConsentimento('${whatsappEscapar(lead.id)}')">Remover</button>`
                        : `<button class="btn btn-success btn-xs" onclick="whatsappAutorizarContato('${whatsappEscapar(lead.id)}')">Autorizar</button>`}</td>
                </tr>`;
            }).join('')}
        </tbody></table></div>
    `;
}

function whatsappAutorizarContato(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || whatsappTemOptOut(leadId)) return;
    whatsappConsentimentos[leadId] = true;
    salvarDados();
    whatsappFilaRenderizarCandidatos();
    showToast(`Contato autorizado para a fila: ${lead.empresa}.`, 'success');
}

function whatsappRemoverConsentimento(leadId) {
    delete whatsappConsentimentos[leadId];
    salvarDados();
    whatsappFilaRenderizarCandidatos();
    showToast('Consentimento removido. O contato não entrará em novas filas.', 'warning');
}

function whatsappMarcarOptOut(leadId) {
    if (!whatsappOptOut.includes(leadId)) whatsappOptOut.push(leadId);
    delete whatsappConsentimentos[leadId];
    salvarDados();
    whatsappFilaRenderizarCandidatos();
}

function whatsappFilaModeloIds() {
    return ['wFilaModeloV1', 'wFilaModeloV2', 'wFilaModeloV3']
        .map(id => document.getElementById(id)?.value)
        .filter(Boolean);
}

function whatsappFilaContarConfirmadosHoje() {
    const hojeStr = hoje();
    return whatsappLog.filter(log => log.data === hojeStr && ['confirmado', 'enviado'].includes(log.status)).length;
}

function whatsappFilaObterItemAtual() {
    if (!whatsappFilaAtual?.itens?.length) return null;
    return whatsappFilaAtual.itens.find(item => item.status === 'aberto') || whatsappFilaAtual.itens.find(item => item.status === 'pendente') || null;
}

function whatsappFilaCriar() {
    const nome = document.getElementById('wFilaNome')?.value.trim() || `Campanha ${formatarData(hoje())}`;
    const modeloIds = whatsappFilaModeloIds();
    const personalizada = document.getElementById('wFilaPersonalizada')?.value.trim() || '';
    const limiteDiario = Math.max(1, Math.min(100, parseInt(document.getElementById('wFilaLimite')?.value, 10) || 30));
    const filtros = whatsappFiltrosFila();
    const candidatos = whatsappLeadsSegmento(filtros, false);
    if (!modeloIds.length && !personalizada) {
        showToast('Selecione ao menos um modelo ou informe uma mensagem personalizada.', 'error');
        return;
    }
    if (!candidatos.length) {
        showToast('Nenhum contato autorizado corresponde aos filtros. Autorize os contatos na prévia.', 'warning');
        return;
    }
    const fila = {
        id: gerarId(),
        nome,
        criadaEm: new Date().toISOString(),
        status: 'em_andamento',
        limiteDiario,
        filtros,
        modeloIds,
        itens: candidatos.map((lead, index) => {
            const variacoes = [
                ...modeloIds.map((modeloId, posicao) => ({ id: modeloId, rotulo: `V${posicao + 1}`, conteudo: modelosWhatsapp.find(m => m.id === modeloId)?.conteudo || '' })),
                ...(personalizada ? [{ id: 'personalizada', rotulo: 'Personalizada', conteudo: personalizada }] : [])
            ];
            const variacao = variacoes[index % variacoes.length];
            return {
                id: gerarId(),
                leadId: lead.id,
                modeloId: variacao.id,
                variacao: variacao.rotulo,
                mensagem: whatsappFilaVariaveis(variacao.conteudo, lead),
                status: 'pendente',
                criadoEm: new Date().toISOString()
            };
        })
    };
    whatsappFilaAtual = fila;
    whatsappCampanhas.unshift({ id: fila.id, nome: fila.nome, criadaEm: fila.criadaEm, status: fila.status, total: fila.itens.length });
    salvarDados();
    renderizarWhatsapp();
    showToast(`Fila criada com ${fila.itens.length} contato(s).`, 'success');
}

function whatsappFilaAbrirAtual() {
    const item = whatsappFilaObterItemAtual();
    if (!item) {
        showToast('Não há contato pendente na fila.', 'warning');
        return;
    }
    if (whatsappFilaContarConfirmadosHoje() >= whatsappFilaAtual.limiteDiario) {
        showToast(`Limite diário de ${whatsappFilaAtual.limiteDiario} confirmações atingido.`, 'warning');
        return;
    }
    const lead = leads.find(l => l.id === item.leadId);
    if (!lead || whatsappTemOptOut(lead.id) || !whatsappTemConsentimento(lead.id)) {
        item.status = 'optout';
        whatsappFilaRenderizar();
        showToast('Contato sem consentimento válido ou marcado para não contatar.', 'warning');
        return;
    }
    const telefone = whatsappTelefoneLead(lead);
    const url = `https://wa.me/${CONFIG.WHATSAPP_COUNTRY_CODE}${telefone}?text=${encodeURIComponent(item.mensagem)}`;
    window.open(url, '_blank');
    item.status = 'aberto';
    item.abertoEm = new Date().toISOString();
    whatsappLog.unshift({ id: gerarId(), data: hoje(), hora: new Date().toTimeString().slice(0, 5), leadId: lead.id, empresa: lead.empresa, telefone: lead.whatsapp || lead.telefone, mensagem: item.mensagem, status: 'aberto', campanhaId: whatsappFilaAtual.id, variacao: item.variacao, usuarioId: usuarioAtual.id });
    salvarDados();
    whatsappFilaRenderizar();
    showToast(`WhatsApp aberto para ${lead.empresa}. Confirme manualmente o envio na conversa.`);
}

function whatsappFilaMarcarEnviado() {
    const item = whatsappFilaObterItemAtual();
    if (!item || item.status !== 'aberto') {
        showToast('Abra o contato no WhatsApp antes de confirmar o envio.', 'warning');
        return;
    }
    if (whatsappFilaContarConfirmadosHoje() >= whatsappFilaAtual.limiteDiario) {
        showToast(`Limite diário de ${whatsappFilaAtual.limiteDiario} confirmações atingido.`, 'warning');
        return;
    }
    const lead = leads.find(l => l.id === item.leadId);
    item.status = 'confirmado';
    item.confirmadoEm = new Date().toISOString();
    const log = whatsappLog.find(l => l.campanhaId === whatsappFilaAtual.id && l.leadId === item.leadId && l.status === 'aberto');
    if (log) log.status = 'confirmado';
    if (lead) {
        if (!lead.historico) lead.historico = [];
        lead.historico.push({ data: hoje(), hora: new Date().toTimeString().slice(0, 5), tipo: 'WhatsApp', descricao: `Envio confirmado na fila ${whatsappFilaAtual.nome} (${item.variacao}).` });
    }
    salvarDados();
    whatsappFilaRenderizar();
    renderizarAll();
    showToast('Envio confirmado e registrado.', 'success');
}

function whatsappFilaPularAtual() {
    const item = whatsappFilaObterItemAtual();
    if (!item) return;
    item.status = 'pulado';
    item.puladoEm = new Date().toISOString();
    salvarDados();
    whatsappFilaRenderizar();
    showToast('Contato pulado. A fila avançou para o próximo.');
}

function whatsappFilaOptOutAtual() {
    const item = whatsappFilaObterItemAtual();
    if (!item) return;
    whatsappMarcarOptOut(item.leadId);
    item.status = 'optout';
    item.optoutEm = new Date().toISOString();
    salvarDados();
    whatsappFilaRenderizar();
    showToast('Contato incluído na lista de não contato.', 'warning');
}

function whatsappFilaPausar() {
    if (!whatsappFilaAtual) return;
    whatsappFilaAtual.status = 'pausada';
    salvarDados();
    whatsappFilaRenderizar();
}

function whatsappFilaRetomar() {
    if (!whatsappFilaAtual) return;
    whatsappFilaAtual.status = 'em_andamento';
    salvarDados();
    whatsappFilaRenderizar();
}

function whatsappFilaEncerrar() {
    if (!whatsappFilaAtual) return;
    whatsappFilaAtual.status = 'encerrada';
    const campanha = whatsappCampanhas.find(c => c.id === whatsappFilaAtual.id);
    if (campanha) campanha.status = 'encerrada';
    salvarDados();
    whatsappFilaRenderizar();
}

function whatsappFilaReiniciar() {
    if (!whatsappFilaAtual) return;
    whatsappFilaAtual.itens.forEach(item => {
        if (['pulado', 'aberto'].includes(item.status)) item.status = 'pendente';
    });
    whatsappFilaAtual.status = 'em_andamento';
    salvarDados();
    whatsappFilaRenderizar();
}

function whatsappStatusFilaLabel(status) {
    return ({ pendente: 'Pendente', aberto: 'Aberto', confirmado: 'Confirmado', pulado: 'Pulado', optout: 'Não contatar' }[status] || status);
}

function whatsappFilaRenderizar() {
    const painel = document.getElementById('wFilaPainel');
    if (!painel) return;
    const fila = whatsappFilaAtual;
    if (!fila) {
        painel.innerHTML = '<div class="empty-state compact"><p>Nenhuma fila ativa. Monte uma fila com os contatos autorizados.</p></div>';
        return;
    }
    const itemAtual = whatsappFilaObterItemAtual();
    const total = fila.itens.length;
    const confirmados = fila.itens.filter(i => i.status === 'confirmado').length;
    const pulados = fila.itens.filter(i => ['pulado', 'optout'].includes(i.status)).length;
    const concluidos = confirmados + pulados;
    const progresso = total ? Math.round((concluidos / total) * 100) : 0;
    const lead = itemAtual ? leads.find(l => l.id === itemAtual.leadId) : null;
    const pausada = fila.status === 'pausada';
    const encerrada = ['encerrada', 'concluida'].includes(fila.status);
    const statusAtual = itemAtual ? whatsappStatusFilaLabel(itemAtual.status) : 'Concluída';
    const resto = fila.itens.filter(i => i.id !== itemAtual?.id).slice(0, 8);

    painel.innerHTML = `
        <div class="w-fila-header">
            <div><h4>${whatsappEscapar(fila.nome)}</h4><span class="text-xs text-muted">${total} contatos • ${confirmados} confirmados • ${pulados} pulados • limite diário ${fila.limiteDiario}</span></div>
            <div class="flex gap-8 flex-wrap"><span class="w-fila-status ${fila.status}">${pausada ? 'Pausada' : encerrada ? 'Encerrada' : 'Em andamento'}</span><button class="btn btn-outline btn-xs" onclick="${pausada ? 'whatsappFilaRetomar' : 'whatsappFilaPausar'}()">${pausada ? 'Retomar' : 'Pausar'}</button><button class="btn btn-danger btn-xs" onclick="whatsappFilaEncerrar()">Encerrar</button></div>
        </div>
        <div class="w-fila-progress"><div style="width:${progresso}%;"></div></div><div class="text-xs text-muted mb-8">${progresso}% processado</div>
        ${itemAtual && !pausada && !encerrada ? `<div class="w-fila-atual">
            <div class="w-fila-atual-head"><div><span class="text-xs text-muted">Próximo contato • ${whatsappEscapar(itemAtual.variacao)} • ${statusAtual}</span><h4>${whatsappEscapar(lead?.empresa || 'Contato não encontrado')}</h4><div class="text-xs text-muted">${whatsappEscapar(lead?.decisor || '—')} • ${whatsappEscapar(lead?.whatsapp || lead?.telefone || 'Sem telefone')}</div></div><strong>${concluidos + 1}/${total}</strong></div>
            <div class="w-fila-mensagem">${whatsappEscapar(itemAtual.mensagem).replace(/\n/g, '<br>')}</div>
            <div class="flex gap-8 flex-wrap mt-12">
                <button class="btn btn-success btn-sm" onclick="whatsappFilaAbrirAtual()">Abrir no WhatsApp</button>
                <button class="btn btn-primary btn-sm" onclick="whatsappFilaMarcarEnviado()">Confirmar envio</button>
                <button class="btn btn-outline btn-sm" onclick="whatsappFilaPularAtual()">Pular</button>
                <button class="btn btn-danger btn-sm" onclick="whatsappFilaOptOutAtual()">Não contatar</button>
            </div>
            <div class="text-xs text-muted mt-8">O botão “Confirmar envio” deve ser usado somente depois que você concluir o envio na conversa aberta.</div>
        </div>` : `<div class="empty-state compact"><p>${encerrada ? 'Fila encerrada.' : pausada ? 'Fila pausada.' : 'Todos os contatos foram processados.'}</p>${!encerrada && !pausada ? '<button class="btn btn-outline btn-sm" onclick="whatsappFilaReiniciar()">Reabrir pulados</button>' : ''}</div>`}
        <div class="w-fila-proximos"><h4>Próximos itens</h4>${resto.length ? `<div class="w-fila-lista">${resto.map(i => { const l = leads.find(x => x.id === i.leadId); return `<div class="w-fila-lista-item"><span>${whatsappEscapar(l?.empresa || '—')}</span><span>${whatsappEscapar(i.variacao)} • <em class="w-fila-item-status ${i.status}">${whatsappStatusFilaLabel(i.status)}</em></span></div>`; }).join('')}</div>` : '<div class="text-xs text-muted">Nenhum item restante.</div>'}</div>
    `;
}

function whatsappRenderizarCampanhas() {
    const container = document.getElementById('wFilaCampanhas');
    if (!container) return;
    if (!whatsappCampanhas.length) {
        container.innerHTML = '<div class="text-xs text-muted">Nenhuma campanha criada.</div>';
        return;
    }
    container.innerHTML = whatsappCampanhas.slice(0, 8).map(c => `<div class="w-campanha-item"><div><strong>${whatsappEscapar(c.nome)}</strong><div class="text-xs text-muted">${c.total || 0} contatos • ${formatarData(c.criadaEm)}</div></div><span class="w-fila-status ${c.status}">${whatsappEscapar(c.status)}</span></div>`).join('');
}

function inicializarFilaWhatsapp() {
    whatsappFilaAtualizarVendedores();
    whatsappFilaAtualizarModeloSelects();
    whatsappFilaRenderizarCandidatos();
    whatsappFilaRenderizar();
    whatsappRenderizarCampanhas();
}
