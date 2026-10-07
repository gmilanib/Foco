# Roadmap da fork Foco Java
## New e Stable 1.18.0 — Tarefas e hoje

Solicitada em 07/10/2026. Base New 1.17.0 e promoção/publicação Stable confirmadas; padrão de cinco prioridades escolhido pelo usuário. [Escopo e regras](Doc/Tarefas-e-hoje.md).

- [x] Reunir Tarefas e Hoje em uma área única, com lista, criação, planejamento e atalhos preservados.
- [x] Configurar de 1 a 100 atividades prioritárias por dia; padrão 5; preservar prioridades ao reduzir.
- [x] Sortear e persistir cores para projetos novos, mantendo variações da cor do cliente e aparência dos legados.
- [x] Renovar controles de estado e permitir seleção múltipla por caixas de seleção, sem Shift.
- [x] Validar 124 testes Java e 176 Vitest, builds New/Stable, 28 capturas e backend empacotado isolado.
- [x] Instalar New e Stable 1.18.0; hashes, janela, token e preservação das 20 tabelas/274 apontamentos conferidos.
- [ ] Publicar Stable 1.18.0 no GitHub, com código validado e quatro anexos verificados.
- [x] Limpar intermediários e pacotes substituídos; preservar instaladores atuais, backups e evidências.

Publicação Stable 1.18.0 autorizada e preparada; será executada após o envio do código validado à main.

## New 1.17.0 — interface expressiva e blocos de 2 minutos

Solicitados em 06/10/2026. Preferências confirmadas: visual expressivo; converter o histórico recuperável, preservando e identificando legados sem precisão. Fluxos, dados e limites em [Interface e arredondamento](Doc/Interface-e-arredondamento.md).

- [x] Botões com relevo/gradientes e feedback, navegação e abas renovadas, transições de telas/cards/diálogos, indicador animado de foco.
- [x] Foco por teclado ao navegar e suporte a movimento reduzido, impressão e temas claro/escuro.
- [x] Encerrar/trocar em blocos de 120 segundos; conversão transacional do histórico com backup anterior, auditoria e proteção contra repetição.
- [x] Preservar e identificar legados sem precisão; manter retroativos, sessões abertas e intervalos reais.
- [x] `npm test`: 119 Java e 173 Vitest aprovados; `npm run build` concluído.
- [x] Conferir 34 capturas em Electron (1440 × 960 e 800 × 620), claro/escuro/sistema, teclado, movimento reduzido e impressão; pacote e backend real isolado validados.
- [x] Limpar 324 arquivos intermediários (444 MiB), preservando New 1.17.0 gerada, New 1.16.0 correspondente à instalação, Stable e oito backups locais.

New 1.17.0 instalada e aberta por solicitação do usuário: saída 0, versão/hashes conferidos, 266 sessões preservadas e 41 históricos recuperáveis convertidos. 216 legados finalizados sem precisão mantidos; sessão pausada preservada com 1.342 segundos. Backup anterior e cópia automática da migração íntegros, 20 tabelas conferidas e janela respondendo. Instalador New 1.16.0 substituído removido; New 1.17.0, Stable e nove backups locais preservados. Detalhes em [Instalação](Doc/Instalacao.md).

## New 1.16.0 — sétima onda concluída

AP-03, AP-04 e CF-01 autorizadas em 06/10/2026 para concluir as 24 melhorias candidatas. Critérios, preservação histórica e restauração em [Sétima onda](Doc/Setima-onda.md).

- [x] AP-03: linha do tempo diária com sessões, pausas precisas, legados identificados, edição e classificação por botões acessíveis.
- [x] AP-04: jornada semanal versionada, exceções por data, meta e lacunas coerentes, preservando dias anteriores.
- [x] CF-01: prévia validada em banco isolado, confirmação/hash, cópia anterior e restauração transacional com rollback.
- [x] `npm test`: 101 Java e 169 Vitest; `npm run build`, pacote e backend empacotado conferidos.
- [x] Dez capturas em Electron, 800 × 620, claro/escuro e teclado; restauração real do JAR em base isolada, com integridade e cópia anterior verificadas.
- [x] Limpar 583 MiB de intermediários e pacote New 1.14.0 substituído; preservar New 1.15.0 instalada, New 1.16.0 gerada, Stable e backups.

