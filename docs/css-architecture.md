# Arquitetura CSS

Os estilos foram divididos por area da extensao para reduzir o tamanho dos arquivos principais e facilitar manutencao.

## Entradas principais

- `css/style.css`: entrada usada pelas paginas de opcoes.
- `css/popup.css`: entrada usada pelo popup.

## Modulos

- `css/options/`: layout, componentes compartilhados, seguranca, geral, tema escuro e responsividade das telas de opcoes.
- `css/popup/`: layout, dicionario/rodape e tema escuro do popup.
- `css/content/`: bolinha flutuante, painel, cards, animacoes, responsividade e tema escuro do content script.

## Carregamento

As paginas internas carregam os arquivos de entrada. O content script carrega os
modulos diretamente pelo `manifest.json`, em ordem, para evitar dependencia de
`@import` em CSS injetado pelo Chrome.
