// ============================================
// IMPORTAÇÃO CSV
// ============================================
function importarCSV(event) {
    const file = event.target.files[0];
    if (!file) {
        showToast('Nenhum arquivo selecionado!', 'warning');
        return;
    }

    const statusDiv = document.getElementById('importStatus');
    statusDiv.innerHTML = `<div class="import-status info">Processando arquivo "${file.name}"...</div>`;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim() !== '');

            if (lines.length < 2) {
                statusDiv.innerHTML =
                    `<div class="import-status error">Arquivo vazio ou inválido. Certifique-se de que o CSV tem cabeçalho e dados.</div>`;
                showToast('Arquivo CSV inválido!', 'error');
                return;
            }

            const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

            const colMap = {};
            header.forEach((col, index) => {
                const normalized = col.replace(/\s+/g, '').toLowerCase();
                let mapped = CSV_MAP[normalized];
                if (!mapped) {
                    for (const key of Object.keys(CSV_MAP)) {
                        if (normalized.includes(key) || key.includes(normalized)) {
                            mapped = CSV_MAP[key];
                            break;
                        }
                    }
                }
                if (mapped) {
                    colMap[index] = mapped;
                }
            });

            const hasEmpresa = Object.values(colMap).includes('empresa');
            if (!hasEmpresa) {
                statusDiv.innerHTML =
                    `<div class="import-status error">Coluna "Empresa" não encontrada no CSV. Colunas encontradas: ${header.join(', ')}</div>`;
                showToast('Coluna "Empresa" não encontrada!', 'error');
                return;
            }

            let imported = 0;
            let errors = 0;
            const newLeads = [];

            for (let i = 1; i < lines.length; i++) {
                try {
                    let line = lines[i];
                    const values = [];
                    let current = '';
                    let inQuotes = false;

                    for (let char of line) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            values.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim());

                    const lead = {};
                    let empresa = '';
                    let codigoUnico = '';

                    for (const [index, field] of Object.entries(colMap)) {
                        const idx = parseInt(index);
                        if (idx < values.length) {
                            let value = values[idx].replace(/^"|"$/g, '').trim();
                            if (field === 'valor') {
                                value = value.replace(/[R$\s.]/g, '').replace(',', '.');
                                lead.valor = parseFloat(value) || 0;
                            } else if (field === 'empresa') {
                                empresa = value;
                                lead.empresa = value;
                            } else if (field === 'codigoUnico') {
                                codigoUnico = value;
                                lead.codigoUnico = value;
                            } else if (field === 'potencial') {
                                lead.potencial = value.toUpperCase().substring(0, 1) || 'B';
                            } else if (field === 'etapa') {
                                const etapaNorm = value.toLowerCase().trim();
                                const etapaMap = {
                                    'lead': 'leads',
                                    'leads': 'leads',
                                    'qualificacao': 'qualificacao',
                                    'qualificação': 'qualificacao',
                                    'oportunidade': 'oportunidades',
                                    'oportunidades': 'oportunidades',
                                    'orcamento': 'orcamento',
                                    'orçamento': 'orcamento',
                                    'pedido': 'pedido'
                                };
                                lead.etapa = etapaMap[etapaNorm] || 'leads';
                            } else {
                                lead[field] = value;
                            }
                        }
                    }

                    if (!empresa) {
                        errors++;
                        continue;
                    }

                    if (!codigoUnico) {
                        codigoUnico = empresa.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
                        lead.codigoUnico = codigoUnico;
                    }

                    if (!lead.etapa) lead.etapa = 'leads';
                    if (!lead.potencial) lead.potencial = 'B';
                    if (!lead.valor) lead.valor = 0;
                    if (!lead.cidade) lead.cidade = '';
                    if (!lead.estado) lead.estado = '';
                    if (!lead.telefone) lead.telefone = '';
                    if (!lead.whatsapp) lead.whatsapp = '';
                    if (!lead.email) lead.email = '';
                    if (!lead.decisor) lead.decisor = '';
                    if (!lead.observacoes) lead.observacoes = '';

                    const novoLead = {
                        id: gerarId(),
                        empresa: lead.empresa,
                        codigoUnico: lead.codigoUnico,
                        valor: lead.valor,
                        telefone: lead.telefone,
                        whatsapp: lead.whatsapp,
                        email: lead.email,
                        decisor: lead.decisor,
                        cidade: lead.cidade,
                        estado: lead.estado,
                        potencial: lead.potencial,
                        etapa: lead.etapa,
                        observacoes: lead.observacoes,
                        dataCriacao: new Date().toISOString(),
                        cliente: (lead.etapa === 'pedido'),
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
                            tipo: 'Importação CSV',
                            descricao: `Importado via arquivo CSV na etapa ${ETAPA_NOMES[lead.etapa] || lead.etapa}`
                        }]
                    };

                    newLeads.push(novoLead);
                    imported++;

                } catch (err) {
                    errors++;
                    console.error('Erro na linha', i, err);
                }
            }

            if (newLeads.length > 0) {
                csvImportPendente = newLeads;
                csvImportErros = errors;
                renderizarPreviaImportacaoCSV();
            } else {
                statusDiv.innerHTML =
                    `<div class="import-status error">Nenhum lead válido foi importado. Verifique o formato do arquivo.</div>`;
                showToast('Nenhum lead válido importado!', 'error');
            }

        } catch (err) {
            console.error(err);
            statusDiv.innerHTML = `<div class="import-status error">Erro ao processar o arquivo: ${err.message}</div>`;
            showToast(`Erro: ${err.message}`, 'error');
        }
    };

    reader.onerror = function() {
        statusDiv.innerHTML = `<div class="import-status error">Erro ao ler o arquivo.</div>`;
        showToast('Erro ao ler o arquivo!', 'error');
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
}