**Tabela de melhorias funcionais concluída: 24/24.** New 1.16.0 instalada e reaberta por solicitação do usuário: saída 0, versão/hashes conferidos, 262 sessões e todas as tabelas anteriores preservadas. Pendências históricas de distribuição/validação abaixo são separadas dessa tabela.

## New 1.15.0 — sexta onda concluída

AN-02, OR-05, AD-01, AD-03 e OR-01 autorizadas em 06/10/2026. Escopo, critérios, dados e validação em [Sexta onda](Doc/Sexta-onda.md).

- [x] Comparação de horas reais/arredondadas, visões salvas, captura por atalho global/bandeja, lembretes locais e planejamento semanal.
- [x] Validar `npm test` (91 Java e 160 Vitest), `npm run build` e 14 capturas em janela compacta, claro/escuro e teclado.
- [x] Conferir ASAR, controlador local, JAR e manifesto; iniciar backend empacotado em banco isolado e validar token/loopback.
- [x] Gerar `release/New/Foco-New-Setup-1.15.0.exe` e limpar 440 MiB de intermediários, preservando instaladores em uso e backups. Entrega local, sem publicação.
- [x] Instalar e abrir por solicitação do usuário: saída 0, versão/hashes conferidos, backup íntegro e 18 tabelas preservadas, incluindo 261 sessões; janela respondendo e backend saudável.

## Stable 1.14.0 — promoção de todas as atualizações — 06/10/2026

- [x] Promover a New 1.14.0, incluindo as cinco ondas abaixo, para Stable 1.14.0; as referências New da tabela registram a versão de implementação original.
- [x] Incorporar o gancho de liberação dos arquivos ao instalador Stable e cobrir ambos os canais com testes.
- [x] Validar `npm test` (86 Java e 144 Vitest), `npm run build` e `npm run build:stable`; conferir ASAR, backend e manifestos entre canais.
- [x] Preparar código, testes e documentação para a `main` e release `v1.14.0-stable`, com tag correspondente ao código do instalador e quatro anexos verificados.
- [x] Remover cópias de empacotamento e o pacote Stable 1.10.0 substituído, preservando instaladores atuais, Stable 1.6.0 em uso e backups.

Entrega do instalador, sem reinstalar a aplicação. Artefatos e hashes em [Versões](Doc/Versoes.md).

## Melhorias planejadas — 24/24 concluídas (origem: 01/10/2026)

As propostas abaixo complementam a New 1.9.1. AD-02, OR-07, AD-05 e UX-01 foram selecionadas pelo usuário para a New 1.10.0. AN-03, AP-01, AP-02 e UX-02 compõem a segunda onda autorizada em 02/10/2026 e implementada na New 1.11.0. CF-02, OR-02 e AD-04 compõem a terceira onda autorizada em 02/10/2026, implementada na New 1.12.0. AN-01 e AN-04 compõem a quarta onda autorizada em 02/10/2026, implementada na New 1.13.0. OR-03, OR-04 e OR-06 compõem a quinta onda autorizada e implementada na New 1.14.0. AN-02, OR-05, AD-01, AD-03 e OR-01 compõem a sexta onda autorizada e implementada na New 1.15.0. AP-03, AP-04 e CF-01 compõem a sétima onda implementada na New 1.16.0, concluindo os 24 itens. Impacto e esforço são estimativas iniciais para comparação, não prazos. Ao escolher uma proposta, detalhar seu escopo e critérios de aceite antes de incluí-la em uma entrega.

Para filtrar, use os IDs e as colunas **Área**, **Impacto** e **Esforço**. Na coluna **Decisão**, substituir `A avaliar` por `Selecionada`, `Adiada` ou `Descartada`, preservando o ID. Esforço: **P** = alteração localizada; **M** = envolve interface, regras e persistência; **G** = envolve vários fluxos ou compatibilidade de dados.

