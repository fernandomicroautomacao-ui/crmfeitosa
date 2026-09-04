// ============================================
// ITENS / ORÇAMENTO
// ============================================
function abrirItens(leadId, tipo) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para editar itens deste lead.', 'error');
        return;
    }

    itensEditLeadId = leadId;
    itemEmEdicaoIndex = -1;
    itensEditLista = JSON.parse(JSON.stringify(lead.itens || []));

    document.getElementById('itensEmpresaNome').textContent = lead.empresa;
    document.getElementById('itemProduto').value = '';
    document.getElementById('itemPreco').value = '';
    document.getElementById('itemQtd').value = 1;
    document.getElementById('itemDesconto').value = lead.desconto || '';
    document.getElementById('itemFrete').value = lead.frete || '';
    document.getElementById('itemCondicoes').value = lead.condicoes || '';
    document.getElementById('itemObsOrcamento').value = lead.obsOrcamento || '';
    cancelarEdicaoItem();

    itensEditAnexos = JSON.parse(JSON.stringify(lead.orcamentoAnexos || []));
    renderizarAnexosOrcamento();

    renderizarItensLista();
    atualizarUIAutorizacao(lead);
    abrirModal('itensModal');
}

// ---------- Anexos do orçamento (vários arquivos, qualquer formato) ----------
const ANEXO_LIMITE_MB = 8;
const ANEXO_MAX_ARQUIVOS = 5;

function renderizarAnexosOrcamento() {
    const lista = document.getElementById('orcAnexosLista');
    if (!lista) return;
    if (itensEditAnexos.length === 0) {
        lista.innerHTML = '<p class="text-sm text-muted">Nenhum anexo adicionado.</p>';
        return;
    }
    lista.innerHTML = itensEditAnexos.map((anexo, i) => `
        <div class="anexo-row">
            <span class="icon-sm" data-icone="nota"></span>
            <span class="text-sm" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${anexo.nome}</span>
            <button type="button" class="btn btn-outline btn-xs" onclick="abrirAnexoOrcamento(${i})">Abrir</button>
            <button type="button" class="btn btn-danger btn-xs" onclick="removerAnexoOrcamento(${i})">Remover</button>
        </div>
    `).join('');
}

function processarAnexoOrcamento(file) {
    if (!file) return;
    if (itensEditAnexos.length >= ANEXO_MAX_ARQUIVOS) {
        showToast(`Máximo de ${ANEXO_MAX_ARQUIVOS} anexos por orçamento.`, 'error');
        return;
    }
    if (file.size > ANEXO_LIMITE_MB * 1024 * 1024) {
        showToast(`O arquivo precisa ter no máximo ${ANEXO_LIMITE_MB}MB.`, 'error');
        return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
        itensEditAnexos.push({ nome: file.name, tipo: file.type, dataUrl: leitor.result });
        renderizarAnexosOrcamento();
        showToast('Anexo adicionado — clique em "Salvar Orçamento" para confirmar.');
    };
    leitor.readAsDataURL(file);
    document.getElementById('orcAnexoInput').value = '';
}

function abrirAnexoOrcamento(index) {
    const anexo = itensEditAnexos[index];
    if (!anexo) return;
    const janela = window.open();
    if (!janela) {
        showToast('Permita pop-ups para abrir o anexo!', 'error');
        return;
    }
    if (anexo.tipo === 'application/pdf' || anexo.tipo.startsWith('image/')) {
        const tag = anexo.tipo.startsWith('image/')
            ? `<img src="${anexo.dataUrl}" style="max-width:100%;">`
            : `<iframe src="${anexo.dataUrl}" style="border:none;width:100%;height:100vh;"></iframe>`;
        janela.document.write(tag);
    } else {
        janela.location.href = anexo.dataUrl;
    }
}

function removerAnexoOrcamento(index) {
    itensEditAnexos.splice(index, 1);
    renderizarAnexosOrcamento();
}

