# Troca automática de tarefa

Na tela Tarefas, clicar em **Iniciar** inicia a tarefa escolhida imediatamente. Se existir um apontamento em andamento ou pausado, ele é finalizado como **Interrompida**, com o foco acumulado e o arredondamento já utilizado no encerramento. Não aparece confirmação para escolher o resultado.

O encerramento do apontamento não conclui o cadastro da tarefa anterior. Ela pode receber novos apontamentos depois. O comando **Encerrar** continua permitindo a escolha manual do resultado.

## Consistência e falhas

`POST /api/sessions/switch` recebe `previousId`, `focusSeconds` e `next` (dados da nova sessão). `SessionSwitchController` encerra a anterior e cria a próxima em uma transação. A nova sessão inicia exatamente no término da anterior. Se a criação falhar, a transação restaura a anterior, incluindo seu tempo e estado. Uma repetição com o ID já finalizado é rejeitada.

A interface bloqueia cliques repetidos durante a troca. Atualizações atrasadas do cronômetro não alteram o foco de sessões finalizadas. Não há nova entidade: as duas entradas continuam na tabela `sessions`, com seus vínculos opcionais em `tasks` e intervalos em `session_work_intervals`.

```mermaid
sequenceDiagram
    actor Usuario
    participant Tela as Tarefas
    participant API as SessionSwitchController
    participant Banco as SQLite
    Usuario->>Tela: Iniciar outra tarefa
    Tela->>API: Sessão anterior, foco e nova tarefa
    API->>Banco: Iniciar transação
    API->>Banco: Finalizar anterior como Interrompida
    API->>Banco: Criar nova sessão Em andamento
    alt Dados válidos
        API->>Banco: Confirmar transação
        API-->>Tela: Nova sessão
        Tela-->>Usuario: Cronômetro da nova tarefa
    else Falha
        API->>Banco: Desfazer transação
        API-->>Tela: Erro; apontamento anterior preservado
    end
```

Os testes cobrem troca em andamento e pausada, horário comum de transição, arredondamento, rejeição de repetição, tick atrasado e restauração após dados inválidos. A interface testa troca sem diálogo e mensagem de erro.


A New 1.10.0 acrescenta uma etapa opcional de próxima ação para sessões vinculadas: Trocar tarefa ou Cancelar. A troca direta permanece para sessões sem tarefa. Texto e sessão são atualizados na mesma transação. Ver [Primeira onda](Primeira-onda.md).
