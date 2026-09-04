# Fila assistida de WhatsApp

## Objetivo

A fila assistida prepara campanhas segmentadas usando os leads do CRM e abre cada conversa por meio de um link `wa.me`. Como a conta não possui a API oficial do WhatsApp Business, o envio final continua sendo manual e depende da confirmação do operador dentro da conversa.

## Fluxo

Primeiro, filtre por etapa, potencial, vendedor, estado e cidade. A prévia apresenta os contatos encontrados com telefone ou WhatsApp. Um contato só entra na fila depois que for marcado como **Autorizado**. Caso a pessoa solicite não receber mensagens, use **Não contatar**; esse registro bloqueia novas filas para o contato.

Em seguida, informe o nome da campanha, defina o limite diário e selecione até três modelos para as variações V1, V2 e V3. Uma mensagem personalizada também pode ser usada como variação adicional. As tags disponíveis são `{{empresa}}`, `{{decisor}}`, `{{valor}}`, `{{telefone}}`, `{{cidade}}`, `{{estado}}` e `{{potencial}}`.

Ao iniciar a fila, o CRM apresenta o próximo contato e a mensagem pronta. O botão **Abrir no WhatsApp** abre a conversa com o texto preenchido. Depois que o operador concluir o envio manualmente, deve clicar em **Confirmar envio**. Também é possível pular o contato, marcar como não contatar, pausar ou encerrar a fila.

## Controles aplicados

| Controle | Comportamento |
|---|---|
| Consentimento | Apenas contatos autorizados entram na fila. |
| Opt-out | Contatos marcados como não contatar ficam fora de novas filas. |
| Limite diário | O operador define de 1 a 100 confirmações por dia. |
| Variações | Os modelos escolhidos são alternados em sequência; a mensagem personalizada pode participar como variação adicional. |
| Auditoria | Abertura, confirmação, campanha, variação e usuário ficam registrados no histórico local do CRM. |
| Pausa e encerramento | A fila pode ser pausada ou encerrada sem apagar o histórico. |

Não há disparo automático, automação de cliques ou temporização aleatória para simular comportamento humano ou contornar controles da plataforma.
