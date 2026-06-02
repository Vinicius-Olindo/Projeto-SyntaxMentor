# Arquitetura do content script

O content script fica dividido em modulos menores em `js/content/`. Eles sao
scripts classicos do Chrome Extension Manifest V3 e sao carregados em ordem pelo
`manifest.json`.

## Ordem dos modulos

1. `js/shared/texts.js` - textos compartilhados de UI.
2. `js/shared/dom.js` - criacao segura de elementos DOM.
3. `js/shared/storage.js` - acesso centralizado ao `chrome.storage`.
4. `00-state.js` - estado global e configuracao base.
5. `01-platform-utils.js` - utilitarios de DOM, storage, mensagens e badge.
6. `02-editor-events.js` - desfazer, feedback visual e eventos nativos de edicao.
7. `03-page-review.js` - pontuacao local e revisao de pagina inteira.
8. `04-context-observers.js` - modo foco, Shadow DOM, iframes, idioma e toggle de site.
9. `05-grammar-highlights.js` - chamada de gramatica, grifos e fila de requisicoes.
10. `06-corrections-stats.js` - aplicar correcoes e confirmacoes.
11. `07-ui-panel.js` - bolha, painel principal e arraste.
12. `08-shortcuts-input.js` - atalhos e listeners de digitacao.
13. `09-messaging.js` - mensagens recebidas de popup/background/context menu.
14. `11-bootstrap.js` - configuracao final, limpeza e inicializacao.

## Regra de manutencao

Mantenha novas funcoes no modulo da responsabilidade correspondente. Se um
modulo precisar chamar uma funcao declarada depois dele, evite executar essa
chamada no carregamento inicial; deixe a chamada acontecer em eventos, callbacks
ou depois de `iniciar()`.

O script efetivo e a lista declarada em `manifest.json`.
