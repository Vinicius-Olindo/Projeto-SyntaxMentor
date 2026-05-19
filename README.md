# SyntaxMentor

Extensão de correção ortográfica e gramatical para Chrome (Manifest V3), com suporte a múltiplos idiomas, modo offline, análise de sentimentos, API pública e sincronização entre dispositivos.

**Versão atual:** 2.9.0 Elite

---

## Funcionalidades

**Correção**
- Correção ortográfica e gramatical em tempo real via [LanguageTool](https://languagetool.org)
- Detecção automática de idioma (pt-BR, en-US, es, fr, de, it)
- Modo offline com dicionário local — fallback automático sem conexão
- Correção de voz para texto — perfil dedicado para transcrições de áudio
- Histórico de correções da sessão com reverter individual por item
- Histórico de desfazer (Ctrl+Z)

**Interface**
- Bolinha flutuante arrastável com contagem de erros
- Painel com três abas: Gramática, Sentimento e Histórico
- Preview dos erros diretamente no popup da extensão com aplicação em um clique
- Tooltip flutuante ao revisar texto selecionado pelo menu de contexto
- Modo Foco — oculta a interface durante a digitação
- Modo Confirmação — pede aprovação antes de aplicar correções

**Aprendizado**
- Modo Aprendizado — explica o motivo de cada correção com categoria, exemplo e link de referência
- Análise de sentimento com detecção de negação e intensificadores
- Dashboard com estatísticas globais, erros mais comuns, uso por site e sequência diária (streak)

**Configuração**
- Dicionário pessoal (palavras ignoradas)
- Blacklist e whitelist de sites
- Sincronização entre dispositivos via `chrome.storage.sync`
- API Key do LanguageTool Premium (armazenada em session storage)
- Exportação e importação de configurações em JSON
- Exportação de relatórios

**API pública** para integração em outros sites (`window.SyntaxMentor`)

---

## Instalação

### No Chrome (modo desenvolvedor)

1. Faça o download ou clone este repositório
2. Acesse `chrome://extensions`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação**
5. Selecione a pasta raiz do projeto

### Atalhos de teclado

Os atalhos abaixo são os padrões. Todos podem ser personalizados em **Configurações → Atalhos**.

| Atalho | Ação |
|---|---|
| `Alt+Shift+A` | Ativar a extensão no site atual |
| `Alt+Shift+D` | Desativar a extensão no site atual |
| `Alt+S` | Abrir/fechar painel de correções |
| `Alt+I` | Ignorar erro selecionado |
| `Alt+Shift+S` | Corrigir tudo automaticamente |

> Os atalhos principais são registrados via `chrome.commands` e funcionam mesmo com o foco fora da página.

---

## Configuração

### API Key (opcional)

Acesse as configurações da extensão → aba **Segurança** e informe sua API Key do LanguageTool Premium para remover os limites de requisição da versão gratuita. A chave é armazenada em `chrome.storage.session` e não persiste entre sessões do navegador.

### API URL personalizada

Se você hospeda sua própria instância do LanguageTool, informe a URL na aba **Segurança**:

```
http://localhost:8010/v2/check
```

### Sincronização entre dispositivos

Ative o toggle **Sincronização na nuvem** em Configurações → Segurança para sincronizar automaticamente usando `chrome.storage.sync`. Itens sincronizados: dicionário pessoal, blacklist, idioma, atalhos, whitelist e modo whitelist.

### Debug

Para ativar logs detalhados no console, execute no DevTools da página:

```javascript
localStorage.setItem('sm_debug', 'true');
```

---

## Menu de contexto

Selecione qualquer texto e clique com o botão direito para acessar:

- **Revisar seleção** — verifica o texto e exibe tooltip flutuante com os erros encontrados
- **Adicionar ao dicionário** — adiciona a palavra ao dicionário pessoal
- **Ignorar nesta sessão** — ignora a palavra durante a sessão atual

---

## API Pública

O SyntaxMentor expõe uma API global (`window.SyntaxMentor`) para sites que queiram usar o corretor programaticamente. A API tem rate limiting de 10 chamadas/s e debounce de 300ms.

### Uso básico

```javascript
if (window.SyntaxMentor) {
  const resultado = await window.SyntaxMentor.correct('Eu gosto de programaçao');
  console.log(resultado.correctedText);   // "Eu gosto de programação"
  console.log(resultado.corrections);     // array de erros encontrados
  console.log(resultado.totalErrors);     // 1
}
```

### Configuração da API

```javascript
window.SyntaxMentor.configure({
  language: 'pt-BR',    // idioma (padrão: pt-BR)
  pickyMode: true,      // modo rigoroso
  apiUrl: 'https://api.languagetool.org/v2/check'
});
```

### Corrigir elemento HTML

```javascript
const input = document.getElementById('meu-textarea');
await window.SyntaxMentor.correctElement(input);
```

### Adicionar palavras ao dicionário

Palavras são validadas antes de salvar (máx. 60 caracteres, somente letras, hífen e apóstrofo).

```javascript
window.SyntaxMentor.addToDictionary('SyntaxMentor');
window.SyntaxMentor.addToDictionary(['Digisac', 'Blip']);
```

### Estrutura do retorno de `correct()`

```json
{
  "success": true,
  "text": "texto original",
  "correctedText": "texto corrigido",
  "totalErrors": 2,
  "language": "pt-BR",
  "corrections": [
    {
      "original": "programaçao",
      "suggestions": ["programação"],
      "message": "Possível erro ortográfico",
      "offset": 15,
      "length": 11,
      "rule": {
        "id": "MORFOLOGIK_RULE_PT_BR",
        "category": "Possíveis erros",
        "categoryId": "TYPOS"
      }
    }
  ]
}
```

### Evento de carregamento

```javascript
window.addEventListener('syntaxmentor-ready', (e) => {
  console.log('API pronta, versão:', e.detail.version);
});
```

---

## Estrutura do projeto

```
├── manifest.json               # Configuração da extensão (MV3)
├── popup.html / js/popup.js    # Popup com preview de erros e aplicação rápida
├── options.html                # Página de configurações gerais
├── options-dashboard.html      # Dashboard de estatísticas
├── options-seguranca.html      # Configurações de API e segurança
├── welcome.html                # Página de boas-vindas (pós-install)
├── api-docs.html               # Documentação da API pública
├── api-usage.html              # Exemplos de uso da API
├── js/
│   ├── background.js           # Service Worker — commands, sync, menu de contexto
│   ├── content.js              # Script injetado nas páginas
│   ├── popup.js                # Lógica do popup
│   ├── public-api.js           # API pública (window.SyntaxMentor)
│   ├── api-usage.js            # Lógica da página de exemplos
│   ├── offline-grammar.js      # Verificador offline
│   ├── offline-mode.js         # Gerenciador do modo offline
│   ├── sentiment-analysis.js   # Análise de sentimentos
│   ├── sentiment-ui.js         # UI da análise de sentimentos
│   ├── export-reports.js       # Exportação de relatórios
│   ├── options-dashboard.js    # Dashboard (streak, stats por site)
│   ├── options-geral.js        # Lógica das configurações gerais
│   ├── options-seguranca.js    # Configurações de API, segurança e cloudSync
│   ├── options-utils.js        # Utilitários compartilhados
│   └── options.js              # Navegação entre abas de configurações
├── css/                        # Estilos
├── icons/                      # Ícones (16×16, 32×32, 48×48, 128×128px)
├── Arquivos-Dicionario/        # Dicionário local para modo offline
└── tests/
    ├── content.test.js         # Testes de content.js
    ├── public-api.test.js      # Testes de public-api.js
    └── options-geral.test.js   # Testes de options-geral.js
```

---

## Testes

```bash
# Instalar dependências
npm install

# Rodar os testes
npm test

# Rodar em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

---

## Sites suportados com integração especial

- Digisac (`*.digisac.com.br`, `*.digisac.io`)
- Blip (`*.blip.ai`, `*.take.io`)

Outros sites funcionam via content script padrão. Shadow DOM e iframes são suportados automaticamente.

---

## Segurança

- API Key em `chrome.storage.session` (não persiste entre sessões)
- Todos os dados da API passam por `escapeHtml()` antes de entrar no DOM
- `addToDictionary()` valida entrada com regex Unicode antes de salvar
- Scripts inline removidos de todas as páginas HTML (conformidade com CSP)
- Permissões mínimas no manifest

---

## Changelog

### 2.8.0
- Popup com preview dos erros ativos e aplicação direta
- Menu de contexto "Revisar seleção" com tooltip flutuante
- Modo aprendizado enriquecido com categoria, exemplo e link de referência
- Atalhos principais via `chrome.commands` (funcionam sem foco na página)
- Streak diário e meta de correções no dashboard
- Sincronização real entre dispositivos (`chrome.storage.sync`)
- Estatísticas por site no dashboard
- Análise de sentimento com detecção de negação e intensificadores
- Perfil de correção para voz para texto (`insertFromSpeech`)
- Aba Histórico no painel com reverter individual
- Rate limiting na API pública (10 chamadas/s, debounce 300ms)
- Cache do dicionário pessoal em memória
- Flag `isExtensaoMutando` para evitar loops no MutationObserver
- Modal `smConfirm` substituindo `window.confirm` nativo

### 2.7.1
- Correção do `toggleSiteGlobal` fora do listener
- Correção do bug de regex na substituição de texto
- Ícones regenerados nos tamanhos corretos
- `chrome.alarms` substituindo `setTimeout` longo no Service Worker
- Caminho correto do `api-usage.html` no manifest

---

## Licença

Projeto privado. Todos os direitos reservados.