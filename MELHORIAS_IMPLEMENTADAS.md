# Feitosa CRM — pacote de funcionalidades ampliado

## Status

Esta versão foi preparada localmente para revisão. **Nenhum deploy foi realizado na Netlify e nenhuma migration foi executada automaticamente no Supabase.**

## Funcionalidades adicionadas

### Experiência e navegação

A navegação foi organizada por grupos e recebeu as áreas **Central 360º**, **Financeiro e Comissões** e **Automação e IA**. O dashboard conta com ações rápidas, menu móvel, identificação de perfil e melhor orientação para o primeiro passo.

### Central 360º

A Central reúne busca por empresa, CNPJ, telefone, WhatsApp, e-mail e decisor, filtros por potencial e etapa, ficha comercial, dados de contato, valor da oportunidade, últimas atividades, recomendação de próxima ação e acesso rápido à edição e ao registro de atividade.

### CNPJ

O cadastro ganhou campo de CNPJ e consulta opcional a uma fonte pública para preencher razão social, município, UF, telefone e e-mail. A consulta é feita somente quando o usuário clica em **Consultar**; se estiver indisponível, o preenchimento manual continua funcionando.

### Financeiro e comissões

Foi adicionado um painel local com faturamento, pedidos, pendências e comissão prevista. O percentual padrão é configurável e a área permite exportar a relação de pedidos e comissões em CSV.

### Automação comercial

Foi adicionada a criação de cadências com etapas configuráveis, exclusão, listagem e uma recomendação heurística de próxima ação baseada no estágio, potencial e atividade do lead.

### Backup e auditoria

A Administração ganhou backup JSON local, restauração com confirmação e auditoria local das criações, atualizações, atividades, exportações e restaurações. O backup local não substitui o backup do Supabase.

### PWA

Foi preparado manifesto, ícones e service worker para instalação como aplicativo. O service worker não cacheia endpoints de autenticação ou dados do Supabase.

### Banco de dados

O arquivo `supabase-migration-v1.sql` contém a estrutura preparada para empresas, atividades, comunicações, modelos, campanhas, metas, comissões, anexos, auditoria e cadências, incluindo índices e políticas RLS conservadoras.

## Limitações e pontos de revisão

Os leads continuam utilizando a estrutura existente do projeto. Modelos, campanhas, metas e parte dos históricos ainda podem estar no `localStorage`; a migration SQL apenas prepara as tabelas e não migra dados automaticamente.

A recomendação chamada de “IA” nesta versão é uma regra local baseada em dados do lead. A integração real com um provedor de IA exige uma função backend segura, variável de ambiente e definição de política de privacidade.

A consulta de CNPJ depende da disponibilidade da API pública e deve ser revisada quanto a limites, termos de uso e tratamento de indisponibilidade antes de uso intensivo.

As políticas RLS do SQL devem ser conferidas contra os nomes reais das colunas e papéis do Supabase antes de execução. Faça backup do banco e teste em um projeto de homologação.

## Roteiro de revisão

1. Abrir `index.html` em um servidor local ou em um preview da Netlify.
2. Testar login como administrador e como vendedor.
3. Criar um lead com CNPJ e validar o preenchimento automático.
4. Abrir a Central 360º, pesquisar por empresa/CNPJ e registrar atividade.
5. Conferir pedidos, comissões, exportação CSV e backup JSON.
6. Criar uma cadência e testar a abertura em celular.
7. Revisar a migration SQL antes de qualquer execução no Supabase.
8. Somente após aprovação, publicar os arquivos em produção.


## Correção da Central 360º e comissões — revisão adicional

A Central 360º foi corrigida para usar o array global real de leads, que é declarado no estado da aplicação e não em `window.leads`. O detalhe da empresa agora é selecionado dentro dos leads visíveis ao usuário, respeitando a regra de administrador e vendedor.

