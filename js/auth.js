// ============================================
// LOGIN / USUÁRIOS
// ============================================
function alternarVisibilidadeSenha() {
    const input = document.getElementById('loginSenha');
    const btn = document.getElementById('btnToggleSenha');
    const oculto = input.type === 'password';
    input.type = oculto ? 'text' : 'password';
    btn.innerHTML = svgIcone(oculto ? 'ocultar' : 'olho');
    btn.title = oculto ? 'Ocultar senha' : 'Mostrar senha';
}

async function carregarUsuarios() {
    const { data, error } = await supabaseClient.from('profiles').select('id, nome, email, papel');
    if (error) {
        console.error('Erro ao carregar usuários do Supabase:', error);
        usuarios = [];
        return;
    }
    usuarios = data || [];
}

async function verificarLogin() {
    const { data, error } = await supabaseClient.auth.getSession();
    const session = data && data.session;
    if (error || !session) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appWrapper').style.display = 'none';
        return;
    }

    // Só agora, com sessão confirmada, é que dá pra buscar profiles/leads (RLS exige autenticação)
    await carregarUsuarios();
    const perfil = usuarios.find(u => u.id === session.user.id);
    if (!perfil) {
        // Sessão do Supabase existe mas o profile ainda não foi encontrado (ex: acabou de ser criado)
        await supabaseClient.auth.signOut();
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appWrapper').style.display = 'none';
        return;
    }
    await carregarDados();
    usuarioAtual = perfil;
    if (typeof carregarDadosEmpresa === 'function') await carregarDadosEmpresa();
    mostrarApp();
}

async function fazerLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const senha = document.getElementById('loginSenha').value;
    const errEl = document.getElementById('loginError');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

    if (error || !data.session) {
        errEl.textContent = 'E-mail ou senha inválidos.';
        errEl.style.display = 'block';
        const card = document.getElementById('loginCard');
        card.classList.remove('shake');
        void card.offsetWidth; // reinicia a animação mesmo em tentativas seguidas
        card.classList.add('shake');
        return;
    }

    await carregarUsuarios();
    const perfil = usuarios.find(u => u.id === data.session.user.id);
    if (!perfil) {
        errEl.textContent = 'Login válido, mas não encontramos seu perfil. Fale com um administrador.';
        errEl.style.display = 'block';
        await supabaseClient.auth.signOut();
        return;
    }
    await carregarDados();

    errEl.style.display = 'none';
    usuarioAtual = perfil;
    if (typeof carregarDadosEmpresa === 'function') await carregarDadosEmpresa();
    mostrarApp();
}

async function logout() {
    await supabaseClient.auth.signOut();
    usuarioAtual = null;
    document.getElementById('loginForm').reset();
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appWrapper').style.display = 'none';
}

function mostrarApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appWrapper').style.display = 'flex';

    const avatarEl = document.getElementById('userAvatar');
    avatarEl.textContent = iniciais(usuarioAtual.nome);
    avatarEl.style.background = corAvatar(usuarioAtual.nome);
    document.getElementById('userNome').textContent = usuarioAtual.nome;
    const ehAdmin = usuarioAtual.papel === 'admin';
    document.getElementById('navAdmin').style.display = ehAdmin ? 'flex' : 'none';
    const adminGroup = document.getElementById('navAdminGroup');
    if (adminGroup) adminGroup.style.display = ehAdmin ? 'block' : 'none';
    const roleEl = document.getElementById('headerUserRole');
    if (roleEl) roleEl.textContent = ehAdmin ? 'Administrador' : 'Vendedor';

    // Admin filter
    const filterContainer = document.getElementById('adminFilterContainer');
    if (usuarioAtual.papel === 'admin') {
        filterContainer.style.display = 'flex';
        const select = document.getElementById('filtroUsuarioAdmin');
        select.innerHTML = '<option value="">Todos</option>' +
            usuarios.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
        select.value = filtroAdminUsuarioId; // mantém seleção anterior
    } else {
        filterContainer.style.display = 'none';
        filtroAdminUsuarioId = ''; // reset
    }

    renderizarAll();
}

// ============================================
// FILTRO DE LEADS POR USUÁRIO
// ============================================
function getLeadsVisiveis() {
    if (!usuarioAtual) return [];
    let resultado = leads;
    if (usuarioAtual.papel === 'admin') {
        if (filtroAdminUsuarioId) {
            resultado = leads.filter(l => l.usuarioId === filtroAdminUsuarioId);
        }
        // se não houver filtro, retorna todos
    } else {
        resultado = leads.filter(l => l.usuarioId === usuarioAtual.id);
    }
    return resultado;
}

function getPerdidosVisiveis() {
    if (!usuarioAtual) return [];
    let resultado = perdidos;
    if (usuarioAtual.papel === 'admin') {
        if (filtroAdminUsuarioId) {
            resultado = perdidos.filter(p => p.usuarioId === filtroAdminUsuarioId);
        }
    } else {
        resultado = perdidos.filter(p => p.usuarioId === usuarioAtual.id);
    }
    return resultado;
}
