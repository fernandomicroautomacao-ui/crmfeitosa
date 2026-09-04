// ============================================
// AUTENTICAÇÃO OUTLOOK API (Microsoft Graph)
// ============================================
function carregarMSAL() {
    return new Promise((resolve) => {
        if (typeof msal !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

async function initOutlookMsal() {
    try {
        await carregarMSAL();

        if (CONFIG.OUTLOOK_CLIENT_ID === 'SEU_CLIENT_ID_OUTLOOK_AQUI') {
            showToast('Configure o OUTLOOK_CLIENT_ID no código!', 'warning');
            mostrarGuiaConfig();
            return false;
        }

        msalInstance = new msal.PublicClientApplication({
            auth: {
                clientId: CONFIG.OUTLOOK_CLIENT_ID,
                authority: `https://login.microsoftonline.com/${CONFIG.OUTLOOK_TENANT_ID || 'common'}`,
                redirectUri: CONFIG.OUTLOOK_REDIRECT_URI
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: true
            }
        });

        return true;
    } catch (error) {
        console.error('Erro ao inicializar Outlook:', error);
        showToast('Erro ao inicializar Outlook: ' + error.message, 'error');
        return false;
    }
}

async function conectarOutlook() {
    const btn = document.getElementById('btnOutlook');
    btn.textContent = 'Conectando...';
    btn.disabled = true;

    try {
        const init = await initOutlookMsal();
        if (!init) {
            btn.textContent = 'Conectar';
            btn.disabled = false;
            return;
        }

        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            const response = await msalInstance.acquireTokenSilent({
                scopes: ['openid', 'profile', 'email', 'Mail.Send', 'Mail.Read'],
                account: accounts[0]
            });
            salvarTokenOutlook(response);
            showToast('Outlook já está conectado!', 'success');
            renderizarMarketing();
            btn.textContent = 'Conectar';
            btn.disabled = false;
            return;
        }

        const request = {
            scopes: ['openid', 'profile', 'email', 'Mail.Send', 'Mail.Read'],
            prompt: 'select_account'
        };

        const response = await msalInstance.loginPopup(request);
        salvarTokenOutlook(response);
        showToast('Outlook conectado com sucesso!');
        renderizarMarketing();

    } catch (error) {
        console.error('Erro ao conectar Outlook:', error);
        showToast('Erro ao conectar Outlook: ' + error.message, 'error');
    }

    btn.textContent = 'Conectar';
    btn.disabled = false;
}

function salvarTokenOutlook(response) {
    localStorage.setItem('outlook_access_token', response.accessToken);
    localStorage.setItem('outlook_token_expiry', Date.now() + (response.expiresIn * 1000));
    localStorage.setItem('ploomes_outlook_connected', 'true');
    localStorage.setItem('outlook_user_email', response.account?.username || '');
    document.getElementById('outlookUserEmail').textContent = response.account?.username || 'Conectado';
}

async function enviarEmailOutlookReal(destinatario, assunto, corpo) {
    const token = localStorage.getItem('outlook_access_token');
    const expiry = parseInt(localStorage.getItem('outlook_token_expiry') || '0');

    if (!token || Date.now() >= expiry) {
        showToast('Token Outlook expirado. Reconecte-se.', 'warning');
        await conectarOutlook();
        return null;
    }

    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    subject: assunto,
                    body: {
                        contentType: 'Text',
                        content: corpo
                    },
                    toRecipients: [{ emailAddress: { address: destinatario } }]
                },
                saveToSentItems: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erro ao enviar email');
        }

        return { success: true, messageId: Date.now() };

    } catch (error) {
        console.error('Erro ao enviar Outlook:', error);
        showToast('Erro ao enviar: ' + error.message, 'error');
        return null;
    }
}