| ID | Área | Melhoria proposta e escopo inicial | Benefício esperado | Impacto | Esforço | Decisão |
|---|---|---|---|---|---|---|
| AD-01 | Aderência | Capturar por atalho global do Windows e menu da bandeja, mesmo com o Foco oculto; permitir configurar ou desativar o atalho. | Registrar demandas sem precisar procurar a janela do app. | Alto | M | Implementada · New 1.15.0 |
| AD-02 | Aderência | Ao encerrar ou trocar uma tarefa, oferecer um campo opcional de próxima ação, preenchido com a anotação existente. | Retomar o trabalho sem reconstruir o contexto; complementar o planejamento já disponível em Hoje. | Alto | M | Implementada · New 1.10.0 |
| AD-03 | Aderência | Lembretes locais opcionais para planejar e revisar o dia, com horários, adiar e silenciar; avisar que dependem do app aberto ou na bandeja. | Ajudar a manter a rotina sem excesso de notificações. | Alto | M | Implementada · New 1.15.0 |
| AD-04 | Aderência | Painel de revisão semanal com capturas antigas, tarefas sem próxima ação, planejamentos não executados e dependências vencidas. | Evitar o acúmulo de tarefas esquecidas. | Alto | M | Implementada — New 1.12.0 |
| AD-05 | Aderência | Guardar rascunhos locais dos formulários e notas de revisão ao navegar; permitir recuperar ou descartar o rascunho. | Evitar redigitação e perda de contexto durante interrupções. | Alto | M | Implementada · New 1.10.0 |
| OR-01 | Organização | Planejar por semana, movendo tarefas entre dias sem alterar o prazo de entrega; oferecer ações equivalentes por teclado. | Distribuir o trabalho com uma visão mais ampla que Hoje. | Alto | G | Implementada · New 1.15.0 |
| OR-02 | Organização | Estimar duração por tarefa e configurar a capacidade diária; comparar horas planejadas com horas disponíveis, sem bloquear o planejamento. | Montar dias mais realistas e reconhecer sobrecarga. | Alto | M | Implementada — New 1.12.0 |
| OR-03 | Organização | Checklist de passos dentro da tarefa, preservando os apontamentos na tarefa principal. | Transformar trabalhos grandes em avanços observáveis. | Médio | M | Implementada · New 1.14.0 |
| OR-04 | Organização | Arquivar tarefas e projetos fora de uso, com filtro de arquivados e restauração, preservando histórico e relatórios. | Reduzir o ruído das listas sem excluir registros. | Alto | M | Implementada · New 1.14.0 |
| OR-05 | Organização | Salvar visões com filtros e ordenação, como “Intelbras em andamento” ou “Prazos da semana”. | Reabrir consultas frequentes sem configurar os mesmos filtros. | Médio | M | Implementada · New 1.15.0 |
| OR-06 | Organização | Editar e pausar modelos recorrentes; acrescentar dias úteis, dias específicos e frequência mensal, mantendo a geração manual escolhida pelo usuário. | Ajustar rotinas sem remover e recriar modelos. | Médio | M | Implementada · New 1.14.0 |
| OR-07 | Organização | Oferecer prazo vazio como padrão configurável para novas tarefas, inclusive no formulário tradicional de Tarefas. | Evitar que uma intenção de execução vire automaticamente um compromisso vencido. | Alto | P | Implementada · New 1.10.0 |
| AP-01 | Apontamentos | Vincular um apontamento existente a uma tarefa ou corrigir esse vínculo pela interface, com histórico da alteração. | Recuperar trabalho registrado fora da tarefa e consolidar seus totais. | Alto | M | Implementada · New 1.11.0 |
| AP-02 | Apontamentos | Revisar lacunas em sequência, com anterior/próxima e reaproveitamento opcional de classificação; conferir cada intervalo antes de salvar. | Reduzir o esforço do fechamento diário sem preencher tempos por suposição. | Alto | M | Implementada · New 1.11.0 |
| AP-03 | Apontamentos | Oferecer uma linha do tempo diária com sessões, pausas e lacunas; abrir a edição a partir de cada intervalo. | Enxergar trocas de contexto e inconsistências de horário. | Médio | G | Implementada · New 1.16.0 |
| AP-04 | Apontamentos | Configurar dias e horários de jornada, intervalos e exceções por data, preservando as regras aplicadas a períodos anteriores. | Fazer a apuração refletir a rotina real, inclusive feriados e jornadas diferentes. | Alto | G | Implementada · New 1.16.0 |
| AN-01 | Análise | Comparar horas planejadas, estimadas e realizadas por tarefa, projeto e semana; usar a capacidade e estimativas de OR-02. | Identificar padrões de subestimação e melhorar o planejamento seguinte. | Alto | M | Implementada · New 1.13.0 |
| AN-02 | Análise | Mostrar lado a lado horas reais, arredondadas e diferença acumulada, incluindo a quantidade de registros sem precisão histórica recuperável. | Entender o efeito do arredondamento e os limites dos dados antigos. | Alto | M | Implementada · New 1.15.0 |
| AN-03 | Análise | Disponibilizar a base real/arredondada também nos totais de Tarefas e nos relatórios/CSV; distinguir duração de horário de término. | Consultar a mesma base de tempo em todas as telas, além do Dashboard já implementado. | Alto | M | Implementada · New 1.11.0 |
| AN-04 | Análise | Permitir expandir além dos dez grupos do Dashboard ou mostrar um grupo “Outros” que represente o restante. | Facilitar a conferência entre distribuição, percentuais e total geral. | Médio | M | Implementada · New 1.13.0 |
| CF-01 | Confiabilidade | Restaurar um backup pela interface com prévia, validação de integridade e cópia de segurança anterior à restauração; testar primeiro em base isolada. | Tornar a recuperação de dados acessível e verificável. | Alto | G | Implementada · New 1.16.0 |
| CF-02 | Confiabilidade | Exibir canal, versão instalada, data e resultado do último backup, além de um resumo local de diagnóstico. | Identificar rapidamente a versão em uso e problemas de manutenção. | Médio | P | Implementada — New 1.12.0 |
| UX-01 | Usabilidade | Revisar Hoje, planejamento e Dashboard em janelas compactas, temas claro/escuro e navegação por teclado; corrigir foco e identificação de botões. | Usar os fluxos novos com menos atrito e conferir visualmente a entrega. | Alto | M | Implementada · New 1.10.0 |
| UX-02 | Usabilidade | Guardar preferências de visualização, como base de horas, agrupamento, ordenação e detalhes expandidos, sem manter datas antigas inadvertidamente. | Reduzir a configuração repetida ao abrir o app. | Médio | P | Implementada · New 1.11.0 |