O controle financeiro agora exige confirmação por pedido. O sistema exibe o percentual padrão como sugestão, informa quando a comissão ainda não foi confirmada, permite alterar percentual e valor confirmado, bloqueia o registro de pagamento antes da confirmação e aceita vários pagamentos até atingir o valor total. O status passa a ser **Pendente**, **Parcial** ou **Integral**, com saldo restante e exportação CSV detalhada.

O CNPJ também foi incluído no mapeamento de persistência. Enquanto a migration não for aplicada, o salvamento possui compatibilidade de fallback para não impedir o restante dos dados; depois da aplicação da migration, o CNPJ passará a ser persistido normalmente.

### Teste específico recomendado

Crie ou abra um pedido, acesse **Financeiro e Comissões**, confirme um percentual e um valor diferentes do padrão, registre um pagamento menor que a comissão e verifique o status **Parcial**. Em seguida, registre o saldo restante e confirme o status **Integral**. Também abra **Central 360º**, pesquise pela empresa e selecione outros registros na lista.


## Adaptação ao schema real do Supabase

A migration foi ajustada para refletir a estrutura fornecida: `public.leads.id` é `text`, portanto os campos `lead_id` de atividades, comunicações, comissões e anexos agora também são `text`. O identificador `pedido_id` foi mantido como `text`, pois os pedidos atuais são objetos JSONB dentro da coluna `leads.pedidos` e não possuem tabela própria. A coluna `leads.cnpj` é adicionada de forma segura com `if not exists`.

A aplicação mantém fallback de salvamento para instalações que ainda não aplicaram a coluna CNPJ. Nesse caso, os demais dados continuam sendo salvos e o usuário recebe um aviso para aplicar a migration antes de exigir persistência do CNPJ.


## White label por login

Foi adicionada a seção **Identidade da Empresa** ao painel de Administração. O administrador pode informar nome, nome curto, CNPJ, e-mail comercial, telefone, site, endereço, cidade, estado, cores e logotipo da empresa.

A identidade é aplicada ao título da página, nome do menu, logotipo exibido no sistema, favicon, tema e documentos de orçamento e relatório. O favicon padrão está em `assets/favicon.svg`; quando o administrador envia um logotipo, ele passa a ser usado como ícone dinâmico da sessão.

A aplicação salva localmente por usuário e tenta sincronizar no Supabase pela tabela `company_settings`. A migration dessa tabela está no arquivo `supabase-migration-v1.sql`. Sem executar a migration, a identidade continua funcional neste navegador por meio do fallback local; depois da migration, ela poderá ser carregada do banco para o login.

O pacote continua preparado apenas para revisão local. Nenhuma alteração foi executada no Supabase e nenhum deploy foi realizado na Netlify.


## CAMADA ISOLADA DE RELATÓRIOS (rpt_*)

Nova apresentação de relatórios adicionada sem interferir em nada do que já roda:

- Novo módulo `js/relatorios-avancados.js` com painel de KPIs hierarquizados, evolução mensal (12 meses), funil de conversão por etapa, ranking de vendedores, motivos de perda e alertas comerciais.
- Visão alternável: painel de análises <-> relatório detalhado original (`relAvanAlternarVisao`).
- Períodos estendidos: Hoje, Últimos 7 dias, Este mês, Últimos 3 meses, Este ano e Todos (`relAvanGetRangePeriodo`, sem alterar `getRangePeriodo` original).
- Meta mensal configurável por usuário, salva em localStorage.
- Snapshot de relatórios em localStorage e, quando o Supabase permitir, na tabela nova `rpt_report_snapshots`.
- `supabase-migration-relatorios-isolada.sql`: cria SOMENTE `rpt_report_snapshots` e `rpt_commission_ledger`, com RLS próprio, sem alterar tabelas/RLS existentes e sem foreign keys.
- CSS novo prefixado `.rel-` para não conflitar com estilos existentes.
- O frontend já usa as chaves anon com RLS; a migration segue esse modelo.