// ============================================
// PRÉ-VISUALIZAÇÃO DE IMPORTAÇÃO CSV
// ============================================
function renderizarPreviaImportacaoCSV() {
    const statusDiv = document.getElementById('importStatus');
    if (!csvImportPendente) return;

    const linhas = csvImportPendente.slice(0, 20).map(l => `
        <tr>
            <td>${l.empresa}</td>
            <td>${l.codigoUnico}</td>
            <td>${l.cidade || '—'}</td>
            <td>${ETAPA_NOMES[l.etapa] || l.etapa}</td>
            <td>${formatarMoeda(l.valor || 0)}</td>
        </tr>
    `).join('');

    statusDiv.innerHTML = `
        <div class="import-status info">Pré-visualização: ${csvImportPendente.length} lead(s) prontos para importar${csvImportErros > 0 ? ` (${csvImportErros} linha(s) ignorada(s) por erro)` : ''}. Confira antes de confirmar.</div>
        <div class="table-wrapper mt-8" style="max-height:280px;overflow-y:auto;">
            <table>
                <thead><tr><th>Empresa</th><th>Código</th><th>Cidade</th><th>Etapa</th><th>Valor</th></tr></thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>
        ${csvImportPendente.length > 20 ? `<p class="text-xs text-muted mt-4">Mostrando 20 de ${csvImportPendente.length} registros.</p>` : ''}
        <div class="flex gap-8 mt-16">
            <button class="btn btn-success btn-sm" onclick="confirmarImportacaoCSV()">Confirmar Importação</button>
            <button class="btn btn-outline btn-sm" onclick="cancelarImportacaoCSV()">Cancelar</button>
        </div>
    `;
}

function confirmarImportacaoCSV() {
    if (!csvImportPendente || csvImportPendente.length === 0) return;
    const total = csvImportPendente.length;
    leads = [...csvImportPendente, ...leads];
    csvImportPendente = null;
    csvImportErros = 0;

    salvarDados();
    renderizarAll();
    document.getElementById('importStatus').innerHTML =
        `<div class="import-status success">${total} leads importados com sucesso!</div>`;
    showToast(`${total} leads importados com sucesso!`);
}

function cancelarImportacaoCSV() {
    csvImportPendente = null;
    csvImportErros = 0;
    document.getElementById('importStatus').innerHTML =
        `<div class="import-status warning">Importação cancelada. Nenhum dado foi alterado.</div>`;
    showToast('Importação cancelada.', 'warning');
}

