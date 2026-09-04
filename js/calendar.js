// ============================================
// CALENDÁRIO
// ============================================
function renderizarCalendario() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro',
        'Novembro', 'Dezembro'
    ];

    title.textContent = `${meses[currentMonth]} ${currentYear}`;
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const eventos = {};
    const proximas = {};
    const leadsVisiveis = getLeadsVisiveis();

    leadsVisiveis.forEach(l => {
        (l.historico || []).forEach(h => {
            if (h.data) {
                if (!eventos[h.data]) eventos[h.data] = [];
                eventos[h.data].push({ empresa: l.empresa, id: l.id, tipo: h.tipo, desc: h.descricao });
            }
        });
        if (l.proximaData) {
            if (!proximas[l.proximaData]) proximas[l.proximaData] = [];
            proximas[l.proximaData].push({ empresa: l.empresa, id: l.id, acao: l.proximaAcao });
        }
    });

    // Filtrar emailLog para os leads visíveis (já que emailLog não tem usuarioId, usamos o leadId)
    const leadsIds = new Set(leadsVisiveis.map(l => l.id));
    const emailLogFiltrado = emailLog.filter(log => leadsIds.has(log.leadId));

    emailLogFiltrado.forEach(log => {
        if (log.data) {
            if (!eventos[log.data]) eventos[log.data] = [];
            eventos[log.data].push({ empresa: log.empresa, id: log.leadId, tipo: 'Email', desc: log
                    .assunto });
        }
    });

    let html = '';
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(d => html += `<div class="weekday">${d}</div>`);

    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="day other-month">${daysInPrevMonth - i}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr =
            `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let classes = 'day';
        if (dateStr === hoje()) classes += ' today';
        if (eventos[dateStr]) classes += ' has-event';
        if (proximas[dateStr]) classes += ' has-proxima';
        if (dateStr === selectedDate) classes += ' selected';

        html += `<div class="${classes}" onclick="selecionarData('${dateStr}')">${d}</div>`;
    }

    grid.innerHTML = html;
    mostrarDetalhesData(selectedDate || hoje());
}

function selecionarData(dateStr) {
    selectedDate = dateStr;
    renderizarCalendario();
}

function mostrarDetalhesData(dateStr) {
    const container = document.getElementById('calendarDetails');
    const tarefas = [];
    const atividadesLog = [];
    const emails = [];
    const leadsVisiveis = getLeadsVisiveis();
    const leadsIds = new Set(leadsVisiveis.map(l => l.id));

    leadsVisiveis.forEach(l => {
        if (l.proximaData === dateStr && l.proximaAcao) {
            const status = getTaskStatus(dateStr, l.id);
            const info = getTaskInfo(dateStr, l.id);
            const statusLabel = status === 'pendente' ? 'Pendente' : status === 'concluida' ? 'Concluída' :
                status === 'adiada' ? 'Adiada' : 'Cancelada';
            tarefas.push({
                empresa: l.empresa,
                id: l.id,
                desc: l.proximaAcao,
                status,
                statusLabel,
                motivo: info && info.motivo ? info.motivo : ''
            });
        }
        (l.historico || []).forEach(h => {
            if (h.data === dateStr && h.tipo !== 'Movimento' && h.tipo !== 'Tarefa') {
                atividadesLog.push({
                    empresa: l.empresa,
                    id: l.id,
                    tipo: h.tipo,
                    desc: h.descricao,
                    hora: h.hora || ''
                });
            }
        });
    });

    // Filtrar emailLog
    const emailLogFiltrado = emailLog.filter(log => leadsIds.has(log.leadId));
    emailLogFiltrado.forEach(log => {
        if (log.data === dateStr) {
            emails.push({ empresa: log.empresa, id: log.leadId, desc: log.assunto });
        }
    });

    const totalItens = tarefas.length + atividadesLog.length + emails.length;
    if (totalItens === 0) {
        container.innerHTML =
            `<div class="empty-state compact"><span class="emoji-big"><span data-icone="calendario"></span></span><p class="text-sm">Nenhum evento em ${formatarData(dateStr)}</p></div>`;
        return;
    }

    container.innerHTML = `
        <h4 style="margin-bottom:12px;">${formatarData(dateStr)}</h4>

        ${tarefas.length > 0 ? `
            <div class="calendar-group">
                <div class="calendar-group-title tarefa">Tarefas Agendadas <span class="text-muted" style="font-weight:400;">— coisas a fazer, com prazo</span></div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${tarefas.map(item => `
                        <div class="calendar-item task-item">
                            <div>
                                <strong>${item.empresa}</strong>
                                <div style="font-size:12px;color:var(--text-secondary);">${item.desc}</div>
                                <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                                    <span class="task-status-badge ${item.status}">${item.statusLabel}</span>
                                    ${item.motivo ? `<span class="text-muted" style="font-size:11px;">— ${item.motivo}</span>` : ''}
                                </div>
                            </div>
                            <div class="task-actions">
                                <button class="btn btn-primary btn-xs" onclick="abrirTarefa('${item.id}','${dateStr}')">Status</button>
                                <button class="btn btn-success btn-xs" onclick="abrirModalCliente('${item.id}')"><span data-icone="perfil"></span></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${atividadesLog.length > 0 ? `
            <div class="calendar-group">
                <div class="calendar-group-title log">Atividades Já Realizadas <span class="text-muted" style="font-weight:400;">— registro do que já aconteceu</span></div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${atividadesLog.map(item => `
                        <div class="calendar-item log-item">
                            <div>
                                <strong>${item.tipo}</strong> — ${item.empresa} ${item.hora ? `<span class="text-muted" style="font-size:11px;">${item.hora}</span>` : ''}
                                <div style="font-size:12px;color:var(--text-secondary);">${item.desc}</div>
                            </div>
                            <div class="task-actions">
                                <button class="btn btn-success btn-xs" onclick="abrirModalCliente('${item.id}')"><span data-icone="perfil"></span></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${emails.length > 0 ? `
            <div class="calendar-group">
                <div class="calendar-group-title email">E-mails Enviados</div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${emails.map(item => `
                        <div class="calendar-item email-item">
                            <div>
                                <strong>${item.empresa}</strong>
                                <div style="font-size:12px;color:var(--text-secondary);">${item.desc}</div>
                            </div>
                            <div class="task-actions">
                                <button class="btn btn-success btn-xs" onclick="abrirModalCliente('${item.id}')"><span data-icone="perfil"></span></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

function mudarMes(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0;
        currentYear++; }
    if (currentMonth < 0) { currentMonth = 11;
        currentYear--; }
    renderizarCalendario();
}

function voltarHoje() {
    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
    selectedDate = hoje();
    renderizarCalendario();
}

function imprimirTarefasFuturas() {
    const hojeStr = hoje();
    const statusLabels = { pendente: 'Pendente', concluida: 'Concluída', adiada: 'Adiada', cancelada: 'Cancelada' };
    const leadsVisiveis = getLeadsVisiveis();

    const tarefas = leadsVisiveis
        .filter(l => l.proximaData && l.proximaAcao && l.proximaData >= hojeStr)
        .map(l => ({
            empresa: l.empresa,
            decisor: l.decisor || '—',
            data: l.proximaData,
            acao: l.proximaAcao,
            etapa: ETAPA_NOMES[l.etapa] || l.etapa,
            status: getTaskStatus(l.proximaData, l.id)
        }))
        .sort((a, b) => a.data.localeCompare(b.data));

    const linhas = tarefas.map(t => `
        <tr>
            <td>${formatarData(t.data)}</td>
            <td>${t.empresa}</td>
            <td>${t.decisor}</td>
            <td>${t.etapa}</td>
            <td>${t.acao}</td>
            <td>${statusLabels[t.status] || t.status}</td>
        </tr>
    `).join('');

    const htmlImpressao = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Tarefas Futuras</title>
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
    <h1>Relatório de Tarefas Futuras — Feitosa CRM</h1>
    <div class="meta">Gerado em ${formatarData(hojeStr)} • Total: ${tarefas.length} tarefa(s) a partir de hoje</div>
    <table>
        <thead><tr><th>Data</th><th>Empresa</th><th>Contato</th><th>Etapa</th><th>Ação Prevista</th><th>Status</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6">Nenhuma tarefa futura registrada.</td></tr>'}</tbody>
    </table>
</body></html>`;

    const janela = window.open('', '_blank');
    if (!janela) {
        showToast('Permita pop-ups para gerar o PDF!', 'error');
        return;
    }
    janela.document.write(htmlImpressao);
    janela.document.close();
    setTimeout(() => { janela.focus(); janela.print(); }, 350);
}

function abrirTarefa(leadId, data) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para alterar esta tarefa.', 'error');
        return;
    }

    document.getElementById('tsLeadId').value = leadId;
    document.getElementById('tsData').value = data;
    document.getElementById('tsDescricaoAtual').innerHTML =
        `<strong>${lead.empresa}</strong> — ${lead.proximaAcao || 'Tarefa'} (prevista para ${formatarData(data)})`;

    const infoAtual = getTaskInfo(data, leadId);
    document.getElementById('tsStatus').value = (infoAtual && infoAtual.status !== 'pendente') ? infoAtual.status : 'concluida';
    document.getElementById('tsNovaData').value = '';
    document.getElementById('tsMotivo').value = (infoAtual && infoAtual.motivo) || '';
    document.getElementById('tsAdiadaWrap').style.display = document.getElementById('tsStatus').value === 'adiada' ? 'block' : 'none';

    abrirModal('tarefaStatusModal');
}

function salvarStatusTarefa(event) {
    event.preventDefault();
    const leadId = document.getElementById('tsLeadId').value;
    const data = document.getElementById('tsData').value;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para alterar esta tarefa.', 'error');
        return;
    }

    const novoStatus = document.getElementById('tsStatus').value;
    const motivo = document.getElementById('tsMotivo').value.trim();
    const novaData = document.getElementById('tsNovaData').value;

    if (novoStatus === 'adiada' && !novaData) {
        showToast('Informe a nova data para a tarefa adiada!', 'error');
        return;
    }

    if (!lead.tarefas) lead.tarefas = {};

    if (novoStatus === 'concluida') {
        lead.tarefas[data] = { status: 'concluida', motivo };
        lead.historico.push({
            data: hoje(), hora: new Date().toTimeString().slice(0, 5),
            tipo: 'Tarefa',
            descricao: `Tarefa "${lead.proximaAcao}" marcada como Concluída${motivo ? ' — ' + motivo : ''}`
        });
    } else if (novoStatus === 'adiada') {
        lead.tarefas[data] = { status: 'adiada', motivo, novaData };
        lead.tarefas[novaData] = { status: 'pendente' };
        lead.proximaData = novaData;
        lead.historico.push({
            data: hoje(), hora: new Date().toTimeString().slice(0, 5),
            tipo: 'Tarefa',
            descricao: `Tarefa "${lead.proximaAcao}" adiada de ${formatarData(data)} para ${formatarData(novaData)}${motivo ? ' — Motivo: ' + motivo : ''}`
        });
    } else if (novoStatus === 'cancelada') {
        lead.tarefas[data] = { status: 'cancelada', motivo };
        lead.historico.push({
            data: hoje(), hora: new Date().toTimeString().slice(0, 5),
            tipo: 'Tarefa',
            descricao: `Tarefa "${lead.proximaAcao}" cancelada${motivo ? ' — Motivo: ' + motivo : ''}`
        });
    }

    salvarDados();
    fecharModal('tarefaStatusModal');
    renderizarAll();
    showToast('Tarefa atualizada!');
}
