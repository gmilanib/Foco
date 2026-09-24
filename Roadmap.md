# Roadmap da fork Foco Java

Projeto de paridade funcional do Foco V35 com aplicação Electron/React/TypeScript, backend Java/Spring e armazenamento SQLite local.

## Feito nesta fundação

- [x] Autocomplete usa histórico e tarefas cadastradas em Apontar horas, Tarefas e Lançamento retroativo; filtra pelo texto do campo atual e altera somente esse campo.
- [x] Relatório permite excluir um lançamento finalizado por vez, após confirmação; sessões ativas ficam protegidas.
- [x] Cor de destaque aparece na navegação, botões, seleção, foco e primeiro segmento dos gráficos, com contraste no texto.
- [x] Cor própria do cliente aparece como marcador nos lançamentos, tarefas, relatórios e projetos relacionados; agregados compartilhados não recebem cor de um único cliente.
- [x] Removida a lista separada de sugestões de detalhamento; apagar o detalhamento altera somente esse campo.
- [x] Edição histórica preserva o fuso local e recalcula o tempo de foco pela diferença entre início e término.
- [x] Lançamento retroativo pelo espaço Apontar horas, com foco efetivo ajustável, aviso de sobreposição e vínculo opcional com tarefas concluídas.
- [x] Valores/hora sugeridos usam vírgula decimal no padrão brasileiro; a entrada também aceita ponto decimal sem bloquear o início do cronômetro.

- [x] Dashboard abre no dia local de hoje, carrega automaticamente e inclui ambas as datas do filtro.

- [x] Estrutura independente; nenhuma alteração ou substituição do Foco WPF.
- [x] Electron com janela principal, bandeja do sistema, instância única e sobreposição sempre visível.
- [x] Serviço Spring limitado ao loopback, token efêmero e persistência SQLite.
- [x] Cronômetro sem limite, pausas, duração programada, finalização e retomada após reabrir.
- [x] Tarefas pendentes, em andamento e concluídas; vários apontamentos e conclusão manual.
- [x] Relatórios com filtros, edição histórica, alterações em lote e exportação CSV.
- [x] Dashboard por cliente, projeto, atividade ou consultor, com subtotais por projeto.
- [x] Preferências de aparência, tema, acento, privacidade de valores e cores dos clientes.
- [x] Importação XML V35 somente leitura, transacional, com bloqueio de DTD/XXE e detecção de origem já importada.
- [x] Backup ZIP diário configurável, verificado, sem limite de retenção.
- [x] Documentação de uso, entidades, casos de uso e arquitetura; testes automatizados iniciais.

## Antes da primeira distribuição

- [ ] Executar `npm test` e `npm run build` em Windows com Java e Node instalados.
- [ ] Revisar visualmente os cinco espaços, os diálogos, os estados de tema e a sobreposição em resolução compacta.
- [ ] Comparar fixtures anonimizadas dos XMLs V35, especialmente tarefas, cores e configurações legadas.
- [ ] Criar procedimento de recuperação manual de backup e testar restauração em uma cópia de dados.
- [ ] Decidir distribuição de Java Runtime para máquinas sem Java instalado.

## New 1.1.0 — implementada

- [x] Gerar instaladores lado a lado: Stable 1.0.0 preservada e New 1.1.0 com nome e pasta próprios. Ambas apontam para `%APPDATA%\foco-java\data\foco.db`; bloqueio compartilhado limita o uso a uma instância. A migração aditiva foi verificada em teste com esquema antigo.
- [x] Ajustar a sobreposição do tempo para mostrar atividade atual e tempo em uma linha horizontal e compacta.
- [x] Adicionar atalhos **Alt + F/D/R/T/C** para telas, **Alt + I** para iniciar/pausar/retomar e **Alt + E** para abrir as opções de encerramento.
- [x] Adicionar categoria **Agenda** nos formulários de apontamento, edição e lançamento retroativo, com marcador no relatório, filtro e coluna no CSV; o padrão continua **Normal**.
- [x] Adicionar prazo limite opcional às tarefas, visível no formulário e na lista e filtrável por período.

O instalador Stable é uma cópia do artefato 1.0.0 que já estava em `release/`; o instalador New 1.1.0 foi produzido em `release/New/`. Ainda falta a revisão visual manual e testar a alternância entre os instaladores com uma cópia de dados de produção antes da distribuição pública.

## Critérios para concluir uma melhoria

Atualize este roadmap e `Doc/`; inclua teste que valide casos válidos e negativos; rode `npm test` e `npm run build`; não finalize com falha ou limitação escondida. Não feche o processo Foco WPF ativo nem substitua o projeto original.
