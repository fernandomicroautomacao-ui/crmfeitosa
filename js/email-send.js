// ============================================
// VERIFICAR TOKENS SALVOS
// ============================================
function verificarTokensSalvos() {
    // Gmail
    const gmailToken = localStorage.getItem('gmail_access_token');
    const gmailExpiry = parseInt(localStorage.getItem('gmail_token_expiry') || '0');
    const gmailEmail = localStorage.getItem('gmail_user_email') || 'Não conectado';

    if (gmailToken && Date.now() < gmailExpiry) {
        document.getElementById('gmailUserEmail').textContent = gmailEmail;
        document.getElementById('gmailStatus').className = 'integration-status connected';
        document.getElementById('gmailStatus').innerHTML = '<span class="status-dot online"></span> Conectado';
        document.getElementById('btnGmail').textContent = 'Conectado';
    }

    // Outlook
    const outlookToken = localStorage.getItem('outlook_access_token');
    const outlookExpiry = parseInt(localStorage.getItem('outlook_token_expiry') || '0');
    const outlookEmail = localStorage.getItem('outlook_user_email') || 'Não conectado';

    if (outlookToken && Date.now() < outlookExpiry) {
        document.getElementById('outlookUserEmail').textContent = outlookEmail;
        document.getElementById('outlookStatus').className = 'integration-status connected';
        document.getElementById('outlookStatus').innerHTML = '<span class="status-dot online"></span> Conectado';
        document.getElementById('btnOutlook').textContent = 'Conectado';
    }
}

// ============================================
// FUNÇÃO DE ENVIO (HÍBRIDA)
// ============================================
async function enviarEmail(event) {
    event.preventDefault();

    const leadId = document.getElementById('envioLeadId').value;
    const email = document.getElementById('envioEmail').value.trim();
    const assunto = document.getElementById('envioAssunto').value.trim();
    const conteudo = document.getElementById('envioConteudo').value.trim();
    const provedor = document.getElementById('envioProvedor').value;
    const salvarHist = document.getElementById('envioSalvarHistorico').checked;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
        showToast('Lead não encontrado!', 'error');
        return;
    }

    // Verificar permissão: admin ou dono
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para enviar email deste lead.', 'error');
        return;
    }

    if (!email || !assunto || !conteudo) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }

    let result = null;

    if (provedor === 'google') {
        const conectado = localStorage.getItem('ploomes_google_connected') === 'true';
        if (!conectado) {
            showToast('Conecte-se ao Gmail primeiro!', 'warning');
            await conectarGmail();
            return;
        }
        result = await enviarEmailGmailReal(email, assunto, conteudo);
    } else if (provedor === 'outlook') {
        const conectado = localStorage.getItem('ploomes_outlook_connected') === 'true';
        if (!conectado) {
            showToast('Conecte-se ao Outlook primeiro!', 'warning');
            await conectarOutlook();
            return;
        }
        result = await enviarEmailOutlookReal(email, assunto, conteudo);
    } else if (provedor === 'mailto') {
        result = enviarEmailMailto(email, assunto, conteudo);
    } else if (provedor === 'outlook-web') {
        result = enviarEmailOutlookWeb(email, assunto, conteudo);
    }

    if (result) {
        const manual = ehEnvioManual(provedor);
        const log = {
            id: gerarId(),
            data: hoje(),
            hora: new Date().toTimeString().slice(0, 5),
            leadId: lead.id,
            empresa: lead.empresa,
            email: email,
            assunto: assunto,
            campanha: 'Envio Rápido',
            provedor: provedor,
            status: manual ? 'manual' : 'enviado',
            messageId: result.id || result.messageId || 'N/A',
            usuarioId: usuarioAtual.id
        };
        emailLog.unshift(log);

        if (salvarHist) {
            if (!lead.historico) lead.historico = [];
            lead.historico.push({
                data: hoje(),
                hora: new Date().toTimeString().slice(0, 5),
                tipo: manual ? 'Email (manual)' : 'Email (API)',
                descricao: `Email ${manual ? 'aberto para envio manual' : 'enviado'} para ${email} via ${nomeProvedorEmail(provedor)} - Assunto: ${assunto}`
            });
        }

        salvarDados();
        fecharModal('envioModal');
        renderizarAll();
        showToast(manual
            ? `${nomeProvedorEmail(provedor)} foi aberto para enviar a ${lead.empresa}. Confirme o envio lá.`
            : `Email enviado para ${lead.empresa} via ${nomeProvedorEmail(provedor)}!`);
    }
}

