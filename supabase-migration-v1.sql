-- Feitosa CRM — estrutura preparada para migração gradual
-- IMPORTANTE: revisar e executar no Supabase somente após backup e validação das políticas.

create extension if not exists pgcrypto;

-- Compatibilidade com a tabela leads existente do CRM.
alter table if exists public.leads add column if not exists cnpj text;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  codigo_unico text unique not null,
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  inscricao_estadual text,
  telefone text,
  whatsapp text,
  email text,
  decisor text,
  cidade text,
  estado text,
  endereco text,
  categoria text,
  potencial text check (potencial in ('A','B','C')) default 'B',
  observacoes text,
  ativo boolean not null default true,
  usuario_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  lead_id text references public.leads(id) on delete cascade,
  usuario_id uuid references public.profiles(id) not null,
  tipo text not null,
  descricao text not null,
  data date not null default current_date,
  hora time,
  status text not null default 'concluida',
  prioridade text not null default 'normal',
  prazo date,
  recorrente boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  lead_id text references public.leads(id) on delete cascade,
  usuario_id uuid references public.profiles(id) not null,
  canal text not null,
  assunto text,
  conteudo text,
  status text default 'registrado',
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id),
  nome text not null,
  assunto text,
  conteudo text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) not null,
  nome text not null,
  template_id uuid references public.email_templates(id),
  status text not null default 'rascunho',
  agendada_para timestamptz,
  total_destinatarios integer not null default 0,
  total_enviados integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id),
  competencia date not null,
  meta_vendas numeric(14,2) not null default 0,
  meta_orcamento numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(usuario_id, competencia)
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  pedido_id text,
  lead_id text references public.leads(id) on delete set null,
  vendedor_id uuid references public.profiles(id) not null,
  valor_base numeric(14,2) not null default 0,
  percentual numeric(6,3) not null default 0,
  valor numeric(14,2) generated always as (valor_base * percentual / 100) stored,
  valor_confirmado numeric(14,2),
  percentual_confirmado numeric(6,3),
  confirmado boolean not null default false,
  valor_pago numeric(14,2) not null default 0,
  status text not null default 'pendente',
  data_pagamento date,
  pagamentos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  lead_id text references public.leads(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  usuario_id uuid references public.profiles(id) not null,
  nome text not null,
  caminho text not null,
  mime_type text,
  tamanho integer,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.profiles(id),
  entidade text not null,
  entidade_id text,
  acao text not null,
  antes jsonb,
  depois jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cadences (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id),
  nome text not null,
  ativa boolean not null default true,
  etapas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_companies_cnpj on public.companies(cnpj);
create index if not exists idx_activities_usuario_prazo on public.activities(usuario_id, prazo, status);
create index if not exists idx_communication_logs_lead on public.communication_logs(lead_id, created_at desc);
create index if not exists idx_audit_logs_entidade on public.audit_logs(entidade, entidade_id, created_at desc);

alter table public.companies enable row level security;
alter table public.activities enable row level security;
alter table public.communication_logs enable row level security;
alter table public.email_templates enable row level security;
alter table public.campaigns enable row level security;
alter table public.goals enable row level security;
alter table public.commissions enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.cadences enable row level security;

-- As policies abaixo são deliberadamente conservadoras. Ajustar nomes de papel
-- se o projeto usar outra convenção. O administrador tem acesso geral; vendedor
-- trabalha apenas com registros próprios.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.papel = 'admin') $$;

create policy companies_select on public.companies for select to authenticated using (public.is_admin() or usuario_id = auth.uid());
create policy companies_write on public.companies for all to authenticated using (public.is_admin() or usuario_id = auth.uid()) with check (public.is_admin() or usuario_id = auth.uid());
create policy activities_select on public.activities for select to authenticated using (public.is_admin() or usuario_id = auth.uid());
create policy activities_write on public.activities for all to authenticated using (public.is_admin() or usuario_id = auth.uid()) with check (public.is_admin() or usuario_id = auth.uid());
create policy communication_select on public.communication_logs for select to authenticated using (public.is_admin() or usuario_id = auth.uid());
create policy communication_write on public.communication_logs for all to authenticated using (public.is_admin() or usuario_id = auth.uid()) with check (public.is_admin() or usuario_id = auth.uid());
create policy templates_access on public.email_templates for all to authenticated using (public.is_admin() or usuario_id = auth.uid() or usuario_id is null) with check (public.is_admin() or usuario_id = auth.uid() or usuario_id is null);
create policy campaigns_access on public.campaigns for all to authenticated using (public.is_admin() or usuario_id = auth.uid()) with check (public.is_admin() or usuario_id = auth.uid());
create policy goals_access on public.goals for all to authenticated using (public.is_admin() or usuario_id = auth.uid() or usuario_id is null) with check (public.is_admin() or usuario_id = auth.uid() or usuario_id is null);
create policy commissions_access on public.commissions for all to authenticated using (public.is_admin() or vendedor_id = auth.uid()) with check (public.is_admin() or vendedor_id = auth.uid());
create policy attachments_access on public.attachments for all to authenticated using (public.is_admin() or usuario_id = auth.uid()) with check (public.is_admin() or usuario_id = auth.uid());
create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin() or usuario_id = auth.uid());
create policy audit_insert on public.audit_logs for insert to authenticated with check (public.is_admin() or usuario_id = auth.uid());
create policy cadences_access on public.cadences for all to authenticated using (public.is_admin() or usuario_id = auth.uid() or usuario_id is null) with check (public.is_admin() or usuario_id = auth.uid() or usuario_id is null);


-- ============================================================
-- WHITE LABEL POR LOGIN
-- Compatível com public.profiles.id uuid do schema existente.
-- A aplicação mantém fallback local até esta migration ser aplicada.
-- ============================================================
create table if not exists public.company_settings (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  nome text not null default 'Feitosa CRM',
  nome_curto text not null default 'Feitosa',
  cnpj text default '',
  email text default '',
  telefone text default '',
  site text default '',
  endereco text default '',
  cidade text default '',
  estado text default '',
  logo_data_url text,
  cor_primaria text not null default '#22384d',
  cor_destaque text not null default '#2f7d5b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

drop policy if exists "company_settings_select_owner" on public.company_settings;
create policy "company_settings_select_owner"
  on public.company_settings for select
  using (owner_id = auth.uid());

drop policy if exists "company_settings_insert_owner" on public.company_settings;
create policy "company_settings_insert_owner"
  on public.company_settings for insert
  with check (owner_id = auth.uid());

drop policy if exists "company_settings_update_owner" on public.company_settings;
create policy "company_settings_update_owner"
  on public.company_settings for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "company_settings_delete_owner" on public.company_settings;
create policy "company_settings_delete_owner"
  on public.company_settings for delete
  using (owner_id = auth.uid());
