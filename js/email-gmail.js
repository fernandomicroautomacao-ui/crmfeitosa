// ============================================
// AUTENTICAÇÃO GMAIL API
// ============================================
function carregarGapi() {
    return new Promise((resolve) => {
        if (typeof gapi !== 'undefined' && gapi.client) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client', resolve);
        };
        document.head.appendChild(script);
    });
}

function carregarGSI() {
    return new Promise((resolve) => {
        if (typeof google !== 'undefined' && google.accounts) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

async function initGmailTokenClient() {
    try {
        await carregarGSI();
        await carregarGapi();

        if (CONFIG.GMAIL_CLIENT_ID === 'SEU_CLIENT_ID_GOOGLE_AQUI') {
            showToast('Configure o GMAIL_CLIENT_ID no código!', 'warning');
            mostrarGuiaConfig();
            return;
        }

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GMAIL_CLIENT_ID,
            scope: CONFIG.GMAIL_SCOPES,
            callback: async (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error('Erro Gmail:', tokenResponse.error);
                    showToast('Erro na autenticação: ' + tokenResponse.error, 'error');
                    return;
                }

                localStorage.setItem('gmail_access_token', tokenResponse.access_token);
                localStorage.setItem('gmail_token_expiry', Date.now() + (tokenResponse.expires_in * 1000));
                localStorage.setItem('ploomes_google_connected', 'true');

                await buscarInfoUsuarioGmail(tokenResponse.access_token);
                showToast('Gmail conectado com sucesso!');
                renderizarMarketing();
            },
        });

        return true;
    } catch (error) {
        console.error('Erro ao inicializar Gmail:', error);
        showToast('Erro ao inicializar Gmail: ' + error.message, 'error');
        return false;
    }
}

async function buscarInfoUsuarioGmail(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        localStorage.setItem('gmail_user_email', data.email);
        localStorage.setItem('gmail_user_name', data.name);
        document.getElementById('gmailUserEmail').textContent = data.email;
        return data;
    } catch (error) {
        console.error('Erro ao buscar info:', error);
        return null;
    }
}

async function conectarGmail() {
    const btn = document.getElementById('btnGmail');
    btn.textContent = 'Conectando...';
    btn.disabled = true;

    try {
        const init = await initGmailTokenClient();
        if (!init) {
            btn.textContent = 'Conectar';
            btn.disabled = false;
            return;
        }

        const token = localStorage.getItem('gmail_access_token');
        const expiry = parseInt(localStorage.getItem('gmail_token_expiry') || '0');

        if (token && Date.now() < expiry) {
            showToast('Gmail já está conectado!', 'success');
            await buscarInfoUsuarioGmail(token);
            renderizarMarketing();
            btn.textContent = 'Conectar';
            btn.disabled = false;
            return;
        }

        tokenClient.requestAccessToken({ prompt: 'consent' });
        btn.textContent = 'Conectar';
        btn.disabled = false;

    } catch (error) {
        console.error('Erro ao conectar Gmail:', error);
        showToast('Erro: ' + error.message, 'error');
        btn.textContent = 'Conectar';
        btn.disabled = false;
    }
}

async function enviarEmailGmailReal(destinatario, assunto, corpo) {
    const token = localStorage.getItem('gmail_access_token');
    const expiry = parseInt(localStorage.getItem('gmail_token_expiry') || '0');

    if (!token || Date.now() >= expiry) {
        showToast('Token Gmail expirado. Reconecte-se.', 'warning');
        await conectarGmail();
        return null;
    }

    const emailLines = [
        `From: ${localStorage.getItem('gmail_user_email') || 'seu-email@gmail.com'}`,
        `To: ${destinatario}`,
        `Subject: ${assunto}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        corpo
    ];

    const email = emailLines.join('\r\n');
    const base64EncodedEmail = btoa(email)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: base64EncodedEmail })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erro ao enviar email');
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Erro ao enviar Gmail:', error);
        showToast('Erro ao enviar: ' + error.message, 'error');
        return null;
    }
}
