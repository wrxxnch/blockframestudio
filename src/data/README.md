# Catálogo BetterCraft

`bettercraftCatalog.json` é gerado pelo script `tools/export_catalog.py` do repositório `luanti-bettercraft`.

Para atualizar o catálogo após alterar o jogo:

```bash
cd ../luanti-bettercraft
python3 tools/export_catalog.py \
  --game-root games/bettercraft \
  --output ../blockframestudio/src/data/bettercraftCatalog.json
```

O site importa diretamente o array JSON em `src/bettercraftRegistry.ts`. Cada posição possui `type` (`node` ou `item`), `name`, `description`, `drawtype`, `mesh`, `inventory_image`, `wield_image`, `tiles`, `paramtype` e `paramtype2`.

Na aba **TEXTURAS**, o site reconhece as duas saídas do exportador: o formato plano de `--gentexture`, com todos os arquivos diretamente em `textures/` e `models/`, e o formato de `--gentexture-separated`, com arquivos em `textures/<mod>/` e `models/<mod>/`. Use **Importar arquivos** para selecionar vários assets ou **Importar pasta textures/models** para selecionar a pasta gerada inteira. O caminho relativo identifica automaticamente se o arquivo é textura ou modelo e, quando aplicável, exibe o mod de origem.
