<div align="center">

# ✨ SyntaxMentor

**Extensão de correção ortográfica e gramatical gratuita para Chrome**

[![Version](https://img.shields.io/badge/version-2.8.0-blue.svg)](https://github.com/Vinicius-Olindo/Projeto-SyntaxMentor/releases)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)]()
[![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)]()
[![License](https://img.shields.io/github/license/Vinicius-Olindo/Projeto-SyntaxMentor)](../../Projeto-SyntaxMentor - Codex/LICENSE)
[![Stars](https://img.shields.io/github/stars/Vinicius-Olindo/Projeto-SyntaxMentor)](https://github.com/Vinicius-Olindo/Projeto-SyntaxMentor/stargazers)
[![GitHub release](https://img.shields.io/github/v/release/Vinicius-Olindo/Projeto-SyntaxMentor)](https://github.com/Vinicius-Olindo/Projeto-SyntaxMentor/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/Vinicius-Olindo/Projeto-SyntaxMentor)](https://github.com/Vinicius-Olindo/Projeto-SyntaxMentor/commits/main)

</div>
<div align="justify">

---

## 📋 Índice

- [Visão Geral](../../Projeto-SyntaxMentor - Codex/README.md#-visão-geral)
- [Funcionalidades](../../Projeto-SyntaxMentor - Codex/README.md#-funcionalidades)
- [Instalação](../../Projeto-SyntaxMentor - Codex/README.md#-instalação)
- [Atalhos de Teclado](../../Projeto-SyntaxMentor - Codex/README.md#-atalhos-de-teclado)
- [Menu de Contexto](../../Projeto-SyntaxMentor - Codex/README.md#-menu-de-contexto)
- [API Pública](../../Projeto-SyntaxMentor - Codex/README.md#-api-pública)
- [Configurações](../../Projeto-SyntaxMentor - Codex/README.md#-configurações)
- [Estrutura do Projeto](../../Projeto-SyntaxMentor - Codex/README.md#-estrutura-do-projeto)
- [Testes](../../Projeto-SyntaxMentor - Codex/README.md#-testes)
- [Segurança e Permissões](../../Projeto-SyntaxMentor - Codex/README.md#-segurança-e-permissões)
- [Sites Suportados](../../Projeto-SyntaxMentor - Codex/README.md#-sites-suportados)
- [Arquitetura Técnica](../../Projeto-SyntaxMentor - Codex/README.md#-arquitetura-técnica)
- [Changelog](../../Projeto-SyntaxMentor - Codex/README.md#-changelog)
- [Contribuindo](../../Projeto-SyntaxMentor - Codex/README.md#-contribuindo)
- [Licença](../../Projeto-SyntaxMentor - Codex/README.md#-licença)

---

## 🚀 Visão Geral

**SyntaxMentor** é uma extensão para Google Chrome que realiza correção ortográfica e gramatical em tempo real diretamente nos campos de texto da web. Integrada ao [LanguageTool](https://languagetool.org), suporta múltiplos idiomas com detecção automática, oferece análise de sentimentos, dicionário pessoal, sincronização em nuvem e uma API JavaScript pública para integração com outras ferramentas.

Construída sobre **Manifest V3**, usa Service Worker como background script, `chrome.storage` para persistência/sincronização e `chrome.alarms` para tarefas agendadas — garantindo compatibilidade com as diretrizes modernas da Chrome Web Store.

| Atributo               | Detalhe                      |
| ---------------------- | ---------------------------- |
| **Versão atual**       | `2.8.0`                      |
| **Manifest**           | V3                           |
| **Motor de correção**  | LanguageTool API             |
| **Idiomas suportados** | pt-BR, en-US, es, fr, de, it |
| **Compatibilidade**    | Google Chrome 88+            |

---

## 🎯 Funcionalidades

### 📝 Correção Gramatical em Tempo Real

- Verificação contínua via LanguageTool enquanto o usuário digita
- Detecção automática de idioma do texto
- Perfil dedicado para correção de transcrições de voz
- Histórico de até **20 ações** com desfazer individual por item (`Ctrl+Z`)
- Filtro inteligente de duplicatas: remove erros repetidos por posição sem agrupar palavras distintas

### 🎨 Interface

A interface é composta por uma **bolinha flutuante arrastável** que exibe o contador de erros ativos. Durante a verificação, ela pulsa e emite efeito visual de ondas. Ao clicar, abre um **painel lateral com três abas**:

| Aba            | Conteúdo                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| **Gramática**  | Cards de erro com opções de corrigir, ignorar ou adicionar ao dicionário |
| **Sentimento** | Resultado da análise de tom e sugestões de reescrita                     |
| **Histórico**  | Log de correções aplicadas com opção de reversão individual              |

**Tooltip flutuante** é exibido ao selecionar texto para revisão pontual.

**Modos especiais:**

| Modo            | Comportamento                                               |
| --------------- | ----------------------------------------------------------- |
| **Foco**        | Oculta a interface durante a digitação para não distrair    |
| **Confirmação** | Exige aprovação explícita antes de aplicar cada correção    |
| **Aprendizado** | Exibe categoria, motivo e link de referência para cada erro |

### 📊 Análise de Sentimento

Motor próprio (`sentiment-analysis.js`) que detecta:

- **Palavras negativas** com sugestões de alternativas profissionais (ex: "problema" → "oportunidade de melhoria")
- **Tom agressivo** com sugestão de linguagem colaborativa
- **Intensificadores** que podem soar inadequados em contexto profissional
- **Score geral** do texto: `negative`, `slightly_negative`, `neutral`, `slightly_positive`, `positive`

Os resultados aparecem na aba **Sentimento** do painel, com opção de reescrita sugerida por frase.

### 📚 Dashboard de Aprendizado

Acessível pelas configurações, exibe:

- Estatísticas de uso acumulado
- Streak diário de atividade
- Conquistas desbloqueadas
- Erros mais frequentes do usuário

### ⚙️ Configurações

Acessível em `chrome://extensions` → SyntaxMentor → Detalhes → Opções, ou via clique com botão direito no ícone da extensão.

| Funcionalidade            | Descrição                                                             |
| ------------------------- | --------------------------------------------------------------------- |
| **Dicionário pessoal**    | Adicione palavras que não devem ser sinalizadas (validação Unicode)   |
| **Blacklist / Whitelist** | Controle por domínio: bloqueie ou libere sites individualmente        |
| **Modo Whitelist**        | Ativa a extensão apenas nos sites autorizados                         |
| **Cloud Sync**            | Sincroniza configurações entre dispositivos via `chrome.storage.sync` |
| **API Key Premium**       | Remove limites de requisição (armazenada em `sessionStorage`)         |
| **Exportar / Importar**   | Backup completo de configurações em JSON ou TXT                       |
| **Relatórios**            | Exportação do histórico de correções em CSV ou HTML                   |
| **Modo escuro**           | Disponível em todas as telas de configuração                          |

---

## 📦 Instalação

### Pré-requisitos

- Google Chrome 88 ou superior
- Modo desenvolvedor habilitado

### Via repositório (desenvolvimento)

```bash
# 1. Clone o repositório
git clone https://github.com/Vinicius-Olindo/Projeto-SyntaxMentor.git
cd Projeto-SyntaxMentor

# 2. Instale as dependências de desenvolvimento (apenas para testes)
npm install

# 3. Abra a página de extensões do Chrome
# Cole na barra de endereços:
chrome://extensions

# 4. Ative o "Modo do desenvolvedor" (toggle no canto superior direito)

# 5. Clique em "Carregar sem compactação"

# 6. Selecione a pasta raiz do projeto (onde está manifest.json)
```

### Via arquivo ZIP

1. Extraia o arquivo ZIP em uma pasta local
2. Siga os passos 3–6 acima, selecionando a pasta extraída

Após carregar, o ícone do SyntaxMentor aparecerá na barra de ferramentas. Clique nele para abrir o popup e iniciar a configuração.

---

## ⌨️ Atalhos de Teclado

| Atalho            | Ação                                    |
| ----------------- | --------------------------------------- |
| `Alt + S`         | Abrir / fechar painel de correções      |
| `Alt + Shift + A` | Ativar SyntaxMentor no site atual       |
| `Alt + Shift + D` | Desativar SyntaxMentor no site atual    |
| `Alt + Shift + S` | Corrigir todos os erros automaticamente |
| `Ctrl + Z`        | Desfazer última correção aplicada       |

> Os atalhos podem ser personalizados em `chrome://extensions/shortcuts`.

---

## 🖱️ Menu de Contexto

Ao selecionar um texto em qualquer página e clicar com o botão direito, o SyntaxMentor adiciona opções ao menu de contexto para revisão rápida do trecho selecionado, sem precisar abrir o painel completo.

---

## 🔌 API Pública

O SyntaxMentor expõe uma API JavaScript acessível via `window.SyntaxMentor` em qualquer página onde a extensão esteja ativa. Útil para integrações com outras ferramentas ou automações no browser.

### Limites

| Parâmetro      | Valor                        |
| -------------- | ---------------------------- |
| **Rate limit** | 10 chamadas por segundo      |
| **Cache LRU**  | 50 entradas, TTL de 1 minuto |

### Métodos disponíveis

```javascript
// Verificar um texto manualmente
// Retorna: { matches: [...], language: {...} }
const resultado = await window.SyntaxMentor.check("Texto para verficar");

// Obter todos os erros ativos na página atual
const erros = window.SyntaxMentor.getErrors();

// Aplicar todas as correções sugeridas de uma vez
window.SyntaxMentor.fixAll();

// Obter status atual da extensão
// Retorna: { active: boolean, errorCount: number, language: string }
const status = window.SyntaxMentor.getStatus();
```

> Para documentação completa, abra `api-docs.html` no navegador ou consulte `api-usage.html` para o monitor de consumo da API.

---

## 🗂️ Estrutura do Projeto

```
SyntaxMentor/
│
├── manifest.json                   # Configuração da extensão (Manifest V3)
├── package.json                    # Scripts do projeto
│
├── popup.html                      # Interface do popup da barra de ferramentas
├── options.html                    # Página principal de configurações
├── options-dashboard.html          # Dashboard de estatísticas e conquistas
├── options-seguranca.html          # Configurações de segurança e privacidade
├── welcome.html                    # Página de boas-vindas (pós-instalação)
├── api-docs.html                   # Documentação da API pública
├── api-usage.html                  # Monitor de uso da API
├── teste.html                      # Página de testes manuais
│
├── js/
│   ├── background.js               # Service Worker — núcleo da extensão
│   ├── content.js                  # Entrada legada do content script
│   ├── popup.js                    # Lógica do popup
│   ├── public-api.js               # API pública (window.SyntaxMentor)
│   ├── sentiment-analysis.js       # Motor de análise de sentimento
│   ├── sentiment-ui.js             # Interface da análise de sentimento
│   ├── options.js                  # Entrypoint das opções
│   ├── options-geral.js            # Entrada das configurações gerais
│   ├── options-seguranca.js        # Lógica das configurações de segurança
│   ├── options-dashboard.js        # Lógica do dashboard
│   ├── options-utils.js            # Utilitários compartilhados de opções
│   ├── export-reports.js           # Exportação de relatórios (CSV/HTML)
│   ├── security.js                 # Validações e proteções de segurança
│   ├── api-usage.js                # Monitor de consumo da API
│   ├── content/                    # Módulos do content script
│   └── options/geral/              # Módulos da página de opções gerais
│
├── css/
│   ├── style.css                   # Entrada dos estilos das opções
│   ├── content.css                 # Entrada legada dos estilos injetados
│   ├── popup.css                   # Entrada dos estilos do popup
│   ├── sentiment.css               # Entrada legada do painel de sentimento
│   ├── options/                    # Módulos das telas de opções
│   ├── content/                    # Módulos do content script
│   └── popup/                      # Módulos do popup
│
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── logo.svg
│
├── Arquivos-Dicionario/
│   ├── dicionario.json             # Dicionário pessoal padrão (termos técnicos)
│   └── palavras-teste.txt          # Palavras para testes de dicionário
│
└── tests/
    ├── content.test.js             # Testes unitários do content script
    ├── options-geral.js            # Testes das configurações gerais
    ├── public-api-js               # Testes da API pública
    ├── run-tests.js                # Runner de testes
    └── setup.js                    # Configuração do ambiente (mocks do Chrome)
```

---

## 🧪 Testes

O projeto usa um runner local em Node.js, sem dependências externas, para validar sintaxe, referências do manifest/HTML e pontos críticos de segurança.

```bash
# Instalar dependências
npm install

# Rodar todos os testes
npm test

# Rodar em modo watch simples (re-executa ao salvar)
npm run test:watch

# Rodar a mesma suíte com aviso de cobertura estática
npm run test:coverage
```

Os testes cobrem validações importantes de `content.js`, configurações gerais, API pública, manifest e referências de arquivos. A página `teste.html` também pode ser carregada no browser para testes manuais de interface.

---

## 🔒 Segurança e Permissões

### Permissões declaradas

| Permissão      | Motivo                                        |
| -------------- | --------------------------------------------- |
| `storage`      | Salvar e sincronizar configurações do usuário |
| `activeTab`    | Acessar a aba ativa para injetar a interface  |
| `scripting`    | Injetar o content script programaticamente    |
| `contextMenus` | Adicionar opções ao menu de contexto          |
| `alarms`       | Agendar remoção do badge "NEW" após 7 dias    |

### Host permissions

A extensão faz requisições de rede **exclusivamente** para:

- `https://api.languagetool.org` — motor de correção gramatical
- `https://*.digisac.com.br` e `https://*.digisac.io` — suporte especial
- `https://*.blip.ai` e `https://*.take.io` — suporte especial

### Armazenamento de dados sensíveis

- **API Key Premium**: armazenada em `sessionStorage` — nunca persiste entre sessões e nunca vai para `chrome.storage`
- **Configurações do usuário**: `chrome.storage.local` (local) e `chrome.storage.sync` (Cloud Sync)
- **Dicionário pessoal**: `chrome.storage.local` com validação Unicode na entrada

### Proteções adicionais

- Content Security Policy (CSP) restritiva declarada no manifest (`frame-ancestors 'none'`, `form-action 'none'`, `object-src 'none'`)
- Saída HTML sanitizada via `escapeHtml()` para prevenir XSS em qualquer dado exibido na UI
- Módulo `security.js` dedicado a validações e proteções de runtime

---

## 🌐 Sites Suportados

Por padrão, a extensão é ativada em todos os sites (`<all_urls>`). O usuário pode refinar o comportamento via:

| Mecanismo           | Comportamento                                             |
| ------------------- | --------------------------------------------------------- |
| **Blacklist**       | Bloquear domínios específicos                             |
| **Whitelist**       | Ativar apenas nos domínios autorizados (Modo Whitelist)   |
| **Override manual** | Bloquear um site específico mesmo que esteja na whitelist |

Domínios com suporte e host permissions pré-configurados: `digisac.com.br`, `digisac.io`, `blip.ai`, `take.io`.

---

## 🏗️ Arquitetura Técnica

O SyntaxMentor segue o modelo padrão de extensões Manifest V3:

```
┌─────────────────────────────────────────────────────┐
│                  Chrome Browser                     │
│                                                     │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │  popup.html  │     │     Página da Web        │  │
│  │  popup.js    │     │  ┌────────────────────┐  │  │
│  └──────┬───────┘     │  │   content.js       │  │  │
│         │             │  │   (UI + correção)  │  │  │
│         │             │  │   public-api.js    │  │  │
│         ▼             │  └────────┬───────────┘  │  │
│  ┌──────────────────────────────┐ │              │  │
│  │      background.js           │◄┘              │  │
│  │   (Service Worker)           │                │  │
│  │  • Gerencia storage          │                │  │
│  │  • Controla blacklist        │                │  │
│  │  • Agenda alarms             │                │  │
│  └──────────────┬───────────────┘                │  │
│                 │                                 │  │
└─────────────────┼─────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  LanguageTool  │
         │     API        │
         └────────────────┘
```

**Fluxo de correção:**

1. `content.js` detecta input do usuário em campos de texto
2. Debounce + verificação de blacklist/whitelist via `background.js`
3. Requisição para `api.languagetool.org`
4. Erros exibidos como cards no painel lateral
5. Ação do usuário (corrigir / ignorar / adicionar ao dicionário) atualiza o DOM e o histórico

---

## 📝 Changelog

### v2.8.0 — Atual

- Efeito visual aprimorado: pulsação e ondas magnéticas na bolinha durante verificação
- Cards de erro compactos com largura adaptada ao conteúdo
- Botões "Ignorar" e "+Dic" redesenhados com textos curtos e melhor alinhamento
- Modo escuro completo e consistente em todas as abas de configuração
- Histórico de correções com reversão individual por item
- Contador de navegação corrigido (ex: `1/28` em vez de `—/28`)
- Filtro de erros: remove duplicatas por posição sem agrupar palavras distintas
- Primeiro erro destacado visualmente ao abrir o painel
- API pública com rate limit de 10 req/s e cache LRU de 1 minuto (50 entradas)
- Desfazer (`Ctrl+Z`) totalmente funcional e confiável

- Migração completa para Manifest V3
- Service Worker como background script
- Uso de `chrome.alarms` para gerenciamento do badge "NEW"

- Lançamento da API pública (`window.SyntaxMentor`)
- Dashboard de estatísticas e conquistas
- Cloud Sync via `chrome.storage.sync`

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, leia o [CODE_OF_CONDUCT.md](../../Projeto-SyntaxMentor - Codex/CODE_OF_CONDUCT.md) antes de abrir issues ou pull requests.

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Rode os testes (`npm test`)
4. Abra um Pull Request com uma descrição clara da mudança

---

## 📄 Licença

Distribuído sob os termos descritos em [LICENSE](../../Projeto-SyntaxMentor - Codex/LICENSE). Consulte o arquivo para detalhes completos.

---

<div align="center">

Desenvolvido por [Vinicius Olindo](https://github.com/Vinicius-Olindo)

</div>

</div>
