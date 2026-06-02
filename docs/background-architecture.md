# Arquitetura do background

O service worker principal fica em `js/background.js` e carrega os modulos de
`js/background/` com `importScripts()`. A ordem importa porque os scripts sao
classicos e compartilham o mesmo escopo global.

## Ordem dos modulos

1. `js/shared/storage.js` - wrappers para `chrome.storage.local` e `session`.
2. `00-config.js` - logs, constantes e comparacao segura de dominios.
3. `01-sites-storage.js` - regras de bloqueio/whitelist e overrides por site.
4. `02-language-tool.js` - montagem e chamada da API LanguageTool.
5. `03-badge-tabs.js` - badge, icone OFF e eventos de aba.
6. `04-context-menu.js` - menu de contexto e dicionario via selecao.
7. `05-messaging.js` - mensagens vindas do content/popup.
8. `06-lifecycle-commands.js` - instalacao, startup, storage changes e atalhos.

## Regra de manutencao

Mantenha novas funcoes no modulo da responsabilidade correspondente. O arquivo
`js/background.js` deve continuar apenas importando modulos e registrando os
listeners principais.
