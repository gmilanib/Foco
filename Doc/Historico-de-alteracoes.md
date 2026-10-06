# Historico de alteracoes

## Registro

A tabela `change_history` guarda snapshots JSON das tarefas e dos apontamentos. Cada entrada tem tipo e ID do registro, data local com deslocamento, valores anteriores e valores novos. Criacao, edicao, mudanca de estado e exclusao ficam registradas; cronometro a cada cinco segundos nao cria versoes. Pausa, retomada e encerramento sao eventos registrados.

Os valores permanecem no SQLite local. O endpoint `GET /api/history?entityType=task|session&entityId=...` exige o mesmo token local das demais rotas. A interface abre o historico pela lista de tarefas ou pelo relatorio de apontamentos e mostra as duas versoes do registro.

Os snapshots incluem os campos da entidade, inclusive valor/hora quando preenchido. A preferencia que oculta valores financeiros controla a apresentacao normal, mas o historico tecnico do registro continua completo e local.

## Mudancas de estado das tarefas

`tasks.state` guarda `Pendente`, `Em andamento` ou `Concluida` quando o estado e alterado manualmente. Linhas antigas sem valor continuam derivando o estado de `completed` e da existencia de apontamentos. Concluir uma tarefa com sessao ativa e recusado. Qualquer pessoa usando a aplicacao local pode alterar o estado.

## Compatibilidade

As colunas e tabelas novas sao aditivas. Versoes anteriores preservam os campos que nao conhecem, mas podem mostrar o estado derivado sem considerar uma alteracao manual feita pela New 1.7.0. O historico nao altera o conteudo dos apontamentos.
