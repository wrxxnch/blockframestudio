export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BlockFrameArgs {
  size: Vector3D;
  rotate: Vector3D;
  mirror: 'none' | 'x' | 'y' | 'z';
  glow: number; // 0 to 15 (minetest light level)
  collision: boolean;
  node: boolean; // if true Node mode, if false Item mode
}

export type EntityType = 'preview' | 'placed';

export interface BlockFrameEntity {
  id: string;
  node: string; // e.g. "default:stone"
  pos: Vector3D;
  args: BlockFrameArgs;
  type: EntityType;
  color?: string; // Hex color based on node type for voxel rendering
}

export interface CompositeStructure {
  id: string;
  name: string;
  entities: BlockFrameEntity[];
  size: Vector3D; // bounds x, y, z
}

export interface UndoStep {
  entities: BlockFrameEntity[];
  description: string;
}

export interface ProjectMetaData {
  id: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
  visibility: 'public' | 'private';
  downloads?: number;
  likes?: number;
  blockCount?: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  createdAt: string;
  preview_url?: string;
  json_url?: string;
}

export interface ProjectItem extends ProjectMetaData {
  entitiesJson: string; // serialized BlockFrame entities
}

// Built-in common Minetest node palette with standard voxel colors
export interface MinetestNodeMetadata {
  id: string;
  name: string;
  category: 'natural' | 'wood' | 'stone' | 'industrial' | 'colored' | 'glass' | 'special' | 'bettercraft';
  color: string;
  glow?: number;
  texture?: string;
}

