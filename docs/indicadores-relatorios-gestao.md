# Indicadores de relatórios de gestão

## Escopo implementado

A nova visão de gestão usa os dados já armazenados pelo CRM e respeita o período e o vendedor selecionados. Foram incorporados o valor do pipeline em aberto, ticket médio, evolução de pedidos, conversão, ranking de vendedores, motivos detalhados de perda, oportunidades estagnadas, touchpoints médios, atividades por canal, tarefas executadas e pendentes, distribuição geográfica e curva ABC de clientes.

Também foram adicionados dois blocos de gestão: **Saúde do pipeline**, que mostra idade média dos cards, cobertura de próxima ação e atrasos por etapa; e **Potencial x pipeline**, que estima o valor provável usando pesos de 80% para potencial A, 50% para B e 20% para C.

## Regras de cálculo

| Indicador | Regra aplicada |
|---|---|
| Win rate | Pedidos fechados divididos por pedidos fechados mais perdas cuja etapa de origem era Orçamento. |
| Loss rate | Perdas cuja etapa de origem era Orçamento divididas pelo total de decisões de proposta. |
| Touchpoints médios | Interações do histórico, excluindo movimentos de etapa, divididas pela quantidade de pedidos. |
| Negócio estagnado | Lead ativo sem interação recente há mais de 30 dias. |
| Execução de tarefas | Tarefas com descrição de conclusão ou execução divididas pelo total de tarefas executadas mais pendentes. |
| Curva ABC | Clientes ordenados pelo faturamento acumulado; a faixa é atribuída pela posição acumulada antes de cada cliente, evitando classificar uma carteira de um único cliente como C. |
| Distribuição geográfica | Agrupamento por cidade/UF, com quantidade de leads, pedidos e valor vendido. |
| Potencial provável | Pipeline aberto ponderado por potencial: A 80%, B 50% e C 20%. |

## Indicadores que dependem de novos dados

A lista anexada também cita CAC, LTV, relação LTV/CAC, churn, revenue churn, MRR, expansão, NPS, ROI de campanhas, MQL para SQL, tempo de primeira resposta, no-show, produto/serviço e auditoria imutável. Esses indicadores não foram inventados nem estimados porque a base atual não possui, de forma confiável, custo de aquisição, contratos recorrentes, cancelamentos, pesquisa NPS, investimento por campanha, timestamps de primeira resposta, presença em reuniões, itens de produto ou trilha imutável de alterações.

Para disponibilizá-los corretamente, o CRM precisará receber campos e eventos específicos. A implementação atual deixa os indicadores suportados prontos sem modificar o modelo de dados financeiro ou comercial existente.
