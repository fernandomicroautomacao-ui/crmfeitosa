// ============================================
// CONFIGURAÇÃO - SUBSTITUA COM SEUS DADOS
// ============================================
const CONFIG = {
    // Supabase (autenticação e leads)
    SUPABASE_URL: 'https://gewoitwpwlizavmmcrll.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_i6tZP_a2Ebrk6nKNvOWWXQ_BPG0LGvk',

    // Gmail API
    GMAIL_CLIENT_ID: '31724700389-ie9j72drc8m54hk6mok150rma8vt81ue.apps.googleusercontent.com',
    GMAIL_SCOPES: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',

    // Outlook API (Microsoft Graph)
    OUTLOOK_CLIENT_ID: '80818cbe-ea94-4d12-8c7d-95ac7bb9fbc6',
    OUTLOOK_TENANT_ID: 'c6c088c6-5ed6-4bcb-b777-56b0608011ad',
    OUTLOOK_SCOPES: 'openid profile email Mail.Send Mail.Read',
    OUTLOOK_REDIRECT_URI: window.location.origin + '/callback',

    // WhatsApp (via link wa.me - sem necessidade de token/API)
    WHATSAPP_COUNTRY_CODE: '55'
};

// ============================================
// CONSTANTES DE DOMÍNIO
// ============================================
const CLASSIFICACOES_LEAD = [
    { id: 'consumidor', label: 'Consumidor', cor: '#1e7b85', bg: 'rgba(30, 123, 133, 0.15)' },
    { id: 'revendedor', label: 'Revendedor', cor: '#2f7d5b', bg: 'rgba(47, 125, 91, 0.15)' },
    { id: 'distribuidor', label: 'Distribuidor', cor: '#a9761f', bg: 'rgba(169, 118, 31, 0.15)' },
    { id: 'industrializacao', label: 'Industrialização', cor: '#7b4397', bg: 'rgba(123, 67, 151, 0.15)' },
    { id: 'outros', label: 'Outros', cor: '#607286', bg: 'rgba(96, 114, 134, 0.15)' }
];

const CLASSIFICACAO_NOMES = {
    consumidor: 'Consumidor',
    revendedor: 'Revendedor',
    distribuidor: 'Distribuidor',
    industrializacao: 'Industrialização',
    outros: 'Outros'
};

const ETAPAS = [
    { id: 'leads', label: 'Leads', cor: '#2d4863' },
    { id: 'qualificacao', label: 'Qualificação', cor: '#3c6e91' },
    { id: 'oportunidades', label: 'Oportunidades', cor: '#a9761f' },
    { id: 'orcamento', label: 'Orçamento', cor: '#8a5a3c' },
    { id: 'pedido', label: 'Pedido', cor: '#2f7d5b' }
];

const ETAPA_NOMES = {
    leads: 'Leads',
    qualificacao: 'Qualificação',
    oportunidades: 'Oportunidades',
    orcamento: 'Orçamento',
    pedido: 'Pedido'
};

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Dias sem nenhum contato (ligação, e-mail ou WhatsApp) até um cliente ser considerado atrasado
const DIAS_LIMITE_CONTATO = {
    A: 10,
    B: 20,
    C: 35
};

const CSV_MAP = {
    'empresa': 'empresa',
    'codigounico': 'codigoUnico',
    'codigo_unico': 'codigoUnico',
    'codigo': 'codigoUnico',
    'cidade': 'cidade',
    'estado': 'estado',
    'telefone': 'telefone',
    'whatsapp': 'whatsapp',
    'email': 'email',
    'decisor': 'decisor',
    'valor': 'valor',
    'potencial': 'potencial',
    'etapa': 'etapa',
    'classificacao': 'classificacao',
    'classificação': 'classificacao',
    'tipo': 'classificacao',
    'categoria': 'classificacao',
    'observacoes': 'observacoes',
    'observacao': 'observacoes'
};
