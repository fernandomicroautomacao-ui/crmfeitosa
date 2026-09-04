/* Feitosa CRM — recursos avançados locais e preparados para Supabase */
(function () {
    const STORAGE_KEYS = {
        commission: 'feitosaCommissionRateV1',
        cadences: 'feitosaCadencesV1'
    };

    function getRate() {
        const value = parseFloat(localStorage.getItem(STORAGE_KEYS.commission));
        return Number.isFinite(value) ? value : 3;
    }

    function safeLeads() {
        return typeof leads !== 'undefined' && Array.isArray(leads) ? leads : [];
    }

    function money(value) {
        if (typeof formatarMoeda === 'function') return formatarMoeda(Number(value) || 0);
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    }

    function visibleLeads() {
        return typeof getLeadsVisiveis === 'function' ? getLeadsVisiveis() : safeLeads();
    }

    function text(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function renderCentral() {
        const list = document.getElementById('centralCompanyList');
        if (!list) return;
        const search = (document.getElementById('centralSearch')?.value || '').trim().toLowerCase();
        const classification = document.getElementById('centralClassification')?.value || '';
        const potential = document.getElementById('centralPotential')?.value || '';
        const stage = document.getElementById('centralStage')?.value || '';
        const filtered = visibleLeads().filter(lead => {
            const haystack = [lead.empresa, lead.cnpj, lead.telefone, lead.whatsapp, lead.email, lead.decisor, lead.cidade, lead.estado].join(' ').toLowerCase();
            return (!search || haystack.includes(search)) &&
                   (!classification || (lead.classificacao || 'outros') === classification) &&
                   (!potential || lead.potencial === potential) &&
                   (!stage || lead.etapa === stage);
        });
        if (!filtered.length) {
            list.innerHTML = '<div class="empty-state compact"><span data-icone="clientes"></span><p>Nenhuma empresa encontrada.</p><button class="btn btn-primary btn-sm" onclick="abrirModalLead()">Cadastrar empresa</button></div>';
            const detail = document.getElementById('centralCompanyDetail');
            if (detail) detail.innerHTML = '<div class="empty-state"><p>Use a busca ou cadastre uma nova empresa para começar.</p></div>';
            return;
        }
        list.innerHTML = filtered.map((lead, index) => `<button class="central-company-item ${index === 0 ? 'selected' : ''}" onclick="selecionarEmpresaCentral('${text(lead.id)}')"><span class="company-avatar">${text((lead.empresa || '?').slice(0, 2).toUpperCase())}</span><span class="company-item-copy"><strong>${text(lead.empresa)}</strong><small>${text(lead.codigoUnico || 'Sem código')} · ${text(lead.etapa || 'lead')}</small></span><span class="company-item-value">${money(lead.valor)}</span></button>`).join('');
        selecionarEmpresaCentral(filtered[0].id);
    }

    function selecionarEmpresaCentral(id) {
        const lead = visibleLeads().find(item => String(item.id) === String(id));
        const detail = document.getElementById('centralCompanyDetail');
        if (!lead || !detail) return;
        document.querySelectorAll('.central-company-item').forEach(item => item.classList.remove('selected'));
        document.querySelectorAll('.central-company-item').forEach(item => { if (item.getAttribute('onclick')?.includes(String(id))) item.classList.add('selected'); });
        const history = Array.isArray(lead.historico) ? lead.historico.slice(-5).reverse() : [];
        const recommendation = lead.etapa === 'pedido' ? 'Confirme o recebimento e avalie uma oportunidade recorrente.' : lead.proximaData ? `Próxima ação: ${lead.proximaAcao || 'atividade agendada'} em ${lead.proximaData}.` : 'Defina uma próxima ação para evitar que esta oportunidade fique parada.';
        const classifNome = typeof CLASSIFICACAO_NOMES !== 'undefined' && CLASSIFICACAO_NOMES[lead.classificacao] ? CLASSIFICACAO_NOMES[lead.classificacao] : (lead.classificacao || 'Outros');
        detail.innerHTML = `<div class="company-detail-header"><div><span class="quick-start-kicker">Ficha comercial</span><h3>${text(lead.empresa)}</h3><p class="text-muted">${text(lead.cnpj || 'CNPJ não informado')} · ${text(lead.cidade || 'Localidade não informada')}</p></div><button class="btn btn-primary btn-sm" onclick="abrirModalLead('${text(lead.id)}')">Editar</button></div><div class="company-detail-grid"><div><span>Etapa</span><strong>${text(lead.etapa || '—')}</strong></div><div><span>Classificação</span><strong>${text(classifNome)}</strong></div><div><span>Potencial</span><strong>${text(lead.potencial || '—')}</strong></div><div><span>Valor</span><strong>${money(lead.valor)}</strong></div></div><div class="company-detail-contact"><a href="tel:${text(lead.telefone)}">${text(lead.telefone || 'Sem telefone')}</a><a href="mailto:${text(lead.email)}">${text(lead.email || 'Sem e-mail')}</a><span>${text(lead.decisor || 'Decisor não informado')}</span></div><div class="ai-recommendation"><strong>Recomendação:</strong> ${recommendation}</div><div class="company-history"><div class="card-header"><h3>Últimas atividades</h3><button class="btn btn-outline btn-sm" onclick="abrirAtividade('${text(lead.id)}')">Registrar atividade</button></div>${history.length ? history.map(item => `<div class="history-row"><span>${text(item.data)} ${text(item.hora)}</span><strong>${text(item.tipo)}</strong><p>${text(item.descricao)}</p></div>`).join('') : '<div class="empty-state compact"><p>Nenhuma atividade registrada.</p></div>'}</div>`;
        const ai = document.getElementById('aiRecommendation');
        if (ai) ai.innerHTML = `<strong>${text(lead.empresa)}:</strong> ${recommendation}`;
    }

    function getOrders() {
        return visibleLeads().flatMap(lead => {
            if (Array.isArray(lead.pedidos) && lead.pedidos.length) return lead.pedidos.map((order, index) => ({ ...order, empresa: lead.empresa, leadId: lead.id, orderIndex: index }));
            return lead.etapa === 'pedido' ? [{ numero: lead.numeroPedido || 'Pedido', data: lead.dataPedido || lead.dataCriacao, valor: lead.valor || 0, empresa: lead.empresa, leadId: lead.id, orderIndex: -1, isLegacy: true }] : [];
        });
    }

    function commissionData(order) {
        const base = Number(order.valor) || 0;
        const percent = Number(order.comissaoPercentual);
        const rate = Number.isFinite(percent) ? percent : getRate();
        const amount = Number(order.comissaoValor);
        const total = Number.isFinite(amount) ? amount : base * rate / 100;
        const paid = Math.max(0, Number(order.comissaoPago) || 0);
        const status = paid >= total && total > 0 ? 'integral' : paid > 0 ? 'parcial' : 'pendente';
        return { base, rate, total, paid, balance: Math.max(0, total - paid), status, confirmed: !!order.comissaoConfirmada || Number.isFinite(amount) || Number.isFinite(percent) };
    }

    function orderForUpdate(leadId, index) {
        const lead = safeLeads().find(item => String(item.id) === String(leadId));
        if (!lead) return null;
        if (!Array.isArray(lead.pedidos)) lead.pedidos = [];
        if (index < 0) {
            lead.pedidos.push({ numero: lead.numeroPedido || 'Pedido', data: lead.dataPedido || new Date().toISOString().slice(0, 10), valor: lead.valor || 0, itens: lead.itens || [] });
            return { lead, order: lead.pedidos[lead.pedidos.length - 1] };
        }
        return lead.pedidos[index] ? { lead, order: lead.pedidos[index] } : null;
    }

    async function persistOrderChange() {
        if (typeof salvarDados === 'function') await salvarDados();
        if (typeof renderizarAll === 'function') renderizarAll();
        renderizarFinanceiro();
    }

    function renderizarFinanceiro() {
        const orders = getOrders();
        const data = orders.map(commissionData);
        const total = orders.reduce((sum, order) => sum + (Number(order.valor) || 0), 0);
        const commission = data.reduce((sum, item) => sum + item.total, 0);
        const paid = data.reduce((sum, item) => sum + item.paid, 0);
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
        set('financeRevenue', money(total)); set('financeCommission', money(commission)); set('financeOrders', orders.length); set('financePending', data.filter(item => item.status !== 'integral').length);
        const rate = document.getElementById('defaultCommissionRate'); if (rate && document.activeElement !== rate) rate.value = getRate();
        const status = document.getElementById('commissionRuleStatus'); if (status) status.textContent = `Padrão atual: ${getRate().toLocaleString('pt-BR')}%. Total pago: ${money(paid)}. Comissão sem confirmação não deve ser considerada definitiva.`;
        const alert = document.getElementById('financeAlerts'); if (alert) { const pendingConfirm = orders.filter((order, i) => !data[i].confirmed); alert.innerHTML = pendingConfirm.length ? `<div class="finance-alert">Atenção: ${pendingConfirm.length} comissão(ões) ainda usam o padrão e precisam de confirmação.</div>` : ''; }
        const table = document.getElementById('commissionTableWrap');
        if (table) table.innerHTML = orders.length ? `<div class="table-wrapper"><table><thead><tr><th>Pedido</th><th>Empresa</th><th>Valor</th><th>Comissão</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody>${orders.map((order, i) => { const c = data[i]; return `<tr><td>${text(order.numero)}<br><small>${text(order.data || '')}</small></td><td>${text(order.empresa)}</td><td>${money(order.valor)}</td><td><div class="commission-edit"><input id="commRate-${text(order.leadId)}-${order.orderIndex}" type="number" min="0" max="100" step="0.01" value="${c.rate}" title="Percentual da comissão"><input id="commValue-${text(order.leadId)}-${order.orderIndex}" type="number" min="0" step="0.01" value="${c.total.toFixed(2)}" title="Valor confirmado da comissão"><small>${c.confirmed ? 'Confirmada' : 'Padrão não confirmado'}</small></div></td><td>${money(c.paid)} / ${money(c.total)}<br><span class="status-pill status-${c.status}">${c.status === 'integral' ? 'Integral' : c.status === 'parcial' ? 'Parcial' : 'Pendente'}</span></td><td><button class="btn btn-outline btn-sm" onclick="salvarComissaoPedido('${text(order.leadId)}',${order.orderIndex})">Confirmar valor</button><div class="payment-edit"><input id="commPayment-${text(order.leadId)}-${order.orderIndex}" type="number" min="0" step="0.01" placeholder="Valor pago"><button class="btn btn-primary btn-sm" onclick="registrarPagamentoComissao('${text(order.leadId)}',${order.orderIndex})">Registrar pagamento</button></div></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty-state compact"><p>Nenhum pedido registrado.</p></div>';
    }

    async function salvarComissaoPedido(leadId, index) {
        const ref = orderForUpdate(leadId, index); if (!ref) return;
        const key = `${leadId}-${index}`;
        const rate = parseFloat(document.getElementById(`commRate-${key}`)?.value);
        const value = parseFloat(document.getElementById(`commValue-${key}`)?.value);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isFinite(value) || value < 0) { if (typeof showToast === 'function') showToast('Informe percentual e valor válidos.', 'error'); return; }
        ref.order.comissaoPercentual = rate; ref.order.comissaoValor = value; ref.order.comissaoConfirmada = true; ref.order.comissaoUsaPadrao = false; ref.order.comissaoConfirmadaEm = new Date().toISOString();
        if (typeof registrarAuditoriaLocal === 'function') registrarAuditoriaLocal('Comissão confirmada', 'pedido', leadId, `Valor ${value}`);
        await persistOrderChange(); if (typeof showToast === 'function') showToast('Comissão confirmada para este pedido.');
    }

    async function registrarPagamentoComissao(leadId, index) {
        const ref = orderForUpdate(leadId, index); if (!ref) return;
        const value = parseFloat(document.getElementById(`commPayment-${leadId}-${index}`)?.value);
        if (!Number.isFinite(value) || value <= 0) { if (typeof showToast === 'function') showToast('Informe um valor de pagamento válido.', 'error'); return; }
        const c = commissionData(ref.order); if (!c.confirmed) { if (typeof showToast === 'function') showToast('Confirme primeiro o valor da comissão.', 'error'); return; }
        if (value > c.balance) { if (typeof showToast === 'function') showToast(`O pagamento não pode exceder o saldo de ${money(c.balance)}.`, 'error'); return; }
        ref.order.comissaoPago = c.paid + value; ref.order.comissaoUltimoPagamento = new Date().toISOString(); ref.order.comissaoStatus = commissionData(ref.order).status;
        if (typeof registrarAuditoriaLocal === 'function') registrarAuditoriaLocal('Pagamento de comissão', 'pedido', leadId, `Pagamento ${value}`);
        await persistOrderChange(); if (typeof showToast === 'function') showToast('Pagamento de comissão registrado.');
    }

    function salvarRegraComissao() {
        const input = document.getElementById('defaultCommissionRate');
        const value = parseFloat(input?.value);
        if (!Number.isFinite(value) || value < 0 || value > 100) { if (typeof showToast === 'function') showToast('Informe um percentual entre 0 e 100.', 'error'); return; }
        localStorage.setItem(STORAGE_KEYS.commission, String(value)); renderizarFinanceiro(); if (typeof showToast === 'function') showToast('Regra de comissão salva neste dispositivo.');
    }

    function getCadences() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.cadences) || '[]'); } catch { return []; } }
    function renderizarCadencias() {
        const list = document.getElementById('cadenceList'); if (!list) return;
        const cadences = getCadences();
        list.innerHTML = cadences.length ? cadences.map((item, index) => `<div class="cadence-row"><div><strong>${text(item.nome)}</strong><small>${item.etapas.length} etapas</small></div><button class="btn btn-danger btn-sm" onclick="excluirCadencia(${index})">Excluir</button></div>`).join('') : '<div class="empty-state compact"><p>Nenhuma cadência criada.</p></div>';
    }
    function salvarCadencia() {
        const nome = document.getElementById('cadenceName')?.value.trim(); const etapas = (document.getElementById('cadenceSteps')?.value || '').split('\n').map(item => item.trim()).filter(Boolean);
        if (!nome || !etapas.length) { if (typeof showToast === 'function') showToast('Informe o nome e pelo menos uma etapa.', 'error'); return; }
        const cadences = getCadences(); cadences.push({ nome, etapas, criadaEm: new Date().toISOString() }); localStorage.setItem(STORAGE_KEYS.cadences, JSON.stringify(cadences)); document.getElementById('cadenceName').value = ''; document.getElementById('cadenceSteps').value = ''; renderizarCadencias(); if (typeof showToast === 'function') showToast('Cadência criada.');
    }
    function excluirCadencia(index) { const cadences = getCadences(); cadences.splice(index, 1); localStorage.setItem(STORAGE_KEYS.cadences, JSON.stringify(cadences)); renderizarCadencias(); }

    async function consultarCNPJ() {
        const input = document.getElementById('fCnpj');
        const status = document.getElementById('cnpjLookupStatus');
        const cnpj = (input?.value || '').replace(/\D/g, '');
        if (cnpj.length !== 14) { if (typeof showToast === 'function') showToast('Informe um CNPJ com 14 dígitos.', 'error'); return; }
        if (status) status.textContent = 'Consultando dados públicos...';
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (!response.ok) throw new Error('CNPJ não encontrado');
            const data = await response.json();
            const set = (id, value) => { const el = document.getElementById(id); if (el && value) el.value = value; };
            set('fEmpresa', data.razao_social || data.nome_fantasia);
            set('fCidade', data.municipio);
            set('fEstado', data.uf);
            set('fTelefone', data.ddd_telefone_1);
            set('fEmail', data.email);
            set('fCodigoUnico', cnpj);
            if (status) status.textContent = `Dados encontrados: ${data.nome_fantasia || data.razao_social || 'empresa localizada'}.`;
            if (typeof showToast === 'function') showToast('Dados do CNPJ preenchidos.');
        } catch (error) {
            if (status) status.textContent = 'Não foi possível consultar agora. Preencha os dados manualmente.';
            if (typeof showToast === 'function') showToast('Consulta de CNPJ indisponível.', 'error');
        }
    }

    function getAuditLogs() { try { return JSON.parse(localStorage.getItem('feitosaAuditLocalV1') || '[]'); } catch { return []; } }
    function registrarAuditoriaLocal(acao, entidade, entidadeId, detalhes) {
        const logs = getAuditLogs(); logs.unshift({ acao, entidade, entidadeId: entidadeId || '', detalhes: detalhes || '', data: new Date().toISOString(), usuario: window.usuarioAtual?.nome || 'Sessão atual' });
        localStorage.setItem('feitosaAuditLocalV1', JSON.stringify(logs.slice(0, 100)));
        renderizarAuditoriaLocal();
    }
    function renderizarAuditoriaLocal() {
        const el = document.getElementById('auditLocalList'); if (!el) return;
        const logs = getAuditLogs();
        el.innerHTML = logs.length ? logs.slice(0, 6).map(log => `<div class="audit-row"><strong>${text(log.acao)}</strong><span>${text(log.entidade)} · ${new Date(log.data).toLocaleString('pt-BR')}</span></div>`).join('') : '<div class="empty-state compact"><p>Nenhuma ação registrada localmente.</p></div>';
    }
    function exportarBackupCompleto() {
        const payload = { versao: 1, exportadoEm: new Date().toISOString(), leads: safeLeads(), localStorage: { commission: localStorage.getItem(STORAGE_KEYS.commission), cadences: localStorage.getItem(STORAGE_KEYS.cadences), metas: localStorage.getItem('ploomesMetasV5') } };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `backup-feitosa-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); registrarAuditoriaLocal('Exportação de backup', 'sistema', '', 'Backup JSON baixado');
    }
    function restaurarBackupCompleto(event) {
        const file = event.target.files?.[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = () => { try { const payload = JSON.parse(reader.result); if (!payload || !Array.isArray(payload.leads)) throw new Error('Formato inválido'); if (!confirm('Restaurar este backup substituirá os leads locais atuais. Deseja continuar?')) return; leads = payload.leads; if (payload.localStorage?.commission) localStorage.setItem(STORAGE_KEYS.commission, payload.localStorage.commission); if (payload.localStorage?.cadences) localStorage.setItem(STORAGE_KEYS.cadences, payload.localStorage.cadences); if (typeof salvarDados === 'function') salvarDados(); if (typeof renderizarAll === 'function') renderizarAll(); registrarAuditoriaLocal('Restauração de backup', 'sistema', '', 'Backup JSON restaurado'); if (typeof showToast === 'function') showToast('Backup restaurado.'); } catch { if (typeof showToast === 'function') showToast('Arquivo de backup inválido.', 'error'); } finally { event.target.value = ''; } }; reader.readAsText(file);
    }

    function exportarFinanceiroCSV() {
        const rows = [['Pedido', 'Empresa', 'Data', 'Valor do pedido', 'Percentual', 'Comissão confirmada', 'Total pago', 'Saldo', 'Status'], ...getOrders().map(order => { const c = commissionData(order); return [order.numero, order.empresa, order.data, Number(order.valor) || 0, c.rate, c.total.toFixed(2), c.paid.toFixed(2), c.balance.toFixed(2), c.status]; })];
        const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `financeiro-feitosa-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
    }

    window.renderizarCentral = renderCentral;
    window.selecionarEmpresaCentral = selecionarEmpresaCentral;
    window.renderizarFinanceiro = renderizarFinanceiro;
    window.salvarRegraComissao = salvarRegraComissao;
    window.salvarComissaoPedido = salvarComissaoPedido;
    window.registrarPagamentoComissao = registrarPagamentoComissao;
    window.renderizarCadencias = renderizarCadencias;
    window.salvarCadencia = salvarCadencia;
    window.excluirCadencia = excluirCadencia;
    window.exportarFinanceiroCSV = exportarFinanceiroCSV;
    window.consultarCNPJ = consultarCNPJ;
    window.exportarBackupCompleto = exportarBackupCompleto;
    window.restaurarBackupCompleto = restaurarBackupCompleto;
    window.registrarAuditoriaLocal = registrarAuditoriaLocal;
    window.renderizarAuditoriaLocal = renderizarAuditoriaLocal;

    const originalNavigate = window.navegarPara;
    window.navegarPara = function (section) {
        if (typeof originalNavigate === 'function') originalNavigate(section);
        if (section === 'central') renderCentral();
        if (section === 'financeiro') renderizarFinanceiro();
        if (section === 'automacao') renderizarCadencias();
    };

    document.addEventListener('DOMContentLoaded', () => {
        renderizarFinanceiro(); renderizarCadencias(); renderizarAuditoriaLocal();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    });
})();
