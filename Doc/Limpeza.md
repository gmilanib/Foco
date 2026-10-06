# Limpeza de arquivos locais — 02/10/2026

## Complemento — promoção Stable 1.14.0, 06/10/2026

Após testes e conferência dos pacotes New/Stable 1.14.0, foram removidos seis alvos regeneráveis ou substituídos: as duas pastas `win-unpacked`, dois arquivos `builder-debug.yml` e instalador/blockmap Stable 1.10.0. Total: 156 arquivos e 1.055.059.912 bytes (cerca de 0,98 GiB).

Preservados os pacotes New/Stable 1.14.0, seus manifestos, o instalador/blockmap Stable 1.6.0 correspondente à instalação em uso e os seis backups SQLite. Caminhos limitados a `release/`, alvos não rastreados pelo Git e ausência de pontos de redirecionamento conferidos antes da remoção. Os hashes dos três instaladores preservados e dos seis backups ficaram inalterados. Manifesto local em `.atualizacao_status/stable-1.14.0-cleanup.json`; a pasta de evidências foi adicionada ao `.gitignore`.

As seções abaixo registram a limpeza anterior; a Stable 1.10.0 citada nelas foi substituída nesta promoção.

Limpeza solicitada pelo usuário após a entrega da New 1.14.0. Foram removidos 122 alvos, contendo 8.191 arquivos e 5.529.181.137 bytes (5,15 GiB, aproximadamente 5,5 GB). A lista dos alvos e seus tamanhos está em [Limpeza-arquivos.json](Limpeza-arquivos.json).

## Preservado

- Código, testes, configuração, documentação, Git e dependências de desenvolvimento.
- Instalador New 1.14.0 e seus metadados; o executável instalado foi consultado e já estava na versão 1.14.0.0.
- Instaladores Stable 1.6.0 (versão instalada) e 1.10.0 (pacote local mais recente), com seus blockmaps.
- Seis backups SQLite anteriores às instalações, com os manifestos de comparação relacionados.
- Registros dos testes/build da quinta onda, capturas e scripts da conferência visual atual, e registros da validação da correção do instalador.
- Frontend compilado `desktop/dist` e JAR atual `backend/target/foco-backend.jar`, usados pelos fluxos locais de execução/verificação.
- Instalações em AppData, dados da aplicação e Foco WPF de origem. Nenhuma remoção ocorreu fora desta pasta de projeto.

## Removido

Instaladores antigos que não correspondem às versões acima, distribuições extraídas `win-unpacked`, cópias antigas de promoção/empacotamento, scripts pontuais das entregas anteriores, perfis Chromium de QA, logs antigos, cache de testes, classes/intermediários Maven e bancos isolados dos testes.

As referências a pacotes e registros antigos em documentos históricos descrevem entregas anteriores; esses arquivos locais podem ter sido removidos nesta limpeza. Os próximos testes/builds recriarão seus intermediários e bancos isolados. A conferência visual atual continua disponível em `.atualizacao_status/organization-qa/`.

## Validação

Antes de remover, todos os alvos foram conferidos como não rastreados pelo Git e dentro do workspace; caminhos com pontos de redirecionamento foram rejeitados. Foram comparados os hashes de 147 arquivos de código/recursos/scripts e dos seis backups antes/depois, sem alterações. Os hashes dos instaladores New 1.14.0 e Stable 1.10.0 correspondem aos registrados nas entregas. Todos os alvos selecionados ficaram ausentes, e `npm ls --depth=0` confirmou as dependências instaladas.

O manifesto local `release/Stable/latest.yml` foi alinhado à Stable 1.10.0; antes ainda apontava para 1.7.0. Os manifestos SHA-256 de New e Stable foram regenerados para os arquivos preservados. Não houve publicação externa nem alteração funcional; não foi necessário reconstruir o aplicativo.
