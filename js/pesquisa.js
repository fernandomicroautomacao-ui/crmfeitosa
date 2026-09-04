// ============================================
// PESQUISA
// ============================================
function abrirPesquisa(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para pesquisar este lead.', 'error');
        return;
    }

    const empresa = lead.empresa || '';
    const localizacao = `${lead.cidade || ''} ${lead.estado || ''}`.trim();
    const empresaLocalQ = encodeURIComponent(`${empresa} ${localizacao}`.trim());
    const empresaQ = encodeURIComponent(empresa);
    const telefoneRaw = lead.telefone || lead.whatsapp || '';
    const cnpjDigits = (lead.codigoUnico || '').replace(/\D/g, '');

    document.getElementById('pesquisaEmpresaNome').textContent = empresa || 'lead sem nome';

    const links = [
        { icone: 'site', label: 'Google', url: `https://www.google.com/search?q=${empresaLocalQ}` },
        { icone: 'mapa', label: 'Google Maps', url: `https://www.google.com/maps/search/${empresaLocalQ}` },
        { icone: 'maleta', label: 'LinkedIn', url: `https://www.linkedin.com/search/results/companies/?keywords=${empresaQ}` },
        { icone: 'camera', label: 'Instagram', url: `https://www.google.com/search?q=${empresaQ}+site:instagram.com` },
        { icone: 'jornal', label: 'Notícias', url: `https://www.google.com/search?q=${empresaQ}&tbm=nws` },
        { icone: 'estrela', label: 'Reclame Aqui', url: `https://www.google.com/search?q=${empresaQ}+site:reclameaqui.com.br` }
    ];

    if (telefoneRaw) {
        links.splice(1, 0, {
            icone: 'telefone',
            label: 'Telefone',
            url: `https://www.google.com/search?q=${encodeURIComponent('"' + telefoneRaw + '"')}`
        });
    }

    if (cnpjDigits.length >= 11) {
        links.push({
            icone: 'predio',
            label: 'CNPJ (cnpja.com.br)',
            url: `https://www.google.com/search?q=${encodeURIComponent(cnpjDigits)}+site:cnpja.com.br`
        });
    }

    document.getElementById('pesquisaLinks').innerHTML = links.map(l => `
        <a href="${l.url}" target="_blank" rel="noopener" class="cliente-action-btn">
            <span class="icon" data-icone="${l.icone}"></span><span class="label">${l.label}</span>
        </a>
    `).join('');

    abrirModal('pesquisaModal');
}
