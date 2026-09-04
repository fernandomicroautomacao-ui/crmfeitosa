// ============================================
// WHITE LABEL / IDENTIDADE DA EMPRESA
// ============================================
const WHITE_LABEL_DEFAULTS = {
    nome: 'Feitosa CRM',
    nomeCurto: 'Feitosa',
    cnpj: '',
    email: '',
    telefone: '',
    site: '',
    endereco: '',
    cidade: '',
    estado: '',
    logoDataUrl: '',
    corPrimaria: '#22384d',
    corDestaque: '#2f7d5b'
};

let empresaAtual = { ...WHITE_LABEL_DEFAULTS };

function whiteLabelStorageKey() {
    return `feitosaWhiteLabel_${usuarioAtual?.id || 'anonimo'}`;
}

function escaparHtmlWhiteLabel(valor) {
    return String(valor || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

async function carregarDadosEmpresa() {
    const local = JSON.parse(localStorage.getItem(whiteLabelStorageKey()) || 'null');
    empresaAtual = { ...WHITE_LABEL_DEFAULTS, ...(local || {}) };

    if (typeof supabaseClient !== 'undefined' && usuarioAtual?.id) {
        try {
            const { data, error } = await supabaseClient
                .from('company_settings')
                .select('*')
                .eq('owner_id', usuarioAtual.id)
                .maybeSingle();
            if (!error && data) {
                empresaAtual = {
                    ...WHITE_LABEL_DEFAULTS,
                    nome: data.nome || data.nome_empresa || WHITE_LABEL_DEFAULTS.nome,
                    nomeCurto: data.nome_curto || data.nomeCurto || data.nome || WHITE_LABEL_DEFAULTS.nomeCurto,
                    cnpj: data.cnpj || '',
                    email: data.email || '',
                    telefone: data.telefone || '',
                    site: data.site || '',
                    endereco: data.endereco || '',
                    cidade: data.cidade || '',
                    estado: data.estado || '',
                    logoDataUrl: data.logo_data_url || data.logoDataUrl || '',
                    corPrimaria: data.cor_primaria || data.corPrimaria || WHITE_LABEL_DEFAULTS.corPrimaria,
                    corDestaque: data.cor_destaque || data.corDestaque || WHITE_LABEL_DEFAULTS.corDestaque
                };
                localStorage.setItem(whiteLabelStorageKey(), JSON.stringify(empresaAtual));
            }
        } catch (e) {
            console.warn('Configuração white label ainda não disponível no Supabase; usando armazenamento local.', e);
        }
    }
    aplicarIdentidadeEmpresa();
}

function aplicarIdentidadeEmpresa() {
    const nome = empresaAtual.nome || WHITE_LABEL_DEFAULTS.nome;
    const curto = empresaAtual.nomeCurto || nome;
    document.title = `${nome} — Gestão comercial`;
    document.documentElement.style.setProperty('--brand-primary', empresaAtual.corPrimaria || WHITE_LABEL_DEFAULTS.corPrimaria);
    document.documentElement.style.setProperty('--brand-accent', empresaAtual.corDestaque || WHITE_LABEL_DEFAULTS.corDestaque);

    document.querySelectorAll('[data-company-name]').forEach(el => { el.textContent = nome; });
    document.querySelectorAll('[data-company-short-name]').forEach(el => { el.textContent = curto; });
    document.querySelectorAll('[data-company-logo]').forEach(el => {
        if (empresaAtual.logoDataUrl) {
            el.innerHTML = `<img src="${empresaAtual.logoDataUrl}" alt="${escaparHtmlWhiteLabel(nome)}" class="company-logo-image">`;
        } else {
            el.innerHTML = `<span class="logo-mark">${escaparHtmlWhiteLabel(curto.slice(0, 2).toUpperCase())}</span>`;
        }
    });

    let favicon = document.getElementById('dynamicFavicon');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.id = 'dynamicFavicon';
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.type = empresaAtual.logoDataUrl ? 'image/png' : 'image/svg+xml';
    favicon.href = empresaAtual.logoDataUrl || 'assets/favicon.svg';

    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = empresaAtual.corPrimaria || WHITE_LABEL_DEFAULTS.corPrimaria;
}

function renderizarEmpresaAdmin() {
    if (usuarioAtual?.papel !== 'admin') return;
    const form = document.getElementById('companySettingsForm');
    if (!form) return;
    const campos = {
        companyName: empresaAtual.nome,
        companyShortName: empresaAtual.nomeCurto,
        companyCnpj: empresaAtual.cnpj,
        companyEmail: empresaAtual.email,
        companyPhone: empresaAtual.telefone,
        companySite: empresaAtual.site,
        companyAddress: empresaAtual.endereco,
        companyCity: empresaAtual.cidade,
        companyState: empresaAtual.estado,
        companyPrimaryColor: empresaAtual.corPrimaria,
        companyAccentColor: empresaAtual.corDestaque
    };
    Object.entries(campos).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.value = valor || '';
    });
    const preview = document.getElementById('companyLogoPreview');
    if (preview) preview.innerHTML = empresaAtual.logoDataUrl
        ? `<img src="${empresaAtual.logoDataUrl}" alt="Logo atual" class="company-logo-preview">`
        : '<span class="text-muted text-sm">Nenhum logotipo configurado. Será usado o favicon padrão.</span>';
}

function lerArquivoLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Selecione uma imagem válida para o logotipo.', 'error');
        event.target.value = '';
        return;
    }
    if (file.size > 1024 * 1024) {
        showToast('O logotipo deve ter no máximo 1 MB.', 'error');
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        empresaAtual.logoDataUrl = reader.result;
        const preview = document.getElementById('companyLogoPreview');
        if (preview) preview.innerHTML = `<img src="${reader.result}" alt="Prévia do logotipo" class="company-logo-preview">`;
    };
    reader.readAsDataURL(file);
}

async function salvarEmpresaWhiteLabel(event) {
    event.preventDefault();
    if (usuarioAtual?.papel !== 'admin') {
        showToast('Apenas administradores podem alterar a identidade da empresa.', 'error');
        return;
    }
    empresaAtual = {
        ...empresaAtual,
        nome: document.getElementById('companyName').value.trim() || WHITE_LABEL_DEFAULTS.nome,
        nomeCurto: document.getElementById('companyShortName').value.trim() || document.getElementById('companyName').value.trim() || WHITE_LABEL_DEFAULTS.nomeCurto,
        cnpj: document.getElementById('companyCnpj').value.trim(),
        email: document.getElementById('companyEmail').value.trim(),
        telefone: document.getElementById('companyPhone').value.trim(),
        site: document.getElementById('companySite').value.trim(),
        endereco: document.getElementById('companyAddress').value.trim(),
        cidade: document.getElementById('companyCity').value.trim(),
        estado: document.getElementById('companyState').value.trim(),
        corPrimaria: document.getElementById('companyPrimaryColor').value || WHITE_LABEL_DEFAULTS.corPrimaria,
        corDestaque: document.getElementById('companyAccentColor').value || WHITE_LABEL_DEFAULTS.corDestaque
    };
    localStorage.setItem(whiteLabelStorageKey(), JSON.stringify(empresaAtual));

    let sincronizado = false;
    try {
        if (typeof supabaseClient !== 'undefined') {
            const { error } = await supabaseClient.from('company_settings').upsert({
                owner_id: usuarioAtual.id,
                nome: empresaAtual.nome,
                nome_curto: empresaAtual.nomeCurto,
                cnpj: empresaAtual.cnpj,
                email: empresaAtual.email,
                telefone: empresaAtual.telefone,
                site: empresaAtual.site,
                endereco: empresaAtual.endereco,
                cidade: empresaAtual.cidade,
                estado: empresaAtual.estado,
                logo_data_url: empresaAtual.logoDataUrl || null,
                cor_primaria: empresaAtual.corPrimaria,
                cor_destaque: empresaAtual.corDestaque,
                updated_at: new Date().toISOString()
            }, { onConflict: 'owner_id' });
            sincronizado = !error;
            if (error) console.warn('Não foi possível sincronizar empresa no Supabase:', error.message);
        }
    } catch (e) {
        console.warn('Falha ao sincronizar identidade white label:', e);
    }
    aplicarIdentidadeEmpresa();
    showToast(sincronizado ? 'Dados da empresa salvos e sincronizados.' : 'Dados salvos neste navegador. Aplique a migration para sincronizar no Supabase.');
}

function restaurarIdentidadePadrao() {
    if (!confirm('Restaurar o nome e as cores padrão do CRM?')) return;
    empresaAtual = { ...WHITE_LABEL_DEFAULTS };
    localStorage.setItem(whiteLabelStorageKey(), JSON.stringify(empresaAtual));
    renderizarEmpresaAdmin();
    aplicarIdentidadeEmpresa();
    showToast('Identidade padrão restaurada.');
}
