# Datas sugeridas e diagnóstico local

## Datas nos formulários

- Relatórios começa com início e fim no dia local atual. O usuário pode alterar os dois campos, ou escolher o período completo.
- Dashboard e Jornada já iniciam no dia local atual.
- Uma tarefa nova sugere hoje como prazo limite; o campo continua editável e pode ser apagado. Tarefas existentes mantêm seu prazo salvo.
- Lançamento retroativo sugere a última hora, com início e término editáveis. Apontar horas usa a data/hora corrente; edição histórica preserva os valores existentes.

## Log local

O Electron acrescenta linhas JSON ao arquivo `errors.log` em `%APPDATA%/foco-java/logs/`. Cada linha contém horário UTC, contexto da operação e detalhe da falha. Respostas HTTP malsucedidas da API incluem status e corpo retornado pelo Spring; erros do processo Spring são registrados quando aparecem no fluxo de erro padrão. A tela Configurações abre a pasta do arquivo.

O log fica somente no computador. Ao investigar uma falha do Dashboard, use o contexto `api GET /api/dashboard` e o evento Spring imediatamente próximo para localizar a exceção original.

## Diagnóstico do Dashboard

A interface converte as datas locais do filtro em limites ISO de início do dia e início do dia seguinte. Assim, o filtro inclui todo o dia final e não depende do fuso UTC. Falhas HTTP são mantidas visíveis na interface e também gravadas no log local para diagnóstico.

Dashboard empty-result fix: SQLite returns NULL for SUM(unpriced) when no sessions match a date range. The controller now wraps this aggregate in COALESCE(..., 0), so empty periods return HTTP 200 with zero totals and empty groups instead of a NullPointerException.
