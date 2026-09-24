# Manual de uso

## Primeiro início

1. Instale Java 17+ e execute o instalador Windows gerado pelo build. Durante desenvolvimento, instale Node 24 e rode `npm ci` e `npm run dev` na raiz.
2. Ao abrir, o Foco cria banco SQLite no diretório local do usuário. Não é necessária conta, servidor externo ou internet para operar.
3. Para trazer seus dados, abra Configurações → Importação inicial da V35 e selecione a pasta que contém `sessions.xml`. Selecione a pasta original do Foco V35; ela não será editada. A operação só é feita uma vez por banco local.
4. Escolha uma pasta de backup que fique acessível mesmo se o banco local for danificado. O backup diário começa ao abrir quando está pendente e o aplicativo acompanha a virada de dia enquanto permanecer aberto.

## Apontar horas


Cliente, projeto, atividade, consultor, card/link e valor por hora oferecem autocomplete do histórico e das tarefas cadastradas. As opções acompanham o texto digitado no próprio campo. Escolher uma opção preenche somente esse campo.

O detalhamento é um campo de texto livre, sem uma lista separada de sugestões. Apagá-lo não altera o consultor solicitante nem os outros campos.

Abra **Apontar horas**, descreva a atividade e preencha os dados que quiser: cliente, projeto, detalhamento, consultor solicitante, card/link e valor por hora. Os campos lembram nomes vistos no histórico para reduzir digitação.

O valor por hora aceita a vírgula decimal brasileira (`59,37`) e também o ponto decimal (`59.37`). Deixe o campo vazio quando não quiser informar um valor.

Escolha **Cronômetro** para tempo sem limite ou **Timer** para definir duração. Presets rápidos são 25, 50 e 90 minutos. O valor por hora é opcional. Iniciar começa o foco; pausar congela a contagem; retomar continua do tempo acumulado. Timer programado termina automaticamente. No fim, escolha o resultado que descreve o lançamento.

Use **Categoria do apontamento** para marcar uma sessão como **Agenda** ou **Normal**. A categoria aparece no relatório e pode ser usada nos filtros. Para um registro retroativo, escolha a mesma categoria no formulário.

O botão de sobreposição abre uma janela pequena e sempre visível. Fechar a janela principal a esconde na bandeja, sem parar o cronômetro. No menu da bandeja é possível reabrir, mostrar/ocultar sobreposição e sair do aplicativo. Ao iniciar outra sessão com uma atual aberta, escolha primeiro como encerrar a atual.

## Lançamento retroativo

Em **Apontar horas**, clique em **Lançamento retroativo** quando precisar registrar trabalho feito durante uma indisponibilidade. Informe início e término passados, atividade e, se desejar, cliente, projeto, detalhamento, consultor, card/link, valor/hora e uma tarefa existente. Tarefas já concluídas também podem receber esse vínculo histórico.

Os campos de texto do lançamento retroativo oferecem o mesmo autocomplete: as opções dependem apenas do texto do campo atual e não completam outros campos. Escolher uma tarefa no seletor de tarefas continua copiando seus dados para os campos ainda vazios.

O Foco sugere a duração completa entre início e término nos campos **Horas de foco** e **Minutos de foco**. Ajuste esses campos para informar apenas o tempo efetivamente trabalhado; o valor deve ser positivo e não pode ultrapassar o intervalo. **Usar intervalo completo** restaura a sugestão. O resultado inicial é **Concluída**, podendo ser trocado por **Encerrada** ou **Interrompida**.

Se o período cruzar outro apontamento, o formulário mostra um aviso e exige sua confirmação antes de salvar. A sobreposição é permitida para recuperar registros legítimos. O lançamento salvo aparece nos relatórios, no dashboard e, quando vinculado, nos totais da tarefa.

## Tarefas

No formulário de nova tarefa ou edição, cliente, projeto, atividade, consultor, card/link e valor/hora oferecem o mesmo autocomplete independente. Digite parte do valor e escolha uma opção para preencher somente o campo atual. O detalhamento permanece livre, sem lista de sugestões.

Em **Tarefas**, crie registros sem iniciar o cronômetro. O campo **Prazo limite** registra a data prevista para entrega. A lista mostra o prazo e permite filtrar um intervalo de datas. Consulte o estado pendente, em andamento ou concluído, os apontamentos e o tempo total. Iniciar tarefa cria mais um apontamento ligado à tarefa e copia seus parâmetros. Pode haver vários apontamentos associados. Conclua manualmente quando o trabalho tiver sido entregue; tarefas com sessões ainda ativas não podem ser concluídas. Uma tarefa com histórico não pode ser excluída.

