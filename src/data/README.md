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

Na aba **TEXTURAS**, o botão **Importar textures/models** aceita múltiplos arquivos de imagem e modelos (`.obj`, `.b3d`, `.glb`, `.gltf`, `.blend`, `.bbmodel`, `.mtl` e `.x`). Os modelos são listados como assets importados e as imagens são exibidas em miniaturas.
