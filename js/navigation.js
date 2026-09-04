// ============================================
// NAVEGAÇÃO
// ============================================
function setupNavegacao() {
    document.querySelectorAll('.sidebar nav a').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            navegarPara(this.dataset.section);
        });
    });
}

function navegarPara(section) {
    fecharTodosModais();
    document.getElementById('sidebar')?.classList.remove('mobile-open');

    document.querySelectorAll('.sidebar nav a').forEach(el => el.classList.remove('active'));
    document.querySelector(`.sidebar nav a[data-section="${section}"]`)?.classList.add('active');

    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        pipeline: 'Pipeline',
        central: 'Central 360º',
        marketing: 'Marketing',
        whatsapp: 'WhatsApp',
        coletor: 'Coletor de Leads',
        calendario: 'Calendário',
        comunicacao: 'Comunicação',
        clientes: 'Clientes',
        relatorios: 'Relatórios',
        financeiro: 'Financeiro e Comissões',
        historico: 'Histórico',
        importar: 'Importar',
        exportar: 'Exportar',
        automacao: 'Automação e IA',
        admin: 'Administração'
    };
    document.getElementById('pageTitle').innerHTML =
        `<span class="page-title-icon">${svgIcone(section)}</span> ${titles[section] || section}`;

    if (section === 'dashboard') renderizarDashboard();
    if (section === 'pipeline') renderizarPipeline();
    if (section === 'central' && typeof renderizarCentral === 'function') renderizarCentral();
    if (section === 'marketing') renderizarMarketing();
    if (section === 'whatsapp') renderizarWhatsapp();
    if (section === 'coletor') renderizarColetor();
    if (section === 'calendario') renderizarCalendario();
    if (section === 'comunicacao') renderizarComunicacao();
    if (section === 'clientes') renderizarClientes();
    if (section === 'relatorios') {
        renderizarRelatorios();
        if (typeof renderizarRelatoriosAvancados === 'function') renderizarRelatoriosAvancados();
        if (typeof inicializarSubAbasRelatorio === 'function') inicializarSubAbasRelatorio();
    }
    if (section === 'financeiro' && typeof renderizarFinanceiro === 'function') renderizarFinanceiro();
    if (section === 'historico') renderizarHistorico();
    if (section === 'admin') renderizarAdmin();
    if (section === 'automacao' && typeof renderizarCadencias === 'function') renderizarCadencias();
}

// ============================================
// TEMA
// ============================================
function aplicarTema() {
    const tema = localStorage.getItem('ploomesTemaV5') || 'light';
    document.documentElement.setAttribute('data-theme', tema === 'dark' ? 'dark' : 'light');
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
}

function toggleTheme() {
    const atual = document.documentElement.getAttribute('data-theme');
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', novo);
    localStorage.setItem('ploomesTemaV5', novo);
}
