// ============================================
// ADMINISTRAÇÃO
// ============================================
function renderizarAdmin() {
    if (usuarioAtual.papel !== 'admin') {
        navegarPara('dashboard');
        showToast('Apenas administradores podem acessar esta área.', 'error');
        return;
    }
    renderizarUsuariosAdmin();
    if (typeof renderizarEmpresaAdmin === 'function') renderizarEmpresaAdmin();
    popularAnoMetas();
    renderizarMetasAdmin();
    popularMesMetasVendedor();
    renderizarMetasVendedores();
}

function renderizarUsuariosAdmin() {
    const container = document.getElementById('adminUsersContainer');
    if (!container) return;

    if (usuarios.length === 0) {
        container.innerHTML = `<div class="empty-state compact"><span class="emoji-big"><span data-icone="clientes"></span></span><p class="text-sm">Nenhum usuário cadastrado</p></div>`;
        return;
    }

    const totalAdmins = usuarios.filter(u => u.papel === 'admin').length;

    container.innerHTML = usuarios.map(u => {
        const ehVoce = u.id === usuarioAtual.id;
        const totalLeadsUsuario = leads.filter(l => l.usuarioId === u.id).length;
        const podeExcluir = !ehVoce && !(u.papel === 'admin' && totalAdmins <= 1);

        return `
            <div class="admin-user-row ${u.papel === 'vendedor' ? 'vendedor' : ''}">
                <div class="flex gap-8" style="align-items:center;">
                    <div class="avatar-circle sm" style="background:${corAvatar(u.nome)};">${iniciais(u.nome)}</div>
                    <div>
                        <div style="font-size:13px;font-weight:600;">${u.nome} ${ehVoce ? '<span class="text-xs text-muted">(você)</span>' : ''}</div>
                        <div class="text-xs text-muted">${u.email} • ${totalLeadsUsuario} lead(s)</div>
                    </div>
                </div>
                <div class="flex gap-8" style="align-items:center;">
                    <span class="role-badge ${u.papel === 'vendedor' ? 'vendedor' : ''}">${u.papel}</span>
                    <button class="btn btn-danger btn-xs" onclick="excluirUsuario('${u.id}')" ${podeExcluir ? '' : 'disabled title="Não é possível remover"'}><span data-icone="excluir"></span></button>
                </div>
            </div>
        `;
    }).join('');
}

async function salvarUsuario(event) {
    event.preventDefault();

    const nome = document.getElementById('uNome').value.trim();
    const email = document.getElementById('uEmail').value.trim().toLowerCase();
    const senha = document.getElementById('uSenha').value;
    const papel = document.getElementById('uPapel').value;

    if (!nome || !email || !senha) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }
    if (senha.length < 6) {
        showToast('A senha precisa ter ao menos 6 caracteres.', 'error');
        return;
    }
    if (usuarios.some(u => u.email.toLowerCase() === email)) {
        showToast('Já existe um usuário com esse e-mail!', 'error');
        return;
    }

    const { data, error } = await supabaseClient.functions.invoke('manage-user', {
        body: { action: 'create', nome, email, senha, papel }
    });

    if (error || (data && data.error)) {
        showToast('Erro ao criar usuário: ' + (error ? error.message : data.error), 'error');
        return;
    }

    await carregarUsuarios();
    document.getElementById('adminUserForm').reset();
    renderizarUsuariosAdmin();
    showToast(`Usuário "${nome}" adicionado!`);
}

async function excluirUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;

    if (id === usuarioAtual.id) {
        showToast('Você não pode remover seu próprio usuário.', 'error');
        return;
    }

    const totalAdmins = usuarios.filter(u => u.papel === 'admin').length;
    if (usuario.papel === 'admin' && totalAdmins <= 1) {
        showToast('É necessário manter ao menos um administrador.', 'error');
        return;
    }

    const totalLeadsUsuario = leads.filter(l => l.usuarioId === id).length;
    const aviso = totalLeadsUsuario > 0
        ? `"${usuario.nome}" possui ${totalLeadsUsuario} lead(s) vinculado(s), que continuarão no sistema. Remover mesmo assim?`
        : `Remover o usuário "${usuario.nome}"?`;
    if (!confirm(aviso)) return;

    const { data, error } = await supabaseClient.functions.invoke('manage-user', {
        body: { action: 'delete', userId: id }
    });

    if (error || (data && data.error)) {
        showToast('Erro ao remover usuário: ' + (error ? error.message : data.error), 'error');
        return;
    }

    await carregarUsuarios();
    renderizarUsuariosAdmin();
    showToast(`Usuário "${usuario.nome}" removido.`);
}
