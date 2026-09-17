import catalogData from './data/bettercraftCatalog.json';
import { MinetestNodeMetadata } from './types';

interface CatalogItem {
  type: 'node' | 'item';
  name: string;
  description: string;
  drawtype?: string | null;
  mesh?: string | null;
  inventory_image?: string | null;
  wield_image?: string | null;
  tiles: string[];
  paramtype?: string | null;
  paramtype2?: string | null;
}

export interface BetterCraftItem {
  id: string;
  name: string;
  type: 'node' | 'craft' | 'craftitem' | 'tool' | 'item';
  mod: string;
  texture: string | null;
  textureName: string;
  color: string;
  category: string;
  drawtype?: string;
  drop?: string;
}

const catalogItems: CatalogItem[] = Array.isArray(catalogData)
  ? catalogData as CatalogItem[]
  : (catalogData as { items: CatalogItem[] }).items;

const CATALOG_OVERRIDES_KEY = 'blockframe_bettercraft_catalog_overrides';
const readCatalogOverrides = (): Record<string, Partial<BetterCraftItem> & { removed?: boolean }> => {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CATALOG_OVERRIDES_KEY) || '{}'); } catch { return {}; }
};

function categoryFor(item: CatalogItem): string {
  if (item.drawtype === 'plantlike' || item.name.includes('sapling') || item.name.includes('flower')) return 'Vegetation & Food';
  if (item.name.includes('ore') || item.name.includes('stone') || item.name.includes('block') || item.name.includes('brick')) return 'Blocks & Ores';
  if (item.name.includes('wood') || item.name.includes('plank') || item.name.includes('log')) return 'Construction & Decor';
  if (item.name.includes('redstone') || item.name.includes('piston') || item.name.includes('lever')) return 'Redstone & Tech';
  return item.type === 'node' ? 'Construction & Decor' : 'Items';
}

export const BETTERCRAFT_ITEMS: BetterCraftItem[] = catalogItems.map(item => {
  const id = item.name;
  const textureName = item.type === 'item'
    ? (item.inventory_image || `${id.replace(':', '_')}.png`)
    : (item.tiles[0] || `${id.replace(':', '_')}.png`);
  const type: BetterCraftItem['type'] = item.type;
  return {
    id,
    name: item.description,
    type,
    mod: id.split(':')[0] || 'unknown',
    texture: null,
    textureName,
    color: '#78716c',
    category: categoryFor(item),
    drawtype: item.drawtype || undefined,
    drop: undefined
  };
}).filter(item => !readCatalogOverrides()[item.id]?.removed).map(item => ({
  ...item,
  ...(readCatalogOverrides()[item.id] || {})
}));

