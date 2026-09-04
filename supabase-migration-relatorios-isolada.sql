-- ============================================================
-- MIGRATION ISOLADA — NOVO CONTROLE DE RELATÓRIOS (rpt_*)
-- ============================================================
-- Objetivo: adicionar SOMENTE tabelas novas para a camada de
-- relatórios avançados, sem alterar nenhuma tabela ou função
-- existente do Supabase (leads, profiles, autorizacoes_pedido,
-- Edge Functions, RLS atuais).
--
-- SEGURANÇA: execute primeiro em projeto de homologação, com
-- backup, antes de aplicar em produção.
--
-- Esta migration:
--  - Cria as tabelas rpt_report_snapshots e rpt_commission_ledger
--  - Aplica políticas RLS próprias, sem tocar nas políticas atuais
--  - Não altera, renomeia nem remove tabelas existentes
--  - Não cria foreign keys para leads.id (usamos texto simples)
-- ============================================================

-- ============================================================
-- 1. TABELA DE SNAPSHOTS DE RELATÓRIOS
-- ============================================================
-- Guarda o histórico de geração dos relatórios avançados para
-- comparação de períodos sem recalcular tudo na hora.
CREATE TABLE IF NOT EXISTS public.rpt_report_snapshots (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id uuid,
    papel_usuario text NOT NULL DEFAULT 'vendedor',
    dados jsonb NOT NULL DEFAULT '{}'::jsonb,
    periodo_informe text DEFAULT '',
    criado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rpt_report_snapshots
    ADD CONSTRAINT rpt_report_snapshots_pkey PRIMARY KEY (id);

-- ============================================================
-- 2. TABELA DE LANÇAMENTOS DE COMISSÃO (camada de relatórios)
-- ============================================================
-- Registro exclusivo e independente para controle de comissões
-- nos relatórios: percentual confirmado, pagamentos parciais e
-- quitação integral. Não depende do módulo de pedidos existente.
CREATE TABLE IF NOT EXISTS public.rpt_commission_ledger (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id uuid,
    lead_id text NOT NULL DEFAULT '',
    pedido_id text DEFAULT '',
    empresa text DEFAULT '',
    valor_pedido numeric DEFAULT 0,
    percentual_confirmado numeric DEFAULT 0,
    valor_comissao numeric DEFAULT 0,
    comissao_confirmada boolean DEFAULT false,
    valor_pago numeric DEFAULT 0,
    status_pagamento text DEFAULT 'Pendente',
    observacao text DEFAULT '',
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rpt_commission_ledger
    ADD CONSTRAINT rpt_commission_ledger_pkey PRIMARY KEY (id);

-- ============================================================
-- 3. ROW LEVEL SECURITY (somente para as tabelas novas)
-- ============================================================
ALTER TABLE public.rpt_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpt_commission_ledger ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3.1 Snapshots: cada login vê e salva os próprios registros;
--     administradores enxergam todos os snapshots.
-- ============================================================
CREATE POLICY IF NOT EXISTS rpt_snapshots_select_policy
    ON public.rpt_report_snapshots
    FOR SELECT
    USING (
        usuario_id = auth.uid()
        OR (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY IF NOT EXISTS rpt_snapshots_insert_policy
    ON public.rpt_report_snapshots
    FOR INSERT
    WITH CHECK (
        usuario_id = auth.uid()
        OR (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- ============================================================
-- 3.2 Comissões: cada login registra as próprias comissões;
--     administradores podem ver e ajustar todas.
-- ============================================================
CREATE POLICY IF NOT EXISTS rpt_commission_select_policy
    ON public.rpt_commission_ledger
    FOR SELECT
    USING (
        usuario_id = auth.uid()
        OR (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY IF NOT EXISTS rpt_commission_insert_policy
    ON public.rpt_commission_ledger
    FOR INSERT
    WITH CHECK (
        usuario_id = auth.uid()
        OR (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY IF NOT EXISTS rpt_commission_update_policy
    ON public.rpt_commission_ledger
    FOR UPDATE
    USING (
        usuario_id = auth.uid()
        OR (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY IF NOT EXISTS rpt_commission_delete_policy
    ON public.rpt_commission_ledger
    FOR DELETE
    USING (
        (SELECT papel FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
