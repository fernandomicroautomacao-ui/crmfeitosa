# Relatórios personalizáveis e inteligência de leads

A aba **Relatórios e Inteligência de Leads** agora utiliza um único período global para todas as análises. O filtro pode ser mensal, trimestral, semestral, anual, todo o período ou personalizado com as datas **De** e **Até**. O período escolhido é aplicado aos KPIs, metas, evolução de vendas, funil, ranking, distribuição por etapa, potencial, orçamento, perdas, exportação CSV, impressão e painel avançado.

## Como usar

Selecione o tipo de período no topo da aba Relatórios. Ao escolher **Personalizado**, informe as duas datas. O sistema grava o último tipo e intervalo usado por usuário e restaura essa seleção quando a aplicação é recarregada. O painel avançado mostra explicitamente o mesmo período geral, evitando que uma parte da tela apresente números de outro intervalo.

A evolução de vendas adapta automaticamente a granularidade. Períodos curtos são divididos por semana; períodos mais longos são apresentados por mês; intervalos muito extensos são consolidados por ano. O CSV exportado inclui a série do intervalo escolhido, os principais indicadores de inteligência e a lista de leads prioritários.

## Indicadores de inteligência

O bloco **Inteligência de leads** foi criado para transformar os relatórios em ações comerciais. Ele mostra a cobertura de contato no intervalo, o percentual de leads ativos com próxima ação definida, o pipeline aberto, a idade média dos leads, a distribuição por potencial, tarefas atrasadas e perdas registradas.

Também é exibida uma lista de até oito leads que merecem atenção. A priorização considera potencial, ausência de próxima ação, ausência de contato recente e tarefas atrasadas. Cada registro apresenta etapa, potencial, valor, próxima data e o motivo operacional para acompanhamento.

| Indicador | Interpretação |
|---|---|
| Cobertura de contato | Percentual de leads do período com ao menos uma atividade registrada dentro do intervalo selecionado. |
| Próxima ação definida | Percentual de leads ativos com ação ou data futura preenchida. |
| Pipeline aberto | Soma do valor dos leads que ainda não estão na etapa Pedido. |
| Idade média dos leads | Média de dias entre a criação do lead e o final do período selecionado. |
| Tarefas atrasadas | Leads ativos cuja próxima data é anterior ao fim do período analisado. |
| Sem contato recente | Leads ativos cuja última interação ocorreu há mais de 14 dias em relação ao fim do período. |

## Critérios de data

Leads em etapas abertas são associados ao período pela data de criação. Pedidos são associados ao período pela data de entrada em Pedido, utilizando os campos históricos disponíveis no app. Perdas são associadas pela data de exclusão. Essa separação evita que vendas fechadas no período sejam omitidas apenas porque o lead foi criado anteriormente.

O valor de **Orçamentos** representa somente os leads atualmente em orçamento. Pedidos convertidos permanecem na métrica de vendas e não são somados novamente ao valor de orçamento.

## Validação

A atualização foi verificada com testes automatizados dos cálculos, validação de sintaxe JavaScript e teste visual no navegador com dados autenticados da aplicação. Foram verificados o período personalizado, sua persistência após recarregamento, a sincronização entre painel avançado e relatório detalhado, a evolução semanal e a correção de percentuais artificiais acima de 100% no funil acumulado.
