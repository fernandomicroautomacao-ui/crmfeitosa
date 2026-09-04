// ============================================
// CLIENTE SUPABASE
// ============================================
// Ponto único de acesso ao Supabase. Em testes automatizados, uma página pode
// injetar window.__SUPABASE_MOCK__ antes deste script rodar para substituir o
// cliente real por um mock (sem precisar de rede).
const supabaseClient = window.__SUPABASE_MOCK__
    || supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
