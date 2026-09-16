import { BlockFrameEntity, BlockFrameArgs, Vector3D } from './types';

// Replicates minetest lua's parse_vec helper
export function parseVec(val: string | undefined | null, defaultVal: number = 1): Vector3D {
  if (!val) return { x: defaultVal, y: defaultVal, z: defaultVal };
  
  // Strip any brackets or braces if user pasted them
  const cleaned = val.replace(/[\{\}\[\]\(\)]/g, '');
  const parts = cleaned.split(',').map(s => parseFloat(s.trim()));
  
  if (parts.length === 1 && !isNaN(parts[0])) {
    return { x: parts[0], y: parts[0], z: parts[0] };
  } else if (parts.length === 3) {
    return {
      x: isNaN(parts[0]) ? defaultVal : parts[0],
      y: isNaN(parts[1]) ? defaultVal : parts[1],
      z: isNaN(parts[2]) ? defaultVal : parts[2],
    };
  }
  return { x: defaultVal, y: defaultVal, z: defaultVal };
}

// Replicates minetest lua's parse_args
export function parseArgs(argString: string): {
  args: Partial<BlockFrameArgs>;
  node?: string;
  radius?: number;
} {
  const result: Partial<BlockFrameArgs> = {};
  let node: string | undefined = undefined;
  let radius: number | undefined = undefined;

  // Split spaces but respect potential quotes if keys are complex (usually simple key=val)
  const tokens = argString.split(/\s+/);

  for (const token of tokens) {
    if (!token) continue;
    
    // Check if simple string (like just a material name, e.g. "default:stone")
    if (!token.includes('=')) {
      if (token.startsWith('default:') || token.startsWith('wool:') || token.includes(':')) {
        node = token;
      } else if (!isNaN(Number(token))) {
        radius = Number(token); // apply radius parameter
      }
      continue;
    }

    const [key, val] = token.split('=');
    if (!key || !val) continue;

    const lowerKey = key.toLowerCase();
    
    if (lowerKey === 'node') {
      // Check if it's node name or node/item mode boolean
      if (val === 'true' || val === 'false') {
        result.node = val === 'true';
      } else {
        node = val;
      }
    } else if (lowerKey === 'item') {
      result.node = val !== 'true'; // item mode is inverse
    } else if (lowerKey === 'size') {
      result.size = parseVec(val, 1);
    } else if (lowerKey === 'scale') {
      result.size = parseVec(val, 1);
    } else if (lowerKey === 'rotate' || lowerKey === 'rot') {
      result.rotate = parseVec(val, 0);
    } else if (lowerKey === 'mirror') {
      const v = val.toLowerCase();
      if (v === 'x' || v === 'y' || v === 'z') {
        result.mirror = v;
      } else {
        result.mirror = 'none';
      }
    } else if (lowerKey === 'glow') {
      const parsedGlow = parseInt(val, 10);
      result.glow = isNaN(parsedGlow) ? 0 : Math.max(0, Math.min(15, parsedGlow));
    } else if (lowerKey === 'collision' || lowerKey === 'col') {
      result.collision = val === 'true' || val === '1';
    } else if (lowerKey === 'radius' || lowerKey === 'rad') {
      radius = Number(val);
    }
  }

  return { args: result, node, radius };
}