export const MINETEST_NODES: MinetestNodeMetadata[] = [
  // Bettercraft Items & Blocks
  { id: 'mcl_farming:cookie', name: 'Cookie (Bettercraft)', category: 'bettercraft', color: '#c29a53', texture: '/texturas/cookie.png' },
  { id: 'mcl_farming:bread', name: 'Bread (Bettercraft)', category: 'bettercraft', color: '#b1723a', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_farming/textures/farming_bread.png' },
  { id: 'mcl_core:apple', name: 'Apple (Bettercraft)', category: 'bettercraft', color: '#e11d48', texture: '/texturas/apple.png' },
  { id: 'mcl_core:coal_lump', name: 'Coal Lump (Bettercraft)', category: 'bettercraft', color: '#2c2c2c', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_coal_lump.png' },
  { id: 'mcl_core:steel_ingot', name: 'Iron Ingot (Bettercraft)', category: 'bettercraft', color: '#d3d3d3', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_steel_ingot.png' },
  { id: 'mcl_core:gold_ingot', name: 'Gold Ingot (Bettercraft)', category: 'bettercraft', color: '#facc15', texture: '/texturas/gold.png' },
  { id: 'mcl_core:diamond', name: 'Diamond (Bettercraft)', category: 'bettercraft', color: '#38bdf8', texture: '/texturas/diamond.png' },
  { id: 'mcl_core:stick', name: 'Stick (Bettercraft)', category: 'bettercraft', color: '#a16207', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_stick.png' },
  { id: 'mcl_core:clay_lump', name: 'Clay Lump (Bettercraft)', category: 'bettercraft', color: '#a78bfa', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_clay_lump.png' },
  { id: 'mcl_core:flint', name: 'Flint (Bettercraft)', category: 'bettercraft', color: '#52525b', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_flint.png' },
  { id: 'mcl_core:paper', name: 'Paper (Bettercraft)', category: 'bettercraft', color: '#ffffff', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_paper.png' },
  
  { id: 'mcl_core:sapling', name: 'Oak Sapling (Bettercraft)', category: 'bettercraft', color: '#22c55e', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_sapling.png' },
  { id: 'mcl_core:junglesapling', name: 'Jungle Sapling (Bettercraft)', category: 'bettercraft', color: '#15803d', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_junglesapling.png' },
  { id: 'mcl_core:acacia_sapling', name: 'Acacia Sapling (Bettercraft)', category: 'bettercraft', color: '#f97316', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_acacia_sapling.png' },
  { id: 'mcl_core:cactus_flower', name: 'Cactus Flower (Bettercraft)', category: 'bettercraft', color: '#ec4899', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/cactus_flower.png' },
  { id: 'mcl_core:dry_shrub', name: 'Dry Shrub (Bettercraft)', category: 'bettercraft', color: '#ca8a04', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_core/textures/default_dry_shrub.png' },

  { id: 'mcl_lush_caves:spore_blossom', name: 'Spore Blossom (Bettercraft)', category: 'bettercraft', color: '#ec4899', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_lush_caves/textures/spore_blossom.png' },
  { id: 'mcl_mobitems:milk_bucket', name: 'Milk Bucket (Bettercraft)', category: 'bettercraft', color: '#f1f5f9', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_buckets/textures/bucket_milk.png' },
  { id: 'mcl_cake:cake', name: 'Cake (Bettercraft)', category: 'bettercraft', color: '#fbcfe8', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_cake/textures/cake_top.png' },
  { id: 'mcl_composters:composter', name: 'Composter (Bettercraft)', category: 'bettercraft', color: '#78350f', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_composters/textures/composter_side.png' },
  { id: 'mcl_bamboo:slab_bamboo_mosaic_three_sides_u', name: 'Bamboo Mosaic Slab (Bettercraft)', category: 'bettercraft', color: '#a3e635', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_bamboo/textures/bamboo_mosaic.png' },
  { id: 'mcl_colorblocks:slab_concrete_white_1', name: 'White Concrete Slab (Bettercraft)', category: 'bettercraft', color: '#e2e8f0', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/mcl_colorblocks/textures/concrete_white.png' },
  { id: 'mcl_wool:slab_white_1', name: 'White Wool Slab (Bettercraft)', category: 'bettercraft', color: '#ffffff', texture: 'https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/wool/textures/wool_white.png' },

  // Natural
  { id: 'default:dirt', name: 'Dirt Block', category: 'natural', color: '#8b5a2b', texture: '/texturas/dirt.png' },
  { id: 'default:dirt_with_grass', name: 'Grass Block', category: 'natural', color: '#567d46', texture: '/texturas/grass.png' },
  { id: 'default:sand', name: 'Sand', category: 'natural', color: '#dac292' },
  { id: 'default:gravel', name: 'Gravel', category: 'natural', color: '#7e7e7e' },
  { id: 'default:clay', name: 'Clay Block', category: 'natural', color: '#9e7b66' },
  
  // Stone / Brick
  { id: 'default:stone', name: 'Stone', category: 'stone', color: '#686868', texture: '/texturas/stone.png' },
  { id: 'default:cobble', name: 'Cobblestone', category: 'stone', color: '#5b5b5b', texture: '/texturas/stone.png' },
  { id: 'default:desert_stone', name: 'Desert Stone', category: 'stone', color: '#9d5a3c' },
  { id: 'default:stone_brick', name: 'Stone Brick', category: 'stone', color: '#7a7a7a', texture: '/texturas/brick.png' },
  { id: 'default:sandstone', name: 'Sandstone', category: 'stone', color: '#c2a67a' },
  { id: 'default:obsidian', name: 'Obsidian Block', category: 'stone', color: '#1a1126', glow: 3, texture: '/texturas/obsidian.png' },
  
  // Wood
  { id: 'default:wood', name: 'Wooden Planks', category: 'wood', color: '#c19a6b', texture: '/texturas/wood.png' },
  { id: 'default:junglewood', name: 'Junglewood Planks', category: 'wood', color: '#855430', texture: '/texturas/wood.png' },
  { id: 'default:aspen_wood', name: 'Aspen Planks', category: 'wood', color: '#e5ca9c', texture: '/texturas/wood.png' },
  { id: 'default:tree', name: 'Tree Trunk', category: 'wood', color: '#543d2b' },
  { id: 'default:leaves', name: 'Leaves', category: 'natural', color: '#31551c' },

  // Metal / Ores
  { id: 'default:steel_block', name: 'Steel Block', category: 'industrial', color: '#d3d3d3' },
  { id: 'default:copper_block', name: 'Copper Block', category: 'industrial', color: '#b87333' },
  { id: 'default:gold_block', name: 'Gold Block', category: 'industrial', color: '#ffd700', texture: '/texturas/gold.png' },
  { id: 'default:bronze_block', name: 'Bronze Block', category: 'industrial', color: '#cd7f32' },
  { id: 'default:mese', name: 'Mese Block (Crystal)', category: 'special', color: '#eeee00', glow: 8, texture: '/texturas/mese.png' },

  // Glass & Lights
  { id: 'default:glass', name: 'Glass', category: 'glass', color: '#a0dfef', texture: '/texturas/glass.png' },
  { id: 'default:obsidian_glass', name: 'Obsidian Glass', category: 'glass', color: '#2a1a3a' },
  { id: 'default:meselamp', name: 'Mese Lamp', category: 'special', color: '#ffffaa', glow: 15, texture: '/texturas/mese.png' },
  
  // Wool (Colored blocks)
  { id: 'wool:white', name: 'White Wool', category: 'colored', color: '#ffffff' },
  { id: 'wool:red', name: 'Red Wool', category: 'colored', color: '#b22222', texture: '/texturas/wool_red.png' },
  { id: 'wool:orange', name: 'Orange Wool', category: 'colored', color: '#ff8c00' },
  { id: 'wool:yellow', name: 'Yellow Wool', category: 'colored', color: '#ffd700' },
  { id: 'wool:green', name: 'Green Wool', category: 'colored', color: '#228b22', texture: '/texturas/wool_green.png' },
  { id: 'wool:blue', name: 'Blue Wool', category: 'colored', color: '#1e90ff', texture: '/texturas/wool_blue.png' },
  { id: 'wool:violet', name: 'Violet Wool', category: 'colored', color: '#8a2be2' },
  { id: 'wool:pink', name: 'Pink Wool', category: 'colored', color: '#ff69b4' },
  { id: 'wool:black', name: 'Black Wool', category: 'colored', color: '#2e2e2e' },
  { id: 'wool:magenta', name: 'Magenta Wool', category: 'colored', color: '#ff00ff' },
  { id: 'wool:cyan', name: 'Cyan Wool', category: 'colored', color: '#00ffff' },
];