### Sugestão de primeiro recorte para avaliação

Começar por **AD-02**, **OR-07**, **AD-05** e **UX-01**, pois tratam diretamente de retomada, prazos involuntários, perda de digitação e uso dos fluxos recém-criados. Avaliar **OR-02** antes de **AN-01**, que depende das estimativas. **CF-01** merece uma decisão própria por envolver recuperação de dados. O primeiro recorte foi autorizado em 01/10/2026; escopo e critérios estão em `Doc/Primeira-onda.md`.

As propostas devem manter dados locais, acesso ao backend pelo preload, preservação do Foco WPF e geração manual de recorrências. Ao selecionar um item, registrar resultado esperado, dependências, impacto em dados antigos e forma de validação. O histórico de versões abaixo permanece como registro das entregas realizadas.

## New 1.9.1 — horas do Dashboard

- [x] Escolher horas reais ou arredondadas, incluindo totais, gráficos, subtotais, valores e filtros.
- [x] Identificar o modo aplicado no painel e PDF; preservar o tempo salvo de legados e lacunas A definir.
- [x] Documentar cálculo e validar `npm test`: 49 testes Java e 97 Vitest aprovados.
- [x] Validar `npm run build`; gerar `release/New/Foco-New-Setup-1.9.1.exe`, conferir versão no ASAR e igualdade do JAR empacotado.

## New 1.8.0 — backup configurável

- [x] Configurar pasta de destino e intervalo em minutos, com padrão de 24 horas e validação na interface e na API.
- [x] Gerar backup manual e reiniciar o intervalo após sucesso; preservar cópias anteriores.
- [x] Cobrir intervalo, mudança de destino, falhas, seleção de pasta e recuperação do SQLite do ZIP com testes Java e Vitest.
- [x] Atualizar documentação em `Doc/Backup.md`, Manual, Arquitetura e Entidades.
- [x] Validar com `npm test` (35 Java e 82 Vitest) e `npm run build`; gerar `release/New/Foco-New-Setup-1.8.0.exe`.

