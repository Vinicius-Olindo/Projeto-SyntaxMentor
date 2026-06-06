# Chrome Web Store assets

Pacote visual para a primeira publicacao do SyntaxMentor na Chrome Web Store.

## Arquivos gerados

Todos os PNGs ficam em `store-assets/chrome-web-store/`.

- `icon-128-store.png`: icone 128x128 com area visual centralizada em 96x96.
- `promo-small-440x280.png`: imagem promocional obrigatoria da Chrome Web Store.
- `marquee-1400x560.png`: imagem promocional opcional para destaque.
- `screenshot-01-revisao-em-tempo-real-1280x800.png`: experiencia principal de revisao.
- `screenshot-02-painel-de-sugestoes-1280x800.png`: painel e correcoes em foco.
- `screenshot-03-controle-e-dicionario-1280x800.png`: popup, controles e dicionario.

## Requisitos usados

Baseado na documentacao oficial da Chrome Web Store:

- icone: PNG 128x128, com arte quadrada em aproximadamente 96x96;
- promocional pequena: 440x280;
- promocional marquee: 1400x560;
- screenshots: 1280x800 ou 640x400, cantos quadrados e sem padding.

## Como regenerar

Use o Python empacotado no ambiente do Codex ou qualquer Python com Pillow:

```powershell
& "C:\Users\vinim\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" store-assets\generate_store_assets.py
```

O script sobrescreve apenas os arquivos dentro de `store-assets/chrome-web-store/`.
