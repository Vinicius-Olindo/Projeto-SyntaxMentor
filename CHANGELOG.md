# Changelog

## 2.8.3 - Correção de ocorrências repetidas

- Corrigido o tratamento de erros repetidos para preservar cada ocorrência com `offset` e `length` próprios.
- O painel agora mantém ocorrências repetidas como itens separados.
- O popup passa a enviar a ocorrência específica ao aplicar uma correção.
- O botão “Corrigir tudo” continua agrupando por texto para aplicação segura, mas conta todas as ocorrências aplicadas.
- Adicionados testes para validar palavras repetidas como `Ola`, `extensao` e `nao`.

## 2.8.2 - 2026-06-28

### Segurança e privacidade

- Revisão online pelo LanguageTool desligada por padrão.
- Tela de boas-vindas ajustada para exigir consentimento explícito antes da revisão online.
- Removida a diretiva `wasm-unsafe-eval` do CSP.
- Reduzido o escopo de execução em frames no manifesto.
- Adicionado limite de caracteres para revisão online automática.
- Adicionado backoff para erro 429 da API LanguageTool.
- Adicionado cache temporário de revisões para reduzir chamadas repetidas.

### Publicação

- Adicionado script `npm run build:zip`.
- Adicionado workflow de validação no GitHub Actions.
- Atualizados textos públicos com acentuação e explicação de privacidade.

### Qualidade

- Adicionadas configurações iniciais de ESLint e Prettier.
- Adicionado checklist de teste beta em navegador.
