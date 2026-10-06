# Foco Java — orientação para agentes

- Consulte `Roadmap.md` antes de iniciar uma melhoria. Use perguntas interativas para lacunas relevantes.
- Mantenha a documentação funcional e técnica em `Doc/` atualizada, incluindo fluxos, entidades e diagramas.
- Para toda mudança funcional, aumente a cobertura Java e/ou Vitest. Rode `npm test` e, para integração/empacotamento, `npm run build`.
- A interface chama Spring somente pelo preload Electron. Spring deve permanecer em loopback e exigir o token local.
- Não publique ou envie mensagens para serviços externos. Dados da aplicação são locais.
- Antes de finalizar, explique em linguagem simples o que mudou e como foi validado.
- Sempre fazer uma limpeza no diretório daquilo que não é usado pelas versões atuais