// Converts a BlockFrame list to clean Minetest Lua code.
// Output matches standard minetest Lua registry and placing script.
// By default, reduces size by 0.67 factor upon export for Minetest/BlockFrame compatibility
export function generateLuaExport(
  entities: BlockFrameEntity[],
  structureName: string = 'minha_estrutura',
  scaleMultiplier: number = 0.67
): string {
  const bfName = structureName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'structure';
  
  let code = `-- BlockFrame Export: ${structureName}\n`;
  code += `-- Gerado automaticamente pelo BlockFrame Online Web Editor\n`;
  code += `-- Escala reduzida em 0.67 para proporção perfeita no Minetest/Luanti\n\n`;
  code += `local ${bfName}_entities = {\n`;
  
  entities.forEach((ent, i) => {
    const rX = ent.args.rotate.x;
    const rY = ent.args.rotate.y;
    const rZ = ent.args.rotate.z;

    const sx = Math.round(ent.args.size.x * scaleMultiplier * 10000) / 10000;
    const sy = Math.round(ent.args.size.y * scaleMultiplier * 10000) / 10000;
    const sz = Math.round(ent.args.size.z * scaleMultiplier * 10000) / 10000;
    
    code += `  {\n`;
    code += `    node = "${ent.node}",\n`;
    code += `    rel_pos = { x = ${ent.pos.x}, y = ${ent.pos.y}, z = ${ent.pos.z} },\n`;
    code += `    args = {\n`;
    code += `      size = { x = ${sx}, y = ${sy}, z = ${sz} },\n`;
    code += `      rotate = { x = ${rX}, y = ${rY}, z = ${rZ} },\n`;
    code += `      mirror = "${ent.args.mirror}",\n`;
    code += `      glow = ${ent.args.glow},\n`;
    code += `      collision = ${ent.args.collision},\n`;
    code += `      node = ${ent.args.node}\n`;
    code += `    }\n`;
    code += `  }${i < entities.length - 1 ? ',' : ''}\n`;
  });
  
  code += `}\n\n`;
  code += `-- Script para spawnar a estrutura na posição do jogador 'pos'\n`;
  code += `function spawn_${bfName}(pos)\n`;
  code += `  for _, ent in ipairs(${bfName}_entities) do\n`;
  code += `    local spawn_pos = {\n`;
  code += `      x = pos.x + ent.rel_pos.x,\n`;
  code += `      y = pos.y + ent.rel_pos.y,\n`;
  code += `      z = pos.z + ent.rel_pos.z\n`;
  code += `    }\n`;
  code += `    -- Converte propriedades para staticdata como no init.lua do mod\n`;
  code += `    local staticdata = minetest.serialize({\n`;
  code += `      node = ent.node,\n`;
  code += `      size = ent.args.size,\n`;
  code += `      rotate = ent.args.rotate,\n`;
  code += `      mirror = ent.args.mirror,\n`;
  code += `      glow = ent.args.glow,\n`;
  code += `      collision = ent.args.collision,\n`;
  code += `      node_mode = ent.args.node\n`;
  code += `    })\n`;
  code += `    \n`;
  code += `    minetest.add_entity(spawn_pos, "blockframe:placed", staticdata)\n`;
  code += `  end\n`;
  code += `  minetest.chat_send_all("Estrutura ${structureName} construida com sucesso pelo BlockFrame!")\n`;
  code += `end\n`;
  
  return code;
}

// Generates the native JSON matching the mod format (reduces size by scaleMultiplier=0.67 upon export)
export function generateBlockFrameJSON(
  entities: BlockFrameEntity[],
  structureName: string = 'structure',
  scaleMultiplier: number = 0.67
): string {
  const payload = {
    version: 1,
    name: structureName,
    entities: entities.map(ent => ({
      node: ent.node,
      rel_pos: {
        x: ent.pos.x,
        y: ent.pos.y,
        z: ent.pos.z
      },
      args: {
        size: {
          x: Math.round(ent.args.size.x * scaleMultiplier * 10000) / 10000,
          y: Math.round(ent.args.size.y * scaleMultiplier * 10000) / 10000,
          z: Math.round(ent.args.size.z * scaleMultiplier * 10000) / 10000,
        },
        rotate: ent.args.rotate,
        mirror: ent.args.mirror,
        glow: ent.args.glow,
        collision: ent.args.collision,
        node: ent.args.node
      }
    }))
  };
  return JSON.stringify(payload, null, 2);
}

// Helper to make a deep copy of an object
export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Transforms all entities around an origin using rotate
export function rotateStructuralSet(entities: BlockFrameEntity[], axis: 'x' | 'y' | 'z', degrees: number): BlockFrameEntity[] {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return entities.map(ent => {
    const copy = deepCopy(ent);
    const { x, y, z } = copy.pos;

    let rx = x, ry = y, rz = z;
    if (axis === 'z') {
      rx = x * cos - y * sin;
      ry = x * sin + y * cos;
    } else if (axis === 'x') {
      ry = y * cos - z * sin;
      rz = y * sin + z * cos;
    } else if (axis === 'y') {
      rx = x * cos + z * sin;
      rz = -x * sin + z * cos;
    }

    // round to nearest step limits to keep grid clean
    copy.pos = {
      x: Math.round(rx * 100) / 100,
      y: Math.round(ry * 100) / 100,
      z: Math.round(rz * 100) / 100
    };

    // Also rotate the local rotation properties
    if (axis === 'x') {
      copy.args.rotate.x = (copy.args.rotate.x + degrees) % 360;
    } else if (axis === 'y') {
      copy.args.rotate.y = (copy.args.rotate.y + degrees) % 360;
    } else if (axis === 'z') {
      copy.args.rotate.z = (copy.args.rotate.z + degrees) % 360;
    }

    return copy;
  });
}