function renderizarItensLista() {
    const tbody = document.getElementById('itensListaBody');
    if (itensEditLista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state compact"><span class="emoji-big"><span data-icone="caixa"></span></span><p class="text-sm">Nenhum produto adicionado</p></div></td></tr>`;
    } else {
        tbody.innerHTML = itensEditLista.map((item, i) => `
            <tr ${i === itemEmEdicaoIndex ? 'style="background:var(--bg-primary);"' : ''}>
                <td>${item.descricao}</td>
                <td>${formatarMoeda(item.preco || 0)}</td>
                <td>${item.quantidade}</td>
                <td style="font-weight:700;">${formatarMoeda((item.preco || 0) * (item.quantidade || 0))}</td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button type="button" class="btn btn-info btn-xs" onclick="editarItemOrcamento(${i})"><span data-icone="editar"></span></button>
                        <button type="button" class="btn btn-danger btn-xs" onclick="removerItemOrcamento(${i})"><span data-icone="excluir"></span></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    recalcularTotalItens();
}

function adicionarItemOrcamento() {
    const descricao = document.getElementById('itemProduto').value.trim();
    const preco = parseFloat(document.getElementById('itemPreco').value) || 0;
    const quantidade = parseInt(document.getElementById('itemQtd').value) || 1;

    if (!descricao) {
        showToast('Informe o nome do produto!', 'error');
        return;
    }

    itensEditLista.push({ descricao, preco, quantidade });
    document.getElementById('itemProduto').value = '';
    document.getElementById('itemPreco').value = '';
    document.getElementById('itemQtd').value = 1;
    document.getElementById('itemProduto').focus();
    renderizarItensLista();
}

function editarItemOrcamento(index) {
    const item = itensEditLista[index];
    if (!item) return;

    itemEmEdicaoIndex = index;
    document.getElementById('itemProduto').value = item.descricao;
    document.getElementById('itemPreco').value = item.preco || '';
    document.getElementById('itemQtd').value = item.quantidade || 1;

    document.getElementById('btnAdicionarItem').style.display = 'none';
    document.getElementById('btnAtualizarItem').style.display = 'block';
    document.getElementById('btnCancelarEdicao').style.display = 'block';

    document.getElementById('itemProduto').focus();
    renderizarItensLista();
}

function atualizarItemOrcamento() {
    if (itemEmEdicaoIndex < 0 || itemEmEdicaoIndex >= itensEditLista.length) return;

    const descricao = document.getElementById('itemProduto').value.trim();
    const preco = parseFloat(document.getElementById('itemPreco').value) || 0;
    const quantidade = parseInt(document.getElementById('itemQtd').value) || 1;

    if (!descricao) {
        showToast('Informe o nome do produto!', 'error');
        return;
    }

    itensEditLista[itemEmEdicaoIndex] = { descricao, preco, quantidade };
    cancelarEdicaoItem();
    renderizarItensLista();
    showToast('Item atualizado com sucesso!');
}

function cancelarEdicaoItem() {
    itemEmEdicaoIndex = -1;
    document.getElementById('itemProduto').value = '';
    document.getElementById('itemPreco').value = '';
    document.getElementById('itemQtd').value = 1;

    document.getElementById('btnAdicionarItem').style.display = 'block';
    document.getElementById('btnAtualizarItem').style.display = 'none';
    document.getElementById('btnCancelarEdicao').style.display = 'none';

    renderizarItensLista();
}

function removerItemOrcamento(index) {
    if (confirm('Deseja remover este item?')) {
        itensEditLista.splice(index, 1);
        if (itemEmEdicaoIndex === index) cancelarEdicaoItem();
        renderizarItensLista();
        showToast('Item removido!');
    }
}

function recalcularTotalItens() {
    const subtotal = itensEditLista.reduce((acc, item) => acc + (item.preco || 0) * (item.quantidade || 0), 0);
    const desconto = parseFloat(document.getElementById('itemDesconto').value) || 0;
    const frete = parseFloat(document.getElementById('itemFrete').value) || 0;
    const total = subtotal - (subtotal * desconto / 100) + frete;
    document.getElementById('itensTotalGeral').textContent = formatarMoeda(Math.max(total, 0));
    return Math.max(total, 0);
}

// ============================================
// GERADOR DE COBRANÇA PIX (abre em outra aba, já preenchido)
// ============================================
function abrirGeradorPix() {
    const lead = leads.find(l => l.id === itensEditLeadId);
    if (!lead) return;

    const numero = lead.numeroPedido || lead.codigoUnico || lead.id;
    const total = recalcularTotalItens();
    const valorTexto = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const descricao = `Pagamento referente ao Orçamento ${numero}`.slice(0, 59);

    const params = new URLSearchParams({ orcamento: numero, valor: valorTexto, descricao });
    window.open(`gerador-pix.html?${params.toString()}`, '_blank');
}

function salvarItensOrcamento() {
    const lead = leads.find(l => l.id === itensEditLeadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para salvar itens neste lead.', 'error');
        return;
    }

    const desconto = parseFloat(document.getElementById('itemDesconto').value) || 0;
    const frete = parseFloat(document.getElementById('itemFrete').value) || 0;
    const condicoes = document.getElementById('itemCondicoes').value.trim();
    const obsOrcamento = document.getElementById('itemObsOrcamento').value.trim();
    const total = recalcularTotalItens();

    lead.itens = itensEditLista;
    lead.desconto = desconto;
    lead.frete = frete;
    lead.orcamentoAnexos = itensEditAnexos;
    lead.condicoes = condicoes;
    lead.obsOrcamento = obsOrcamento;
    if (itensEditLista.length > 0) lead.valor = total;

    lead.historico.push({
        data: hoje(),
        hora: new Date().toTimeString().slice(0, 5),
        tipo: 'Orçamento',
        descricao: `Orçamento atualizado: ${itensEditLista.length} produto(s), total ${formatarMoeda(total)}`
    });

    salvarDados();
    fecharModal('itensModal');
    renderizarAll();
    showToast('Orçamento salvo com sucesso!');
}

function imprimirOrcamentoPDF() {
    const lead = leads.find(l => l.id === itensEditLeadId);
    if (!lead) {
        showToast('Nenhum orçamento selecionado!', 'error');
        return;
    }

    const desconto = parseFloat(document.getElementById('itemDesconto').value) || 0;
    const frete = parseFloat(document.getElementById('itemFrete').value) || 0;
    const condicoes = document.getElementById('itemCondicoes').value.trim();
    const obsOrcamento = document.getElementById('itemObsOrcamento').value.trim();
    const total = recalcularTotalItens();

    const subtotal = itensEditLista.reduce((acc, item) => acc + (item.preco || 0) * (item.quantidade || 0), 0);
    const descontoValor = subtotal * desconto / 100;
    const totalComDesconto = subtotal - descontoValor;
    const marcaEmpresa = (typeof empresaAtual !== 'undefined' && empresaAtual) ? empresaAtual : { nome: 'Feitosa CRM', cnpj: '', email: '', telefone: '', endereco: '' };

    let linhasItens = itensEditLista.map((item, i) => `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${item.descricao}</td>
            <td style="text-align:center;">${item.quantidade}</td>
            <td style="text-align:right;">${formatarMoeda(item.preco || 0)}</td>
            <td style="text-align:right;font-weight:700;">${formatarMoeda((item.preco || 0) * (item.quantidade || 0))}</td>
        </tr>
    `).join('');

    const htmlPDF = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Orçamento - ${lead.empresa}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #1a2332; background: #fff; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #2d4863; padding-bottom: 20px; }
        .header h1 { margin: 0; color: #2d4863; font-size: 28px; }
        .header p { margin: 4px 0; color: #666; font-size: 12px; }
        .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .info-block { background: #f0f2f5; padding: 15px; border-radius: 8px; }
        .info-block h3 { margin: 0 0 10px 0; font-size: 13px; color: #666; text-transform: uppercase; }
        .info-block p { margin: 4px 0; font-size: 14px; }
        .info-block strong { color: #1a2332; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #2d4863; color: #fff; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        tr:nth-child(even) { background: #f9fafb; }
        .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
        .totals-table { width: 300px; }
        .totals-table tr td { border: none; padding: 8px 12px; }
        .totals-table tr:last-child { border-top: 2px solid #2d4863; font-weight: 700; font-size: 16px; background: #f0f2f5; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #666; }
        .footer-note { background: #f0f2f5; padding: 15px; border-radius: 8px; margin-top: 15px; }
        @media print { body { padding: 0; } .header { border-bottom: 2px solid #2d4863; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>ORÇAMENTO</h1>
        <p>${marcaEmpresa.nome || 'Sistema de Gestão de Vendas'}${marcaEmpresa.cnpj ? ` — CNPJ: ${marcaEmpresa.cnpj}` : ''}</p>
        ${marcaEmpresa.email || marcaEmpresa.telefone ? `<p>${marcaEmpresa.email || ''}${marcaEmpresa.email && marcaEmpresa.telefone ? ' • ' : ''}${marcaEmpresa.telefone || ''}</p>` : ''}
    </div>

    <div class="info-section">
        <div class="info-block">
            <h3>Empresa</h3>
            <p><strong>${lead.empresa}</strong></p>
            <p>CNPJ: <strong>${lead.codigoUnico || 'N/A'}</strong></p>
            <p>Contato: <strong>${lead.decisor || 'N/A'}</strong></p>
            <p>E-mail: <strong>${lead.email || 'N/A'}</strong></p>
            <p>Telefone: <strong>${lead.telefone || 'N/A'}</strong></p>
        </div>
        <div class="info-block">
            <h3>Detalhes do Orçamento</h3>
            <p>Data: <strong>${formatarData(hoje())}</strong></p>
            <p>Etapa: <strong>${ETAPA_NOMES[lead.etapa] || lead.etapa}</strong></p>
            <p>Potencial: <strong>${lead.potencial || 'N/A'}</strong></p>
            <p>Cidade: <strong>${lead.cidade || 'N/A'} / ${lead.estado || 'N/A'}</strong></p>
        </div>
    </div>

    <h3 style="margin-top:30px;margin-bottom:10px;">Itens do Orçamento</h3>
    <table>
        <thead>
            <tr>
                <th style="width:5%;">#</th>
                <th style="width:45%;">Descrição</th>
                <th style="width:15%;text-align:center;">Quantidade</th>
                <th style="width:15%;text-align:right;">Preço Unit.</th>
                <th style="width:20%;text-align:right;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            ${linhasItens || '<tr><td colspan="5" style="text-align:center;">Nenhum item adicionado</td></tr>'}
        </tbody>
    </table>

    <div class="totals">
        <table class="totals-table">
            <tr>
                <td>Subtotal:</td>
                <td style="text-align:right;">${formatarMoeda(subtotal)}</td>
            </tr>
            ${desconto > 0 ? `
            <tr>
                <td>Desconto (${desconto}%):</td>
                <td style="text-align:right;">-${formatarMoeda(descontoValor)}</td>
            </tr>
            ` : ''}
            ${frete > 0 ? `
            <tr>
                <td>Frete:</td>
                <td style="text-align:right;">+${formatarMoeda(frete)}</td>
            </tr>
            ` : ''}
            <tr>
                <td>TOTAL:</td>
                <td style="text-align:right;">${formatarMoeda(total)}</td>
            </tr>
        </table>
    </div>

    ${condicoes ? `
    <div class="footer-note">
        <strong>Condições de Pagamento:</strong><br>
        ${condicoes}
    </div>
    ` : ''}

    ${obsOrcamento ? `
    <div class="footer-note">
        <strong>Observações:</strong><br>
        ${obsOrcamento}
    </div>
    ` : ''}

    <div class="footer">
        <p style="margin:0;">Este orçamento foi gerado automaticamente por ${marcaEmpresa.nome || 'o CRM'} em ${formatarData(hoje())} às ${new Date().toTimeString().slice(0, 5)}.</p>
        <p style="margin:8px 0 0 0;">Para dúvidas ou alterações, favor entrar em contato conosco.</p>
    </div>
</body>
</html>
    `;

    const janela = window.open('', '_blank');
    if (!janela) {
        showToast('Permita pop-ups para gerar o PDF!', 'error');
        return;
    }
    janela.document.write(htmlPDF);
    janela.document.close();
    setTimeout(() => { janela.focus(); janela.print(); }, 500);
    showToast('Orçamento pronto para imprimir!');
}