// ============================================
// ENVIO "MANUAL" (mailto ou Outlook na Web — sem necessidade de login/API)
// Não depende de consentimento de administrador do Microsoft 365.
// ============================================
function ehEnvioManual(provedor) {
    return provedor === 'mailto' || provedor === 'outlook-web';
}

function enviarEmailMailto(destinatario, assunto, corpo) {
    const link = `mailto:${destinatario}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = link;
    return { success: true, messageId: 'manual' };
}

// Abre a caixa de compor do Outlook direto no navegador (não depende do app
// desktop do Outlook nem do handler padrão de mailto: do sistema operacional).
function enviarEmailOutlookWeb(destinatario, assunto, corpo) {
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(destinatario)}&subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.open(url, '_blank');
    return { success: true, messageId: 'manual-web' };
}

function nomeProvedorEmail(provedor) {
    if (provedor === 'google') return 'Gmail';
    if (provedor === 'mailto') return 'E-mail (manual)';
    if (provedor === 'outlook-web') return 'Outlook na Web';
    return 'Outlook';
}

// ============================================
// ABRIR ENVIO
// ============================================
function abrirEnvioEmail(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Verificar permissão
    if (usuarioAtual.papel !== 'admin' && lead.usuarioId !== usuarioAtual.id) {
        showToast('Você não tem permissão para enviar email deste lead.', 'error');
        return;
    }

    document.getElementById('envioLeadId').value = leadId;
    document.getElementById('envioEmpresa').textContent = lead.empresa;
    document.getElementById('envioEmail').value = lead.email || '';

    const select = document.getElementById('envioModelo');
    select.innerHTML = '<option value="">Selecionar modelo</option>' +
        modelos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');

    document.getElementById('envioAssunto').value = '';
    document.getElementById('envioConteudo').value = '';

    abrirModal('envioModal');
}

function previsualizarEnvio() {
    const modeloId = document.getElementById('envioModelo').value;
    const leadId = document.getElementById('envioLeadId').value;
    const lead = leads.find(l => l.id === leadId);

    if (!modeloId || !lead) return;

    const modelo = modelos.find(m => m.id === modeloId);
    if (!modelo) return;

    const classifTexto = typeof CLASSIFICACAO_NOMES !== 'undefined' && CLASSIFICACAO_NOMES[lead.classificacao] ? CLASSIFICACAO_NOMES[lead.classificacao] : (lead.classificacao || 'Outros');
    let assunto = modelo.assunto
        .replace(/\{\{empresa\}\}/g, lead.empresa || '')
        .replace(/\{\{decisor\}\}/g, lead.decisor || '')
        .replace(/\{\{valor\}\}/g, formatarMoeda(lead.valor || 0))
        .replace(/\{\{email\}\}/g, lead.email || '')
        .replace(/\{\{telefone\}\}/g, lead.telefone || '')
        .replace(/\{\{classificacao\}\}/g, classifTexto);

    let conteudo = modelo.conteudo
        .replace(/\{\{empresa\}\}/g, lead.empresa || '')
        .replace(/\{\{decisor\}\}/g, lead.decisor || '')
        .replace(/\{\{valor\}\}/g, formatarMoeda(lead.valor || 0))
        .replace(/\{\{email\}\}/g, lead.email || '')
        .replace(/\{\{telefone\}\}/g, lead.telefone || '')
        .replace(/\{\{classificacao\}\}/g, classifTexto);

    document.getElementById('envioAssunto').value = assunto;
    document.getElementById('envioConteudo').value = conteudo;
}
