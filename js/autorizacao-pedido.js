// ============================================
// AUTORIZAÇÃO DE EMISSÃO DE PEDIDO (assinatura do cliente por link)
// Só disponível na etapa Orçamento. Gera um link público (autorizacao.html)
// onde o cliente só pode digitar o nome para assinar — sem editar mais nada
// e sem opção de apagar depois de assinado.
// ============================================
function atualizarUIAutorizacao(lead) {
    const wrap = document.getElementById('autorizacaoPedidoWrap');
    if (!wrap) return;

    if (lead.etapa !== 'orcamento') {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'block';

    const select = document.getElementById('autorizacaoAnexoSelect');
    const anexos = lead.orcamentoAnexos || [];
    select.innerHTML = anexos.length > 0
        ? anexos.map((a, i) => `<option value="${i}">${a.nome}</option>`).join('')
        : '<option value="">Nenhum anexo salvo</option>';

    const info = document.getElementById('autorizacaoStatusInfo');
    if (!lead.autorizacaoPedidoId) {
        info.textContent = anexos.length === 0
            ? 'Anexe e salve um arquivo do pedido para poder gerar a autorização.'
            : 'Nenhuma autorização gerada ainda.';
    } else if (lead.autorizacaoPedidoStatus === 'assinado') {
        info.innerHTML = `<strong style="color:var(--stage-pedido);">Assinado pelo cliente.</strong> ` +
            `<button type="button" class="btn btn-outline btn-xs" onclick="copiarLinkAutorizacaoAtual()">Copiar link</button>`;
    } else {
        info.innerHTML = `Pendente de assinatura. ` +
            `<button type="button" class="btn btn-outline btn-xs" onclick="verificarStatusAutorizacao()">Verificar assinatura</button> ` +
            `<button type="button" class="btn btn-outline btn-xs" onclick="copiarLinkAutorizacaoAtual()">Copiar link</button>`;
    }
}

function linkAutorizacao(id) {
    return `${window.location.origin}/autorizacao.html?token=${id}`;
}

async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch (e) {
        return false;
    }
}

function copiarLinkAutorizacaoAtual() {
    const lead = leads.find(l => l.id === itensEditLeadId);
    if (!lead || !lead.autorizacaoPedidoId) return;
    copiarTexto(linkAutorizacao(lead.autorizacaoPedidoId)).then(ok => {
        showToast(ok ? 'Link copiado! Cole onde quiser enviar ao cliente.' : 'Link: ' + linkAutorizacao(lead.autorizacaoPedidoId));
    });
}

async function gerarAutorizacaoPedido() {
    const lead = leads.find(l => l.id === itensEditLeadId);
    if (!lead) return;

    if (!lead.orcamentoAnexos || lead.orcamentoAnexos.length === 0) {
        showToast('Anexe e salve um arquivo do pedido antes de gerar a autorização.', 'error');
        return;
    }

    const select = document.getElementById('autorizacaoAnexoSelect');
    const anexoIndex = select ? parseInt(select.value) || 0 : 0;

    const btn = document.getElementById('btnGerarAutorizacao');
    if (btn) { btn.disabled = true; btn.textContent = 'Gerando...'; }

    const { data, error } = await supabaseClient.functions.invoke('super-responder', {
        body: { action: 'gerar', leadId: lead.id, anexoIndex }
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Gerar link de autorização'; }

    if (error || !data || data.error) {
        showToast('Erro ao gerar autorização: ' + (error ? error.message : data.error), 'error');
        return;
    }

    lead.autorizacaoPedidoId = data.id;
    lead.autorizacaoPedidoStatus = 'pendente';
    salvarDados();
    atualizarUIAutorizacao(lead);

    const ok = await copiarTexto(linkAutorizacao(data.id));
    showToast(ok ? 'Link copiado! Cole onde quiser enviar ao cliente.' : 'Link gerado: ' + linkAutorizacao(data.id));
}

async function verificarStatusAutorizacao() {
    const lead = leads.find(l => l.id === itensEditLeadId);
    if (!lead || !lead.autorizacaoPedidoId) return;

    const { data, error } = await supabaseClient.functions.invoke('super-responder', {
        body: { action: 'obter', token: lead.autorizacaoPedidoId }
    });

    if (error || !data || data.error) {
        showToast('Erro ao verificar status: ' + (error ? error.message : data.error), 'error');
        return;
    }

    lead.autorizacaoPedidoStatus = data.autorizacao.status;
    salvarDados();
    atualizarUIAutorizacao(lead);
    showToast(data.autorizacao.status === 'assinado' ? 'Documento assinado pelo cliente!' : 'Ainda pendente de assinatura.');
}
