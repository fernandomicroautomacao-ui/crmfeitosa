// ============================================
// UTILITÁRIOS
// ============================================
function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatarData(data) {
    if (!data) return '—';
    const partData = String(data).split('T')[0];
    const partes = partData.split('-');
    if (partes.length === 3) {
        const [ano, mes, dia] = partes;
        return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatarMoeda(valor) {
    return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hoje() {
    return new Date().toISOString().split('T')[0];
}

function getMesAtual() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getTaskStatus(data, leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !lead.tarefas) return 'pendente';
    const t = lead.tarefas[data];
    if (!t) return 'pendente';
    return typeof t === 'object' ? (t.status || 'pendente') : t;
}

function getTaskInfo(data, leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !lead.tarefas || !lead.tarefas[data]) return null;
    const t = lead.tarefas[data];
    return typeof t === 'object' ? t : { status: t };
}

function iniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function corAvatar(nome) {
    const paleta = ['#2d4863', '#3c6e91', '#a9761f', '#8a5a3c', '#2f7d5b', '#6b4468', '#4d7396', '#5b5a80'];
    if (!nome) return paleta[0];
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return paleta[Math.abs(hash) % paleta.length];
}

// ============================================
// TOAST
// ============================================
function showToast(mensagem, tipo = 'success', acaoLabel = null, acaoCallback = null) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    const texto = document.createElement('span');
    texto.textContent = mensagem;
    toast.appendChild(texto);

    if (acaoLabel && acaoCallback) {
        const btnAcao = document.createElement('button');
        btnAcao.className = 'toast-action';
        btnAcao.textContent = acaoLabel;
        btnAcao.onclick = () => {
            acaoCallback();
            toast.remove();
        };
        toast.appendChild(btnAcao);
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, acaoLabel ? 6000 : 3000);
}

// ============================================
// CONTADORES
// ============================================
function setBadge(elId, valor) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = valor;
    el.classList.toggle('zero', valor === 0);
}

function atualizarContadores() {
    const leadsVisiveis = getLeadsVisiveis();
    const clientes = new Set(leadsVisiveis.filter(l => l.etapa === 'pedido').map(l => l.codigoUnico));
    setBadge('clientCount', clientes.size);
    setBadge('pipelineCount', leadsVisiveis.filter(l => l.etapa !== 'pedido').length);

    const tarefasPendentes = leadsVisiveis.filter(l => l.proximaData && l.proximaAcao).length;
    const tarefasAtrasadas = calcularTarefasMeuDia().atrasadas.length;
    const calBadge = document.getElementById('calendarioCount');
    if (calBadge) {
        calBadge.textContent = tarefasAtrasadas > 0 ? tarefasAtrasadas : tarefasPendentes;
        calBadge.classList.toggle('zero', tarefasAtrasadas === 0 && tarefasPendentes === 0);
        calBadge.classList.toggle('atrasado', tarefasAtrasadas > 0);
        calBadge.title = tarefasAtrasadas > 0 ? `${tarefasAtrasadas} tarefa(s) atrasada(s)` : '';
    }

    setBadge('marketingCount', campanhas.filter(c => c.status === 'ativa').length);
    setBadge('whatsappCount', whatsappLog.filter(log => log.data === hoje()).length);
    const pendentesColetor = coletorListas.reduce((acc, p) => acc + p.linhas.filter(l => l.tratado && !l.promovido).length, 0);
    setBadge('coletorCount', pendentesColetor);
    setBadge('perdidosCount', getPerdidosVisiveis().length);

    const comBadge = document.getElementById('comunicacaoCount');
    if (comBadge) {
        const atrasados = calcularContatosAtrasados().length;
        comBadge.textContent = atrasados;
        comBadge.classList.toggle('zero', atrasados === 0);
        comBadge.classList.toggle('atrasado', atrasados > 0);
        comBadge.title = atrasados > 0 ? `${atrasados} cliente(s) sem contato recente` : '';
    }
}
