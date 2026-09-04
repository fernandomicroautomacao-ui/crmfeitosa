// ============================================
// COLETOR DE LEADS
// ============================================

// ---------- Utilidades de importação ----------
function coletorCorrigirEncoding(texto) {
    if (/Ã|©|â|ã|ç|é|í|ó|ú|Â|Ê|Ô|Ç/.test(texto)) {
        try {
            const bytes = new Uint8Array(texto.length);
            for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i) & 0xFF;
            return new TextDecoder('ISO-8859-1').decode(bytes);
        } catch (e) {
            return texto;
        }
    }
    return texto;
}

function coletorExtrairCidadeUF(endereco) {
    if (!endereco || typeof endereco !== 'string') return { cidade: '', estado: '' };
    const limpo = endereco.replace(/\b\d{5}-\d{3}\b/g, '').replace(/\s+/g, ' ').trim();
    const partes = limpo.split(',');
    for (let i = partes.length - 1; i >= 0; i--) {
        const m = partes[i].match(/([\p{L}\s]+?)\s*[-–]\s*([A-Z]{2})\b/u);
        if (m) {
            const cidade = m[1].trim();
            if (cidade.length > 1 && cidade.length < 50) return { cidade, estado: m[2] };
        }
    }
    return { cidade: '', estado: '' };
}

function coletorParsearCSV(texto) {
    const primeiraLinha = texto.split(/\r?\n/)[0];
    const delimitador = (primeiraLinha.match(/;/g) || []).length > (primeiraLinha.match(/,/g) || []).length ? ';' : ',';
    const linhas = texto.split(/\r?\n/);
    if (linhas.length < 2) return [];
    const cabecalhos = linhas[0].split(delimitador).map(h => h.replace(/^"|"$/g, '').trim());
    const resultado = [];
    for (let i = 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue;
        let campos = [], entreAspas = false, atual = '';
        for (const ch of linhas[i]) {
            if (ch === '"') entreAspas = !entreAspas;
            else if (ch === delimitador && !entreAspas) { campos.push(atual.trim()); atual = ''; }
            else atual += ch;
        }
        campos.push(atual.trim());
        campos = campos.map(c => c.replace(/^"|"$/g, '').trim());
        const obj = {};
        cabecalhos.forEach((h, idx) => obj[h] = campos[idx] || '');
        resultado.push(obj);
    }
    return resultado;
}

const COLETOR_CAMPOS_CONHECIDOS = new Set([
    'First Name', 'Last Name', 'Name', 'Nome Completo', 'Razão Social', 'Empresa', 'Organization Name',
    'E-mail 1 - Value', 'Email', 'E-mail', 'email', 'Phone 1 - Value', 'Telefone', 'Phone', 'Celular',
    'Website 1 - Value', 'Website', 'Site', 'Custom Field 1 - Label', 'Custom Field 1 - Value', 'CNPJ',
    'Instagram', 'LinkedIn', 'Address 1 - Formatted', 'Endereço', 'Endereco', 'Address', 'Street',
    'Logradouro', 'Rua', 'Address Line 1', 'Address 1', 'Endereço completo', 'Categoria', 'categoria',
    'Segmento', 'Setor', 'Observações', 'Observacoes', 'Anotações', 'Nome', 'first name', 'last name'
]);

function coletorNormalizarLinha(bruta) {
    const primeiroNome = bruta['First Name'] || bruta['Nome'] || bruta['first name'] || '';
    const sobrenome = bruta['Last Name'] || bruta['Sobrenome'] || bruta['last name'] || '';
    let nomeCompleto = (primeiroNome + ' ' + sobrenome).trim();
    if (!nomeCompleto) nomeCompleto = bruta['Name'] || bruta['Nome Completo'] || bruta['Razão Social'] || bruta['Empresa'] || '';

    let endereco = bruta['Address 1 - Formatted'] || bruta['Endereço'] || bruta['Endereco'] || bruta['Address'] ||
        bruta['Street'] || bruta['Logradouro'] || bruta['Rua'] || bruta['Address Line 1'] || bruta['Address 1'] ||
        bruta['Endereço completo'] || '';

    const extras = Object.entries(bruta)
        .filter(([chave, valor]) => !COLETOR_CAMPOS_CONHECIDOS.has(chave) && valor)
        .map(([chave, valor]) => `${chave}: ${valor}`)
        .join(' | ');

    return {
        nome: nomeCompleto,
        empresa: bruta['Empresa'] || bruta['Organization Name'] || nomeCompleto,
        email: bruta['E-mail 1 - Value'] || bruta['Email'] || bruta['E-mail'] || bruta['email'] || '',
        telefone: bruta['Phone 1 - Value'] || bruta['Telefone'] || bruta['Phone'] || bruta['Celular'] || '',
        website: bruta['Website 1 - Value'] || bruta['Website'] || bruta['Site'] || '',
        cnpj: (bruta['Custom Field 1 - Label'] === 'CNPJ' ? bruta['Custom Field 1 - Value'] : (bruta['CNPJ'] || '')),
        instagram: bruta['Instagram'] || '',
        linkedin: bruta['LinkedIn'] || '',
        endereco,
        categoria: bruta['Categoria'] || bruta['categoria'] || bruta['Segmento'] || bruta['Setor'] || '',
        observacoes: [bruta['Observações'] || bruta['Observacoes'] || bruta['Anotações'] || '', extras].filter(Boolean).join(' | '),
        tratado: false,
        promovido: false
    };
}