## Promoção New 1.7.0 para Stable — 30/09/2026

- [x] Publicar a Release `v1.7.0-stable` em `gmilanib/Foco`, com quatro anexos conferidos por tamanho e SHA-256 e confirmação da publicação pela API.
- [x] Promover a implementação atual para `release/Stable/Foco-Stable-Setup-1.7.0.exe`, preservando instaladores anteriores.
- [x] Validar com `npm test` (32 Java e 79 Vitest), `npm run build` e `npm run build:stable`.
- [x] Conferir interface ASAR idêntica e conteúdo das 238 entradas do backend igual entre New e Stable; registrar a promoção em `Doc/Versoes.md`.

## New 1.7.0 - implementada
- [x] Possibilidade de filtro e ordenação das atividades por status, cliente, atividade e filtros multiplos Ex. Status Em andamento e Concluído.
- [x] As cores dos projetos devem ser sempre variações das cores do cliente;
- [x] Separar as lacunas a definir em outra ABA dentro de jornada e inserir a posisbilidade de lançar esses times a definir como um novo aporntamento (Ex. Almoço, definição de taras ou projeto com atividades);
- [x] Permissão de alteração de status das tarefas
- [x] inserir o link também na aba Tasks;
- [x] Gostaria que as atividades e apontamentos tivessem algum tipo de versionamento, exemplo para pagaleve foram feitos dois testes unitários no cliente intelbras;
- [x] `npm test`: 32 testes Java e 79 Vitest aprovados; `npm run build` concluido.
- [x] Gerar `release/New/Foco-New-Setup-1.7.0.exe` e promover a base 1.6.0 para `release/Stable/Foco-Stable-Setup-1.6.0.exe`.

## New 1.6.0 — validação e reinstalação

- [x] Validar revisão de horários e opção A definir: 30 testes Java e 74 Vitest aprovados; build e diff check concluídos em 25/09/2026.
- [x] Gerar `release/New/Foco-New-Setup-1.6.0.exe`.
- [x] Reinstalar após encerramento do apontamento ativo: instalador com saída 0, versão 1.6.0, hashes ASAR/JAR conferidos, janela aberta/respondendo e banco íntegro com 174 sessões.

## Promoção Stable 1.5.0 — 25/09/2026

- [x] Publicar somente a Release `v1.5.0-stable` em `gmilanib/Foco`, com quatro anexos e seus hashes verificados; manter o código 1.6.0 local.

- [x] Promover o último instalador New 1.5.0, conforme escolha do usuário, para `release/Stable/Foco-Stable-Setup-1.5.0.exe`.
- [x] Extrair a distribuição original e preservar seus 3.609 arquivos do ASAR, backend e ícone; conferir SHA-512 da origem e concluir empacotamento Stable.
- [x] Preservar instaladores anteriores e dados locais; registrar procedimento e limites da validação em `Doc/Versoes.md`.
- [x] Executar a suíte do código atual: 30 testes Java e 74 Vitest aprovados. Esse código 1.6.0 não foi incluído na promoção da 1.5.0.

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

## Checklist inicial de distribuição — registro histórico

Este checklist é separado das 24 melhorias funcionais concluídas. Os itens ainda abertos registram validações/distribuição adicionais, sem ampliar o escopo da sétima onda.

- [x] Executar `npm test` e `npm run build` em Windows com Java e Node instalados (validado nas entregas).
- [ ] Revisar visualmente os cinco espaços, os diálogos, os estados de tema e a sobreposição em resolução compacta.
- [ ] Comparar fixtures anonimizadas dos XMLs V35, especialmente tarefas, cores e configurações legadas.
- [x] Criar procedimento de recuperação e testar restauração em uma cópia de dados; fluxo pela interface e testes isolados na New 1.16.0, em `Doc/Backup.md`.
- [ ] Decidir distribuição de Java Runtime para máquinas sem Java instalado.

