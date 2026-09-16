import { BlockFrameEntity, ProjectItem } from './types';

// Preset 1: Dimensional Mese Portal
export const REGAL_PORTAL_ENTITIES: BlockFrameEntity[] = [
  // Pillars
  {
    id: 'p1',
    node: 'default:obsidian',
    pos: { x: -2, y: 0, z: 0 },
    args: { size: { x: 0.8, y: 4, z: 0.8 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 3, collision: true, node: true },
    type: 'placed',
    color: '#1a1126'
  },
  {
    id: 'p2',
    node: 'default:obsidian',
    pos: { x: 2, y: 0, z: 0 },
    args: { size: { x: 0.8, y: 4, z: 0.8 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 3, collision: true, node: true },
    type: 'placed',
    color: '#1a1126'
  },
  // Top beam
  {
    id: 'p3',
    node: 'default:obsidian',
    pos: { x: 0, y: 4, z: 0 },
    args: { size: { x: 4.8, y: 0.8, z: 0.8 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 3, collision: true, node: true },
    type: 'placed',
    color: '#1a1126'
  },
  // Base
  {
    id: 'p4',
    node: 'default:stone_brick',
    pos: { x: 0, y: -0.4, z: 0 },
    args: { size: { x: 6, y: 0.4, z: 1.6 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 0, collision: true, node: true },
    type: 'placed',
    color: '#7a7a7a'
  },
  // Energy core
  {
    id: 'p5',
    node: 'default:mese',
    pos: { x: 0, y: 2, z: 0 },
    args: { size: { x: 1.5, y: 3, z: 0.1 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 15, collision: false, node: true },
    type: 'placed',
    color: '#eeee00'
  },
  // Corner lights
  {
    id: 'p6',
    node: 'default:meselamp',
    pos: { x: -2, y: 4.5, z: 0 },
    args: { size: { x: 0.4, y: 0.4, z: 0.4 }, rotate: { x: 0, y: 45, z: 0 }, mirror: 'none', glow: 12, collision: true, node: true },
    type: 'placed',
    color: '#ffffaa'
  },
  {
    id: 'p7',
    node: 'default:meselamp',
    pos: { x: 2, y: 4.5, z: 0 },
    args: { size: { x: 0.4, y: 0.4, z: 0.4 }, rotate: { x: 0, y: 45, z: 0 }, mirror: 'none', glow: 12, collision: true, node: true },
    type: 'placed',
    color: '#ffffaa'
  },
  // Energy orbits
  {
    id: 'p8',
    node: 'wool:cyan',
    pos: { x: -1, y: 2.5, z: 0 },
    args: { size: { x: 0.2, y: 1.8, z: 0.2 }, rotate: { x: 45, y: 0, z: -15 }, mirror: 'none', glow: 10, collision: false, node: true },
    type: 'placed',
    color: '#00ffff'
  },
  {
    id: 'p9',
    node: 'wool:cyan',
    pos: { x: 1, y: 1.5, z: 0 },
    args: { size: { x: 0.2, y: 1.8, z: 0.2 }, rotate: { x: -45, y: 0, z: 15 }, mirror: 'none', glow: 10, collision: false, node: true },
    type: 'placed',
    color: '#00ffff'
  },
];

// Preset 2: Celestial Sword of Mese
export const CELESTIAL_SWORD_ENTITIES: BlockFrameEntity[] = [
  // Blade (Red wool + Yellow core)
  {
    id: 'sw1',
    node: 'default:mese',
    pos: { x: 0, y: 4, z: 0 },
    args: { size: { x: 0.3, y: 3.2, z: 0.1 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 10, collision: true, node: true },
    type: 'placed',
    color: '#eeee00'
  },
  {
    id: 'sw2',
    node: 'wool:red',
    pos: { x: 0, y: 4, z: -0.1 },
    args: { size: { x: 0.15, y: 3.5, z: 0.05 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 4, collision: true, node: true },
    type: 'placed',
    color: '#b22222'
  },
  {
    id: 'sw3',
    node: 'wool:red',
    pos: { x: 0, y: 4, z: 0.1 },
    args: { size: { x: 0.15, y: 3.5, z: 0.05 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 4, collision: true, node: true },
    type: 'placed',
    color: '#b22222'
  },
  // Blade Tip
  {
    id: 'sw4',
    node: 'default:gold_block',
    pos: { x: 0, y: 5.8, z: 0 },
    args: { size: { x: 0.3, y: 0.4, z: 0.3 }, rotate: { x: 45, y: 45, z: 0 }, mirror: 'none', glow: 12, collision: true, node: true },
    type: 'placed',
    color: '#ffd700'
  },
  // Crossguard
  {
    id: 'sw5',
    node: 'default:steel_block',
    pos: { x: 0, y: 2.2, z: 0 },
    args: { size: { x: 1.6, y: 0.3, z: 0.3 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 0, collision: true, node: true },
    type: 'placed',
    color: '#d3d3d3'
  },
  // Crossguard Gems
  {
    id: 'sw6',
    node: 'wool:cyan',
    pos: { x: -0.7, y: 2.2, z: 0 },
    args: { size: { x: 0.25, y: 0.25, z: 0.35 }, rotate: { x: 0, y: 45, z: 0 }, mirror: 'none', glow: 14, collision: true, node: true },
    type: 'placed',
    color: '#00ffff'
  },
  {
    id: 'sw7',
    node: 'wool:cyan',
    pos: { x: 0.7, y: 2.2, z: 0 },
    args: { size: { x: 0.25, y: 0.25, z: 0.35 }, rotate: { x: 0, y: 45, z: 0 }, mirror: 'none', glow: 14, collision: true, node: true },
    type: 'placed',
    color: '#00ffff'
  },
  // Handle
  {
    id: 'sw8',
    node: 'default:wood',
    pos: { x: 0, y: 1.4, z: 0 },
    args: { size: { x: 0.2, y: 1.3, z: 0.2 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 0, collision: true, node: true },
    type: 'placed',
    color: '#c19a6b'
  },
  // Pommel
  {
    id: 'sw9',
    node: 'default:steel_block',
    pos: { x: 0, y: 0.6, z: 0 },
    args: { size: { x: 0.4, y: 0.4, z: 0.4 }, rotate: { x: 0, y: 45, z: 0 }, mirror: 'none', glow: 0, collision: true, node: true },
    type: 'placed',
    color: '#d3d3d3'
  }
];

// Preset 3: Neon Hoverbike Voxel Concept
export const NEON_HOVERBIKE_ENTITIES: BlockFrameEntity[] = [
  // Core Engine Chassis
  {
    id: 'hb1',
    node: 'default:steel_block',
    pos: { x: 0, y: 1.2, z: 0 },
    args: { size: { x: 0.6, y: 0.6, z: 2.4 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 0, collision: true, node: true },
    type: 'placed',
    color: '#d3d3d3'
  },
  // Seat
  {
    id: 'hb2',
    node: 'wool:black',
    pos: { x: 0, y: 1.6, z: -0.2 },
    args: { size: { x: 0.5, y: 0.2, z: 0.8 }, rotate: { x: -10, y: 0, z: 0 }, mirror: 'none', glow: 0, collision: true, node: true },
    type: 'placed',
    color: '#2e2e2e'
  },
  // Front Shield
  {
    id: 'hb3',
    node: 'default:obsidian',
    pos: { x: 0, y: 1.8, z: 1.0 },
    args: { size: { x: 0.7, y: 0.8, z: 0.3 }, rotate: { x: 30, y: 0, z: 0 }, mirror: 'none', glow: 2, collision: true, node: true },
    type: 'placed',
    color: '#1a1126'
  },
  // Steering column / handle
  {
    id: 'hb4',
    node: 'default:tree',
    pos: { x: 0, y: 1.9, z: 0.4 },
    args: { size: { x: 0.1, y: 0.6, z: 0.1 }, rotate: { x: -20, y: 0, z: 0 }, mirror: 'none', glow: 0, collision: true, node: true },
    type: 'placed',
    color: '#543d2b'
  },
  // Neon Side Thruster Ribs
  {
    id: 'hb5',
    node: 'default:meselamp',
    pos: { x: -0.5, y: 1.0, z: -0.6 },
    args: { size: { x: 0.15, y: 0.15, z: 1.4 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 15, collision: false, node: true },
    type: 'placed',
    color: '#ffffaa'
  },
  {
    id: 'hb6',
    node: 'default:meselamp',
    pos: { x: 0.5, y: 1.0, z: -0.6 },
    args: { size: { x: 0.15, y: 0.15, z: 1.4 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 15, collision: false, node: true },
    type: 'placed',
    color: '#ffffaa'
  },
  // Back Thruster Stream (Cyan particles)
  {
    id: 'hb7',
    node: 'wool:cyan',
    pos: { x: 0, y: 1.2, z: -1.7 },
    args: { size: { x: 0.3, y: 0.3, z: 0.8 }, rotate: { x: 0, y: 0, z: 0 }, mirror: 'none', glow: 12, collision: false, node: true },
    type: 'placed',
    color: '#00ffff'
  },
  // Headlight lamp
  {
    id: 'hb8',
    node: 'default:mese',
    pos: { x: 0, y: 1.7, z: 1.2 },
    args: { size: { x: 0.2, y: 0.2, z: 0.2 }, rotate: { x: 0, y: 45, z: 0 }, mirror: 'none', glow: 14, collision: true, node: true },
    type: 'placed',
    color: '#eeee00'
  }
];

export const PRESET_PROJECTS: ProjectItem[] = [
  {
    id: 'portal-preset-1',
    title: 'Portal Místico de Mese',
    description: 'Um portal de obsidiana colossal com orbe orbital e núcleo purificado gerado usando propriedades escalonadas no BlockFrame Minetest.',
    author: 'MinetestPro',
    tags: ['Decoração', 'Sci-Fi', 'Portal', 'Mese'],
    visibility: 'public',
    downloads: 1420,
    likes: 85,
    blockCount: REGAL_PORTAL_ENTITIES.length,
    sizeX: 6,
    sizeY: 5,
    sizeZ: 2,
    createdAt: '2026-05-15T10:00:00Z',
    entitiesJson: JSON.stringify(REGAL_PORTAL_ENTITIES)
  },
  {
    id: 'sword-preset-2',
    title: 'Espada do Paladino Estelar',
    description: 'Espada monumental de Mese de ouro e pedra, perfeitamente detalhada com proporções de rotação de 45 graus.',
    author: 'VoxelCraft',
    tags: ['Armas', 'Fantasia', 'Gigante', 'Escultura'],
    visibility: 'public',
    downloads: 940,
    likes: 67,
    blockCount: CELESTIAL_SWORD_ENTITIES.length,
    sizeX: 2,
    sizeY: 6,
    sizeZ: 1,
    createdAt: '2026-05-18T18:30:00Z',
    entitiesJson: JSON.stringify(CELESTIAL_SWORD_ENTITIES)
  },
  {
    id: 'bike-preset-3',
    title: 'Hoverbike Neon VX9',
    description: 'Conceito futurista de hovercraft utilizando blocos comprimidos, propulsores neon e design aerodinâmico.',
    author: 'CyberSandro',
    tags: ['Veículos', 'Sci-Fi', 'Futurista', 'Neon'],
    visibility: 'public',
    downloads: 1670,
    likes: 110,
    blockCount: NEON_HOVERBIKE_ENTITIES.length,
    sizeX: 2,
    sizeY: 2,
    sizeZ: 3,
    createdAt: '2026-05-20T04:12:00Z',
    entitiesJson: JSON.stringify(NEON_HOVERBIKE_ENTITIES)
  }
];
