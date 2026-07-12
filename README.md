# SyntaxMentor

SyntaxMentor é uma extensão para Chrome focada em revisão ortográfica e gramatical em campos de texto da web. Ela acompanha a digitação, usa regras locais e, quando o usuário autoriza, consulta o LanguageTool para apresentar sugestões em uma interface leve, com configurações por idioma, site e modo de uso.

## Principais recursos

- Revisão ortográfica e gramatical com regras locais e integração opcional com o LanguageTool.
- Painel lateral com sugestões, ações de corrigir, ignorar e adicionar ao dicionário.
- Correção em lote e desfazer última correção.
- Dicionário pessoal para nomes, termos técnicos e palavras recorrentes.
- Blacklist, whitelist e controles por domínio.
- Modos de confirmação, leitura, foco, aprendizado e revisão manual.
- Página de boas-vindas aberta automaticamente na instalação.
- Configurações de idioma, velocidade, tema e chave de API em armazenamento seguro de sessão.

## Privacidade por padrão

A revisão online fica desativada por padrão. O usuário precisa autorizar explicitamente o envio de texto ao LanguageTool. Sem essa autorização, o SyntaxMentor usa somente a revisão local disponível na extensão.

Textos muito grandes não são enviados automaticamente para revisão online. Isso reduz exposição de dados, melhora a performance e evita uso excessivo da API.

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
|-- scripts/
|-- store-assets/
`-- tests/
```

## Permissões

- `storage`: salva configurações, dicionário pessoal e listas de sites.
- `activeTab`: permite comunicação com a aba ativa.
- `contextMenus`: adiciona ações rápidas ao menu de contexto.
- `https://api.languagetool.org/*`: permite consultar o motor externo de revisão somente quando a revisão online estiver autorizada.

## Desenvolvimento

Requisitos:

- Node.js instalado.
- Chrome ou navegador compatível com extensões Manifest V3.

Executar validações:

```bash
npm test
```

Gerar ZIP de publicação:

```bash
npm run build:zip
```

A suíte verifica sintaxe, referências de arquivos, manifesto e pontos críticos dos scripts de conteúdo, background e configurações.

## Como testar no Chrome

1. Abra `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em `Carregar sem compactação`.
4. Selecione a pasta do projeto.
5. Recarregue a extensão após alterações em scripts, CSS ou manifesto.

## Segurança e privacidade

- Política pública de privacidade: [privacy.html](privacy.html).
- O content script não chama diretamente o LanguageTool; a consulta passa pelo background.
- A chave de API é mantida em `chrome.storage.session`.
- Scripts não são expostos em `web_accessible_resources`.
- Conteúdos dinâmicos da interface são renderizados por APIs de DOM, evitando HTML injetado.
- URLs externas exibidas na interface passam por validação antes de renderizar links.
- A extensão evita revisar campos sensíveis, como senha, cartão, CPF, CNPJ, tokens e chaves de API.

## Versão

Versão atual: `2.8.2`

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais detalhes.