## New 1.1.0 — validada e promovida para Stable

- [x] Gerar instaladores lado a lado: Stable 1.0.0 preservada e New 1.1.0 com nome e pasta próprios. Ambas apontam para `%APPDATA%\foco-java\data\foco.db`; bloqueio compartilhado limita o uso a uma instância. A migração aditiva foi verificada em teste com esquema antigo.
- [x] Ajustar a sobreposição do tempo para mostrar atividade atual e tempo em uma linha horizontal e compacta.
- [x] Adicionar atalhos **Alt + F/D/R/T/C** para telas, **Alt + I** para iniciar/pausar/retomar e **Alt + E** para abrir as opções de encerramento.
- [x] Adicionar categoria **Agenda** nos formulários de apontamento, edição e lançamento retroativo, com marcador no relatório, filtro e coluna no CSV; o padrão continua **Normal**.
- [x] Adicionar prazo limite opcional às tarefas, visível no formulário e na lista e filtrável por período.

O instalador Stable 1.1.0 foi produzido com identidade Stable em `release/Stable/`; o instalador anterior 1.0.0 foi preservado. A New 1.1.0 validada foi a base da promoção.

## New 1.2.0 — validada

- [x] Organizar os filtros de tarefas com busca geral, filtros adicionais por cliente, projeto, atividade, consultor e prazo, além de estado e ordenação.
- [x] Exibir o detalhamento da tarefa diretamente na tabela.
- [x] Executar `npm test` e `npm run build`: 18 testes Java e 40 testes de interface aprovados; instalador gerado em `release/New/`.

## New 1.4.0 — concluída

- [x] Ordenação de tarefas por prazo limite, atividade, cliente/projeto ou estado, em ordem crescente ou decrescente; prazo ausente permanece ao fim. Padrão: prazo crescente.
- [x] Exportação do Dashboard exibido em PDF, com os filtros aplicados, agrupamento e detalhamento atual; permitir ocultar valores financeiros, respeitando a preferência de privacidade.
- [x] Executar `npm test` (21 testes Java e 47 testes de interface) e `npm run build`; instalador gerado em `release/New/Foco-New-Setup-1.4.0.exe`.

## New 1.4.1 — separação das telas de relatório

- [x] Mover o resumo de jornada/extra-time para a tela **Jornada**, com filtro próprio por data inicial/final, opção de todo o período e atalho **Alt+J**.
- [x] Manter **Relatórios** focado em apontamentos, filtros, correções e exportação CSV.
- [x] Executar `npm test` (21 testes Java e 49 de interface) e `npm run build`; instalador gerado em `release/New/Foco-New-Setup-1.4.1.exe`.

## New 1.4.2 — ordenação em relatórios

- [x] Adicionar seleção de campo e direção para ordenar sessões, dias e lacunas da Jornada e grupos/projetos do Dashboard; a ordenação do Dashboard acompanha o PDF.
- [x] Executar `npm test` (21 testes Java e 52 de interface) e `npm run build`; instalador gerado em `release/New/Foco-New-Setup-1.4.2.exe`.
## Critérios para concluir uma melhoria

Atualize este roadmap e `Doc/`; inclua teste que valide casos válidos e negativos; rode `npm test` e `npm run build`; não finalize com falha ou limitação escondida. Não feche o processo Foco WPF ativo nem substitua o projeto original.

## New 1.3.0 — validada

- [x] Apurar jornada de segunda a sexta, 09:00–12:00 e 13:00–18:00, com oito horas efetivas antes do Extra-time.
- [x] Criar períodos A definir entre apontamentos nas janelas de trabalho e contabilizá-los como trabalho.
- [x] Registrar intervalos precisos para novos apontamentos; estimar histórico sem horários de pausa.
- [x] Exibir resumo diário e exportar a apuração em CSV nos Relatórios.
- [x] Executar `npm test` (21 testes Java e 43 testes de interface) e `npm run build`; instalador gerado em `release/New/Foco-New-Setup-1.3.0.exe`.

## New 1.5.0 - Cadastros centrais (validada)

