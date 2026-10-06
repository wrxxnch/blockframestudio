import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  RotateCw,
  Maximize,
  Maximize2,
  Trash2,
  Undo2,
  Redo2,
  Play,
  Save,
  Download,
  Upload,
  Plus,
  Search,
  Terminal,
  Settings,
  Grid,
  Globe,
  HelpCircle,
  Heart,
  DownloadCloud,
  CheckCircle,
  AlertCircle,
  Database,
  Copy,
  Sliders,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  History,
  X,
  Package,
  FolderOpen,
  FilePlus,
  LogOut,
  Move,
  Boxes,
  Type,
  Bug,
  Keyboard,
  Code,
  FileCode,
  Shield,
  Crown
} from 'lucide-react';

import { BlockFrameEntity, BlockFrameArgs, Vector3D, ProjectItem, MINETEST_NODES, ItemDefaultConfig, AdminUser } from './types';
import { BETTERCRAFT_PALETTE_NODES, findBetterCraftItem, BetterCraftItem } from './bettercraftRegistry';
import { PRESET_PROJECTS } from './presets';
import {
  deepCopy,
  parseArgs,
  parseVec,
  generateBlockFrameJSON,
  rotateStructuralSet,
  mirrorStructuralSet,
  parseBF,
  generateBFExport,
  normalizeEntitiesScale,
  normalizeEntitiesToSimulation
} from './blockframeUtils';
import {
  fetchProjects,
  subscribeProjects,
  saveProject,
  likeProject,
  downloadProject,
  deleteProject,
  isFirebaseConfigured,
  auth,
  signInWithGoogle,
  logOut,
  fetchAdmins,
  subscribeAdmins,
  addAdminUser,
  removeAdminUser,
  fetchItemDefaults,
  subscribeItemDefaults,
  saveItemDefaultProperty,
  deleteItemDefaultProperty,
  PRIMARY_OWNER_EMAIL,
  getLocalAdmins,
  getLocalItemDefaults
} from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

import VoxelViewport from './components/VoxelViewport';
import CommandConsole from './components/CommandConsole';
import CodeModal from './components/CodeModal';
import BetterCraftBrowser from './components/BetterCraftBrowser';
import { BDStudioEditor } from './components/BDStudioEditor';
import { LoadModal } from './components/LoadModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AdminPanelModal } from './components/AdminPanelModal';

