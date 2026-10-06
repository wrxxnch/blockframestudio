import * as THREE from 'three';
import { findBetterCraftItem } from './bettercraftRegistry';
import { MINETEST_NODES } from './types';

// Cache for generated and loaded THREE textures
const textureCache = new Map<string, THREE.Texture>();

// Map of local textures available in /texturas/
const LOCAL_TEXTURE_MAP: Record<string, string> = {
  'mcl_farming:cookie': '/texturas/cookie.png',
  'mcl_core:apple': '/texturas/apple.png',
  'mcl_core:gold_ingot': '/texturas/gold.png',
  'mcl_core:diamond': '/texturas/diamond.png',
  'default:stone': '/texturas/stone.png',
  'default:cobble': '/texturas/stone.png',
  'default:stone_brick': '/texturas/brick.png',
  'default:dirt': '/texturas/dirt.png',
  'default:dirt_with_grass': '/texturas/grass.png',
  'default:wood': '/texturas/wood.png',
  'default:junglewood': '/texturas/wood.png',
  'default:aspen_wood': '/texturas/wood.png',
  'default:gold_block': '/texturas/gold.png',
  'default:glass': '/texturas/glass.png',
  'default:obsidian': '/texturas/obsidian.png',
  'default:mese': '/texturas/mese.png',
  'default:meselamp': '/texturas/mese.png',
  'wool:red': '/texturas/wool_red.png',
  'wool:green': '/texturas/wool_green.png',
  'wool:blue': '/texturas/wool_blue.png',
};

/**
 * Creates an instant, crisp 16x16 procedural pixel-art canvas texture.
 * Perfect for Minetest/Minecraft voxel aesthetics with 0ms latency and 0 CORS issues.
 */
export function createProceduralPixelTexture(nodeId: string, baseColorHex: string = '#64748b'): THREE.Texture {
  const cacheKey = `proc_${nodeId}_${baseColorHex}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const dataTex = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
    dataTex.needsUpdate = true;
    return dataTex;
  }

  // Draw procedural pattern based on item type
  const idLower = nodeId.toLowerCase();

  if (idLower.includes('stick')) {
    // Diagonal wooden stick
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = '#854d0e';
    for (let i = 2; i < 14; i++) {
      ctx.fillRect(i, 15 - i, 2, 2);
    }
    ctx.fillStyle = '#a16207';
    for (let i = 3; i < 13; i++) {
      ctx.fillRect(i, 15 - i, 1, 1);
    }
  } else if (idLower.includes('wheat')) {
    // Golden wheat sheaf
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(5, 6, 6, 8);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(6, 4, 4, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(7, 2, 2, 4);
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(4, 9, 8, 2);
  } else if (idLower.includes('bread')) {
    // Loaf of bread
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(3, 5, 10, 6);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(4, 4, 8, 7);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(5, 5, 6, 2);
  } else if (idLower.includes('iron') || idLower.includes('steel')) {
    // Metallic ingot
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(3, 6, 10, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(4, 6, 8, 4);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(5, 7, 5, 1);
  } else if (idLower.includes('coal')) {
    // Charcoal lump
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 4, 8, 8);
    ctx.fillStyle = '#334155';
    ctx.fillRect(5, 5, 5, 5);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(6, 6, 2, 2);
  } else {
    // Generic block with beveled border and noise texture
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 16, 16);

    // Dark border on right and bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);

    // Light border on top and left
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);

    // Subtle internal pixel noise
    const seed = nodeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    for (let x = 1; x < 15; x++) {
      for (let y = 1; y < 15; y++) {
        const val = ((x * 17 + y * 23 + seed) % 10) / 10;
        if (val > 0.65) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(x, y, 1, 1);
        } else if (val < 0.25) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Resolves the primary URL or local path for an entity node
 */
export function resolveNodeTextureUrl(nodeId: string, customOverride?: string): string | null {
  if (customOverride && customOverride.trim()) {
    return customOverride.trim();
  }

  // Check cached local item defaults
  try {
    const raw = localStorage.getItem('blockframe_item_defaults_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[nodeId]?.image) {
        return parsed[nodeId].image;
      }
    }
  } catch (e) {}

  // 1. Direct local file mapping
  if (LOCAL_TEXTURE_MAP[nodeId]) {
    return LOCAL_TEXTURE_MAP[nodeId];
  }

  // 2. Lookup in MINETEST_NODES
  const minetestNode = MINETEST_NODES.find(n => n.id === nodeId);
  if (minetestNode?.texture) {
    return minetestNode.texture;
  }

  // 3. Lookup in BetterCraft items registry
  const bcItem = findBetterCraftItem(nodeId);
  if (bcItem) {
    if (bcItem.texture && bcItem.texture.startsWith('http')) {
      return bcItem.texture;
    }
    if (bcItem.textureName) {
      // Build raw GitHub URL pointing directly to the mod textures in luanti-bettercraft
      const mod = bcItem.mod || (nodeId.includes(':') ? nodeId.split(':')[0] : 'mcl_core');
      return `https://raw.githubusercontent.com/wrxxnch/luanti-bettercraft/main/games/bettercraft/mods/ITEMS/${mod}/textures/${bcItem.textureName}`;
    }
  }

  // 4. Common fallback patterns
  const namePart = nodeId.includes(':') ? nodeId.split(':')[1] : nodeId;
  if (LOCAL_TEXTURE_MAP[`mcl_core:${namePart}`]) {
    return LOCAL_TEXTURE_MAP[`mcl_core:${namePart}`];
  }
  if (LOCAL_TEXTURE_MAP[`default:${namePart}`]) {
    return LOCAL_TEXTURE_MAP[`default:${namePart}`];
  }

  return null;
}

const textureLoader = new THREE.TextureLoader();

/**
 * Loads a texture with automatic fallback to procedural pixel art
 */
export function loadVoxelTexture(
  nodeId: string,
  baseColor: string,
  onLoaded?: (texture: THREE.Texture) => void
): THREE.Texture {
  const cacheKey = `tex_${nodeId}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const url = resolveNodeTextureUrl(nodeId);

  // If no URL, return procedural texture immediately
  if (!url) {
    const proc = createProceduralPixelTexture(nodeId, baseColor);
    textureCache.set(cacheKey, proc);
    return proc;
  }

  // Load from URL (local or CDN)
  const texture = textureLoader.load(
    url,
    (loadedTex) => {
      loadedTex.magFilter = THREE.NearestFilter;
      loadedTex.minFilter = THREE.NearestFilter;
      loadedTex.generateMipmaps = false;
      loadedTex.needsUpdate = true;
      textureCache.set(cacheKey, loadedTex);
      onLoaded?.(loadedTex);
    },
    undefined,
    () => {
      // On error (e.g. 404 or CORS), smoothly fallback to procedural texture
      const fallback = createProceduralPixelTexture(nodeId, baseColor);
      textureCache.set(cacheKey, fallback);
      onLoaded?.(fallback);
    }
  );

  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  textureCache.set(cacheKey, texture);

  return texture;
}