- [x] Centralizar Clientes, Projetos e Atividades em catálogos independentes; Cliente e Projeto são opcionais e Atividade é obrigatória.
- [x] Importar dados legados e normalizar diferenças simples; sugerir nomes parecidos sem unir automaticamente.
- [x] Permitir cadastro, renomeação e unificação manual; atualizar lançamentos e tarefas antigos ao nome escolhido.
- [x] Usar seletores de catálogo em apontamento, retroativo, edição histórica, tarefas e cor do cliente.
- [x] Executar `npm test` (25 testes Java e 54 de interface) e `npm run build`; instalador gerado e instalado em `release/New/Foco-New-Setup-1.5.0.exe`.

## Dates and local error log

- [x] Iniciar outra tarefa interrompe automaticamente o apontamento em andamento ou pausado, sem confirmação. A troca é transacional e preserva o apontamento anterior em caso de falha. Testes: 29 Java e 60 de interface aprovados. Documentação: `Doc/Troca-de-tarefas.md`.

- [x] Mostrar os apontamentos conflitantes no lançamento retroativo, com atividade, detalhamento, cliente, projeto, início, término e estado; atualizar a lista ao alterar o período. Documentação: `Doc/Conflitos-de-lancamentos.md`. Validação: 26 testes Java e 57 de interface aprovados.

- [x] Start Reports and new task forms with today's local date; let users change or clear it.
- [x] Suggest a recent editable interval for retroactive entries.
- [x] Write API and Spring failures to a local JSON-lines log and expose its folder in Settings.
- [x] Treat an empty Dashboard unpriced sum as zero; cover the empty date-filter result in the API suite.
- [x] Run `npm test` (26 Java tests and 56 interface tests) and `npm run build`; installer regenerated successfully.

## Dois horários de término

- [x] Gravar término real e arredondado nos encerramentos e trocas; preservar o real na Jornada e nos conflitos.
- [x] Escolher término em Relatórios e CSV; manter compatibilidade com registros antigos.
- [x] Documentar entidades, comportamento e fluxo; ampliar testes Java e Vitest.
- [x] Validar com `npm test` (36 Java e 84 Vitest) e `npm run build`; gerar New 1.8.0 atualizada e preservar cópia do instalador anterior.

## New 1.9.0 — organização pessoal

- [x] Captura rápida independente dos catálogos, com conversão transacional em tarefa.
- [x] Hoje como tela inicial; Alt+H para navegar e Alt+Q para capturar.
- [x] Data planejada separada do prazo, até três prioridades ordenáveis, próxima ação e Aguardando com dependência/revisão.
- [x] Fechamento diário com tarefas abertas, lacunas e notas persistidas.
- [x] Modelos sob demanda e recorrência diária/semanal com geração manual, conforme escolha do usuário.
- [x] Atualizar documentação funcional, técnica, entidades e diagrama.
- [x] Validar `npm test` (45 Java e 95 Vitest) e `npm run build`; gerar `release/New/Foco-New-Setup-1.9.0.exe`, conferir versão no ASAR, recursos da interface e igualdade do JAR empacotado.

## New 1.10.0 — primeira onda

- [x] AD-02: próxima ação opcional no encerramento manual e na troca de sessão vinculada; preservar anotação se omitida e salvar na mesma transação.
- [x] OR-07: novas tarefas sem prazo por padrão; opção Hoje em Configurações, sem alterar tarefas existentes.
- [x] AD-05: rascunhos locais com recuperação/descarte explícitos, isolados por formulário, entidade ou data; limpar após sucesso e preservar em falhas.
- [x] UX-01: nomes acessíveis da navegação compacta, foco visível, retorno de foco de diálogos, atalhos respeitando modal e ajustes de contraste/disposição.
- [x] `npm test`: 56 testes Java e 107 Vitest; `npm run build`: instalador New 1.10.0 gerado.
- [x] Conferência visual em 800 × 620, temas claro/escuro e teclado; New 1.10.0 reinstalada, backup criado, dados preservados, integridade e hashes conferidos.

## New 1.11.0 — segunda onda

Escopo autorizado em 02/10/2026: AN-03, AP-01, AP-02 e UX-02. Critérios e fluxos em `Doc/Segunda-onda.md`.

