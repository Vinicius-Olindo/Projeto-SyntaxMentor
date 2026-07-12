# Checklist de teste beta em navegador

Use este checklist antes de publicar a extensão.

## Instalação limpa

- Remover a versão antiga da extensão.
- Abrir `chrome://extensions`.
- Ativar modo de desenvolvedor.
- Carregar a pasta do projeto.
- Confirmar que a tela de boas-vindas abre corretamente.
- Confirmar que a revisão online começa desligada.

## Campos básicos

- Testar `input[type=text]`.
- Testar `textarea`.
- Testar `contenteditable`.
- Testar texto curto com erro simples.
- Testar texto longo acima de 5.000 caracteres.
- Confirmar que texto longo não é enviado automaticamente para revisão online.

## Sites reais

- Gmail.
- LinkedIn.
- Notion.
- Google Docs.
- Formulário comum em página simples.

## Segurança

- Campo de senha.
- Campo de cartão.
- Campo de CPF/CNPJ.
- Campo de token/API key.
- Campo numérico.

## Fluxos principais

- Revisão local sem consentimento online.
- Ativar revisão online manualmente.
- Revisar campo manualmente.
- Corrigir uma sugestão.
- Corrigir tudo.
- Desfazer correção.
- Adicionar termo ao dicionário pessoal.
- Desativar extensão por site.
- Reativar extensão por site.
