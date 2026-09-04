// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    aplicarTema();
    setupNavegacao();

    // Verificar tokens salvos
    verificarTokensSalvos();

    // Atualizar configurações no modal
    document.getElementById('configGmailId').textContent = CONFIG.GMAIL_CLIENT_ID || 'NÃO CONFIGURADO';
    document.getElementById('configOutlookId').textContent = CONFIG.OUTLOOK_CLIENT_ID || 'NÃO CONFIGURADO';
    document.getElementById('configOutlookTenant').textContent = CONFIG.OUTLOOK_TENANT_ID || 'NÃO CONFIGURADO';

    // Verifica sessão do Supabase; se houver, carrega usuários/leads e mostra o app
    await verificarLogin();

    // Evento do filtro admin
    document.getElementById('filtroUsuarioAdmin').addEventListener('change', function() {
        filtroAdminUsuarioId = this.value;
        renderizarAll();
    });

    // Busca global
    inicializarBuscaGlobal();

    // Fecha o menu "⋮" dos cards do Pipeline ao clicar fora dele
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.card-menu-wrap')) {
            fecharCardMenus();
        }
    });

    console.log('Feitosa CRM com Email Marketing via API e permissões por usuário!');
    console.log('Configure GMAIL_CLIENT_ID e OUTLOOK_CLIENT_ID no código.');
    console.log('Substitua com seus Client IDs do Google Cloud e Azure.');
});
