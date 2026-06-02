# Arquitetura das Opcoes Gerais

A tela `options.html` manteve o arquivo `js/options-geral.js` como entrada de compatibilidade, mas a implementacao foi dividida em modulos menores em `js/options/geral/`. Antes deles, o HTML carrega `js/shared/texts.js`, `js/shared/dom.js` e `js/shared/storage.js` para manter textos, criacao de DOM e storage em pontos comuns.

## Modulos

- `00-state.js`: referencias do DOM, estado compartilhado e atalhos padrao.
- `01-status.js`: badges de status da tela geral.
- `02-editable-lists.js`: renderizacao e edicao de blacklist e dicionario.
- `03-shortcuts.js`: gravacao e carregamento de atalhos.
- `04-backup.js`: exportacao e importacao de backup.
- `05-settings-events.js`: eventos da tela, salvamento, carregamento inicial e storage listener.
- `06-bootstrap.js`: inicializacao da pagina geral.

## Entrada

`js/options-geral.js` chama `iniciarPaginaGeral()` depois que todos os modulos foram carregados pelo HTML.

Essa organizacao reduz o tamanho do antigo arquivo unico e deixa cada area da tela com um ponto claro de manutencao.