// Mirrors all entities along an axis
export function mirrorStructuralSet(entities: BlockFrameEntity[], axis: 'x' | 'y' | 'z'): BlockFrameEntity[] {
  return entities.map(ent => {
    const copy = deepCopy(ent);
    if (axis === 'x') {
      copy.pos.x = -copy.pos.x;
      // flip local rotation / mirror parameter
      copy.args.mirror = copy.args.mirror === 'x' ? 'none' : 'x';
    } else if (axis === 'y') {
      copy.pos.y = -copy.pos.y;
      copy.args.mirror = copy.args.mirror === 'y' ? 'none' : 'y';
    } else if (axis === 'z') {
      copy.pos.z = -copy.pos.z;
      copy.args.mirror = copy.args.mirror === 'z' ? 'none' : 'z';
    }
    return copy;
  });
}

// Parses the .bf format created by the user (Lua variables replacement and tables)
export function parseBF(content: string): BlockFrameEntity[] {
  // Try to parse as JSON first in case it is plain JSON disguised as .bf
  try {
    const parsed = JSON.parse(content);
    if (parsed.entities && Array.isArray(parsed.entities)) {
      return parsed.entities.map((item: any, index: number) => ({
        id: `bf-imported-${Date.now()}-${index}`,
        node: item.node || 'default:stone',
        pos: {
          x: item.rel_pos?.x ?? item.pos?.x ?? 0,
          y: item.rel_pos?.y ?? item.pos?.y ?? 0,
          z: item.rel_pos?.z ?? item.pos?.z ?? 0,
        },
        args: {
          size: item.args?.size || { x: 1, y: 1, z: 1 },
          rotate: item.args?.rotate || { x: 0, y: 0, z: 0 },
          mirror: item.args?.mirror || 'none',
          glow: item.args?.glow ?? 0,
          collision: item.args?.collision !== false,
          node: item.args?.node !== false,
        },
        type: 'placed'
      }));
    }
  } catch (err) {
    // Reverted to parsing the Lua format
  }

  // 1. Extract array variables mapping, e.g. _[1]="mcl_farming:cookie" or _[2]="rel_pos"
  const arrayVars: { [key: number]: string } = {};
  
  // Find all matches of _[1] = "val" (accepting double or single quotes)
  const arrayVarRegex = /_\s*\[\s*(\d+)\s*\]\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = arrayVarRegex.exec(content)) !== null) {
    const idx = parseInt(match[1], 10);
    const val = match[2] || match[3] || '';
    arrayVars[idx] = val.trim();
  }

  // Fallback defaults for substitution list
  if (!arrayVars[1]) arrayVars[1] = "mcl_farming:cookie";
  if (!arrayVars[2]) arrayVars[2] = "rel_pos";
  if (!arrayVars[3]) arrayVars[3] = "mcl_farming: bread";

  // 2. We replace backslashes and unify braces for easier regex capture
  let cleaned = content
    .replace(/\\/g, ' ')
    .replace(/\s+/g, ' ');

  // Substitute index placements like _[1] or [_[2]] or [[2]] or node=_[1]
  for (const [idx, val] of Object.entries(arrayVars)) {
    const idxNum = parseInt(idx, 10);
    // Replace [_[idx]] or [[idx]] with key name, normally representing "rel_pos"
    cleaned = cleaned.replace(new RegExp(`\\[\\s*_\\s*\\[\\s*${idxNum}\\s*\\]\\s*\\]`, 'g'), val);
    cleaned = cleaned.replace(new RegExp(`\\[\\s*\\[\\s*${idxNum}\\s*\\]\\s*\\]`, 'g'), val);
    
    // Replace all _[idx] with the raw string in quotes
    cleaned = cleaned.replace(new RegExp(`_\\s*\\[\\s*${idxNum}\\s*\\]`, 'g'), `"${val}"`);
  }

  // Let's divide by entities
  const entityBlocks: string[] = [];
  
  // Robust brace parser to isolate elements in the entities array
  const entitiesStart = cleaned.indexOf('entities');
  if (entitiesStart !== -1) {
    const arrayStart = cleaned.indexOf('{', entitiesStart);
    if (arrayStart !== -1) {
      let depth = 0;
      let arrayEnd = -1;
      for (let i = arrayStart; i < cleaned.length; i++) {
        if (cleaned[i] === '{') {
          depth++;
        } else if (cleaned[i] === '}') {
          depth--;
          if (depth === 0) {
            arrayEnd = i;
            break;
          }
        }
      }

      if (arrayEnd !== -1) {
        const arrayContent = cleaned.substring(arrayStart + 1, arrayEnd).trim();
        let topDepth = 0;
        let entityStart = -1;
        for (let i = 0; i < arrayContent.length; i++) {
          const char = arrayContent[i];
          if (char === '{') {
            if (topDepth === 0) {
              entityStart = i;
            }
            topDepth++;
          } else if (char === '}') {
            topDepth--;
            if (topDepth === 0 && entityStart !== -1) {
              entityBlocks.push(arrayContent.substring(entityStart, i + 1));
              entityStart = -1;
            }
          }
        }
      }
    }
  }

  // Fallback: if brace parser fails to retrieve any structured blocks, extract with fallback regex
  if (entityBlocks.length === 0) {
    const matches = cleaned.match(/\{[^{}]*node\s*=[^{}]*\}/g) || [];
    matches.forEach(b => entityBlocks.push(b));
  }

  const parsedEntities: BlockFrameEntity[] = [];
  entityBlocks.forEach((block, idx) => {
    // Grab node name
    const nodeMatch = block.match(/node\s*=\s*(?:"([^"]*)"|'([^']*)')/);
    const nodeVal = nodeMatch ? (nodeMatch[1] || nodeMatch[2] || '').trim() : 'mcl_farming:cookie';

    // Extract table: key = { ... }
    const extractVec = (keyName: string, defaultVal: number): { x: number, y: number, z: number } => {
      // Robust regex for vector keys
      const regex = new RegExp(`${keyName}\\s*=\\s*\\{([^}]+)\\}`);
      const cleanBlock = block.replace(/\s+/g, '');
      const m = cleanBlock.match(regex);
      if (m) {
        const content = m[1];
        // Match standard numbers and scientific notation (e.g. -4.174128e-07)
        const numRegex = /(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/i;
        const xM = content.match(new RegExp(`x\\s*=\\s*${numRegex.source}`, 'i'));
        const yM = content.match(new RegExp(`y\\s*=\\s*${numRegex.source}`, 'i'));
        const zM = content.match(new RegExp(`z\\s*=\\s*${numRegex.source}`, 'i'));
        
        return {
          x: xM ? parseFloat(xM[1]) : defaultVal,
          y: yM ? parseFloat(yM[1]) : defaultVal,
          z: zM ? parseFloat(zM[1]) : defaultVal,
        };
      }
      return { x: defaultVal, y: defaultVal, z: defaultVal };
    };

    // Try relative_pos/rel_pos first, then fallback to pos
    const relPosVal = extractVec('rel_pos', 0);
    const posVal = extractVec('pos', 0);
    
    // Choose relative coordinates as absolute position for our centered canvas workspace
    const hasRelPos = block.includes('rel_pos') || block.includes('rel_pos') || block.includes('_[1]');
    let position = hasRelPos ? relPosVal : posVal;
    
    // If coordinates are too massive (like absolute -496, 536), offset them back close to origin
    if (Math.abs(position.x) > 100 || Math.abs(position.y) > 100 || Math.abs(position.z) > 100) {
      if (hasRelPos && (relPosVal.x !== 0 || relPosVal.y !== 0 || relPosVal.z !== 0)) {
        position = relPosVal;
      } else {
        // Subtract coordinates offsets if user only has pos and no rel_pos
        position = {
          x: position.x < -400 ? position.x - (-497.0379943847656) : (position.x > 350 ? position.x - 411.1 : position.x),
          y: position.y > 20 ? position.y - 23.5 : (position.y > 5 ? position.y - 9.3 : position.y),
          z: position.z > 500 ? position.z - 535.8480224609375 : (position.z > 3 ? position.z - 5.38 : position.z)
        };
      }
    }

    const sizeVal = extractVec('size', 1);
    const rotateVal = extractVec('rotate', 0);

    const mirrorMatch = block.match(/mirror\s*=\s*(?:"([^"]*)"|'([^']*)')/);
    const mirrorVal = mirrorMatch ? (mirrorMatch[1] || mirrorMatch[2] || 'none') : 'none';

    const glowMatch = block.match(/glow\s*=\s*(-?\d+)/);
    const glowVal = glowMatch ? parseInt(glowMatch[1], 10) : 0;

    const colMatch = block.match(/collision\s*=\s*(true|false)/);
    const colVal = colMatch ? colMatch[1] === 'true' : true;

    const nodeModeMatch = block.match(/node\s*=\s*(true|false)/);
    const nodeModeVal = nodeModeMatch ? nodeModeMatch[1] === 'true' : true;

    parsedEntities.push({
      id: `bf-imported-${Date.now()}-${idx}`,
      node: nodeVal,
      pos: {
        x: Math.round(position.x * 1000000) / 1000000,
        y: Math.round(position.y * 1000000) / 1000000,
        z: Math.round(position.z * 1000000) / 1000000
      },
      args: {
        size: sizeVal,
        rotate: rotateVal,
        mirror: mirrorVal as 'none' | 'x' | 'y' | 'z',
        glow: glowVal,
        collision: colVal,
        node: nodeModeVal
      },
      type: 'placed'
    });
  });

  return parsedEntities;
}