- [x] Horas reais/arredondadas em Tarefas, Relatórios, filtros e CSV, com base de término independente.
- [x] Correção e remoção de vínculo de apontamentos finalizados, com histórico transacional.
- [x] Revisão sequencial de lacunas, reaproveitamento opcional e validação antes de cada gravação.
- [x] Preferências locais de visualização sem persistir datas antigas.
- [x] `npm test`: 61 testes Java e 117 Vitest aprovados; `npm run build` concluído.
- [x] Conferência visual isolada em 800 × 620, claro/escuro e teclado; versão ASAR e igualdade do JAR conferidas. Instalador local New 1.11.0 gerado, sem instalação ou publicação.

## New 1.12.0 — terceira onda

Escopo autorizado: CF-02, OR-02 e AD-04. Critérios e fluxos em `Doc/Terceira-onda.md`.

- [x] Canal/versão e diagnóstico local; última tentativa de backup separada do último sucesso.
- [x] Estimativas opcionais por tarefa e capacidade diária configurável; aviso de sobrecarga sem bloqueio.
- [x] Revisão semanal de capturas antigas, próximas ações ausentes, planejamentos não executados e dependências para revisar.
- [x] `npm test`: 68 testes Java e 124 Vitest aprovados; `npm run build` concluído.
- [x] Conferência visual isolada em 800 × 620, claro/escuro e teclado; foco circular do diálogo corrigido, versão ASAR e igualdade do JAR conferidas. Instalador local New 1.12.0 gerado.

## New 1.13.0 — quarta onda

Escopo autorizado: AN-01 e AN-04. Critérios e fluxos em `Doc/Quarta-onda.md`.

- [x] Comparação de estimativas, carga planejada, realizado e capacidade por tarefa, projeto e semana; ausência de estimativa e tempo sem vínculo explícitos.
- [x] Dashboard com todos os grupos e visão resumida de dez mais Outros preservando somas, preferência local e PDF.
- [x] `npm test`: 73 testes Java e 130 Vitest; `npm run build` concluído.
- [x] Conferência visual isolada em 800 × 620, claro/escuro e rolagem por teclado; versão/recursos no ASAR e igualdade do JAR conferidos. Instalador local New 1.13.0 gerado, sem instalação ou publicação.
## New 1.13.1 — instalação confiável, 02/10/2026

- [x] Incorporar ao instalador e desinstalador New o encerramento dos processos Electron e Java da pasta de destino antes de substituir arquivos.
- [x] Validar 73 testes Java e 131 Vitest e `npm run build`.
- [x] Instalar e reinstalar com New aberto: saída 0 nas duas tentativas, versão 1.13.1.0, hashes conferidos, backup e todas as tabelas preservadas.
- [x] Documentar fluxo e verificação em `Doc/Instalacao.md`; manter Foco WPF, Stable e dados locais.

## New 1.14.0 — quinta onda, 02/10/2026

- [x] OR-03: checklist dentro da tarefa, com progresso e histórico, sem dividir apontamentos.
- [x] OR-04: arquivar/restaurar tarefas e projetos, filtrar arquivados e preservar relatórios; proteger apontamentos ativos.
- [x] OR-06: editar/pausar modelos, dias úteis/específicos e mensal; geração manual sem acúmulo.
- [x] Atualizar documentação funcional/técnica e diagramas em `Doc/Quinta-onda.md`, Manual, Entidades, Arquitetura e Casos de uso.
- [x] Validar `npm test` (86 Java, 141 Vitest), `npm run build` e interface compacta claro/escuro com teclado.
- [x] Gerar `release/New/Foco-New-Setup-1.14.0.exe`, conferir ASAR/JAR e manter correção de instalação da 1.13.1. Sem instalação/publicação.
## Limpeza local — 02/10/2026

- [x] Remover 5,15 GiB de instaladores antigos, cópias de empacotamento e temporários, conforme solicitação do usuário.
- [x] Preservar New 1.14.0, Stable instalada 1.6.0 e pacote Stable 1.10.0; manter dados, backups, código e WPF.
- [x] Conferir hashes dos arquivos preservados, dependências e manifestos; documentar em `Doc/Limpeza.md`.
