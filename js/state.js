// ============================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================
let leads = [];
let modelos = [];
let campanhas = [];
let emailLog = [];
let modelosWhatsapp = [];
let whatsappLog = [];
let whatsappCampanhas = [];
let whatsappOptOut = [];
let whatsappConsentimentos = {};
let whatsappFilaAtual = null;
let perdidos = [];
let usuarios = [];
let usuarioAtual = null;
let currentDrag = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let metas = {};
let relPeriodoTipo = 'mes';
let relPeriodoOffset = 0;
let relFiltroUsuarioId = ''; // filtro por vendedor, exclusivo da aba Relatórios (admin)
let perdidosFiltroPeriodoTipo = 'todos'; // período aplicado à lista/relatório de Perdidos
let perdidosFiltroMotivo = ''; // motivo aplicado à lista/relatório de Perdidos
let ultimoRelatorio = null; // cache do último relatório renderizado, usado pela impressão
let filtroAdminUsuarioId = ''; // armazena o ID do usuário selecionado no filtro admin

// Estado do editor de itens/orçamento
let itensEditLeadId = null;
let itensEditLista = [];
let itemEmEdicaoIndex = -1;
let itensEditAnexos = []; // [{ nome, tipo, dataUrl }] anexos do orçamento/pedido

// Estado da pré-visualização de importação CSV
let csvImportPendente = null;
let csvImportErros = 0;

// Estado das integrações de email
let gapiLoaded = false;
let tokenClient = null;
let msalInstance = null;

// Estado do Coletor de Leads
let coletorListas = [];
let coletorListaAtivaId = null;
let coletorSelecionados = new Set();
let coletorChamadaIndex = null;
let coletorPaginaAtual = 1;
const COLETOR_ITENS_POR_PAGINA = 50;

// Segmentos-alvo salvos para a busca no Google Maps (editáveis pelo usuário)
let segmentosBusca = [];
