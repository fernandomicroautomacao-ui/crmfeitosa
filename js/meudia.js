// ============================================
// MEU DIA (painel do Dashboard)
// ============================================
const DIAS_LEAD_PARADO = 15;

function calcularTarefasMeuDia() {
    const leadsVisiveis = getLeadsVisiveis();
    const hojeStr = hoje();
    const atrasadas = [];
    const deHoje = [];

    leadsVisiveis.forEach(l => {
        if (!l.proximaData || !l.proximaAcao) return;
        const status = getTaskStatus(l.proximaData, l.id);
        if (status !== 'pendente') return;

        const item = { id: l.id, empresa: l.empresa, desc: l.proximaAcao, data: l.proximaData };
        if (l.proximaData < hojeStr) atrasadas.push(item);
        else if (l.proximaData === hojeStr) deHoje.push(item);
    });

    atrasadas.sort((a, b) => a.data.localeCompare(b.data));
    return { atrasadas, deHoje };
}

function calcularLeadsParados() {
    const leadsVisiveis = getLeadsVisiveis();
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_LEAD_PARADO);

    return leadsVisiveis
        .filter(l => l.etapa !== 'pedido')
        .map(l => {
            const historico = l.historico || [];
            const ultimaData = historico.length > 0 ?
                historico[historico.length - 1].data :
                (l.dataCriacao || '').split('T')[0];
            return { ...l, ultimaAtividade: ultimaData };
        })
        .filter(l => l.ultimaAtividade && new Date(l.ultimaAtividade) < limite)
        .sort((a, b) => (a.ultimaAtividade || '').localeCompare(b.ultimaAtividade || ''));
}

function diasDesde(dataStr) {
    if (!dataStr) return 0;
    const diff = Date.now() - new Date(dataStr).getTime();
    return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function renderizarMeuDia() {
    const container = document.getElementById('meuDiaContainer');
    if (!container) return;

    const { atrasadas, deHoje } = calcularTarefasMeuDia();
    const parados = calcularLeadsParados();

    if (atrasadas.length === 0 && deHoje.length === 0 && parados.length === 0) {
        container.innerHTML = `
            <div class="empty-state compact">
                <span class="emoji-big">🎉</span>
                <p class="text-sm">Tudo em dia! Nenhuma tarefa pendente ou lead parado.</p>
            </div>
        `;
        return;
    }

    let html = '';

    if (atrasadas.length > 0) {
        html += `
            <div class="calendar-group">
                <div class="calendar-group-title tarefa">Tarefas Atrasadas (${atrasadas.length})</div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${atrasadas.map(item => `
                        <div class="calendar-item task-item">
                            <div>
                                <strong>${item.empresa}</strong>
                                <div style="font-size:12px;color:var(--text-secondary);">${item.desc}</div>
                                <div class="text-xs text-muted">Prevista para ${formatarData(item.data)}</div>
                            </div>
                            <div class="task-actions">
                                <button class="btn btn-primary btn-xs" onclick="abrirTarefa('${item.id}','${item.data}')">Status</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (deHoje.length > 0) {
        html += `
            <div class="calendar-group">
                <div class="calendar-group-title log">Tarefas de Hoje (${deHoje.length})</div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${deHoje.map(item => `
                        <div class="calendar-item log-item">
                            <div>
                                <strong>${item.empresa}</strong>
                                <div style="font-size:12px;color:var(--text-secondary);">${item.desc}</div>
                            </div>
                            <div class="task-actions">
                                <button class="btn btn-primary btn-xs" onclick="abrirTarefa('${item.id}','${item.data}')">Status</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (parados.length > 0) {
        html += `
            <div class="calendar-group">
                <div class="calendar-group-title email">Leads Sem Contato Há ${DIAS_LEAD_PARADO}+ Dias (${parados.length})</div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${parados.slice(0, 8).map(l => `
                        <div class="calendar-item email-item">
                            <div>
                                <strong>${l.empresa}</strong>
                                <div class="text-xs text-muted">${ETAPA_NOMES[l.etapa] || l.etapa} • última atividade há ${diasDesde(l.ultimaAtividade)} dias</div>
                            </div>
                            <div class="task-actions">
                                <button class="btn btn-primary btn-xs" onclick="abrirAtividade('${l.id}')">Registrar</button>
                                <button class="btn btn-success btn-xs" onclick="abrirModalCliente('${l.id}')"><span data-icone="perfil"></span></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${parados.length > 8 ? `<p class="text-xs text-muted mt-8">+ ${parados.length - 8} outro(s) lead(s) parado(s).</p>` : ''}
            </div>
        `;
    }

    container.innerHTML = html;
}
