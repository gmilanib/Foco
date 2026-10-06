# Manual de uso

## Atualização Stable 1.14.0

Baixe o instalador em [Foco Stable 1.14.0](https://github.com/gmilanib/Foco/releases/tag/v1.14.0-stable). Encerre o apontamento e faça backup antes de atualizar. O instalador Stable permite escolher a pasta e libera os processos da instalação de destino antes de substituir seus arquivos. Stable e New compartilham o banco local; feche uma versão antes de abrir a outra. Os recursos descritos abaixo para as versões New até 1.14.0 também estão disponíveis na Stable 1.14.0.

## Cadastros (New 1.5.0)

Abra **Cadastros** na navegação ou use **Alt+N**. Escolha **Clientes**, **Projetos** ou **Atividades** para administrar cada lista separadamente. Cadastre nomes antes de usá-los nos apontamentos e tarefas. Cliente e projeto são opcionais, mas, quando selecionados, precisam existir na lista; atividade é obrigatória. O detalhamento continua livre.

Quando houver nomes parecidos, confira as sugestões. Elas não alteram dados automaticamente. Para corrigir duplicidade, escolha **Manter** no nome correto e confirme a unificação; tarefas e apontamentos antigos serão atualizados para esse nome. Use **Renomear** para corrigir um item isolado. A exclusão só funciona se o item não estiver no histórico.

Na primeira abertura, os valores já presentes no banco e as cores de clientes são importados aos catálogos. Diferenças simples de caixa e espaços são normalizadas; grafias parecidas permanecem separadas até revisão manual.

## Primeiro início

1. Instale Java 17+ e execute o instalador Windows gerado pelo build. Durante desenvolvimento, instale Node 24 e rode `npm ci` e `npm run dev` na raiz.
2. Ao abrir, o Foco cria banco SQLite no diretório local do usuário. Não é necessária conta, servidor externo ou internet para operar.
3. Para trazer seus dados, abra Configurações → Importação inicial da V35 e selecione a pasta que contém `sessions.xml`. Selecione a pasta original do Foco V35; ela não será editada. A operação só é feita uma vez por banco local.
4. Em Configurações → Backup, escolha uma pasta de destino e salve o intervalo em minutos (padrão: 1440, ou 24 horas). O Foco verifica a cada minuto enquanto aberto e ao iniciar. Use **Criar backup agora** para gerar uma cópia manual.

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

Em **Tarefas**, crie registros sem iniciar o cronômetro. O campo **Prazo limite** registra a data prevista para entrega. A tabela mostra também o **Detalhamento** salvo na tarefa. Busque em todos os campos, filtre por estado e ordene por prazo limite, atividade, cliente/projeto ou estado e escolha ordem crescente ou decrescente. Prazos vazios ficam sempre no fim; o padrão é prazo crescente. Em **Filtros adicionais**, filtre por cliente, projeto, atividade, consultor e intervalo de prazo. Consulte os apontamentos associados e o tempo total. Iniciar tarefa cria mais um apontamento ligado à tarefa e copia seus parâmetros. Pode haver vários apontamentos associados. Conclua manualmente quando o trabalho tiver sido entregue; tarefas com sessões ainda ativas não podem ser concluídas. Uma tarefa com histórico não pode ser excluída.

Atalhos **Alt+F**, **Alt+D**, **Alt+R**, **Alt+J**, **Alt+T** e **Alt+C** abrem Apontar horas, Dashboard, Relatórios, Jornada, Tarefas e Configurações. **Alt+I** inicia ou pausa/retoma o foco; **Alt+E** abre as opções para encerrar uma sessão.

## Dashboard

Em **Horas exibidas**, escolha **Arredondadas** ou **Reais** e clique em **Atualizar**. Totais, gráficos, valores financeiros, filtros de horas e PDF acompanham o modo aplicado. Horas reais removem apenas o acréscimo de arredondamento, sem incluir pausas; legados sem essa informação mantêm o tempo salvo. Consulte [Horas do Dashboard](Horas-do-dashboard.md).

Ao abrir esta tela, o Foco seleciona o dia local de hoje e carrega os dados automaticamente. As datas inicial e final do filtro são inclusivas e respeitam o fuso horário local.

Escolha cliente, projeto, atividade ou consultor como agrupamento. Use datas, cliente, projeto, atividade, consultor e limite de horas para recortar o resultado. Atualize para consultar indicadores e gráficos de horas/valores. Em agrupamentos por cliente ou consultor, expanda a linha para ver projetos individuais. Custo depende de valor/hora informado e tempo efetivo de foco.

O botão **Exportar PDF** salva o Dashboard atualmente aplicado, com o agrupamento e o detalhamento de projetos visíveis. Se alterar filtros, escolha **Atualizar** antes de exportar. A opção **Incluir valores financeiros no PDF** aparece junto aos filtros e só fica disponível quando a privacidade financeira permite mostrar valores. O PDF é salvo no local escolhido na janela do Windows.

## Relatórios e correções

Filtre por período, texto, cliente, projeto, atividade, consultor, estado, horas ou valor. Abra filtros adicionais para critérios avançados.

- Marque uma linha e escolha **Editar selecionada** para corrigir os campos e horários.
- Marque uma linha finalizada e escolha **Excluir selecionada**. Confira a atividade e a data no diálogo e confirme a exclusão definitiva. O comando aceita uma linha por vez; sessões em andamento ou pausadas precisam ser encerradas antes. Horas e valores deixam os relatórios, o dashboard e os totais da tarefa vinculada.
- Os horários são exibidos no fuso local. Ao alterar início ou término, o campo **Tempo de foco** mostra a duração entre eles; salvar grava os novos horários e recalcula o foco.
- Corrigir apenas cliente, projeto ou outros textos preserva os segundos originais e o foco efetivo, inclusive quando ele foi ajustado em um lançamento retroativo.
- Marque uma ou mais linhas, escolha campo e valor e aplique em lote.
- Se houver seleção, **Exportar CSV** exporta apenas as linhas marcadas; sem seleção exporta o resultado filtrado.
- No diálogo de exportação, escolha o local do arquivo. Campos que poderiam virar fórmula no Excel recebem proteção.
- Em **Ordenar sessões por**, escolha o campo e a direção para reorganizar as linhas. A ordenação não altera os filtros nem os dados salvos.

## Preferências e cópias

Cores personalizadas de clientes aparecem como pequeno marcador junto ao nome em lançamentos, tarefas, relatórios e projetos do dashboard. A cor do texto permanece a do tema. Um projeto usado por vários clientes não recebe a cor exclusiva de um deles.

Em Configurações, defina tema claro, escuro ou baseado no sistema, cor de destaque e privacidade financeira. A cor de destaque aparece na navegação, botões, seleção, foco dos campos e nos gráficos quando não houver cor própria de cliente. O texto dos botões preenchidos se ajusta à luminosidade da cor. Cores personalizadas para cliente aparecem nas visualizações; para os demais, uma cor padrão é aplicada. A sobreposição exibe a atividade e o tempo em uma linha compacta. A bandeja/sobreposição pode ser aberta também nesta tela.

As instalações **Foco Stable** e **Foco New** usam o mesmo banco local e devem ser abertas uma por vez. A Stable permanece em `%LOCALAPPDATA%\Programs\Foco`; a New fica em `%LOCALAPPDATA%\Programs\foco-java`. A migração da New apenas acrescenta colunas opcionais, preservando tarefas e apontamentos que a Stable já conhece.

O destino é escolhido por **Escolher pasta de backup**. O intervalo aceita de 1 a 525600 minutos; clique em **Salvar intervalo**. **Criar backup agora** faz uma cópia imediata na pasta salva, independentemente do intervalo, e reinicia sua contagem. Trocar a pasta permite um novo backup automático no próximo ciclo. Cada ZIP contém um snapshot consistente do SQLite (histórico, tarefas, configurações, cores e operação) e um manifesto. O Foco verifica o ZIP e mantém todas as cópias; não apaga backups antigos automaticamente. Não há execução automática com o aplicativo fechado; um backup vencido será criado ao reabrir.

## Recuperação e solução de problemas

- Se o Foco encerrar inesperadamente durante o cronômetro, abra novamente e escolha retomar na sessão pausada; tempo posterior ao último salvamento de cinco segundos pode não estar registrado.
- Se não houver Java no `PATH`, instale um JDK/runtime 17+ ou configure `FOCO_JAVA` com o caminho do executável Java.
- Para ambiente de teste isolado, defina `FOCO_DATA_DIR` para outro diretório. Não aponte testes ao banco de produção.
- Se um XML não importar, confirme que `sessions.xml` é um arquivo regular da V35 e que não excede 128 MB; importação abortada mantém arquivos de origem intocados.
- Se o backup falhar, escolha pasta gravável fora do diretório dos dados locais e confira espaço livre.

## Privacidade e integridade

Todos os dados operacionais permanecem na máquina. O serviço aceita conexões somente no endereço local e exige autenticação aleatória por processo. Fechar a janela principal não encerra a sessão da bandeja. Para sair por completo, use **Sair do Foco** no menu da bandeja; ao iniciar de novo, a sessão preserva o foco salvo e fica pausada para retomada manual.

## Jornada diária e Extra-time

Abra a tela **Jornada** para consultar o resumo diário sem misturá-lo aos apontamentos de **Relatórios**. Defina data inicial e final e escolha **Atualizar jornada**; **Todo o período** remove os limites. Use os controles **Ordenar dias por** e **Ordenar lacunas por** para escolher o campo e a direção de cada tabela. A regra padrão considera segunda a sexta-feira, das 09:00 às 12:00 e das 13:00 às 18:00, com uma hora de almoço fora do cálculo. Lacunas entre apontamentos dentro dessas janelas são listadas como **A definir** e contam como trabalho. Até oito horas efetivas no dia são normais; o excedente é **Extra-time**. Apontamentos novos registram pausas e retomadas com precisão. Registros anteriores são estimados a partir do início e término disponíveis. Use **Exportar resumo CSV** para salvar os totais e períodos A definir.

No **Dashboard**, o controle **Ordenar grupos e projetos por** reorganiza as listas e os gráficos em conjunto. A mesma ordem aparece na exportação PDF.

## Atualizacao New 1.7.0

Na tela Tarefas, selecione um ou mais estados no filtro, combine com cliente, projeto, atividade, consultor e prazo, e altere o estado pelo seletor da linha. O campo Card/link abre links HTTP ou HTTPS em uma janela externa. O botao Historico mostra criacao, edicoes e mudancas de estado.

Na tela Jornada, use as abas Resumo e A definir. A segunda lista cada lacuna e oferece Criar apontamento. O formulario retroativo abre com inicio, termino e foco preenchidos; escolha a atividade e revise os dados antes de salvar. Relatorios permite consultar o Historico de cada apontamento.

As cores de projeto na lista de tarefas sao tons derivados da cor cadastrada para o cliente. Projetos sem cliente ou sem cor cadastrada continuam sem marcador colorido.

## Término real e arredondado

Ao finalizar ou trocar uma atividade, `end_at` guarda o instante real e `rounded_end_at` guarda esse instante mais o ajuste do foco para o próximo bloco de cinco minutos. Exemplo: 7 minutos de foco viram 10; o término arredondado fica 3 minutos depois do real. Pausas não são adicionadas ao ajuste. Jornada, conflitos e início da próxima tarefa continuam usando o término real. Foco e custo mantêm a regra atual.

Relatórios oferece **Término exibido: Real / Arredondado**, com Real como padrão. A escolha também acompanha a coluna Término do CSV. Registros antigos e XML importados usam o término disponível quando não há segundo valor; não se inventa um ajuste histórico. Retroativos salvam ambos iguais, pois não arredondam o foco. Alterar horários históricos redefine ambos para o término informado; editar descrições preserva os dois.

## Organização pessoal (New 1.9.0)

O app abre em **Hoje**: capture demandas com **Alt+Q**, organize-as em tarefas, planeje a data de execução e escolha até três prioridades. Use **Alt+H** para voltar a Hoje. Próxima ação, Aguardando e revisão diária ajudam a retomar pendências. Em Modelos, a geração recorrente ocorre somente ao clicar em **Criar tarefas previstas**. Consulte [Planejamento pessoal](Planejamento.md) para o fluxo completo.


New 1.10.0: próxima ação ao encerrar/trocar, prazo padrão e recuperação de rascunhos estão descritos em [Primeira onda](Primeira-onda.md).

## Segunda onda — New 1.11.0

Tarefas e Relatórios permitem escolher horas reais ou arredondadas. Em Relatórios, pressione Atualizar para aplicar; Término exibido é independente e o CSV identifica ambas as bases. Selecione um apontamento finalizado e use Vincular tarefa para corrigir sua associação. Em Jornada → A definir, Revisar em sequência oferece Anterior/Próxima e reaproveitamento opcional de classificação. Preferências de visualização são lembradas, mas datas reabrem atuais. Detalhes e limites em [Segunda onda](Segunda-onda.md).

## Estimativas, revisão semanal e diagnóstico — New 1.12.0

Em Hoje, use Estimativas e capacidade do dia para salvar minutos por tarefa e capacidade diária. O aviso de sobrecarga não bloqueia o planejamento; tarefas sem estimativa deixam o total incompleto. A aba Revisão semanal reúne capturas antigas, tarefas sem próxima ação, planejamentos não executados e dependências para revisar. Em Configurações, Versão e diagnóstico local mostra a versão e distingue a última tentativa de backup do último sucesso. Consulte [Terceira onda](Terceira-onda.md) para regras e exemplos.

## Comparar planejamento e conferir grupos

No Dashboard, use Planejado, estimado e realizado e pressione Comparar horas. Os filtros desse painel são independentes; a comparação mostra tarefas, projetos e semanas, dados sem estimativa e tempo sem vínculo. Estimativas e capacidade são os valores atuais, inclusive em consultas passadas. A carga planejada usa a estimativa na data planejada. Mostrar todos os grupos expande a distribuição; no resumo, Outros soma os grupos restantes. Veja [Quarta onda](Quarta-onda.md) para regras e limites.

## Organização de tarefas — New 1.14.0

Use Checklist em Tarefas ou Hoje para registrar passos sem separar apontamentos. Em Tarefas e Cadastros → Projetos, filtre arquivados e confirme arquivar/restaurar; dados e relatórios são preservados. Em Hoje → Modelos, edite ou pause modelos e configure dias úteis, dias específicos ou frequência mensal. A geração continua manual, sem acumular ocorrências atrasadas. Veja os fluxos e limites em [Quinta onda](Quinta-onda.md).