// Restores standard 1.0 block size in the 3D simulation if an imported model has 0.67 export scale
export function normalizeEntitiesToSimulation(entities: BlockFrameEntity[]): BlockFrameEntity[] {
  return entities.map(ent => {
    const copy = deepCopy(ent);
    if (Math.abs(copy.args.size.x - 0.67) < 0.03 && Math.abs(copy.args.size.y - 0.67) < 0.03 && Math.abs(copy.args.size.z - 0.67) < 0.03) {
      copy.args.size = { x: 1, y: 1, z: 1 };
    }
    return copy;
  });
}

// Normalizes entity sizes to a target scale
export function normalizeEntitiesScale(entities: BlockFrameEntity[], targetUnitScale: number = 1.0): BlockFrameEntity[] {
  return entities.map(ent => {
    const copy = deepCopy(ent);
    if (Math.abs(copy.args.size.x - 1) < 0.02 && Math.abs(copy.args.size.y - 1) < 0.02 && Math.abs(copy.args.size.z - 1) < 0.02) {
      copy.args.size = { x: targetUnitScale, y: targetUnitScale, z: targetUnitScale };
    }
    return copy;
  });
}

// Generates the extremely precise .bf format created by the user with specified coordinate system mappings.
// In the 3D editor/simulation, size=1.0 is used normally; upon export, size is scaled by 0.67 for Minetest/Luanti.
export function generateBFExport(
  entities: BlockFrameEntity[],
  structureName: string = 'structure',
  scaleMultiplier: number = 0.67
): string {
  const offsetX = -497.0379943847656;
  const offsetY = 23.5;
  const offsetZ = 535.8480224609375;

  const header = 'local _={};_[1]="rel_pos";';
  let tableCode = 'return {version=1,entities={';

  entities.forEach((ent, i) => {
    const rx = ent.args.rotate.x;
    const ry = ent.args.rotate.y;
    const rz = ent.args.rotate.z;

    const absX = ent.pos.x + offsetX;
    const absY = ent.pos.y + offsetY;
    const absZ = ent.pos.z + offsetZ;

    // Export time: multiply size by scaleMultiplier (0.67 by default so standard 1.0 blocks become 0.67)
    const sx = Math.round(ent.args.size.x * scaleMultiplier * 100000) / 100000;
    const sy = Math.round(ent.args.size.y * scaleMultiplier * 100000) / 100000;
    const sz = Math.round(ent.args.size.z * scaleMultiplier * 100000) / 100000;

    const rotStr = `{y=${ry},z=${rz},x=${rx}}`;
    const sizeStr = `{y=${sy},z=${sz},x=${sx}}`;
    const posStr = `{y=${absY},z=${absZ},x=${absX}}`;
    const relPosStr = `{y=${ent.pos.y},z=${ent.pos.z},x=${ent.pos.x}}`;

    tableCode += `{node="${ent.node}",args={rotate=${rotStr},size=${sizeStr},pos=${posStr},glow=${ent.args.glow || 0}},[_[1]]=${relPosStr}}${i < entities.length - 1 ? ',' : ''}`;
  });

  tableCode += '}}';
  return `${header}${tableCode}`;
}

