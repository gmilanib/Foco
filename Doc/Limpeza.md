# Limpeza de arquivos locais — 02/10/2026

## Complemento — New e Stable 1.18.0, 07/10/2026

Após verificar as duas instalações, removidos 56 alvos, 424 arquivos e 1364646632 bytes (1301 MiB): distribuições win-unpacked, pacotes substituídos New 1.17.0 e Stable 1.14.0/1.6.0, intermediários Maven/TypeScript, bases/perfis isolados de teste e scripts pontuais obsoletos. Caminhos absolutos dentro do workspace, rastreamento Git e pontos de redirecionamento verificados antes de cada remoção.

238 arquivos protegidos reconferidos por hash; instaladores/blockmaps atuais dos dois canais, 10 backups SQLite, código, documentação, dependências, frontend/JAR atuais, relatórios e capturas finais preservados. Manifestos em `.atualizacao_status/eighth-cleanup*.json`. Dados de uso e instalações não foram removidos.

## Complemento — New 1.17.0, 06/10/2026

Após instalar e abrir a New 1.17.0, removidos também o instalador e o blockmap New 1.16.0 substituídos: dois arquivos, 148.685.831 bytes (142 MiB). Versão e hashes da instalação atual conferidos antes; caminhos limitados ao workspace, alvos não rastreados e sem redirecionamento. New 1.17.0, Stable e nove backups locais preservados por hash. Manifestos em `.atualizacao_status/experience-install-cleanup*.json`; `release/New/SHA256SUMS.txt` atualizado. As referências à New 1.16.0 preservada abaixo descrevem o momento anterior à instalação.

Removidos 26 alvos, 324 arquivos e 465.582.058 bytes (444 MiB): distribuição `win-unpacked`, diagnóstico de empacotamento, perfil Chromium e registro de falha visual já corrigida, base/cópias isoladas do smoke, intermediários Maven, bancos e backups usados exclusivamente pelos testes e dois scripts pontuais de preparação. Removido também o bloco duplicado de CSS de impressão, mantendo a regra completa existente.

Caminhos absolutos limitados ao workspace, ausência de rastreamento no Git e pontos de redirecionamento conferidos antes da remoção. Manifesto em `.atualizacao_status/experience-cleanup.json`; reverificação dos 219 arquivos protegidos concluída. Preservados New 1.17.0 gerada, New 1.16.0 correspondente à instalação atual, pacotes Stable, oito backups SQLite locais, código, dependências, JAR/frontend atuais, relatórios e 34 capturas finais. Nenhuma instalação ou dado da aplicação em uso foi alterado.

## Complemento — New 1.16.0, 06/10/2026

Após instalar e abrir a New 1.16.0, também foram removidos o instalador/blockmap New 1.15.0 substituído e três scripts pontuais/antigos de instalação: cinco arquivos, 148.653.756 bytes (cerca de 142 MiB). Caminhos absolutos, ausência de rastreamento e pontos de redirecionamento conferidos antes; hash do pacote New 1.16.0 e dos oito backups SQLite mantidos. Manifesto em `.atualizacao_status/seventh-wave-install-cleanup.json`. As referências à New 1.15.0 preservada abaixo registram o momento anterior à atualização da instalação.

Removidos 12 alvos, 171 arquivos e 611.333.101 bytes (cerca de 583 MiB): distribuição `win-unpacked` e diagnóstico de empacotamento New; instalador/blockmap New 1.14.0 substituído; perfil visual da sétima onda; duas bases de smoke, banco de integração e cópias de segurança geradas exclusivamente pelos testes; três scripts pontuais de preparação/integração.

Antes da remoção, caminhos absolutos foram limitados ao workspace, alvos rastreados pelo Git e pontos de redirecionamento foram rejeitados. Após remover, hashes de código, documentação, JAR, backups SQLite e quatro instaladores preservados ficaram iguais. Mantidos New 1.16.0 gerada, New 1.15.0 instalada, Stable 1.14.0/1.6.0, frontend/JAR atuais, manifestos e evidências finais. Dados da aplicação e instalações em AppData não foram modificados. Manifesto local em `.atualizacao_status/seventh-wave-cleanup.json`.

## Complemento — New 1.15.0, 06/10/2026

Após os testes, o build e a conferência do pacote, foram removidos sete alvos: `release/New/win-unpacked`, seu `builder-debug.yml`, perfil Chromium e banco vazio do smoke test da sexta onda, registro de falha visual já resolvida e dois scripts pontuais de integração. Total: 142 arquivos e 461.745.457 bytes (cerca de 440 MiB).

Os caminhos absolutos foram limitados ao workspace; todos os alvos eram não rastreados pelo Git e não continham pontos de redirecionamento. Os hashes dos quatro instaladores preservados (New 1.15.0, New 1.14.0, Stable 1.14.0 e Stable 1.6.0) e dos seis backups SQLite ficaram inalterados. Código, dependências, frontend compilado, JAR atual, manifestos, capturas e relatórios finais foram mantidos. Manifesto local em `.atualizacao_status/sixth-wave-cleanup.json`. Nenhuma instalação ou dado da aplicação foi alterado.

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
