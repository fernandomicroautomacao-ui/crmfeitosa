// ============================================
// HISTÓRICO
// ============================================
function renderizarHistorico() {
    const container = document.getElementById('historicoList');
    const filtro = document.getElementById('historicoFiltroCliente');

    const leadsVisiveis = getLeadsVisiveis();
    const selectedId = filtro.value;
    filtro.innerHTML = '<option value="">Todos os clientes</option>' +
        leadsVisiveis.map(l => `<option value="${l.id}">${l.empresa}</option>`).join('');
    filtro.value = selectedId;

    let logs = [];

    leadsVisiveis.forEach(l => {
        if (selectedId && l.id !== selectedId) return;
        (l.historico || []).forEach(h => {
            logs.push({ ...h, empresa: l.empresa });
        });
    });

    // Filtrar emailLog
    const leadsIds = new Set(leadsVisiveis.map(l => l.id));
    const emailLogFiltrado = emailLog.filter(log => leadsIds.has(log.leadId));
    emailLogFiltrado.forEach(log => {
        if (!selectedId || log.leadId === selectedId) {
            logs.push({
                data: log.data,
                hora: log.hora,
                tipo: 'Email Marketing',
                descricao: `${log.assunto} (${log.provedor})`,
                empresa: log.empresa
            });
        }
    });

    // Filtrar whatsappLog
    const whatsappLogFiltrado = whatsappLog.filter(log => leadsIds.has(log.leadId));
    whatsappLogFiltrado.forEach(log => {
        if (!selectedId || log.leadId === selectedId) {
            logs.push({
                data: log.data,
                hora: log.hora,
                tipo: 'WhatsApp',
                descricao: log.mensagem,
                empresa: log.empresa
            });
        }
    });

    logs.sort((a, b) => (b.data + 'T' + (b.hora || '00:00')).localeCompare(a.data + 'T' + (a.hora || '00:00')));

    if (logs.length === 0) {
        container.innerHTML =
            '<p class="text-center text-muted" style="padding:20px;">Nenhuma atividade registrada</p>';
        return;
    }

    container.innerHTML = logs.slice(0, 50).map(h => `
        <div class="historico-item">
            <div class="h-data">${formatarData(h.data)} ${h.hora || ''} • <strong>${h.empresa}</strong></div>
            <div class="h-tipo">${h.tipo}</div>
            <div class="h-desc">${h.descricao}</div>
        </div>
    `).join('');
}