Atalhos **Alt+F**, **Alt+D**, **Alt+R**, **Alt+T** e **Alt+C** abrem Apontar horas, Dashboard, Relatórios, Tarefas e Configurações. **Alt+I** inicia ou pausa/retoma o foco; **Alt+E** abre as opções para encerrar uma sessão.

## Dashboard

Ao abrir esta tela, o Foco seleciona o dia local de hoje e carrega os dados automaticamente. As datas inicial e final do filtro são inclusivas e respeitam o fuso horário local.

Escolha cliente, projeto, atividade ou consultor como agrupamento. Use datas, cliente, projeto, atividade, consultor e limite de horas para recortar o resultado. Atualize para consultar indicadores e gráficos de horas/valores. Em agrupamentos por cliente ou consultor, expanda a linha para ver projetos individuais. Custo depende de valor/hora informado e tempo efetivo de foco.

## Relatórios e correções

Filtre por período, texto, cliente, projeto, atividade, consultor, estado, horas ou valor. A ordenação é por sessão recente, antiga, maior foco ou cliente/projeto. Abra filtros adicionais para critérios avançados.

- Marque uma linha e escolha **Editar selecionada** para corrigir os campos e horários.
- Marque uma linha finalizada e escolha **Excluir selecionada**. Confira a atividade e a data no diálogo e confirme a exclusão definitiva. O comando aceita uma linha por vez; sessões em andamento ou pausadas precisam ser encerradas antes. Horas e valores deixam os relatórios, o dashboard e os totais da tarefa vinculada.
- Os horários são exibidos no fuso local. Ao alterar início ou término, o campo **Tempo de foco** mostra a duração entre eles; salvar grava os novos horários e recalcula o foco.
- Corrigir apenas cliente, projeto ou outros textos preserva os segundos originais e o foco efetivo, inclusive quando ele foi ajustado em um lançamento retroativo.
- Marque uma ou mais linhas, escolha campo e valor e aplique em lote.
- Se houver seleção, **Exportar CSV** exporta apenas as linhas marcadas; sem seleção exporta o resultado filtrado.
- No diálogo de exportação, escolha o local do arquivo. Campos que poderiam virar fórmula no Excel recebem proteção.

## Preferências e cópias

Cores personalizadas de clientes aparecem como pequeno marcador junto ao nome em lançamentos, tarefas, relatórios e projetos do dashboard. A cor do texto permanece a do tema. Um projeto usado por vários clientes não recebe a cor exclusiva de um deles.

Em Configurações, defina tema claro, escuro ou baseado no sistema, cor de destaque e privacidade financeira. A cor de destaque aparece na navegação, botões, seleção, foco dos campos e nos gráficos quando não houver cor própria de cliente. O texto dos botões preenchidos se ajusta à luminosidade da cor. Cores personalizadas para cliente aparecem nas visualizações; para os demais, uma cor padrão é aplicada. A sobreposição exibe a atividade e o tempo em uma linha compacta. A bandeja/sobreposição pode ser aberta também nesta tela.

As instalações **Foco Stable** e **Foco New** usam o mesmo banco local e devem ser abertas uma por vez. A Stable permanece em `%LOCALAPPDATA%\Programs\Foco`; a New fica em `%LOCALAPPDATA%\Programs\foco-java`. A migração da New apenas acrescenta colunas opcionais, preservando tarefas e apontamentos que a Stable já conhece.

O destino diário é escolhido pelo botão de pasta. **Criar backup agora** faz uma cópia adicional imediata. Cada ZIP contém um snapshot consistente do SQLite (histórico, tarefas, configurações, cores e operação) e um manifesto. O Foco verifica o ZIP e mantém todas as cópias; não apaga backups antigos automaticamente.

## Recuperação e solução de problemas

- Se o Foco encerrar inesperadamente durante o cronômetro, abra novamente e escolha retomar na sessão pausada; tempo posterior ao último salvamento de cinco segundos pode não estar registrado.
- Se não houver Java no `PATH`, instale um JDK/runtime 17+ ou configure `FOCO_JAVA` com o caminho do executável Java.
- Para ambiente de teste isolado, defina `FOCO_DATA_DIR` para outro diretório. Não aponte testes ao banco de produção.
- Se um XML não importar, confirme que `sessions.xml` é um arquivo regular da V35 e que não excede 128 MB; importação abortada mantém arquivos de origem intocados.
- Se o backup falhar, escolha pasta gravável fora do diretório dos dados locais e confira espaço livre.

## Privacidade e integridade

Todos os dados operacionais permanecem na máquina. O serviço aceita conexões somente no endereço local e exige autenticação aleatória por processo. Fechar a janela principal não encerra a sessão da bandeja. Para sair por completo, use **Sair do Foco** no menu da bandeja; ao iniciar de novo, a sessão preserva o foco salvo e fica pausada para retomada manual.