// Standard 1.0 scale in the simulation/editor; automatically scaled down by 0.67 on export
const DEFAULT_ARGS: BlockFrameArgs = {
  size: { x: 1, y: 1, z: 1 },
  rotate: { x: 0, y: 0, z: 0 },
  mirror: 'none',
  glow: 0,
  collision: true,
  node: true
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'editor' | 'community' | 'onboarding'>('editor');
  const [isBetterCraftBrowserOpen, setIsBetterCraftBrowserOpen] = useState(false);

  // Core Editor States
  const [entities, setEntities] = useState<BlockFrameEntity[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'add' | 'delete'>('add');
  const [gridSnap, setGridSnap] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // New Block Default Arguments (What gets applied on placing a new block)
  const [brushNode, setBrushNode] = useState<string>('default:stone');
  const [brushArgs, setBrushArgs] = useState<BlockFrameArgs>({ ...DEFAULT_ARGS });

  // Local Folder Textures lists
  const [folderTextures, setFolderTextures] = useState<Array<{ name: string; url: string }>>(() => {
    const cached = localStorage.getItem('blockframe_custom_folder_textures');
    const defaults = [
      { name: 'grass.png', url: '/texturas/grass.png' },
      { name: 'stone.png', url: '/texturas/stone.png' },
      { name: 'dirt.png', url: '/texturas/dirt.png' },
      { name: 'wood.png', url: '/texturas/wood.png' },
      { name: 'brick.png', url: '/texturas/brick.png' },
      { name: 'glass.png', url: '/texturas/glass.png' },
      { name: 'gold.png', url: '/texturas/gold.png' },
      { name: 'diamond.png', url: '/texturas/diamond.png' },
      { name: 'mese.png', url: '/texturas/mese.png' },
      { name: 'obsidian.png', url: '/texturas/obsidian.png' },
      { name: 'wool_red.png', url: '/texturas/wool_red.png' },
      { name: 'wool_blue.png', url: '/texturas/wool_blue.png' },
      { name: 'wool_green.png', url: '/texturas/wool_green.png' },
      { name: 'apple.png', url: '/texturas/apple.png' },
      { name: 'cookie.png', url: '/texturas/cookie.png' }
    ];
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const defaultNames = defaults.map(t => t.name);
          const cachedFiltered = parsed.filter((t: any) => t && t.name && !defaultNames.includes(t.name));
          return [...defaults, ...cachedFiltered];
        }
      } catch (e) {}
    }
    return defaults;
  });

  // Custom User Blocks state
  const [customNodes, setCustomNodes] = useState<{ id: string; name: string; color: string; texture?: string }[]>(() => {
    const cached = localStorage.getItem('blockframe_custom_registered_nodes');
    return cached ? JSON.parse(cached) : [];
  });
  const [newCustomNodeId, setNewCustomNodeId] = useState('');
  const [newCustomNodeName, setNewCustomNodeName] = useState('');
  const [newCustomNodeColor, setNewCustomNodeColor] = useState('#a855f7');
  const [newCustomNodeTexture, setNewCustomNodeTexture] = useState('');

  // History State
  const [history, setHistory] = useState<Array<{ entities: BlockFrameEntity[]; desc: string }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{ entities: BlockFrameEntity[]; desc: string }>>([]);

  // Database / Showcase projects
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  
  // Project Info for publishing
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishAuthor, setPublishAuthor] = useState('Anonimo');
  const [publishTags, setPublishTags] = useState('Decoracao, Sci-Fi');
  const [showPublishModal, setShowPublishModal] = useState(false);

  // User Authentication State (Firebase Auth)
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Admin & Item Defaults Configuration System (jeanpierreowner@gmail.com)
  const [admins, setAdmins] = useState<AdminUser[]>(() => getLocalAdmins());
  const [itemDefaults, setItemDefaults] = useState<Record<string, ItemDefaultConfig>>(() => getLocalItemDefaults());
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminEditingItemId, setAdminEditingItemId] = useState<string | null>(null);

  // Determine if the active session is an authorized administrator (via Google login)
  const isAdmin = useMemo(() => {
    const activeEmail = (currentUser?.email || '').toLowerCase().trim();
    if (!activeEmail) return false;
    if (activeEmail === PRIMARY_OWNER_EMAIL.toLowerCase()) return true;
    return admins.some(a => a.email.toLowerCase() === activeEmail);
  }, [currentUser, admins]);

  // Subscribe to Admins and Item Defaults from Firestore in real-time
  useEffect(() => {
    const unsubAdmins = subscribeAdmins((newAdmins) => {
      setAdmins(newAdmins);
    });
    const unsubDefaults = subscribeItemDefaults((newDefaults) => {
      setItemDefaults(newDefaults);
    });
    return () => {
      unsubAdmins();
      unsubDefaults();
    };
  }, [currentUser]);

  // Modals & Logs
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [systemNotification, setSystemNotification] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user?.displayName) {
        setPublishAuthor(user.displayName);
      }
    });
    return () => unsub();
  }, []);

  // BDStudio UI States (Matching reference interface)
  const [projectName, setProjectName] = useState('Project');
  // Abas abrindo individualmente: starts with elements open, others closed
  const [accordionSections, setAccordionSections] = useState({
    elements: true,
    project: false,
    properties: false,
    nbt: true,
    transforms: false
  });
  const [clipboardEntities, setClipboardEntities] = useState<BlockFrameEntity[]>([]);
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadInputCode, setLoadInputCode] = useState('');
  const [showPaletteDrawer, setShowPaletteDrawer] = useState(false);

  // Left panel settings
  const [sidebarLeftTab, setSidebarLeftTab] = useState<'palette' | 'custom_blocks' | 'presets' | 'texturas'>('palette');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedPaletteCategory, setSelectedPaletteCategory] = useState<string>('all');

  // Persistence trackers
  useEffect(() => {
    localStorage.setItem('blockframe_custom_registered_nodes', JSON.stringify(customNodes));
  }, [customNodes]);

  useEffect(() => {
    localStorage.setItem('blockframe_custom_folder_textures', JSON.stringify(folderTextures));
  }, [folderTextures]);

  // Load community data with real-time Firestore synchronization
  useEffect(() => {
    setLoadingProjects(true);
    const unsubscribe = subscribeProjects(
      (projs) => {
        setProjects(projs);
        setLoadingProjects(false);
      },
      () => {
        setLoadingProjects(false);
      }
    );

    // Warm up the active workspace with clean empty scene (portal removed on load as requested)
    setEntities([]);

    return () => unsubscribe();
  }, []);

  const loadCommunityProjects = async () => {
    setLoadingProjects(true);
    try {
      const projs = await fetchProjects();
      setProjects(projs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProjects(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setSystemNotification({ text, type });
    setTimeout(() => {
      setSystemNotification(null);
    }, 4000);
  };

  // Undo/Redo Engine
  const pushStateToHistory = (currentEntities: BlockFrameEntity[], description: string) => {
    setHistory(prev => [...prev.slice(-30), { entities: deepCopy(currentEntities), desc: description }]);
    setRedoHistory([]); // clean redo
  };

  const undo = () => {
    if (history.length === 0) {
      showToast('Nenhum passo para desfazer', 'info');
      return { success: false, message: 'Nenhuma acao no historico de Undo.' };
    }
    const previous = history[history.length - 1];
    setRedoHistory(prev => [...prev, { entities: deepCopy(entities), desc: previous.desc }]);
    setEntities(previous.entities);
    setHistory(prev => prev.slice(0, -1));
    showToast(`Desfeito: ${previous.desc}`, 'success');
    return { success: true, message: `Desfeito com sucesso! (${previous.desc})` };
  };

  const redo = () => {
    if (redoHistory.length === 0) {
      showToast('Nenhum passo para refazer', 'info');
      return { success: false, message: 'Nenhuma acao no historico de Redo.' };
    }
    const next = redoHistory[redoHistory.length - 1];
    setHistory(prev => [...prev, { entities: deepCopy(entities), desc: next.desc }]);
    setEntities(next.entities);
    setRedoHistory(prev => prev.slice(0, -1));
    showToast(`Refeito: ${next.desc}`, 'success');
    return { success: true, message: `Refeito com sucesso! (${next.desc})` };
  };

  // Workspace Actions
  const clearWorkspace = () => {
    pushStateToHistory(entities, 'Limpar Workspace');
    setEntities([]);
    setSelectedIds([]);
    showToast('Workspace limpo');
  };

  const toggleAccordion = (key: keyof typeof accordionSections) => {
    setAccordionSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Abre uma aba individualmente fechando as outras (para navegação limpa)
  const openSectionIndividually = (key: keyof typeof accordionSections) => {
    setAccordionSections({
      elements: key === 'elements',
      project: key === 'project',
      properties: key === 'properties',
      nbt: key === 'nbt' || key === 'properties',
      transforms: key === 'transforms'
    });
  };

  const openAllSections = () => {
    setAccordionSections({
      elements: true,
      project: true,
      properties: true,
      nbt: true,
      transforms: true
    });
  };

  // Copy selected entities to internal clipboard (Ctrl+C)
  const handleCopySelected = () => {
    if (selectedIds.length === 0) {
      showToast('Nenhum elemento selecionado para copiar', 'info');
      return;
    }
    const toCopy = entities.filter(e => selectedIds.includes(e.id));
    setClipboardEntities(deepCopy(toCopy));
    showToast(`${toCopy.length} elemento(s) copiado(s) para área de transferência`);
  };

  // Paste clipboard entities with snap offset (Ctrl+V)
  const handlePaste = () => {
    if (clipboardEntities.length === 0) {
      showToast('Área de transferência vazia. Copie elementos com Ctrl+C primeiro.', 'info');
      return;
    }
    pushStateToHistory(entities, `Colar ${clipboardEntities.length} elemento(s)`);
    const offset = gridSnap > 0 ? gridSnap : 1;
    const newIds: string[] = [];
    const pastedList: BlockFrameEntity[] = clipboardEntities.map(ent => {
      const newId = `bf-copy-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      newIds.push(newId);
      return {
        ...deepCopy(ent),
        id: newId,
        pos: {
          x: Math.round((ent.pos.x + offset) * 1000) / 1000,
          y: ent.pos.y,
          z: ent.pos.z
        }
      };
    });

    setEntities(prev => [...prev, ...pastedList]);
    setSelectedIds(newIds);
    showToast(`${pastedList.length} elemento(s) colado(s)!`);
  };

  // Inverter seleção na lista de entidades
  const handleInvertSelection = () => {
    if (entities.length === 0) return;
    const inverted = entities.filter(e => !selectedIds.includes(e.id)).map(e => e.id);
    setSelectedIds(inverted);
    showToast(`Seleção invertida (${inverted.length} selecionado(s))`);
  };

  // Selecionar entidades na simulação 3D: Shift para múltiplos, Ctrl/Cmd para alternar/individual
  const handleSelectEntityInViewport = (
    id: string | null,
    modifiers?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }
  ) => {
    const isShift = !!modifiers?.shiftKey;
    const isCtrl = !!(modifiers?.ctrlKey || modifiers?.metaKey);

    if (!id) {
      // Clicou no chão / vazio
      if (!isShift && !isCtrl) {
        setSelectedIds([]);
      }
      return;
    }

    if (isShift) {
      // Shift: adiciona à seleção múltipla
      setSelectedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    } else if (isCtrl) {
      // Ctrl: alterna (deseleciona se já estiver, ou seleciona individualmente)
      setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    } else {
      // Clique padrão: seleciona somente este bloco
      setSelectedIds([id]);
    }
    setActiveTool('select');
  };

  const handleDuplicateSelected = () => {
    if (selectedIds.length === 0) {
      if (entities.length === 0) {
        showToast('Nenhum elemento para duplicar', 'info');
        return;
      }
      const last = entities[entities.length - 1];
      const newId = `bf-dup-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const clone: BlockFrameEntity = {
        ...deepCopy(last),
        id: newId,
        pos: {
          x: Math.round((last.pos.x + gridSnap) * 1000) / 1000,
          y: last.pos.y,
          z: last.pos.z
        }
      };
      pushStateToHistory(entities, `Duplicar ${last.node}`);
      setEntities(prev => [...prev, clone]);
      setSelectedIds([newId]);
      showToast(`Duplicado: ${last.node}`);
      return;
    }

    pushStateToHistory(entities, `Duplicar ${selectedIds.length} elemento(s)`);
    const newBlocks: BlockFrameEntity[] = [];
    const newIds: string[] = [];

    entities.forEach(ent => {
      if (selectedIds.includes(ent.id)) {
        const newId = `bf-dup-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        newBlocks.push({
          ...deepCopy(ent),
          id: newId,
          pos: {
            x: Math.round((ent.pos.x + gridSnap) * 1000) / 1000,
            y: ent.pos.y,
            z: ent.pos.z
          }
        });
        newIds.push(newId);
      }
    });

    setEntities(prev => [...prev, ...newBlocks]);
    setSelectedIds(newIds);
    showToast(`${newBlocks.length} elemento(s) duplicado(s)`);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      if (entities.length > 0) {
        const last = entities[entities.length - 1];
        pushStateToHistory(entities, `Deletar ${last.node}`);
        setEntities(prev => prev.slice(0, -1));
        showToast(`Removido: ${last.node}`);
      } else {
        showToast('Nenhum elemento na cena', 'info');
      }
      return;
    }
    pushStateToHistory(entities, `Deletar ${selectedIds.length} elemento(s)`);
    setEntities(prev => prev.filter(e => !selectedIds.includes(e.id)));
    setSelectedIds([]);
    showToast('Elementos deletados');
  };

  const handleSelectAllOrGroup = () => {
    if (entities.length === 0) return;
    if (selectedIds.length === entities.length) {
      setSelectedIds([]);
      showToast('Seleção limpa');
    } else {
      setSelectedIds(entities.map(e => e.id));
      showToast(`Todos os ${entities.length} elementos selecionados`);
    }
  };

  // Global Keyboard shortcuts: Delete/Backspace to delete selected, Ctrl+A to select all
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not trigger if user is actively writing inside an input, textarea or contenteditable element
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Delete or Backspace key deletes selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }

      // Ctrl+C / Cmd+C copies selected entities
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (activeTab === 'editor' && selectedIds.length > 0) {
          e.preventDefault();
          handleCopySelected();
        }
      }

      // Ctrl+V / Cmd+V pastes copied entities
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (activeTab === 'editor' && clipboardEntities.length > 0) {
          e.preventDefault();
          handlePaste();
        }
      }

      // Ctrl+A / Cmd+A selects all entities when in editor
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (activeTab === 'editor' && entities.length > 0) {
          e.preventDefault();
          setSelectedIds(entities.map(ent => ent.id));
          showToast(`Todos os ${entities.length} elementos selecionados`);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedIds, entities, activeTab, clipboardEntities, gridSnap]);

  const handleNewProject = () => {
    if (entities.length > 0) {
      pushStateToHistory(entities, 'Novo Projeto');
    }
    setEntities([]);
    setSelectedIds([]);
    setProjectName('Project');
    showToast('Novo projeto limpo iniciado');
  };

  const handleLoadImportCode = (code: string) => {
    if (!code.trim()) return;
    try {
      const trimmed = code.trim();
      let list: BlockFrameEntity[] = [];

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsedJson = JSON.parse(trimmed);
        list = Array.isArray(parsedJson) ? parsedJson : (parsedJson.entities || []);
      } else {
        list = parseBF(trimmed);
      }

      if (Array.isArray(list) && list.length > 0) {
        // In simulation, keep size=1.0 normal (if imported has 0.67 export scale, restore to 1.0)
        list = normalizeEntitiesToSimulation(list);
        pushStateToHistory(entities, 'Importar estrutura');
        setEntities(list);
        showToast(`${list.length} elementos carregados na simulação (tamanho normal 1.0)!`);
        setShowLoadModal(false);
        setLoadInputCode('');
        return;
      }
      showToast('Formato não reconhecido (.bf Lua table ou JSON)', 'error');
    } catch (e: any) {
      showToast('Erro ao importar: ' + e.message, 'error');
    }
  };

  const adjustSelectedPos = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (selectedIds.length === 0) return;
    setEntities(prev =>
      prev.map(e => {
        if (selectedIds.includes(e.id)) {
          const newPos = {
            ...e.pos,
            [axis]: Math.round((e.pos[axis] + delta) * 1000) / 1000
          };
          if (axis === 'y') newPos.y = Math.max(0, newPos.y);
          return { ...e, pos: newPos };
        }
        return e;
      })
    );
  };

  const setSelectedPosValue = (axis: 'x' | 'y' | 'z', value: number) => {
    if (selectedIds.length === 0) return;
    setEntities(prev =>
      prev.map(e => {
        if (selectedIds.includes(e.id)) {
          return {
            ...e,
            pos: {
              ...e.pos,
              [axis]: Math.round(value * 1000) / 1000
            }
          };
        }
        return e;
      })
    );
  };

  const setSelectedRotateValue = (axis: 'x' | 'y' | 'z', value: number) => {
    if (selectedIds.length === 0) {
      setBrushArgs(prev => ({
        ...prev,
        rotate: { ...prev.rotate, [axis]: value }
      }));
      return;
    }
    setEntities(prev =>
      prev.map(e => {
        if (selectedIds.includes(e.id)) {
          return {
            ...e,
            args: {
              ...e.args,
              rotate: {
                ...e.args.rotate,
                [axis]: value
              }
            }
          };
        }
        return e;
      })
    );
  };

  const setSelectedSizeValue = (axis: 'x' | 'y' | 'z', value: number) => {
    if (selectedIds.length === 0) {
      setBrushArgs(prev => ({
        ...prev,
        size: { ...prev.size, [axis]: Math.max(0.001, Math.round(value * 10000) / 10000) }
      }));
      return;
    }
    setEntities(prev =>
      prev.map(e => {
        if (selectedIds.includes(e.id)) {
          return {
            ...e,
            args: {
              ...e.args,
              size: {
                ...e.args.size,
                [axis]: Math.max(0.001, Math.round(value * 10000) / 10000)
              }
            }
          };
        }
        return e;
      })
    );
  };

  // Place block command via standard cursor raycaster
  const handlePlaceEntity = (coords: Vector3D) => {
    pushStateToHistory(entities, `Adicionar ${brushNode}`);
    const newIdx = `bf-block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newEntity: BlockFrameEntity = {
      id: newIdx,
      node: brushNode,
      pos: coords,
      args: deepCopy(brushArgs)
    } as BlockFrameEntity;

    setEntities(prev => [...prev, newEntity]);
  };

  // Select node catalog from list click
  const handleSelectBrushNode = (nodeId: string) => {
    setBrushNode(nodeId);
    
    // Check if admin has configured default properties for this item
    const customConfig = itemDefaults[nodeId];
    
    // Auto-detect item frame / wielditem mode based on BetterCraft Registry metadata
    const itemMeta = findBetterCraftItem(nodeId);
    const isWieldItem = itemMeta
      ? itemMeta.type !== 'node'
      : [
          'mcl_farming:cookie',
          'mcl_farming:bread',
          'mcl_core:apple',
          'mcl_mobitems:milk_bucket',
          'mcl_lush_caves:spore_blossom',
          'mcl_core:coal_lump',
          'mcl_core:steel_ingot',
          'mcl_core:gold_ingot',
          'mcl_core:diamond',
          'mcl_core:stick',
          'mcl_core:clay_lump',
          'mcl_core:flint',
          'mcl_core:paper',
          'mcl_core:sapling',
          'mcl_core:junglesapling',
          'mcl_core:acacia_sapling',
          'mcl_core:cactus_flower',
          'mcl_core:dry_shrub'
        ].includes(nodeId);

    const effectiveNodeMode = customConfig !== undefined ? customConfig.isNode : !isWieldItem;
    const defaultScale = customConfig?.scale !== undefined
      ? customConfig.scale
      : (!effectiveNodeMode ? 0.3 : 1.0);

    setBrushArgs(prev => ({
      ...prev,
      node: effectiveNodeMode,
      size: { x: defaultScale, y: defaultScale, z: defaultScale },
      rotate: !effectiveNodeMode ? { x: -45, y: 0, z: 0 } : prev.rotate
    }));

    // If we have blocks currently selected, apply this node material to the selection! Like /blockframe_apply default:stone
    if (selectedIds.length > 0) {
      pushStateToHistory(entities, `Alterar material para ${nodeId}`);
      setEntities(prev =>
        prev.map(e => {
          if (selectedIds.includes(e.id)) {
            return {
              ...e,
              node: nodeId,
              color: undefined,
              args: {
                ...e.args,
                node: effectiveNodeMode,
                size: { x: defaultScale, y: defaultScale, z: defaultScale }
              }
            };
          }
          return e;
        })
      );
    }
  };

  const handleSelectBetterCraftBrush = (item: BetterCraftItem) => {
    setBrushNode(item.id);
    const customConfig = itemDefaults[item.id];
    const isNodeMode = customConfig !== undefined ? customConfig.isNode : item.type === 'node';
    const defaultScale = customConfig?.scale !== undefined ? customConfig.scale : (!isNodeMode ? 0.3 : 1.0);

    setBrushArgs(prev => ({
      ...prev,
      node: isNodeMode,
      size: { x: defaultScale, y: defaultScale, z: defaultScale },
      rotate: !isNodeMode ? { x: -45, y: 0, z: 0 } : prev.rotate
    }));
    showToast(`Pincel ativo: ${customConfig?.label || item.name} (${isNodeMode ? 'Bloco 3D' : 'Item 1 Face'})`);
  };

  const handleInsertBetterCraftEntity = (item: BetterCraftItem) => {
    const customConfig = itemDefaults[item.id];
    const isNodeMode = customConfig !== undefined ? customConfig.isNode : item.type === 'node';
    const defaultScale = customConfig?.scale !== undefined ? customConfig.scale : (!isNodeMode ? 0.3 : 1.0);

    const newEntity: BlockFrameEntity = {
      id: `bf-ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      node: item.id,
      pos: { x: 0, y: Math.max(0.5, entities.length * 0.2), z: 0 },
      args: {
        size: { x: defaultScale, y: defaultScale, z: defaultScale },
        rotate: !isNodeMode ? { x: -45, y: 0, z: 0 } : { x: 0, y: 0, z: 0 },
        mirror: 'none',
        glow: 0,
        collision: true,
        node: isNodeMode
      },
      type: 'placed',
      color: item.color
    };
    pushStateToHistory(entities, `Inserir ${customConfig?.label || item.name}`);
    setEntities(prev => [...prev, newEntity]);
    showToast(`Inserido na cena: ${customConfig?.label || item.name} (${isNodeMode ? 'Bloco 3D' : 'Item 1 Face'})`);
  };

  // Single block action updates (Sidebar controls)
  const adjustSelectedProperty = <K extends keyof BlockFrameArgs>(prop: K, value: BlockFrameArgs[K]) => {
    if (selectedIds.length > 0) {
      pushStateToHistory(entities, `Ajustar propriedade ${prop}`);
      setEntities(prev =>
        prev.map(ent => {
          if (selectedIds.includes(ent.id)) {
            return {
              ...ent,
              args: {
                ...ent.args,
                [prop]: value
              }
            };
          }
          return ent;
        })
      );
    } else {
      // Modify brush configuration instead for subsequent placements
      setBrushArgs(prev => ({
        ...prev,
        [prop]: value
      }));
    }
  };

  // Duplicate Selected Blocks
  const duplicateSelected = () => {
    if (selectedIds.length === 0) return;
    pushStateToHistory(entities, 'Duplicar Seleção');
    const newBlocks: BlockFrameEntity[] = [];
    const newIds: string[] = [];

    entities.forEach(ent => {
      if (selectedIds.includes(ent.id)) {
        const newId = `bf-block-dup-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        newBlocks.push({
          ...deepCopy(ent),
          id: newId,
          // shift position slightly so it does not overlap exactly
          pos: { x: ent.pos.x + 1, y: ent.pos.y, z: ent.pos.z }
        });
        newIds.push(newId);
      }
    });

    setEntities(prev => [...prev, ...newBlocks]);
    setSelectedIds(newIds);
    showToast('Blocos duplicados com sucesso');
  };

  // Delete Selection
  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    pushStateToHistory(entities, 'Deletar Seleção');
    setEntities(prev => prev.filter(e => !selectedIds.includes(e.id)));
    setSelectedIds([]);
    showToast('Seleção removida');
  };

  // Center alignment wrapper
  const centerAllBlocks = () => {
    if (entities.length === 0) return;
    pushStateToHistory(entities, 'Centralizar Blocos');
    
    // Find average center coordinate point
    let sumX = 0, sumY = 0, sumZ = 0;
    entities.forEach(e => {
      sumX += e.pos.x;
      sumY += e.pos.y;
      sumZ += e.pos.z;
    });

    const avgX = Math.round(sumX / entities.length);
    const avgY = Math.round(sumY / entities.length);
    const avgZ = Math.round(sumZ / entities.length);

    setEntities(prev =>
      prev.map(e => ({
        ...e,
        pos: {
          x: Math.round((e.pos.x - avgX) * 2) / 2,
          y: Math.round(Math.max(0, e.pos.y - avgY) * 2) / 2, // avoid sinking below floor
          z: Math.round((e.pos.z - avgZ) * 2) / 2
        }
      }))
    );
    showToast('Ajustado coordenadas ao centro (0, 0, 0)');
  };

  // Add Custom Node Block
  const handleAddCustomNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomNodeId.trim() || !newCustomNodeName.trim()) {
      showToast('Preencha os campos do bloco customizado', 'error');
      return;
    }
    const safeId = newCustomNodeId.toLowerCase().replace(/[^a-z0-9_:]/g, '');
    const exists = MINETEST_NODES.some(n => n.id === safeId) || customNodes.some(n => n.id === safeId);
    
    if (exists) {
      showToast('Este identificador de nó já existe', 'error');
      return;
    }

    const newNode = {
      id: safeId.includes(':') ? safeId : `custom:${safeId}`,
      name: newCustomNodeName,
      color: newCustomNodeColor,
      texture: newCustomNodeTexture || undefined
    };

    setCustomNodes(prev => [...prev, newNode]);
    setNewCustomNodeId('');
    setNewCustomNodeName('');
    setNewCustomNodeTexture('');
    showToast(`Nó customizado ${newNode.id} registrado com sucesso!`);
  };

  const handleDeleteCustomNode = (id: string) => {
    setCustomNodes(prev => prev.filter(n => n.id !== id));
    showToast('Nó customizado removido');
  };

  // Import JSON / BF files drag and drop
  const handleFileImport = (fileContent: string) => {
    try {
      // First, try to parse via the new multi-format .bf and JSON parser
      const parsedList = parseBF(fileContent);
      if (parsedList && parsedList.length > 0) {
        pushStateToHistory(entities, 'Importar BF/JSON');
        setEntities(normalizeEntitiesToSimulation(parsedList));
        showToast(`Carregados ${parsedList.length} blocos com sucesso (escala 1.0 na simulação)!`, 'success');
        return;
      }

      // If that found nothing but valid JSON was provided otherwise, fallback
      const data = JSON.parse(fileContent);
      if (data.entities && Array.isArray(data.entities)) {
        pushStateToHistory(entities, 'Importar Arquivo');
        const list: BlockFrameEntity[] = data.entities.map((item: any, index: number) => {
          return {
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
              collision: item.args?.collision ?? true,
              node: item.args?.node ?? true,
            },
            type: 'placed'
          };
        });

        setEntities(normalizeEntitiesToSimulation(list));
        showToast(`Carregados ${list.length} blocos com sucesso (escala 1.0 na simulação)!`, 'success');
      } else {
        showToast('Formato inválido ou vazio: entidades não localizadas', 'error');
      }
    } catch (e) {
      showToast('Formato incompatível ou com erro de sintaxe', 'error');
    }
  };

  const handleFileUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleFileImport(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  // Load structure of a community preset project directly to edit
  const handleLoadCommunityItem = (project: ProjectItem) => {
    try {
      pushStateToHistory(entities, `Carregar ${project.title}`);
      const list = JSON.parse(project.entitiesJson);
      setEntities(normalizeEntitiesToSimulation(list));
      setActiveTab('editor');
      showToast(`Carregado "${project.title}" para edição!`);
    } catch (e) {
      showToast('Falha ao desfragmentar JSON do projeto', 'error');
    }
  };

  // Save structure online to PostgreSQL table via Supabase or Offline
  const handlePublishProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTitle.trim()) {
      showToast('Por favor insira um título descritivo', 'error');
      return;
    }

    if (entities.length === 0) {
      showToast('Workspace vazio. Adicione blocos para publicar.', 'error');
      return;
    }

    // Measure bounding dimensions
    let maxX = 0, maxY = 0, maxZ = 0;
    entities.forEach(ent => {
      maxX = Math.max(maxX, Math.abs(ent.pos.x));
      maxY = Math.max(maxY, Math.abs(ent.pos.y));
      maxZ = Math.max(maxZ, Math.abs(ent.pos.z));
    });

    const tagList = publishTags.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await saveProject({
        id: `bf-project-${Date.now()}`,
        title: publishTitle,
        description: publishDesc,
        author: publishAuthor,
        tags: tagList,
        visibility: 'public',
        preview_url: '', // optional fallback image
        json_url: '',
        blockCount: entities.length,
        sizeX: Math.round(maxX * 2) || 1,
        sizeY: Math.round(maxY) || 1,
        sizeZ: Math.round(maxZ * 2) || 1,
        entitiesJson: generateBlockFrameJSON(entities, publishTitle)
      }, currentUser?.uid);

      setPublishTitle('');
      setPublishDesc('');
      setShowPublishModal(false);
      showToast('Projeto publicado com sucesso no Firebase Firestore!');
      loadCommunityProjects();
    } catch (err) {
      showToast('Falha ao tentar publicar no Firebase', 'error');
    }
  };

  // Handle Likes Command
  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const upLikes = await likeProject(id);
      setProjects(prev =>
        prev.map(p => (p.id === id ? { ...p, likes: upLikes } : p))
      );
      showToast('Gostei adicionado!');
    } catch (e) {
      console.error(e);
    }
  };

  // Increment Downloads list counter and trigger dynamic JSON download
  const handleDownloadTrigger = async (project: ProjectItem) => {
    try {
      await downloadProject(project.id);
      setProjects(prev =>
        prev.map(p => (p.id === project.id ? { ...p, downloads: (p.downloads || 0) + 1 } : p))
      );
    } catch (e) {}

    const blob = new Blob([project.entitiesJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}.bf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Terminal executing central command handler
  const handleConsoleCommand = (fullCmd: string): { success: boolean; message: string } => {
    const trimmed = fullCmd.trim();
    if (!trimmed.startsWith('/')) {
      return { success: false, message: 'Comando inválido. Certifique-se de iniciar as ações com "/" no terminal.' };
    }

    const commandName = trimmed.split(/\s+/)[0];
    const rawArgs = trimmed.substring(commandName.length).trim();

    // 1. HELP / STATUS (/blockframe)
    if (commandName === '/blockframe') {
      return {
        success: true,
        message: 'INFO: Comandos do Mod: \n' +
                 '  /blockframe_load <nome> [scale=0.67] - Carrega estrutura com escala corrigida (padrão 0.67)\n' +
                 '  /blockframe_scale <valor> - Redimensiona blocos para escala alvo (ex: 0.67)\n' +
                 '  /blockframe_save <nome>  - Salva o desenho ativado em formato local\n' +
                 '  /blockframe_apply <args> - Aplica transformações (ex: size=0.67 rotate=0,90,0)\n' +
                 '  /blockframe_set <prop>   - Ajusta variáveis do ativo (ex: glow=10 collision=false)\n' +
                 '  /blockframe_del          - Remove voxel selecionado rápido\n' +
                 '  /blockframe_undo         - Desfaz as últimas mutações'
      };
    }

    // 2. UNDO (/blockframe_undo)
    if (commandName === '/blockframe_undo') {
      return undo();
    }

    // 3. DELETE SELECTED (/blockframe_del)
    if (commandName === '/blockframe_del') {
      if (selectedIds.length === 0) {
        return { success: false, message: 'ERRO: Nenhum bloco selecionado para deletar.' };
      }
      deleteSelected();
      return { success: true, message: 'SUCESSO: Blocos selecionados deletados.' };
    }

    // 4. APPLY TRANSFORMS (/blockframe_apply)
    if (commandName === '/blockframe_apply') {
      if (!rawArgs) {
        return { success: false, message: 'ERRO: Argumentos em falta. Ex: size=2 rotate=0,90,0' };
      }
      
      const parsed = parseArgs(rawArgs);
      pushStateToHistory(entities, `Terminal: Transformações`);

      // Apply coordinates offset if designated (apply radius or coords)
      setEntities(prev =>
        prev.map(ent => {
          // If we have selected items, apply to them. Otherwise, apply transform to ALL nodes in workspace!
          // (This fits perfectly the behaviour of BlockFrame apply radius!)
          const isTarget = selectedIds.length > 0 ? selectedIds.includes(ent.id) : true;
          if (!isTarget) return ent;

          const updated = deepCopy(ent);
          
          if (parsed.args.size) updated.args.size = parsed.args.size;
          if (parsed.args.rotate) {
            updated.args.rotate = {
              x: (updated.args.rotate.x + parsed.args.rotate.x) % 360,
              y: (updated.args.rotate.y + parsed.args.rotate.y) % 360,
              z: (updated.args.rotate.z + parsed.args.rotate.z) % 360,
            };
          }
          if (parsed.args.mirror) updated.args.mirror = parsed.args.mirror;
          if (parsed.args.glow !== undefined) updated.args.glow = parsed.args.glow;
          if (parsed.args.collision !== undefined) updated.args.collision = parsed.args.collision;
          if (parsed.node !== undefined) {
            // Apply new node block material
            updated.node = parsed.node;
          }

          return updated;
        })
      );

      return { success: true, message: `SUCESSO: Transformações aplicadas a ${selectedIds.length || 'todos os'} blocos!` };
    }

    // 5. SET PARAMETER (/blockframe_set)
    if (commandName === '/blockframe_set') {
      if (!rawArgs) {
        return { success: false, message: 'ERRO: Argumentos requeridos. Ex: collision=true glow=15' };
      }

      const parsed = parseArgs(rawArgs);
      pushStateToHistory(entities, `Terminal: Set Propriedades`);

      setEntities(prev =>
        prev.map(ent => {
          const isTarget = selectedIds.length > 0 ? selectedIds.includes(ent.id) : true;
          if (!isTarget) return ent;

          const updated = deepCopy(ent);
          if (parsed.args.glow !== undefined) updated.args.glow = parsed.args.glow;
          if (parsed.args.collision !== undefined) updated.args.collision = parsed.args.collision;
          if (parsed.args.node !== undefined) updated.args.node = parsed.args.node;
          if (parsed.args.size) updated.args.size = parsed.args.size;
          return updated;
        })
      );

      return { success: true, message: 'SUCESSO: Parâmetros atualizados.' };
    }

    // 6. SAVE LOCALLY (/blockframe_save)
    if (commandName === '/blockframe_save') {
      if (!rawArgs) {
        return { success: false, message: 'ERRO: Especifique um nome para a estrutura. Ex: /blockframe_save muralha' };
      }
      if (entities.length === 0) {
        return { success: false, message: 'ERRO: Workspace vazio. Nada para salvar.' };
      }

      // Store in project database fallback
      const mockProject: ProjectItem = {
        id: `local-save-${Date.now()}`,
        title: rawArgs,
        description: 'Estrutura editada e exportada via terminal de console.',
        author: 'Terminal',
        tags: ['Salvo via Terminal'],
        visibility: 'public',
        blockCount: entities.length,
        sizeX: 4,
        sizeY: 4,
        sizeZ: 4,
        entitiesJson: generateBlockFrameJSON(entities, rawArgs),
        createdAt: new Date().toISOString()
      };

      const existingLocal = localStorage.getItem('blockframe_local_projects');
      let localList: ProjectItem[] = existingLocal ? JSON.parse(existingLocal) : [];
      localList.unshift(mockProject);
      localStorage.setItem('blockframe_local_projects', JSON.stringify(localList));
      loadCommunityProjects();

      return { success: true, message: `SUCESSO: Estrutura "${rawArgs}" salva localmente! Pronta para exportação.` };
    }

    // 7. LOAD (/blockframe_load or /bf_load)
    if (commandName === '/blockframe_load' || commandName === '/bf_load') {
      if (!rawArgs) {
        return { success: false, message: 'ERRO: Especifique o nome da estrutura carregada. Ex: /blockframe_load "Portal Místico de Mese"' };
      }

      // Parse optional scale override if specified
      let searchTitle = rawArgs.trim();
      let explicitScale: number | null = null;

      const scaleMatch = searchTitle.match(/(?:scale|size)\s*=\s*([0-9.]+)/i);
      if (scaleMatch) {
        explicitScale = parseFloat(scaleMatch[1]);
        searchTitle = searchTitle.replace(scaleMatch[0], '').trim();
      }
      searchTitle = searchTitle.replace(/^["']|["']$/g, '').trim().toLowerCase();

      // Search localized or preset collections for matches
      const localList = localStorage.getItem('blockframe_local_projects')
        ? JSON.parse(localStorage.getItem('blockframe_local_projects')!)
        : PRESET_PROJECTS;

      const found = (localList as ProjectItem[]).find(
        p => p.title.toLowerCase().trim() === searchTitle || p.title.toLowerCase().trim().includes(searchTitle)
      );

      if (found) {
        pushStateToHistory(entities, `Terminal: Carregar ${found.title}`);
        const parsed: BlockFrameEntity[] = JSON.parse(found.entitiesJson);
        
        // In simulation, keep size=1.0 normal (or apply explicit scale if specified)
        let adjusted = normalizeEntitiesToSimulation(parsed);
        if (explicitScale !== null && !isNaN(explicitScale)) {
          adjusted = adjusted.map(ent => ({
            ...ent,
            args: {
              ...ent.args,
              size: {
                x: Math.round(ent.args.size.x * explicitScale! * 1000) / 1000,
                y: Math.round(ent.args.size.y * explicitScale! * 1000) / 1000,
                z: Math.round(ent.args.size.z * explicitScale! * 1000) / 1000,
              }
            }
          }));
        }

        setEntities(adjusted);
        return { 
          success: true, 
          message: `SUCESSO: Estrutura "${found.title}" de ${found.author} carregada no editor (escala normal 1.0; diminuirá 0.67 ao exportar)!` 
        };
      } else {
        return { success: false, message: `ERRO: Nenhuma estrutura correspondente a "${rawArgs}" foi localizada.` };
      }
    }

    // 8. SCALE (/blockframe_scale, /bf_scale, /scale)
    if (commandName === '/blockframe_scale' || commandName === '/bf_scale' || commandName === '/scale') {
      const targetScale = rawArgs ? parseFloat(rawArgs.replace(/[^0-9.]/g, '')) || 1.0 : 1.0;
      pushStateToHistory(entities, `Terminal: Escala ${targetScale}`);
      setEntities(prev =>
        prev.map(e => {
          if (selectedIds.length > 0 && !selectedIds.includes(e.id)) return e;
          return {
            ...e,
            args: {
              ...e.args,
              size: { x: targetScale, y: targetScale, z: targetScale }
            }
          };
        })
      );
      return {
        success: true,
        message: `SUCESSO: ${selectedIds.length > 0 ? `${selectedIds.length} blocos selecionados ajustados` : 'Todos os blocos ajustados'} para escala ${targetScale}!`
      };
    }

    return { success: false, message: `ERRO: Comando "${commandName}" não mapeado na API do BlockFrame.` };
  };

  // Combined built-in nodes, BetterCraft catalog, and user customized nodes
  const allAvailableNodes = useMemo(() => {
    const customMetadata = customNodes.map(cn => ({
      id: cn.id,
      name: cn.name,
      category: 'special' as const,
      color: cn.color,
      texture: cn.texture
    }));

    const existingIds = new Set<string>();
    const combined: typeof MINETEST_NODES = [];

    // Custom nodes first
    customMetadata.forEach(n => {
      existingIds.add(n.id);
      combined.push(n);
    });

    // BetterCraft items & blocks
    BETTERCRAFT_PALETTE_NODES.forEach(n => {
      if (!existingIds.has(n.id)) {
        existingIds.add(n.id);
        combined.push(n);
      }
    });

    // Standard minetest nodes
    MINETEST_NODES.forEach(n => {
      if (!existingIds.has(n.id)) {
        existingIds.add(n.id);
        combined.push(n);
      }
    });

    // Apply any admin configured item defaults (custom name / label and custom image / texture)
    return combined.map(node => {
      const def = itemDefaults[node.id];
      if (!def) return node;
      return {
        ...node,
        name: def.label || node.name,
        texture: def.image || node.texture
      };
    });
  }, [customNodes, itemDefaults]);

  // Filters for materials pallet
  const filteredMaterialList = useMemo(() => {
    return allAvailableNodes.filter(node => {
      const matchesSearch = node.name.toLowerCase().includes(paletteSearch.toLowerCase()) ||
                            node.id.toLowerCase().includes(paletteSearch.toLowerCase());
      const matchesCategory = selectedPaletteCategory === 'all' || node.category === selectedPaletteCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allAvailableNodes, paletteSearch, selectedPaletteCategory]);

  // Mirror visual workspace
  const handleMirrorAxis = (axis: 'x' | 'y' | 'z') => {
    if (entities.length === 0) return;
    pushStateToHistory(entities, `Espelhar eixo ${axis.toUpperCase()}`);
    
    setEntities(prev => {
      return prev.map(ent => {
        // Apply mirror translation to coordinates of selection only (or all if none selected)
        const isTarget = selectedIds.length > 0 ? selectedIds.includes(ent.id) : true;
        if (!isTarget) return ent;

        const copy = deepCopy(ent);
        if (axis === 'x') {
          copy.pos.x = -copy.pos.x;
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
    });
    showToast(`Invertido blocos no plano ${axis.toUpperCase()}`);
  };

  // Rotate entire selection or world
  const handleRotate90 = (axis: 'x' | 'y' | 'z') => {
    if (entities.length === 0) return;
    pushStateToHistory(entities, `Rotacionar 90° eixo ${axis.toUpperCase()}`);

    setEntities(prev => {
      if (selectedIds.length > 0) {
        // Rotate only selected items
        const subSelected = prev.filter(e => selectedIds.includes(e.id));
        const rest = prev.filter(e => !selectedIds.includes(e.id));
        return [...rest, ...rotateStructuralSet(subSelected, axis, 90)];
      } else {
        // Rotate everything
        return rotateStructuralSet(prev, axis, 90);
      }
    });
    showToast(`Rotacionado 90 graus no eixo ${axis.toUpperCase()}`);
  };

  // Tag list for community filtering
  const allCommunityTags = useMemo(() => {
    const tags = new Set<string>();
    projects.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [projects]);

  // Filtering projects list
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = !selectedTag || p.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [projects, searchQuery, selectedTag]);

  // Selected Block arguments for sidebar binding
  const selectedEntity = useMemo(() => {
    if (selectedIds.length === 1) {
      return entities.find(e => e.id === selectedIds[0]);
    }
    return null;
  }, [selectedIds, entities]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-cyan-500 selection:text-slate-950 overflow-hidden relative">
      {/* Immersive radial blueprint background style */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.12 }} />
      
      {/* BDStudio Global Header matching reference */}
      <header className="sticky top-0 z-40 bg-[#0d0e15] border-b border-slate-800 px-3 md:px-5 py-2 flex items-center justify-between select-none shadow-md font-mono">
        <div className="flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-md flex items-center justify-center text-black font-black text-xs shadow-[0_0_12px_rgba(16,185,129,0.35)]">
              <Box className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-wide text-white leading-none">
                BDStudio
              </span>
              <span className="text-[8px] text-emerald-400 tracking-wider font-semibold">
                BLOCKFRAME / MINECRAFT
              </span>
            </div>
          </div>

          {/* Action Buttons Group: Load, Save, New, Undo, Redo, Export to Minecraft */}
          <div className="flex items-center gap-1 bg-[#151620] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setShowLoadModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
              title="Carregar projeto (.bf / JSON)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Load</span>
            </button>
            <button
              onClick={() => {
                const code = generateBFExport(entities);
                const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${projectName.toLowerCase().replace(/\s+/g, '_') || 'model'}.bf`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Arquivo .bf salvo com sucesso!', 'success');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
              title="Salvar arquivo .bf"
            >
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span>Save</span>
            </button>
            <button
              onClick={handleNewProject}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
              title="Novo projeto limpo"
            >
              <FilePlus className="w-3.5 h-3.5 text-slate-400" />
              <span>New</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="p-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Desfazer (Undo)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={redoHistory.length === 0}
              className="p-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Refazer (Redo)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/60 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all cursor-pointer shadow-sm"
              title="Exportar para Minecraft block_display ou Luanti BlockFrame"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export to Minecraft</span>
            </button>
          </div>
        </div>

        {/* Header Right Utilities */}
        <div className="flex items-center gap-2">
          {/* Toggle Terminal / Console */}
          <button
            onClick={() => setShowBottomDrawer(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
              showBottomDrawer
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : 'bg-[#151620] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Abrir / Fechar Terminal e Console"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Console</span>
          </button>

          {/* BetterCraft 850+ Catalog */}
          <button
            onClick={() => setIsBetterCraftBrowserOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider cursor-pointer transition-all flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 shadow-sm"
            title="Catálogo BetterCraft com mais de 850 itens extraídos de games/bettercraft/mods/ITEMS"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">BETTERCRAFT (850+)</span>
          </button>

          {/* Admin Panel Button (When logged in as jeanpierreowner@gmail.com or other admin) */}
          {isAdmin && (
            <button
              onClick={() => {
                setAdminEditingItemId(null);
                setShowAdminModal(true);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 bg-gradient-to-r from-amber-500/25 to-yellow-500/20 hover:from-amber-500/35 hover:to-yellow-500/30 text-amber-300 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              title="Abrir Painel Admin: Configurar itens padrão (1 face vs 3D, imagem na lista) e gerenciar administradores"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
              <span className="uppercase tracking-wider">PAINEL ADMIN</span>
            </button>
          )}

          {/* Google Auth Status & Action */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-[#151620] px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Avatar'}
                  className="w-4 h-4 rounded-full border border-emerald-500/40"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden lg:inline text-slate-200 font-bold max-w-[120px] truncate text-[11px]">
                {currentUser.displayName || currentUser.email || 'Usuário'}
              </span>
              <button
                onClick={async () => {
                  await logOut();
                  showToast('Desconectado com sucesso', 'info');
                }}
                className="text-slate-500 hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors ml-0.5"
                title="Sair da conta Google"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                    showToast('Login Google efetuado com sucesso!');
                  } catch (err: any) {
                    showToast('Falha no login com Google', 'error');
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40"
                title="Entrar com sua conta Google para gerenciar seus projetos"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-[11px]">Login Google</span>
              </button>
            </div>
          )}

          {/* Shortcuts Modal Button */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 bg-[#151620] text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg cursor-pointer transition-colors"
            title="Atalhos e Instruções de Uso"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Tab Route Switching */}
          <div className="flex items-center gap-1 bg-[#151620] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'editor'
                  ? 'bg-[#0a0b10] text-emerald-400 border border-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                activeTab === 'community'
                  ? 'bg-[#0a0b10] text-cyan-400 border border-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Comunidade</span>
            </button>
            <button
              onClick={() => setActiveTab('onboarding')}
              className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'onboarding'
                  ? 'bg-[#0a0b10] text-amber-400 border border-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3 h-3 text-amber-400" />
              <span>Firebase</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Live Toast Notification */}
      {systemNotification && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-[#0d0d12]/95 backdrop-blur-md shadow-2xl font-mono text-xs max-w-[320px] transition-all">
          {systemNotification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
          {systemNotification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          {systemNotification.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0" />}
          <div className="flex-1 text-slate-200">{systemNotification.text}</div>
        </div>
      )}

      {/* Active Tab Screen Routing */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'editor' && (
          <BDStudioEditor
            entities={entities}
            setEntities={setEntities}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            selectedEntity={selectedEntity}
            brushNode={brushNode}
            setBrushNode={setBrushNode}
            brushArgs={brushArgs}
            setBrushArgs={setBrushArgs}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            gridSnap={gridSnap}
            setGridSnap={setGridSnap}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            allAvailableNodes={allAvailableNodes}
            handlePlaceEntity={handlePlaceEntity}
            handleSelectBrushNode={handleSelectBrushNode}
            handleRotate90={handleRotate90}
            handleMirrorAxis={handleMirrorAxis}
            adjustSelectedProperty={adjustSelectedProperty}
            adjustSelectedPos={adjustSelectedPos}
            setSelectedPosValue={setSelectedPosValue}
            setSelectedRotateValue={setSelectedRotateValue}
            setSelectedSizeValue={setSelectedSizeValue}
            handleDuplicateSelected={handleDuplicateSelected}
            handleDeleteSelected={handleDeleteSelected}
            handleSelectAllOrGroup={handleSelectAllOrGroup}
            handleConsoleCommand={handleConsoleCommand}
            centerAllBlocks={centerAllBlocks}
            projectName={projectName}
            setProjectName={setProjectName}
            generateBFExport={generateBFExport}
            setShowCodeModal={setShowCodeModal}
            setShowPublishModal={setShowPublishModal}
            setIsBetterCraftBrowserOpen={setIsBetterCraftBrowserOpen}
            showToast={showToast}
            showPaletteDrawer={showPaletteDrawer}
            setShowPaletteDrawer={setShowPaletteDrawer}
            sidebarLeftTab={sidebarLeftTab}
            setSidebarLeftTab={setSidebarLeftTab}
            accordionSections={accordionSections}
            toggleAccordion={toggleAccordion}
            openSectionIndividually={openSectionIndividually}
            openAllSections={openAllSections}
            handleCopySelected={handleCopySelected}
            handlePaste={handlePaste}
            handleInvertSelection={handleInvertSelection}
            clipboardCount={clipboardEntities.length}
            showBottomDrawer={showBottomDrawer}
            setShowBottomDrawer={setShowBottomDrawer}
            customNodes={customNodes}
            handleRegisterCustomNode={handleAddCustomNode}
            handleDeleteCustomNode={handleDeleteCustomNode}
            newCustomNodeId={newCustomNodeId}
            setNewCustomNodeId={setNewCustomNodeId}
            newCustomNodeLabel={newCustomNodeName}
            setNewCustomNodeLabel={setNewCustomNodeName}
            paletteSearch={paletteSearch}
            setPaletteSearch={setPaletteSearch}
            presetProjects={PRESET_PROJECTS}
            pushStateToHistory={pushStateToHistory}
            isAdmin={isAdmin}
            onOpenAdminPanel={() => {
              setAdminEditingItemId(null);
              setShowAdminModal(true);
            }}
            onOpenAdminItemEdit={(itemId) => {
              setAdminEditingItemId(itemId);
              setShowAdminModal(true);
            }}
            itemDefaults={itemDefaults}
          />
        )}

        {/* Tab 2: Communities Database Showcase list panel */}
        {activeTab === 'community' && (
          <div className="p-6 max-w-6xl mx-auto w-full space-y-6 animate-fade-in relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#16161d] p-6 rounded-2xl border border-slate-800 shadow-md">
              <div className="space-y-1.5 font-mono">
                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-405 text-cyan-400" /> Galeria da Comunidade
                </h2>
                <p className="text-xs text-slate-440 text-slate-400">
                  Estruturas criadas por construtores do Minetest utilizando as transformações do BlockFrame.
                </p>
              </div>

              {/* Dynamic Search queries & and input filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-505 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por título, autor..."
                    className="bg-[#0a0a0c] border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
                  />
                </div>
                
                {allCommunityTags.length > 0 && (
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="bg-[#0a0a0c] border border-slate-800 text-slate-300 text-xs rounded-xl px-4 py-2.5 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="">Todas as Tags</option>
                    {allCommunityTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* List columns layout responsive cards */}
            {loadingProjects ? (
              <div className="text-center py-20 font-mono text-slate-400 space-y-4">
                <div className="w-10 h-10 border-4 border-t-amber-400 border-r-transparent border-slate-800 rounded-full animate-spin mx-auto" />
                <p className="text-xs">Sincronizando projetos em tempo real com o Firebase Firestore...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-[#16161d] border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm text-slate-200 group-hover:text-cyan-400 transition-colors truncate pr-2 font-mono uppercase">
                          {proj.title}
                        </h3>
                        <span className="text-[9px] bg-[#0a0a0c] border border-slate-800/80 text-cyan-400 px-2 py-0.5 rounded font-mono shrink-0 font-bold uppercase shadow-sm">
                          {proj.blockCount} blocos
                        </span>
                      </div>
                      <p className="text-xs text-slate-440 text-slate-400 font-mono leading-relaxed line-clamp-3">
                        {proj.description || 'Nenhuma descrição adicionada.'}
                      </p>
                    </div>

                    <div className="space-y-4 text-xs font-mono">
                      {/* Bounds metadata */}
                      <div className="grid grid-cols-3 gap-2 bg-[#0a0a0c] p-2.5 rounded border border-slate-800/70 text-center text-[10px]">
                        <div>
                          <div className="text-slate-500 font-bold">Larg. X</div>
                          <div className="font-bold text-slate-300">{proj.sizeX}m</div>
                        </div>
                        <div>
                          <div className="text-slate-550 text-slate-505 text-slate-500 font-bold">Alt. Y</div>
                          <div className="font-bold text-slate-300">{proj.sizeY}m</div>
                        </div>
                        <div>
                          <div className="text-slate-550 text-slate-505 text-slate-500 font-bold">Prof. Z</div>
                          <div className="font-bold text-slate-300">{proj.sizeZ}m</div>
                        </div>
                      </div>

                      {/* Tag list */}
                      <div className="flex flex-wrap gap-1">
                        {proj.tags.map(t => (
                          <span
                            key={t}
                            onClick={() => setSelectedTag(t)}
                            className="bg-purple-950/20 text-purple-400 hover:text-purple-300 border border-purple-900 text-[8px] uppercase px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Item footer list */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-3 text-slate-500 text-[10px]">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-600" />
                          <span className="truncate max-w-[80px] font-bold text-slate-400">{proj.author}</span>
                        </div>
                        
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={(e) => handleLike(proj.id, e)}
                            className="flex items-center gap-1 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-500/10 text-slate-500 hover:fill-rose-500" />
                            <span>{proj.likes || 0}</span>
                          </button>
                          <div className="flex items-center gap-1 text-slate-500">
                            <DownloadCloud className="w-3.5 h-3.5" />
                            <span>{proj.downloads || 0}</span>
                          </div>
                          {proj.authorId && currentUser && proj.authorId === currentUser.uid && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Excluir o projeto "${proj.title}" do Firestore?`)) {
                                  await deleteProject(proj.id);
                                  showToast('Projeto removido do Firebase!');
                                }
                              }}
                              className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer p-0.5 ml-1"
                              title="Excluir meu projeto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick project import toggle to middle space edit overlay */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleLoadCommunityItem(proj)}
                        className="w-full text-center bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-[10px] font-mono font-bold py-2 rounded-lg cursor-pointer transition-all border border-cyan-500/30 hover:border-transparent"
                      >
                        ABRIR NO EDITOR 3D
                      </button>
                    </div>
                  </div>
                ))}

                {filteredProjects.length === 0 && (
                  <div className="col-span-full text-center py-20 font-mono text-slate-500 space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs">Nenhum projeto encontrado para os termos pesquisados.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Firebase Dashboard & Real-time Cloud Firestore Status */}
        {activeTab === 'onboarding' && (
          <div className="p-6 max-w-4xl mx-auto w-full space-y-6 font-mono">
            {/* Card info Firebase status */}
            <div className="bg-[#0b0e16] border border-slate-900 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" /> Firebase Cloud Firestore & Auth
                </h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado e Ativo
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                A aplicação está integrada com o <span className="text-amber-400 font-bold">Google Firebase</span>, utilizando o banco NoSQL <span className="text-cyan-400 font-bold">Cloud Firestore</span> em tempo real e o <span className="text-emerald-400 font-bold">Firebase Authentication (Google)</span>. Todas as estruturas publicadas são sincronizadas instantaneamente para todos os usuários sem necessidade de recarregar a página.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-1.5">
                  <span className="text-amber-400 font-bold">Firebase Project</span>
                  <div className="text-[11px] text-slate-200 font-mono break-all">{firebaseConfig.projectId}</div>
                  <div className="text-[10px] text-slate-500">Google Cloud Platform</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-1.5">
                  <span className="text-cyan-400 font-bold">Database ID</span>
                  <div className="text-[11px] text-slate-200 font-mono truncate" title={firebaseConfig.firestoreDatabaseId}>
                    {firebaseConfig.firestoreDatabaseId}
                  </div>
                  <div className="text-[10px] text-slate-500">Coleção: /projects</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-1.5">
                  <span className="text-emerald-400 font-bold">Autenticação</span>
                  <div className="text-[11px] text-slate-200 font-mono truncate">
                    {currentUser ? currentUser.email : 'Visitante (Público)'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {currentUser ? 'Sessão ativa com Google' : 'Faça login no botão acima'}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Rules & Real-time Features */}
            <div className="bg-[#0b0e16] border border-slate-900 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-900">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  Regras de Segurança Firestore (ABAC Fortalecido)
                </span>
                <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                  firestore.rules Ativas
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Visualização Aberta:</strong> Qualquer jogador pode navegar pela galeria da comunidade e carregar estruturas voxel para o editor 3D.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Incrementos Atômicos:</strong> Curtidas e downloads são incrementados de forma atômica e validada sem risco de sobreposição de concorrência.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Proteção de Autoria:</strong> Apenas o criador autenticado do projeto pode editar ou remover sua própria estrutura da galeria.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Cache e Fallback Local:</strong> O editor mantém sincronização em memória e LocalStorage, permitindo continuar criando mesmo offline.</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#070910] border-t border-slate-900/60 p-4 text-center font-mono text-[9px] text-slate-500 space-y-1 mt-auto shrink-0">
        <div>BlockFrame Online Editor - Plataforma Web Voxel Independente integrada com a comunidade e o mod Minetest.</div>
        <div>Código gerado em conformidade com as regras e transformações matemáticas de init.lua.</div>
      </footer>

      {/* MODAL 1: Compile export files (Lua, Json, Bfs) */}
      {showCodeModal && (
        <CodeModal
          entities={entities}
          structureName={publishTitle || 'minha_estrutura'}
          onClose={() => setShowCodeModal(false)}
        />
      )}

      {/* MODAL 2: Publish community items online */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-920 border-b border-slate-800">
              <span className="font-bold tracking-wider uppercase text-slate-200">Publicar Novo Projeto</span>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePublishProject} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase">Título da Estrutura</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Trono de Obsidian"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase">Breve Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhes como escala, tempo de construção e uso..."
                  value={publishDesc}
                  onChange={(e) => setPublishDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase">Autor / Construtor</label>
                <input
                  type="text"
                  placeholder="Seu nick no Minetest"
                  value={publishAuthor}
                  onChange={(e) => setPublishAuthor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase">Tags (Separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="ex: Portal, Fantasia, Mese"
                  value={publishTags}
                  onChange={(e) => setPublishTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] text-slate-400 leading-relaxed flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Isso salvará a estrutura de {entities.length} blocos voxel de forma persistente no banco de dados Firebase Cloud Firestore.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="bg-slate-800 hover:bg-slate-755 text-slate-300 py-1.5 px-4 rounded-lg cursor-pointer font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-1.5 px-4 rounded-lg cursor-pointer font-bold"
                >
                  Confirmar e Postar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BetterCraft Full Registry Browser */}
      <BetterCraftBrowser
        isOpen={isBetterCraftBrowserOpen}
        onClose={() => setIsBetterCraftBrowserOpen(false)}
        onSelectBrush={handleSelectBetterCraftBrush}
        onInsertEntity={handleInsertBetterCraftEntity}
        itemDefaults={itemDefaults}
        isAdmin={isAdmin}
        onOpenAdminItemEdit={(itemId) => {
          setAdminEditingItemId(itemId);
          setShowAdminModal(true);
        }}
      />

      {/* Admin Panel Modal (jeanpierreowner@gmail.com) */}
      <AdminPanelModal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setAdminEditingItemId(null);
        }}
        currentUserEmail={currentUser?.email || null}
        admins={admins}
        onAddAdmin={async (email) => {
          await addAdminUser(email, currentUser?.email || 'admin');
        }}
        onRemoveAdmin={async (email) => {
          await removeAdminUser(email);
        }}
        itemDefaults={itemDefaults}
        onSaveItemDefault={async (config) => {
          await saveItemDefaultProperty(config, currentUser?.email || 'admin');
        }}
        onDeleteItemDefault={async (itemId) => {
          await deleteItemDefaultProperty(itemId);
        }}
        showToast={showToast}
        initialEditingItemId={adminEditingItemId}
      />

      {/* Load / Import Modal */}
      <LoadModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        loadInputCode={loadInputCode}
        setLoadInputCode={setLoadInputCode}
        onConfirm={handleLoadImportCode}
        onFileUpload={handleFileUploadInput}
      />

      {/* Shortcuts Guidance Modal */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

    </div>
  );
}