// ============================================
// EXPORTAÇÕES
// ============================================
function exportarCSV() {
    const leadsVisiveis = getLeadsVisiveis();
    if (leadsVisiveis.length === 0) {
        showToast('Nenhum dado para exportar!', 'warning');
        return;
    }

    let csv =
        'Empresa,CodigoUnico,Cidade,Estado,Telefone,WhatsApp,Email,Decisor,Valor,Potencial,Etapa,Observacoes\n';
    leadsVisiveis.forEach(l => {
        csv +=
            `"${l.empresa}","${l.codigoUnico}","${l.cidade || ''}","${l.estado || ''}","${l.telefone || ''}","${l.whatsapp || ''}","${l.email || ''}","${l.decisor || ''}",${l.valor || 0},"${l.potencial || 'B'}","${l.etapa}","${(l.observacoes || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_${hoje()}.csv`;
    a.click();
    showToast('CSV exportado com sucesso!');
}

function exportarJSON() {
    const leadsVisiveis = getLeadsVisiveis();
    if (leadsVisiveis.length === 0) {
        showToast('Nenhum dado para exportar!', 'warning');
        return;
    }
    const blob = new Blob([JSON.stringify(leadsVisiveis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${hoje()}.json`;
    a.click();
    showToast('JSON exportado com sucesso!');
}

// ============================================
// BACKUP COMPLETO DO SISTEMA (todos os dados, não só leads)
// ============================================
function exportarBackup() {
    const payload = {
        tipo: 'feitosa-crm-backup-completo',
        versao: 1,
        geradoEm: new Date().toISOString(),
        leads,
        modelos,
        campanhas,
        emailLog,
        modelosWhatsapp,
        whatsappLog,
        perdidos,
        metas,
        coletorListas,
        coletorListaAtivaId,
        segmentosBusca,
        usuarios,
        tema: localStorage.getItem('ploomesTemaV5') || 'light'
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feitosa-crm-backup-completo_${hoje()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup completo exportado! (Contas de usuário/senhas não vão neste arquivo — são gerenciadas pelo Supabase.)');
}

function importarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);

            if (Array.isArray(parsed)) {
                // Compatibilidade com backups antigos (apenas array de leads)
                if (!confirm(`Isso irá SUBSTITUIR todos os ${leads.length} leads atuais por ${parsed.length} leads do backup. Deseja continuar?`)) return;
                parsed.forEach(l => {
                    if (!l.usuarioId) {
                        const admin = usuarios.find(u => u.papel === 'admin');
                        l.usuarioId = admin ? admin.id : (usuarios[0] ? usuarios[0].id : 'admin');
                    }
                });
                leads = parsed;
                salvarDados();
                renderizarAll();
                showToast(`Backup restaurado! ${leads.length} leads carregados.`);
                e.target.value = '';
                return;
            }

            if (!parsed || parsed.tipo !== 'feitosa-crm-backup-completo' || !Array.isArray(parsed.leads)) {
                showToast('Este arquivo não parece ser um backup válido do sistema.', 'error');
                e.target.value = '';
                return;
            }

            if (!confirm(`Isso irá SUBSTITUIR TODOS os dados do sistema (leads, usuários, metas, campanhas, coletor etc.) pelos do backup de ${new Date(parsed.geradoEm).toLocaleString('pt-BR')}. Essa ação não pode ser desfeita. Deseja continuar?`)) {
                e.target.value = '';
                return;
            }
            if (!confirm('Tem certeza? Os dados atuais serão PERDIDOS caso não tenham sido salvos em outro backup.')) {
                e.target.value = '';
                return;
            }

            leads = parsed.leads || [];
            modelos = parsed.modelos || [];
            campanhas = parsed.campanhas || [];
            emailLog = parsed.emailLog || [];
            modelosWhatsapp = parsed.modelosWhatsapp || [];
            whatsappLog = parsed.whatsappLog || [];
            perdidos = parsed.perdidos || [];
            metas = parsed.metas || {};
            coletorListas = parsed.coletorListas || [];
            coletorListaAtivaId = parsed.coletorListaAtivaId || null;
            segmentosBusca = parsed.segmentosBusca || [];
            if (parsed.tema) {
                localStorage.setItem('ploomesTemaV5', parsed.tema);
                aplicarTema();
            }

            await salvarDados();
            renderizarAll();

            const avisoUsuarios = Array.isArray(parsed.usuarios) && parsed.usuarios.length > 0
                ? ' Usuários não foram restaurados por este arquivo — contas agora são gerenciadas em Administração.'
                : '';
            showToast(`Backup completo restaurado com sucesso!${avisoUsuarios}`);
        } catch (err) {
            showToast('Arquivo inválido ou corrompido!', 'error');
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}