export function updateBetterCraftItem(id: string, changes: { type?: 'node' | 'item'; textureName?: string }): void {
  const item = BETTERCRAFT_ITEMS.find(entry => entry.id === id);
  if (!item) return;
  Object.assign(item, changes);
  const overrides = readCatalogOverrides();
  overrides[id] = { ...overrides[id], ...changes };
  localStorage.setItem(CATALOG_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function removeBetterCraftItem(id: string): void {
  const index = BETTERCRAFT_ITEMS.findIndex(entry => entry.id === id);
  if (index >= 0) BETTERCRAFT_ITEMS.splice(index, 1);
  const paletteIndex = BETTERCRAFT_PALETTE_NODES.findIndex(entry => entry.id === id);
  if (paletteIndex >= 0) BETTERCRAFT_PALETTE_NODES.splice(paletteIndex, 1);
  itemsById.delete(id);
  if (id.includes(':')) itemsById.delete(id.split(':')[1]);
  const overrides = readCatalogOverrides();
  overrides[id] = { ...overrides[id], removed: true };
  localStorage.setItem(CATALOG_OVERRIDES_KEY, JSON.stringify(overrides));
}

// Map to MinetestNodeMetadata for the palette and 3D Viewport
export const BETTERCRAFT_PALETTE_NODES: MinetestNodeMetadata[] = BETTERCRAFT_ITEMS.map(item => {
  let category: MinetestNodeMetadata['category'] = 'bettercraft';
  if (item.category === 'Blocks & Ores') category = 'stone';
  else if (item.category === 'Vegetation & Food') category = 'natural';
  else if (item.category === 'Construction & Decor') category = 'wood';
  else if (item.category === 'Tools & Weapons' || item.category === 'Armor') category = 'special';
  else if (item.category === 'Redstone & Tech') category = 'industrial';

  return {
    id: item.id,
    name: item.name,
    category,
    color: item.color || '#78716c',
    texture: item.texture || undefined
  };
});

// Fast lookup map
const itemsById = new Map<string, BetterCraftItem>();
BETTERCRAFT_ITEMS.forEach(item => {
  itemsById.set(item.id, item);
  // Also index without prefix or with colon
  if (item.id.includes(':')) {
    itemsById.set(item.id.split(':')[1], item);
  }
});

export function findBetterCraftItem(id: string): BetterCraftItem | undefined {
  return itemsById.get(id);
}

/**
 * Generates the registration Lua code according to Luanti/Minetest item registration logic
 * as specified in builtin/game/item.lua (nodedef_default, craftitemdef_default, tooldef_default).
 */
export function generateLuaRegistrationCode(item: BetterCraftItem): string {
  const isNode = item.type === 'node';
  const isTool = item.type === 'tool';
  const isCraft = !isNode && !isTool;

  if (isNode) {
    return `-- Luanti Registration for ${item.id}
-- Built with core.nodedef_default logic
local S = core.get_translator and core.get_translator("${item.mod}") or function(s) return s end

core.register_node("${item.id}", {
    description = S("${item.name}"),
    drawtype = "${item.drawtype || 'normal'}",
    tiles = { "${item.textureName || (item.id.replace(':', '_') + '.png')}" },
    groups = { handy = 1, dig_immediate = 2, ${item.category === 'Blocks & Ores' ? 'building_block = 1, ' : ''}${item.category === 'Vegetation & Food' ? 'plant = 1, ' : ''} },
    walkable = ${item.drawtype === 'plantlike' || item.drawtype === 'torchlike' ? 'false' : 'true'},
    pointable = true,
    diggable = true,
    paramtype = "${item.drawtype === 'nodebox' || item.drawtype === 'torchlike' ? 'light' : 'none'}",
    drop = "${item.drop || item.id}",
})
`;
  }

  if (isTool) {
    return `-- Luanti Tool Registration for ${item.id}
-- Built with core.tooldef_default logic
local S = core.get_translator and core.get_translator("${item.mod}") or function(s) return s end

core.register_tool("${item.id}", {
    description = S("${item.name}"),
    inventory_image = "${item.textureName || (item.id.replace(':', '_') + '.png')}",
    wield_image = "${item.textureName || (item.id.replace(':', '_') + '.png')}",
    wield_scale = { x = 1, y = 1, z = 1 },
    stack_max = 1,
    tool_capabilities = {
        full_punch_interval = 0.8,
        max_drop_level = 3,
        groupcaps = {
            choppy = { times = { [1] = 2.00, [2] = 0.80, [3] = 0.40 }, uses = 50, maxlevel = 3 },
            snappy = { times = { [1] = 1.90, [2] = 0.90, [3] = 0.30 }, uses = 50, maxlevel = 3 },
        },
        damage_groups = { fleshy = 6 },
    },
})
`;
  }

  return `-- Luanti Craftitem Registration for ${item.id}
-- Built with core.craftitemdef_default logic
local S = core.get_translator and core.get_translator("${item.mod}") or function(s) return s end

core.register_craftitem("${item.id}", {
    description = S("${item.name}"),
    inventory_image = "${item.textureName || (item.id.replace(':', '_') + '.png')}",
    wield_image = "${item.textureName || (item.id.replace(':', '_') + '.png')}",
    wield_scale = { x = 1, y = 1, z = 1 },
    stack_max = 99,
    groups = { ${item.category === 'Vegetation & Food' ? 'food = 1, ' : ''}craftitem = 1 },
    on_place = core.item_place,
    on_drop = core.item_drop,
    on_use = ${item.category === 'Vegetation & Food' ? 'core.item_eat(4)' : 'nil'},
})
`;
}
