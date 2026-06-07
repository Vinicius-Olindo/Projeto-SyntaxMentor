# SyntaxMentor

SyntaxMentor e uma extensao para Chrome focada em revisao ortografica e gramatical em campos de texto da web. Ela acompanha a digitacao, consulta o LanguageTool e apresenta sugestoes em uma interface leve, com configuracoes por idioma, site e modo de uso.

## Principais recursos

- Revisao ortografica e gramatical via LanguageTool.
- Painel lateral com sugestoes, acoes de corrigir, ignorar e adicionar ao dicionario.
- Correcao em lote e desfazer ultima correcao.
- Dicionario pessoal para nomes, termos tecnicos e palavras recorrentes.
- Blacklist, whitelist e controles por dominio.
- Modos de confirmacao, leitura, foco e aprendizado.
- Pagina de boas-vindas aberta automaticamente na instalacao.
- Configuracoes de idioma, velocidade, tema e chave de API em armazenamento seguro de sessao.

## Estrutura do projeto

```text
SyntaxMentor/
|-- manifest.json
|-- popup.html
|-- options.html
|-- options-seguranca.html
|-- welcome.html
|-- css/
|   |-- content/
|   |-- options/
|   |-- popup/
|   |-- popup.css
|   |-- style.css
|   `-- welcome.css
|-- js/
|   |-- background/
|   |-- content/
|   |-- options/
|   |-- shared/
|   |-- background.js
|   |-- popup.js
|   |-- options.js
|   |-- options-geral.js
|   |-- options-seguranca.js
|   |-- options-utils.js
|   `-- welcome.js
|-- icons/
|-- docs/
`-- tests/
```

## Permissoes

- `storage`: salva configuracoes, dicionario pessoal e listas de sites.
- `activeTab`: permite comunicacao com a aba ativa.
- `contextMenus`: adiciona acoes rapidas ao menu de contexto.
- `https://api.languagetool.org/*`: permite consultar o motor de revisao.

## Desenvolvimento

Requisitos:

- Node.js instalado.
- Chrome ou navegador compativel com extensoes Manifest V3.

Executar validacoes:

```bash
npm test
```

A suite verifica sintaxe, referencias de arquivos, manifesto e pontos criticos dos scripts de conteudo, background e configuracoes.

## Como testar no Chrome

1. Abra `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em `Carregar sem compactacao`.
4. Selecione a pasta do projeto.
5. Recarregue a extensao apos alteracoes em scripts, CSS ou manifesto.

## Seguranca e privacidade

- Politica publica de privacidade: [privacy.html](privacy.html).
- O content script nao chama diretamente o LanguageTool; a consulta passa pelo background.
- A chave de API e mantida em `chrome.storage.session`.
- Scripts nao sao expostos em `web_accessible_resources`.
- Conteudos dinamicos da interface sao renderizados por APIs de DOM, evitando HTML injetado.
- URLs externas exibidas na interface passam por validacao antes de renderizar links.

## Versao

Versao atual: `2.8.1`

## Licenca

Distribuido sob a licenca MIT. Consulte [LICENSE](LICENSE) para mais detalhes.