function coletorAttr(valor) {
    return String(valor || '').replace(/"/g, '&quot;');
}

function coletorBadgeRelevancia(relevancia) {
    if (!relevancia) return '';
    if (relevancia >= 3) return ' <span class="badge-relevancia alta" title="Site menciona vários termos industriais/de produção">Relevante</span>';
    return ' <span class="badge-relevancia" title="Site menciona algum termo relacionado">Possível</span>';
}

// ---------- Listas (abas) ----------
function coletorListaAtiva() {
    return coletorListas.find(p => p.id === coletorListaAtivaId);
}

function coletorDadosAtivos() {
    const p = coletorListaAtiva();
    return p ? p.linhas : [];
}

function coletorSalvar() {
    salvarDados();
}

function coletorAdicionarLista() {
    const nome = prompt('Nome da nova lista:', `Lista ${coletorListas.length + 1}`);
    if (!nome) return;
    const id = gerarId();
    coletorListas.push({ id, nome, linhas: [] });
    coletorListaAtivaId = id;
    coletorSelecionados.clear();
    coletorSalvar();
    renderizarColetor();
}

function coletorTrocarLista(id) {
    coletorListaAtivaId = id;
    coletorSelecionados.clear();
    coletorPaginaAtual = 1;
    coletorSalvar();
    renderizarColetor();
}

function coletorMudarPagina(delta) {
    coletorPaginaAtual += delta;
    renderizarColetor();
    document.getElementById('dataTableColetorWrapper')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function coletorFecharLista(id) {
    if (coletorListas.length === 1) {
        if (confirm('Essa é a última lista. Deseja apenas limpar os dados dela?')) {
            coletorListas[0].linhas = [];
            coletorSalvar();
            renderizarColetor();
        }
        return;
    }
    const lista = coletorListas.find(p => p.id === id);
    if (!lista) return;
    if (!confirm(`Fechar a lista "${lista.nome}"? Os dados dela serão perdidos (leads já promovidos para o CRM continuam lá).`)) return;
    coletorListas = coletorListas.filter(p => p.id !== id);
    if (coletorListaAtivaId === id) coletorListaAtivaId = coletorListas[0].id;
    coletorSelecionados.clear();
    coletorPaginaAtual = 1;
    coletorSalvar();
    renderizarColetor();
}

function coletorLimparListaAtual() {
    const lista = coletorListaAtiva();
    if (!lista || lista.linhas.length === 0) {
        showToast('Essa lista já está vazia.', 'warning');
        return;
    }
    if (!confirm('Limpar todos os dados desta lista? Essa ação não pode ser desfeita (leads já promovidos para o CRM continuam lá).')) return;
    lista.linhas = [];
    coletorSelecionados.clear();
    coletorPaginaAtual = 1;
    coletorSalvar();
    renderizarColetor();
    showToast('Lista limpa.');
}

// ---------- Busca no Google Maps (API oficial, via Edge Function) ----------
function abrirModalBuscaMaps() {
    document.getElementById('coletorMapsForm').reset();
    document.getElementById('coletorMapsBuscarEmail').checked = true;
    renderizarSegmentosBuscaModal();
    abrirModal('coletorMapsModal');
}

function renderizarSegmentosBuscaModal() {
    const container = document.getElementById('coletorMapsSegmentosList');
    if (!container) return;
    if (segmentosBusca.length === 0) {
        container.innerHTML = `<p class="text-xs text-muted">Nenhum segmento salvo ainda — adicione um abaixo.</p>`;
        return;
    }
    container.innerHTML = segmentosBusca.map(s => `
        <div class="segmento-item">
            <label>
                <input type="checkbox" class="coletor-segmento-check" value="${s.id}">
                ${coletorAttr(s.termo)}
            </label>
            <button type="button" class="btn btn-danger btn-xs" onclick="removerSegmentoBusca('${s.id}')" title="Remover"><span data-icone="excluir"></span></button>
        </div>
    `).join('');
}

function adicionarSegmentoBusca() {
    const input = document.getElementById('coletorMapsNovoSegmento');
    const termo = input.value.trim();
    if (!termo) {
        showToast('Digite o nome do segmento.', 'error');
        return;
    }
    if (segmentosBusca.some(s => s.termo.toLowerCase() === termo.toLowerCase())) {
        showToast('Esse segmento já existe na lista.', 'error');
        return;
    }
    segmentosBusca.push({ id: gerarId(), termo });
    salvarDados();
    renderizarSegmentosBuscaModal();
    input.value = '';
    showToast('Segmento adicionado!');
}

function removerSegmentoBusca(id) {
    if (!confirm('Remover este segmento da lista salva?')) return;
    segmentosBusca = segmentosBusca.filter(s => s.id !== id);
    salvarDados();
    renderizarSegmentosBuscaModal();
}

async function coletorBuscarNoMaps(event) {
    event.preventDefault();
    const cidade = document.getElementById('coletorMapsCidade').value.trim();
    const termoLivre = document.getElementById('coletorMapsTermo').value.trim();
    const segmentosMarcadosIds = [...document.querySelectorAll('.coletor-segmento-check:checked')].map(chk => chk.value);
    const buscarEmail = document.getElementById('coletorMapsBuscarEmail').checked;

    let termosBusca = [];
    let usandoSegmentos = segmentosMarcadosIds.length > 0;

    if (usandoSegmentos) {
        if (!cidade) {
            showToast('Informe a cidade/região pra buscar por segmento.', 'error');
            return;
        }
        termosBusca = segmentosMarcadosIds.map(id => {
            const seg = segmentosBusca.find(s => s.id === id);
            return `${seg.termo} em ${cidade}`;
        });
    } else if (termoLivre) {
        termosBusca = [cidade ? `${termoLivre} em ${cidade}` : termoLivre];
    } else {
        showToast('Marque ao menos um segmento ou digite uma busca livre.', 'error');
        return;
    }

    const btn = document.getElementById('coletorMapsBuscarBtn');
    const textoOriginalBtn = btn.textContent;
    btn.disabled = true;

    try {
        let todosResultados = [];
        let algumErro = false;
        for (let i = 0; i < termosBusca.length; i++) {
            btn.textContent = termosBusca.length > 1 ? `Buscando (${i + 1}/${termosBusca.length})...` : 'Buscando...';
            const { data, error } = await supabaseClient.functions.invoke('buscar-leads-maps', {
                body: { termo: termosBusca[i], buscarEmail }
            });
            if (error || (data && data.error)) {
                algumErro = true;
                showToast(`Erro em "${termosBusca[i]}": ` + (error ? error.message : data.error), 'error');
                continue;
            }
            todosResultados.push(...((data && data.resultados) || []));
        }

        const vistos = new Set();
        const resultadosUnicos = todosResultados.filter(r => {
            const chave = (r.empresa + '|' + r.endereco).toLowerCase();
            if (vistos.has(chave)) return false;
            vistos.add(chave);
            return true;
        });
        resultadosUnicos.sort((a, b) => (b.relevancia || 0) - (a.relevancia || 0));

        if (resultadosUnicos.length === 0) {
            if (!algumErro) showToast('Nenhum resultado encontrado.', 'warning');
            return;
        }

        const nomeLista = usandoSegmentos
            ? `Maps: ${segmentosMarcadosIds.length} segmento(s) em ${cidade}`.substring(0, 60)
            : `Maps: ${termosBusca[0]}`.substring(0, 60);

        const novaLista = { id: gerarId(), nome: nomeLista, linhas: resultadosUnicos };
        coletorListas.push(novaLista);
        coletorListaAtivaId = novaLista.id;
        coletorSelecionados.clear();
        coletorPaginaAtual = 1;
        coletorSalvar();
        renderizarColetor();
        fecharModal('coletorMapsModal');
        showToast(`${resultadosUnicos.length} lead(s) encontrado(s) numa nova lista!`);
    } catch (e) {
        showToast('Erro inesperado na busca: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginalBtn;
    }
}

// ---------- Importação CSV ----------
function coletorCarregarCSV(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const dadosAtuais = coletorDadosAtivos();
    if (dadosAtuais.length > 0) {
        if (!confirm(`A lista atual tem ${dadosAtuais.length} linha(s). Substituir pelos dados do novo CSV?`)) {
            event.target.value = '';
            return;
        }
    }

    const leitor = new FileReader();
    leitor.onload = (e) => {
        try {
            let texto = e.target.result;
            texto = coletorCorrigirEncoding(texto);
            const brutas = coletorParsearCSV(texto);
            if (brutas.length === 0) throw new Error('CSV vazio ou em formato não reconhecido.');
            const normalizadas = brutas.map(coletorNormalizarLinha);

            const lista = coletorListaAtiva();
            lista.linhas = normalizadas;
            coletorSelecionados.clear();
            coletorPaginaAtual = 1;
            coletorSalvar();
            renderizarColetor();
            showToast(`${normalizadas.length} linha(s) carregada(s) em "${lista.nome}".`);
        } catch (err) {
            showToast(`Erro ao importar CSV: ${err.message}`, 'error');
        }
    };
    leitor.readAsText(arquivo, 'UTF-8');
    event.target.value = '';
}

// ---------- Edição de campos ----------
function coletorBotaoCnpja(cnpj) {
    const digitos = (cnpj || '').replace(/\D/g, '');
    if (digitos.length < 14) return '';
    return `<button type="button" class="btn btn-outline btn-xs" onclick="window.open('https://cnpja.com/office/${digitos}')" title="Ver no CNPJá"><span data-icone="link"></span></button>`;
}

function coletorAtualizarCampo(idx, campo, valor) {
    const linha = coletorDadosAtivos()[idx];
    if (!linha) return;
    linha[campo] = valor;
    coletorSalvar();
    if (campo === 'cnpj') {
        const span = document.getElementById(`coletorCnpjLink${idx}`);
        if (span) span.innerHTML = coletorBotaoCnpja(valor);
    }
}

function coletorAtualizarStats() {
    const dados = coletorDadosAtivos();
    document.getElementById('coletorTotalLinhas').textContent = dados.length;
    document.getElementById('coletorTotalTratados').textContent = dados.filter(l => l.tratado).length;
    document.getElementById('coletorTotalPromovidos').textContent = dados.filter(l => l.promovido).length;
}

function coletorAlternarTratado(idx, valor) {
    const linha = coletorDadosAtivos()[idx];
    if (!linha) return;
    linha.tratado = valor;
    coletorSalvar();
    const tr = document.getElementById(`coletorRow${idx}`);
    if (tr) tr.classList.toggle('tratado-row', valor);
    coletorAtualizarStats();
    atualizarContadores();
}

function coletorExcluirLinha(idx) {
    const dados = coletorDadosAtivos();
    const linha = dados[idx];
    if (!linha) return;
    if (!confirm(`Excluir "${linha.empresa || linha.nome || 'esta linha'}"?`)) return;
    dados.splice(idx, 1);
    coletorSelecionados.clear();
    coletorSalvar();
    renderizarColetor();
    showToast('Linha removida.');
}

// ---------- Seleção e ações em massa ----------
function coletorAlternarSelecao(idx, valor) {
    if (valor) coletorSelecionados.add(idx);
    else coletorSelecionados.delete(idx);
    const chkTodos = document.getElementById('coletorSelecionarTodos');
    const total = coletorDadosAtivos().length;
    if (chkTodos) chkTodos.checked = (coletorSelecionados.size === total && total > 0);
}

function coletorSelecionarTodos(valor) {
    coletorSelecionados.clear();
    if (valor) coletorDadosAtivos().forEach((_, i) => coletorSelecionados.add(i));
    renderizarColetor();
}

function coletorAplicarAcaoEmMassa() {
    const acao = document.getElementById('coletorAcaoEmMassa').value;
    if (!acao) { showToast('Selecione uma ação.', 'error'); return; }
    if (coletorSelecionados.size === 0) { showToast('Nenhuma linha selecionada.', 'error'); return; }

    const dados = coletorDadosAtivos();
    const indices = Array.from(coletorSelecionados).sort((a, b) => b - a);

    if (acao === 'excluir') {
        if (!confirm(`Excluir ${indices.length} linha(s) selecionada(s)?`)) return;
        indices.forEach(i => dados.splice(i, 1));
        coletorSelecionados.clear();
        coletorSalvar();
        renderizarColetor();
        showToast(`${indices.length} linha(s) excluída(s).`);
    } else if (acao === 'tratar') {
        indices.forEach(i => dados[i].tratado = true);
        coletorSelecionados.clear();
        coletorSalvar();
        renderizarColetor();
        showToast(`${indices.length} linha(s) marcadas como tratadas.`);
    } else if (acao === 'destratar') {
        indices.forEach(i => dados[i].tratado = false);
        coletorSelecionados.clear();
        coletorSalvar();
        renderizarColetor();
        showToast(`${indices.length} linha(s) desmarcadas.`);
    }
}

// ---------- Detecção de duplicados ----------
function coletorSoDigitos(valor) {
    return (valor || '').replace(/\D/g, '');
}

function coletorNormalizarEmail(valor) {
    return (valor || '').trim().toLowerCase();
}

function coletorLeadJaExisteNoCRM(linha, nomeEmpresa, codigoUnico) {
    const cnpjLinha = coletorSoDigitos(linha.cnpj);
    const telefoneLinha = coletorSoDigitos(linha.telefone);
    const emailLinha = coletorNormalizarEmail(linha.email);
    const nomeLower = nomeEmpresa.toLowerCase();
    const codigoLower = codigoUnico.toLowerCase();

    return leads.some(l => {
        if ((l.codigoUnico || '').toLowerCase() === codigoLower) return true;
        if ((l.empresa || '').trim().toLowerCase() === nomeLower) return true;
        if (cnpjLinha.length >= 14 && coletorSoDigitos(l.codigoUnico) === cnpjLinha) return true;
        if (telefoneLinha.length >= 8 && coletorSoDigitos(l.telefone) === telefoneLinha) return true;
        if (telefoneLinha.length >= 8 && coletorSoDigitos(l.whatsapp) === telefoneLinha) return true;
        if (emailLinha && coletorNormalizarEmail(l.email) === emailLinha) return true;
        return false;
    });
}

// ---------- Promoção para o CRM ----------
function coletorPromoverParaCRM() {
    const dados = coletorDadosAtivos();
    const candidatos = dados.filter(l => l.tratado === true && l.promovido !== true);

    if (candidatos.length === 0) {
        showToast('Nenhuma linha tratada e ainda não promovida nesta lista.', 'warning');
        return;
    }

    if (!confirm(`Promover ${candidatos.length} lead(s) tratado(s) para o Pipeline do CRM (etapa Leads)?`)) return;

    let promovidos = 0;
    let pulados = 0;

    candidatos.forEach(linha => {
        const nomeEmpresa = (linha.empresa || linha.nome || 'Sem nome').trim();
        const codigoUnico = (linha.cnpj || '').trim() || nomeEmpresa.toLowerCase().replace(/\s+/g, '-');

        const jaExiste = coletorLeadJaExisteNoCRM(linha, nomeEmpresa, codigoUnico);

        if (jaExiste) {
            pulados++;
            return;
        }

        const { cidade, estado } = coletorExtrairCidadeUF(linha.endereco);
        const observacoesExtras = [
            linha.categoria ? `Categoria: ${linha.categoria}` : '',
            linha.website ? `Site: ${linha.website}` : '',
            linha.instagram ? `Instagram: ${linha.instagram}` : '',
            linha.linkedin ? `LinkedIn: ${linha.linkedin}` : '',
            linha.observacoes || ''
        ].filter(Boolean).join(' — ');

        const novoLead = {
            id: gerarId(),
            codigoUnico,
            empresa: nomeEmpresa,
            cidade,
            estado,
            telefone: linha.telefone || '',
            whatsapp: linha.telefone || '',
            email: linha.email || '',
            decisor: linha.nome || '',
            valor: 0,
            potencial: 'B',
            etapa: 'leads',
            observacoes: observacoesExtras,
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
                descricao: `Lead promovido do Coletor (lista "${coletorListaAtiva().nome}")`
            }]
        };

        leads.unshift(novoLead);
        linha.promovido = true;
        promovidos++;
    });

    salvarDados();
    renderizarColetor();
    renderizarAll();
    showToast(`${promovidos} lead(s) promovido(s) para o Pipeline!${pulados > 0 ? ` (${pulados} pulado(s) por já existir no CRM)` : ''}`);
}

function coletorResetarPromovidos() {
    const dados = coletorDadosAtivos();
    const total = dados.filter(l => l.promovido === true).length;
    if (total === 0) { showToast('Nenhuma linha promovida nesta lista.', 'warning'); return; }
    if (!confirm(`Resetar o status de "promovido" de ${total} linha(s)? Os leads já criados no CRM não serão removidos — isso só permite promovê-las de novo por engano.`)) return;
    dados.forEach(l => l.promovido = false);
    coletorSalvar();
    renderizarColetor();
    showToast('Flags de promovido resetadas.');
}

// ---------- Ações de linha (maps, busca, ligação, redes sociais) ----------
function coletorAbrirMaps(idx) {
    const linha = coletorDadosAtivos()[idx];
    if (!linha) return;
    const consulta = linha.endereco || linha.empresa || linha.nome;
    if (!consulta) { showToast('Sem endereço ou empresa para localizar.', 'error'); return; }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`, '_blank');
}

function coletorAbrirBusca(idx, termo) {
    const linha = coletorDadosAtivos()[idx];
    if (!linha) return;
    const alvo = linha.empresa || linha.nome;
    window.open(`https://www.google.com/search?q=${encodeURIComponent((alvo || '') + ' ' + termo)}`, '_blank');
}

function coletorLigar(telefone) {
    if (!telefone) { showToast('Número inválido.', 'error'); return; }
    window.location.href = `tel:${telefone.replace(/\D/g, '')}`;
}

function coletorExtrairDominio(linha) {
    const site = linha.website;
    if (site) {
        try {
            const host = new URL(site.startsWith('http') ? site : 'https://' + site).hostname.replace(/^www\./, '');
            if (host) return host;
        } catch (e) {
            // website inválido, tenta pelo e-mail abaixo
        }
    }
    const email = linha.email;
    if (email && email.includes('@')) return email.split('@')[1];
    return null;
}

function coletorSugerirRede(idx, tipo) {
    const linha = coletorDadosAtivos()[idx];
    if (!linha) return;
    const dominio = coletorExtrairDominio(linha);
    if (!dominio) {
        showToast('Não foi possível identificar o domínio (informe o Website ou E-mail primeiro).', 'error');
        return;
    }
    const base = dominio.split('.')[0];
    const sugestao = tipo === 'instagram' ? `https://instagram.com/${base}` : `https://linkedin.com/company/${base}`;
    if (confirm(`Usar "${sugestao}"?`)) {
        linha[tipo] = sugestao;
        coletorSalvar();
        renderizarColetor();
    }
}

// ---------- Modal de chamada ----------
function coletorAbrirChamada(idx = null) {
    coletorChamadaIndex = idx;
    document.getElementById('coletorChamadaTimestamp').textContent = `${new Date().toLocaleString('pt-BR')}`;

    const campos = ['Nome', 'Empresa', 'Telefone', 'Email', 'Endereco', 'Cnpj'];
    if (idx !== null) {
        const linha = coletorDadosAtivos()[idx];
        if (!linha) return;
        document.getElementById('coletorChamadaNome').value = linha.nome || '';
        document.getElementById('coletorChamadaEmpresa').value = linha.empresa || '';
        document.getElementById('coletorChamadaTelefone').value = linha.telefone || '';
        document.getElementById('coletorChamadaEmail').value = linha.email || '';
        document.getElementById('coletorChamadaEndereco').value = linha.endereco || '';
        document.getElementById('coletorChamadaCnpj').value = linha.cnpj || '';
    } else {
        campos.forEach(c => document.getElementById('coletorChamada' + c).value = '');
    }
    document.getElementById('coletorChamadaStatus').value = 'Não atendido';
    document.getElementById('coletorChamadaObs').value = '';
    abrirModal('coletorChamadaModal');
}

function coletorFecharChamada() {
    fecharModal('coletorChamadaModal');
    coletorChamadaIndex = null;
}

function coletorSalvarChamada(mostrarMsg = true) {
    const nome = document.getElementById('coletorChamadaNome').value.trim();
    const empresa = document.getElementById('coletorChamadaEmpresa').value.trim();
    const telefone = document.getElementById('coletorChamadaTelefone').value.trim();
    const email = document.getElementById('coletorChamadaEmail').value.trim();
    const endereco = document.getElementById('coletorChamadaEndereco').value.trim();
    const cnpj = document.getElementById('coletorChamadaCnpj').value.trim();
    const status = document.getElementById('coletorChamadaStatus').value;
    const obs = document.getElementById('coletorChamadaObs').value.trim();

    const notaCompleta = `[${new Date().toLocaleString('pt-BR')}] Status: ${status}${obs ? ' — ' + obs : ''}`;

    if (coletorChamadaIndex !== null) {
        const linha = coletorDadosAtivos()[coletorChamadaIndex];
        if (linha) {
            linha.nome = nome;
            linha.empresa = empresa;
            linha.telefone = telefone;
            linha.email = email;
            linha.endereco = endereco;
            linha.cnpj = cnpj;
            linha.observacoes = linha.observacoes ? `${linha.observacoes}\n${notaCompleta}` : notaCompleta;
        }
    } else {
        const dados = coletorDadosAtivos();
        dados.push({
            nome, empresa, email, telefone, website: '', cnpj, instagram: '', linkedin: '',
            endereco, categoria: '', observacoes: notaCompleta, tratado: false, promovido: false
        });
        coletorChamadaIndex = dados.length - 1;
    }

    coletorSalvar();
    renderizarColetor();
    if (mostrarMsg) showToast(`Anotações salvas${nome ? ' para ' + nome : ''}.`);
}

function coletorLigarAgora() {
    const telefone = document.getElementById('coletorChamadaTelefone').value.trim();
    if (!telefone) { showToast('Informe um telefone para ligar.', 'error'); return; }
    coletorSalvarChamada(false);
    window.location.href = `tel:${telefone.replace(/\D/g, '')}`;
    showToast(`Ligação iniciada para ${telefone}.`);
}

// ---------- Impressão ----------
function coletorImprimirTratados() {
    const dados = coletorDadosAtivos().filter(l => l.tratado === true);
    if (dados.length === 0) { showToast('Nenhuma linha tratada para imprimir.', 'warning'); return; }

    const linhasHtml = dados.map(l => `
        <tr>
            <td>${l.empresa || '-'}</td>
            <td>${l.nome || '-'}</td>
            <td>${l.telefone || '-'}</td>
            <td>${l.email || '-'}</td>
            <td>${l.categoria || '-'}</td>
            <td>${l.promovido ? 'Sim' : '—'}</td>
        </tr>
    `).join('');

    const htmlImpressao = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Leads Tratados - ${coletorListaAtiva().nome}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #1a2332; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #f0f2f5; }
    tr:nth-child(even) { background: #fafafa; }
    @media print { body { padding: 0; } }
</style>
</head><body>
    <h1>Leads Tratados — ${coletorListaAtiva().nome}</h1>
    <div class="meta">Gerado em ${formatarData(hoje())} • Total: ${dados.length} lead(s) tratado(s)</div>
    <table>
        <thead><tr><th>Empresa</th><th>Contato</th><th>Telefone</th><th>E-mail</th><th>Categoria</th><th>Promovido ao CRM</th></tr></thead>
        <tbody>${linhasHtml}</tbody>
    </table>
</body></html>`;

    const janela = window.open('', '_blank');
    if (!janela) { showToast('Permita pop-ups para gerar o PDF!', 'error'); return; }
    janela.document.write(htmlImpressao);
    janela.document.close();
    setTimeout(() => { janela.focus(); janela.print(); }, 350);
}

// ---------- Renderização ----------
function renderizarColetorAbas() {
    const container = document.getElementById('coletorAbas');
    if (!container) return;
    container.innerHTML = coletorListas.map(p => `
        <button type="button" class="sub-tab ${p.id === coletorListaAtivaId ? 'active' : ''}" onclick="coletorTrocarLista('${p.id}')">
            ${p.nome} (${p.linhas.length})
            <span class="coletor-fechar-aba" onclick="event.stopPropagation();coletorFecharLista('${p.id}')" title="Fechar lista">✕</span>
        </button>
    `).join('') + `<button type="button" class="btn btn-outline btn-sm" onclick="coletorAdicionarLista()">+ Nova lista</button>`;
}

function renderizarColetor() {
    renderizarColetorAbas();

    const dados = coletorDadosAtivos();
    const tbody = document.getElementById('coletorTableBody');
    if (!tbody) return;

    coletorAtualizarStats();

    const paginacaoEl = document.getElementById('coletorPaginacao');

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state compact"><span class="emoji-big"><span data-icone="coletor"></span></span><p class="text-sm">Nenhum dado nesta lista. Carregue um CSV para começar.</p></div></td></tr>`;
        const chkVazio = document.getElementById('coletorSelecionarTodos');
        if (chkVazio) chkVazio.checked = false;
        if (paginacaoEl) paginacaoEl.innerHTML = '';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(dados.length / COLETOR_ITENS_POR_PAGINA));
    if (coletorPaginaAtual > totalPaginas) coletorPaginaAtual = totalPaginas;
    if (coletorPaginaAtual < 1) coletorPaginaAtual = 1;
    const inicio = (coletorPaginaAtual - 1) * COLETOR_ITENS_POR_PAGINA;
    const fim = inicio + COLETOR_ITENS_POR_PAGINA;
    const paginaAtualDados = dados.map((linha, idx) => ({ linha, idx })).slice(inicio, fim);

    if (paginacaoEl) {
        paginacaoEl.innerHTML = `
            <button type="button" class="btn btn-outline btn-sm" onclick="coletorMudarPagina(-1)" ${coletorPaginaAtual <= 1 ? 'disabled' : ''}>◀ Anterior</button>
            <span class="text-sm" style="font-weight:600;">Página ${coletorPaginaAtual} de ${totalPaginas} — ${dados.length} linha(s) no total</span>
            <button type="button" class="btn btn-outline btn-sm" onclick="coletorMudarPagina(1)" ${coletorPaginaAtual >= totalPaginas ? 'disabled' : ''}>Próxima ▶</button>
        `;
    }

    tbody.innerHTML = paginaAtualDados.map(({ linha, idx }) => `
        <tr id="coletorRow${idx}" class="${linha.tratado ? 'tratado-row' : ''}">
            <td class="select-col"><input type="checkbox" ${coletorSelecionados.has(idx) ? 'checked' : ''} onchange="coletorAlternarSelecao(${idx}, this.checked)"></td>
            <td class="index-col">${idx + 1}</td>
            <td style="text-align:center;">
                <input type="checkbox" ${linha.tratado ? 'checked' : ''} onchange="coletorAlternarTratado(${idx}, this.checked)" title="Tratado">
                ${linha.promovido ? '<div class="text-xs" style="color:var(--stage-pedido);font-weight:700;margin-top:2px;">No CRM</div>' : ''}
            </td>
            <td><input type="text" value="${coletorAttr(linha.nome)}" onchange="coletorAtualizarCampo(${idx},'nome',this.value)"></td>
            <td><span class="clickable-empresa" onclick="coletorAbrirMaps(${idx})" title="Abrir no Google Maps">${linha.empresa || '-'}</span>${coletorBadgeRelevancia(linha.relevancia)}</td>
            <td>
                <div class="inline-field">
                    <input type="text" value="${coletorAttr(linha.telefone)}" onchange="coletorAtualizarCampo(${idx},'telefone',this.value)">
                    <button type="button" class="btn btn-success btn-xs" onclick="coletorLigar('${coletorAttr(linha.telefone)}')" title="Ligar"><span data-icone="telefone"></span></button>
                    <button type="button" class="btn btn-outline btn-xs" onclick="coletorAbrirBusca(${idx},'telefone')" title="Pesquisar"><span data-icone="busca"></span></button>
                </div>
            </td>
            <td>
                <div class="inline-field">
                    <input type="text" value="${coletorAttr(linha.email)}" onchange="coletorAtualizarCampo(${idx},'email',this.value)">
                    <button type="button" class="btn btn-pink btn-xs" onclick="window.open('https://mail.google.com/mail/?view=cm&to=' + encodeURIComponent('${coletorAttr(linha.email)}'))" title="Enviar e-mail"><span data-icone="marketing"></span></button>
                    <button type="button" class="btn btn-outline btn-xs" onclick="coletorAbrirBusca(${idx},'email')" title="Pesquisar"><span data-icone="busca"></span></button>
                </div>
            </td>
            <td>
                <div class="inline-field">
                    <input type="text" value="${coletorAttr(linha.website)}" onchange="coletorAtualizarCampo(${idx},'website',this.value)">
                    ${linha.website ? `<button type="button" class="btn btn-info btn-xs" onclick="window.open('${(linha.website.startsWith('http') ? linha.website : 'https://' + linha.website).replace(/'/g, '')}')" title="Abrir site"><span data-icone="site"></span></button>` : ''}
                    <button type="button" class="btn btn-outline btn-xs" onclick="coletorAbrirBusca(${idx},'site')" title="Pesquisar"><span data-icone="busca"></span></button>
                </div>
            </td>
            <td>
                <div class="inline-field">
                    <input type="text" value="${coletorAttr(linha.cnpj)}" onchange="coletorAtualizarCampo(${idx},'cnpj',this.value)">
                    <button type="button" class="btn btn-outline btn-xs" onclick="coletorAbrirBusca(${idx},'CNPJ')" title="Pesquisar"><span data-icone="busca"></span></button>
                    <span id="coletorCnpjLink${idx}">${coletorBotaoCnpja(linha.cnpj)}</span>
                </div>
            </td>
            <td>
                <div class="inline-field">
                    <input type="text" value="${coletorAttr(linha.instagram)}" onchange="coletorAtualizarCampo(${idx},'instagram',this.value)">
                    <button type="button" class="btn btn-outline btn-xs" onclick="coletorAbrirBusca(${idx},'Instagram')" title="Pesquisar"><span data-icone="busca"></span></button>
                    <button type="button" class="btn btn-warning btn-xs" onclick="coletorSugerirRede(${idx},'instagram')" title="Sugerir por domínio"><span data-icone="camera"></span></button>
                </div>
            </td>
            <td>
                <div class="inline-field">
                    <input type="text" value="${coletorAttr(linha.linkedin)}" onchange="coletorAtualizarCampo(${idx},'linkedin',this.value)">
                    <button type="button" class="btn btn-outline btn-xs" onclick="coletorAbrirBusca(${idx},'LinkedIn')" title="Pesquisar"><span data-icone="busca"></span></button>
                    <button type="button" class="btn btn-warning btn-xs" onclick="coletorSugerirRede(${idx},'linkedin')" title="Sugerir por domínio"><span data-icone="link"></span></button>
                </div>
            </td>
            <td><input type="text" value="${coletorAttr(linha.endereco)}" onchange="coletorAtualizarCampo(${idx},'endereco',this.value)"></td>
            <td><input type="text" value="${coletorAttr(linha.categoria)}" onchange="coletorAtualizarCampo(${idx},'categoria',this.value)"></td>
            <td>
                <div class="flex gap-8">
                    <button type="button" class="btn btn-primary btn-xs" onclick="coletorAbrirChamada(${idx})" title="Registrar ligação"><span data-icone="telefone"></span></button>
                    <button type="button" class="btn btn-danger btn-xs" onclick="coletorExcluirLinha(${idx})" title="Excluir"><span data-icone="excluir"></span></button>
                </div>
            </td>
        </tr>
    `).join('');

    const chkTodos = document.getElementById('coletorSelecionarTodos');
    if (chkTodos) chkTodos.checked = (coletorSelecionados.size === dados.length && dados.length > 0);
}
