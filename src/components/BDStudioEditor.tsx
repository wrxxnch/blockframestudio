import React, { useState } from 'react';
import {
  Box,
  Plus,
  Trash2,
  Maximize2,
  RotateCw,
  Grid,
  Maximize,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Type,
  Copy,
  Boxes,
  Code,
  Search,
  Download,
  Globe,
  X,
  Package,
  Move
} from 'lucide-react';
import { BlockFrameEntity, BlockFrameArgs, MinetestNodeMetadata, ProjectItem, MINETEST_NODES } from '../types';
import VoxelViewport from './VoxelViewport';
import CommandConsole from './CommandConsole';
import { ItemLibrarySidebar } from './ItemLibrarySidebar';
import { findBetterCraftItem } from '../bettercraftRegistry';

interface BDStudioEditorProps {
  entities: BlockFrameEntity[];
  setEntities: React.Dispatch<React.SetStateAction<BlockFrameEntity[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedEntity: BlockFrameEntity | null;
  brushNode: string;
  setBrushNode: (node: string) => void;
  brushArgs: BlockFrameArgs;
  setBrushArgs: React.Dispatch<React.SetStateAction<BlockFrameArgs>>;
  activeTool: 'select' | 'add' | 'delete';
  setActiveTool: (tool: 'select' | 'add' | 'delete') => void;
  gridSnap: number;
  setGridSnap: (snap: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  allAvailableNodes: MinetestNodeMetadata[];
  handlePlaceEntity: (pos: { x: number; y: number; z: number }) => void;
  handleSelectBrushNode: (id: string) => void;
  handleRotate90: (axis: 'x' | 'y' | 'z') => void;
  handleMirrorAxis: (axis: 'x' | 'y' | 'z') => void;
  adjustSelectedProperty: (key: keyof BlockFrameArgs, value: any) => void;
  adjustSelectedPos: (axis: 'x' | 'y' | 'z', delta: number) => void;
  setSelectedPosValue: (axis: 'x' | 'y' | 'z', value: number) => void;
  setSelectedRotateValue: (axis: 'x' | 'y' | 'z', value: number) => void;
  setSelectedSizeValue: (axis: 'x' | 'y' | 'z', value: number) => void;
  handleDuplicateSelected: () => void;
  handleDeleteSelected: () => void;
  handleSelectAllOrGroup: () => void;
  handleConsoleCommand: (cmd: string) => void;
  centerAllBlocks: () => void;
  projectName: string;
  setProjectName: (name: string) => void;
  generateBFExport: (entities: BlockFrameEntity[]) => string;
  setShowCodeModal: (show: boolean) => void;
  setShowPublishModal: (show: boolean) => void;
  setIsBetterCraftBrowserOpen: (open: boolean) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  showPaletteDrawer: boolean;
  setShowPaletteDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarLeftTab: 'palette' | 'custom_blocks' | 'texturas' | 'presets';
  setSidebarLeftTab: (tab: 'palette' | 'custom_blocks' | 'texturas' | 'presets') => void;
  accordionSections: {
    elements: boolean;
    project: boolean;
    properties: boolean;
    nbt: boolean;
    transforms: boolean;
  };
  toggleAccordion: (section: 'elements' | 'project' | 'properties' | 'nbt' | 'transforms') => void;
  showBottomDrawer: boolean;
  setShowBottomDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  customNodes: Array<{ id: string; name: string; color?: string; texture?: string }>;
  handleRegisterCustomNode: (e: React.FormEvent) => void;
  handleDeleteCustomNode: (id: string) => void;
  newCustomNodeId: string;
  setNewCustomNodeId: (val: string) => void;
  newCustomNodeLabel: string;
  setNewCustomNodeLabel: (val: string) => void;
  paletteSearch: string;
  setPaletteSearch: (val: string) => void;
  presetProjects: ProjectItem[];
  pushStateToHistory: (currentEntities: BlockFrameEntity[], actionLabel: string) => void;
}

export const BDStudioEditor: React.FC<BDStudioEditorProps> = ({
  entities,
  setEntities,
  selectedIds,
  setSelectedIds,
  selectedEntity,
  brushNode,
  brushArgs,
  setBrushArgs,
  activeTool,
  setActiveTool,
  gridSnap,
  setGridSnap,
  showGrid,
  setShowGrid,
  allAvailableNodes,
  handlePlaceEntity,
  handleSelectBrushNode,
  handleRotate90,
  handleMirrorAxis,
  adjustSelectedProperty,
  adjustSelectedPos,
  setSelectedPosValue,
  setSelectedRotateValue,
  setSelectedSizeValue,
  handleDuplicateSelected,
  handleDeleteSelected,
  handleSelectAllOrGroup,
  handleConsoleCommand,
  centerAllBlocks,
  projectName,
  setProjectName,
  generateBFExport,
  setShowCodeModal,
  setShowPublishModal,
  setIsBetterCraftBrowserOpen,
  showToast,
  showPaletteDrawer,
  setShowPaletteDrawer,
  sidebarLeftTab,
  setSidebarLeftTab,
  accordionSections,
  toggleAccordion,
  showBottomDrawer,
  setShowBottomDrawer,
  customNodes,
  handleRegisterCustomNode,
  handleDeleteCustomNode,
  newCustomNodeId,
  setNewCustomNodeId,
  newCustomNodeLabel,
  setNewCustomNodeLabel,
  paletteSearch,
  setPaletteSearch,
  presetProjects,
  pushStateToHistory,
}) => {
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(true);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Handle Drag and Drop of items/blocks from the Left Library directly into the 3D scene
  const handleDropEntity = (nodeId: string, pos: { x: number; y: number; z: number }) => {
    pushStateToHistory(entities, `Arrastar ${nodeId}`);
    const itemMeta = findBetterCraftItem(nodeId);
    const isWieldItem = itemMeta ? itemMeta.type !== 'node' : false;

    const newId = `bf-block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newEntity: BlockFrameEntity = {
      id: newId,
      node: nodeId,
      pos: pos,
      args: {
        ...brushArgs,
        node: !isWieldItem,
      },
      type: 'placed',
    };

    setEntities(prev => [...prev, newEntity]);
    setSelectedIds([newId]);
    setActiveTool('select');
    showToast(`Bloco adicionado: ${nodeId} em [${pos.x}, ${pos.y}, ${pos.z}]`);
  };

  // Handle 3D Gizmo Drag/Rotate/Scale completion
  const handleTransformCommit = (
    id: string,
    pos: { x: number; y: number; z: number },
    rotate: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number }
  ) => {
    pushStateToHistory(entities, `Transformar bloco`);
    setEntities(prev =>
      prev.map(e => {
        if (e.id === id) {
          return {
            ...e,
            pos,
            args: {
              ...e.args,
              rotate,
              size,
            },
          };
        }
        return e;
      })
    );
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col md:flex-row overflow-hidden relative">
      
      {/* Left Item & Block Library with Images and Drag-Drop capability */}
      <ItemLibrarySidebar
        allAvailableNodes={allAvailableNodes}
        brushNode={brushNode}
        onSelectBrushNode={(nodeId) => {
          handleSelectBrushNode(nodeId);
          setActiveTool('add');
        }}
        isOpen={isLibraryOpen}
        onToggleOpen={() => setIsLibraryOpen(prev => !prev)}
        onOpenBetterCraftBrowser={() => setIsBetterCraftBrowserOpen(true)}
        customNodes={customNodes.map(cn => ({
          id: cn.id,
          name: cn.name,
          color: cn.color || '#3b82f6',
          texture: cn.texture
        }))}
        onAddCustomNode={(id, name, color, texture) => {
          setNewCustomNodeId(id);
          setNewCustomNodeLabel(name);
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleRegisterCustomNode(fakeEvent);
        }}
        onDeleteCustomNode={handleDeleteCustomNode}
      />

      {/* Slide-out Drawer for Custom Nodes, Textures & Presets */}
      {showPaletteDrawer && (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-[#0d0e15]/95 border-r border-slate-800 z-30 p-4 overflow-y-auto flex flex-col shadow-2xl backdrop-blur-md font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              PALETA & TEXTURAS
            </span>
            <button
              onClick={() => setShowPaletteDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="grid grid-cols-4 gap-1 bg-[#161620] p-1 rounded-lg border border-slate-800 mb-3">
            <button
              onClick={() => setSidebarLeftTab('palette')}
              className={`py-1 rounded text-[9px] font-bold cursor-pointer ${
                sidebarLeftTab === 'palette' ? 'bg-[#0a0b10] text-cyan-400 border border-slate-800' : 'text-slate-400'
              }`}
            >
              PALETA
            </button>
            <button
              onClick={() => setSidebarLeftTab('custom_blocks')}
              className={`py-1 rounded text-[9px] font-bold cursor-pointer ${
                sidebarLeftTab === 'custom_blocks' ? 'bg-[#0a0b10] text-cyan-400 border border-slate-800' : 'text-slate-400'
              }`}
            >
              CUSTOM
            </button>
            <button
              onClick={() => setSidebarLeftTab('texturas')}
              className={`py-1 rounded text-[9px] font-bold cursor-pointer ${
                sidebarLeftTab === 'texturas' ? 'bg-[#0a0b10] text-cyan-400 border border-slate-800' : 'text-slate-400'
              }`}
            >
              TEXTURAS
            </button>
            <button
              onClick={() => setSidebarLeftTab('presets')}
              className={`py-1 rounded text-[9px] font-bold cursor-pointer ${
                sidebarLeftTab === 'presets' ? 'bg-[#0a0b10] text-cyan-400 border border-slate-800' : 'text-slate-400'
              }`}
            >
              PRESETS
            </button>
          </div>

          {/* Palette View */}
          {sidebarLeftTab === 'palette' && (
            <div className="flex-1 flex flex-col space-y-3 min-h-0 overflow-y-auto">
              <button
                onClick={() => {
                  setShowPaletteDrawer(false);
                  setIsBetterCraftBrowserOpen(true);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">Ver Catálogo 850+</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded font-bold">Abrir</span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={paletteSearch}
                  onChange={(e) => setPaletteSearch(e.target.value)}
                  placeholder="Buscar bloco rápido..."
                  className="w-full bg-[#151620] border border-slate-800 text-slate-100 pl-8 pr-2.5 py-1.5 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-1 overflow-y-auto max-h-[350px] pr-1">
                {MINETEST_NODES.filter(n => n.id.toLowerCase().includes(paletteSearch.toLowerCase()) || n.name.toLowerCase().includes(paletteSearch.toLowerCase())).map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      handleSelectBrushNode(node.id);
                      setShowPaletteDrawer(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      brushNode === node.id
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                        : 'bg-[#151620] border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="truncate text-xs font-semibold">{node.name}</span>
                    <span className="text-[9px] text-slate-500 truncate ml-2 max-w-[110px]">{node.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Blocks Registration */}
          {sidebarLeftTab === 'custom_blocks' && (
            <div className="flex-1 flex flex-col space-y-3">
              <div className="text-[11px] text-slate-400">
                Registre nós customizados com identificadores de seu modpack Luanti:
              </div>
              <form onSubmit={handleRegisterCustomNode} className="space-y-2">
                <input
                  type="text"
                  placeholder="ID (ex: meu_mod:mesa)"
                  value={newCustomNodeId}
                  onChange={(e) => setNewCustomNodeId(e.target.value)}
                  className="w-full bg-[#151620] border border-slate-800 p-2 rounded text-xs text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Nome (ex: Mesa de Madeira)"
                  value={newCustomNodeLabel}
                  onChange={(e) => setNewCustomNodeLabel(e.target.value)}
                  className="w-full bg-[#151620] border border-slate-800 p-2 rounded text-xs text-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 rounded cursor-pointer transition-all"
                >
                  Registrar Nó
                </button>
              </form>
              <div className="space-y-1 overflow-y-auto max-h-48 pt-2">
                {customNodes.map(node => (
                  <div key={node.id} className="flex items-center justify-between p-1.5 bg-[#161620] rounded border border-slate-800">
                    <span className="text-slate-200">{node.name}</span>
                    <button
                      onClick={() => handleDeleteCustomNode(node.id)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Texturas Customizadas */}
          {sidebarLeftTab === 'texturas' && (
            <div className="flex-1 flex flex-col space-y-3">
              <div className="text-[11px] text-slate-400">
                Insira o link de uma textura PNG para mapear a nós customizados:
              </div>
              <input
                type="text"
                placeholder="URL da textura (PNG)..."
                className="w-full bg-[#151620] border border-slate-800 p-2 rounded text-xs text-white"
              />
              <button
                onClick={() => showToast('Mapeamento de textura registrado!', 'success')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 rounded cursor-pointer"
              >
                Aplicar Textura
              </button>
            </div>
          )}

          {/* Presets */}
          {sidebarLeftTab === 'presets' && (
            <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
              {presetProjects.map(preset => {
                let count = 0;
                try {
                  const ent = JSON.parse(preset.entitiesJson);
                  count = ent.length;
                } catch (e) {}
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      pushStateToHistory(entities, `Carregar Preset: ${preset.title}`);
                      try {
                        setEntities(JSON.parse(preset.entitiesJson));
                        setShowPaletteDrawer(false);
                        showToast(`Preset "${preset.title}" carregado!`);
                      } catch (e) {
                        showToast('Erro ao carregar preset', 'error');
                      }
                    }}
                    className="p-2.5 bg-[#151620] hover:bg-slate-800 border border-slate-800 rounded-lg text-left cursor-pointer transition-all"
                  >
                    <div className="font-bold text-slate-200">{preset.title}</div>
                    <div className="text-[10px] text-slate-500">{count} blocos</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Central 3D Canvas Area */}
      <div className="flex-1 relative flex flex-col min-w-0 bg-[#0a0b10] overflow-hidden">
        
        {/* BDStudio Floating Vertical Tool Palette (Left side of 3D canvas) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-[#12131b]/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800/80 shadow-2xl">
          <button
            onClick={() => {
              setActiveTool('select');
              setGizmoMode('translate');
            }}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              activeTool === 'select' && gizmoMode === 'translate'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Arrastar eixos XYZ (Translate) - Tecla: W"
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTool('select');
              setGizmoMode('rotate');
            }}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              activeTool === 'select' && gizmoMode === 'rotate'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Girar eixos XYZ (Rotate) - Tecla: E"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTool('select');
              setGizmoMode('scale');
            }}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              activeTool === 'select' && gizmoMode === 'scale'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Redimensionar eixos XYZ (Scale) - Tecla: R"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('add')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              activeTool === 'add'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Adicionar Bloco com Pincel (Brush)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('delete')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              activeTool === 'delete'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Ferramenta Deletar Bloco (Clique no bloco para remover)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-full h-[1px] bg-slate-800 my-0.5" />
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              showGrid ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'
            }`}
            title="Ocultar / Exibir Grade"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={centerAllBlocks}
            className="p-2 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-slate-800/60 transition-all cursor-pointer"
            title="Centralizar todo o modelo na Origem"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLibraryOpen(prev => !prev)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isLibraryOpen
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Abrir/Fechar Lista de Itens & Blocos na Esquerda"
          >
            <Package className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Viewport Render Canvas */}
        <div className="flex-1 relative w-full h-full">
          <VoxelViewport
            entities={entities}
            selectedIds={selectedIds}
            onSelectEntity={(id) => {
              setSelectedIds(id ? [id] : []);
              setActiveTool('select');
            }}
            activePreview={{
              node: brushNode,
              size: brushArgs.size,
              rotate: brushArgs.rotate,
              mirror: brushArgs.mirror,
              glow: brushArgs.glow,
              collision: brushArgs.collision,
              nodeMode: brushArgs.node
            }}
            onPlaceEntity={handlePlaceEntity}
            gridSnap={gridSnap}
            activeTool={activeTool}
            showGrid={showGrid}
            availableNodes={allAvailableNodes}
            gizmoMode={gizmoMode}
            onGizmoModeChange={setGizmoMode}
            onTransformCommit={handleTransformCommit}
            onDropEntity={handleDropEntity}
          />

          {/* Bottom Center Toggle Pill Button (v) matching BDStudio screenshot */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => setShowBottomDrawer(prev => !prev)}
              className="w-10 h-7 rounded-full bg-slate-200 hover:bg-white text-slate-950 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all cursor-pointer hover:scale-105 active:scale-95"
              title={showBottomDrawer ? 'Recolher Terminal / Preview' : 'Expandir Terminal e Código Lua'}
            >
              {showBottomDrawer ? (
                <ChevronDown className="w-4 h-4 stroke-[3]" />
              ) : (
                <ChevronUp className="w-4 h-4 stroke-[3]" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Bottom Drawer: Terminal Console + Live Lua Preview */}
        {showBottomDrawer && (
          <div className="h-56 bg-[#0e0f17] border-t border-slate-800 flex flex-col md:flex-row z-10 shrink-0 font-mono">
            <div className="flex-1 border-r border-slate-800 overflow-hidden">
              <CommandConsole onExecuteCommand={handleConsoleCommand} />
            </div>
            <div className="w-full md:w-96 flex flex-col bg-[#0b0c12] p-3 text-xs overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  Live .bf Lua Output
                </span>
                <button
                  onClick={() => {
                    const code = generateBFExport(entities);
                    navigator.clipboard.writeText(code);
                    showToast('Código Lua copiado!');
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </button>
              </div>
              <pre className="flex-1 text-[10px] text-slate-400 bg-[#07080c] p-2 rounded-lg mt-2 overflow-auto font-mono whitespace-pre-wrap leading-relaxed">
                {generateBFExport(entities).slice(0, 500)}...
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* BDStudio Right Inspector Sidebar */}
      <div className="w-full md:w-80 xl:w-88 shrink-0 bg-[#101118] border-l border-slate-800 flex flex-col max-h-[calc(100vh-53px)] overflow-y-auto font-mono text-xs select-none p-3 space-y-3">
        
        {/* Accordion 1: v Elements */}
        <div className="bg-[#151620] rounded-xl border border-slate-800/90 overflow-hidden shadow-sm">
          <button
            onClick={() => toggleAccordion('elements')}
            className="w-full px-3 py-2 flex items-center justify-between text-left text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-slate-800/60"
          >
            <span className="font-bold flex items-center gap-1.5 text-[11px] text-slate-200">
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${accordionSections.elements ? '' : '-rotate-90'}`} />
              Elements
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              {entities.length} total
            </span>
          </button>

          {accordionSections.elements && (
            <div className="p-3 space-y-3">
              {/* Mode buttons: Blocks, Items, Text */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    setBrushArgs(prev => ({
                      ...prev,
                      node: true,
                      size: { x: 0.67, y: 0.67, z: 0.67 }
                    }));
                    setShowPaletteDrawer(true);
                    setSidebarLeftTab('palette');
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    brushArgs.node
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-[#0d0e15] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Box className="w-4 h-4" />
                    <Search className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                  <span className="text-[10px] font-bold">Blocks</span>
                </button>

                <button
                  onClick={() => {
                    setBrushArgs(prev => ({
                      ...prev,
                      node: false,
                      size: { x: 0.3, y: 0.3, z: 0.3 },
                      rotate: { x: -45, y: 0, z: 0 }
                    }));
                    setIsBetterCraftBrowserOpen(true);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    !brushArgs.node
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-[#0d0e15] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Sparkles className="w-4 h-4" />
                    <Search className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                  <span className="text-[10px] font-bold">Items</span>
                </button>

                <button
                  onClick={() => {
                    showToast('Modo de Texto: insira caracteres ou placas nas notas', 'info');
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-800 bg-[#0d0e15] text-slate-400 hover:text-slate-200 text-center transition-all cursor-pointer"
                >
                  <Type className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold">Text</span>
                </button>
              </div>

              {/* Quick action buttons row: Duplicate, Group, Delete */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={handleDuplicateSelected}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#0d0e15] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer text-[10px] font-semibold"
                  title="Duplicar elemento selecionado"
                >
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={handleSelectAllOrGroup}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#0d0e15] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer text-[10px] font-semibold"
                  title="Selecionar todos ou agrupar"
                >
                  <Boxes className="w-3 h-3 text-purple-400" />
                  <span>Group</span>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#0d0e15] hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-900/60 transition-all cursor-pointer text-[10px] font-semibold"
                  title="Deletar seleção"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: v Project */}
        <div className="bg-[#151620] rounded-xl border border-slate-800/90 overflow-hidden shadow-sm">
          <button
            onClick={() => toggleAccordion('project')}
            className="w-full px-3 py-2 flex items-center justify-between text-left text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-slate-800/60"
          >
            <span className="font-bold flex items-center gap-1.5 text-[11px]">
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${accordionSections.project ? '' : '-rotate-90'}`} />
              Project
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50">
              {entities.length} items
            </span>
          </button>

          {accordionSections.project && (
            <div
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                  e.preventDefault();
                  setSelectedIds(entities.map(ent => ent.id));
                  showToast(`Todos os ${entities.length} elementos selecionados`);
                }
              }}
              className="p-2 space-y-1.5 focus:outline-none"
            >
              {/* Multi-selection Toolbar */}
              {entities.length > 0 && (
                <div className="flex items-center justify-between px-1 pb-1 text-[10px] text-slate-400 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-cyan-400 font-semibold">
                      {selectedIds.length}
                    </span>
                    <span>selecionado(s)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (selectedIds.length === entities.length) {
                          setSelectedIds([]);
                        } else {
                          setSelectedIds(entities.map(ent => ent.id));
                        }
                      }}
                      className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      title="Selecionar Todos (Ctrl+A)"
                    >
                      {selectedIds.length === entities.length ? 'Desmarcar' : 'Ctrl+A'}
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        onClick={() => {
                          pushStateToHistory(entities, `Deletar ${selectedIds.length} elemento(s)`);
                          setEntities(prev => prev.filter(item => !selectedIds.includes(item.id)));
                          setSelectedIds([]);
                          showToast('Itens excluídos');
                        }}
                        className="text-[9px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title="Excluir selecionados (Delete)"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5 select-none">
                {entities.length === 0 ? (
                  <div className="text-[10px] text-slate-500 text-center py-3">
                    Nenhum elemento adicionado ainda.<br />Clique no chão ou use o pincel!
                  </div>
                ) : (
                  entities.map((e, idx) => {
                    const isSelected = selectedIds.includes(e.id);
                    return (
                      <div
                        key={e.id}
                        onClick={(ev) => {
                          setActiveTool('select');
                          if (ev.shiftKey && lastSelectedIndex !== null && lastSelectedIndex >= 0 && lastSelectedIndex < entities.length) {
                            // Shift-click range selection
                            const start = Math.min(lastSelectedIndex, idx);
                            const end = Math.max(lastSelectedIndex, idx);
                            const rangeIds = entities.slice(start, end + 1).map(item => item.id);

                            if (ev.ctrlKey || ev.metaKey) {
                              const union = new Set([...selectedIds, ...rangeIds]);
                              setSelectedIds(Array.from(union));
                            } else {
                              setSelectedIds(rangeIds);
                            }
                          } else if (ev.ctrlKey || ev.metaKey) {
                            // Ctrl/Cmd-click: toggle selection
                            if (selectedIds.includes(e.id)) {
                              setSelectedIds(selectedIds.filter(id => id !== e.id));
                            } else {
                              setSelectedIds([...selectedIds, e.id]);
                            }
                            setLastSelectedIndex(idx);
                          } else {
                            // Single click
                            setSelectedIds([e.id]);
                            setLastSelectedIndex(idx);
                          }
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200 shadow-sm'
                            : 'bg-[#0d0e15] border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-slate-500 font-mono text-[9px]">#{idx + 1}</span>
                          {e.args.node ? (
                            <Box className="w-3 h-3 text-cyan-400 shrink-0" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate font-semibold">{e.node}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-slate-500 font-mono">
                            [{e.pos.x}, {e.pos.y}, {e.pos.z}]
                          </span>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              pushStateToHistory(entities, `Deletar ${e.node}`);
                              setEntities(prev => prev.filter(item => item.id !== e.id));
                              setSelectedIds(prev => prev.filter(id => id !== e.id));
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                            title="Deletar elemento"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 3: v Properties */}
        <div className="bg-[#151620] rounded-xl border border-slate-800/90 overflow-hidden shadow-sm">
          <button
            onClick={() => toggleAccordion('properties')}
            className="w-full px-3 py-2 flex items-center justify-between text-left text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-slate-800/60"
          >
            <span className="font-bold flex items-center gap-1.5 text-[11px]">
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${accordionSections.properties ? '' : '-rotate-90'}`} />
              Properties
            </span>
            <span className="text-[10px] text-slate-500">
              {selectedEntity ? 'Selected Block' : 'Global Brush'}
            </span>
          </button>

          {accordionSections.properties && (
            <div className="p-3 space-y-3">
              {/* name field matching screenshot with green text */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#0c0d14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* Sub-accordion: v NBT */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#0e0f17]">
                <button
                  onClick={() => toggleAccordion('nbt')}
                  className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-slate-300 hover:bg-slate-800/40 cursor-pointer border-b border-slate-800/60"
                >
                  <span className="font-semibold text-[10px] flex items-center gap-1">
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${accordionSections.nbt ? '' : '-rotate-90'}`} />
                    NBT / BlockFrame Tags
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {(selectedEntity ? selectedEntity.args.node : brushArgs.node) ? 'Node' : 'Item'}
                  </span>
                </button>

                {accordionSections.nbt && (
                  <div className="p-2.5 space-y-2.5">
                    {/* Node Mode vs Item Mode toggle */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Tipo de Render:</span>
                      <div className="flex bg-[#161620] rounded border border-slate-800 p-0.5">
                        <button
                          onClick={() => adjustSelectedProperty('node', true)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            (selectedEntity ? selectedEntity.args.node : brushArgs.node)
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          3D Block
                        </button>
                        <button
                          onClick={() => adjustSelectedProperty('node', false)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            !(selectedEntity ? selectedEntity.args.node : brushArgs.node)
                              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          1-Face Item
                        </button>
                      </div>
                    </div>

                    {/* Glow Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Glow (Luminosidade):</span>
                        <span className="text-amber-400 font-bold">
                          {selectedEntity ? selectedEntity.args.glow : brushArgs.glow}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        value={selectedEntity ? selectedEntity.args.glow : brushArgs.glow}
                        onChange={(e) => adjustSelectedProperty('glow', parseInt(e.target.value, 10))}
                        className="w-full accent-amber-500 h-1 bg-[#090a10] rounded cursor-pointer"
                      />
                    </div>

                    {/* Collision toggle */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Colisão Física:</span>
                      <button
                        onClick={() => {
                          const cur = selectedEntity ? selectedEntity.args.collision : brushArgs.collision;
                          adjustSelectedProperty('collision', !cur);
                        }}
                        className={`px-2 py-0.5 rounded border font-semibold cursor-pointer ${
                          (selectedEntity ? selectedEntity.args.collision : brushArgs.collision)
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                            : 'bg-[#151620] border-slate-800 text-slate-500'
                        }`}
                      >
                        {(selectedEntity ? selectedEntity.args.collision : brushArgs.collision) ? 'ATIVADA' : 'DESLIGADA'}
                      </button>
                    </div>

                    {/* Mirror Selector */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Espelhamento:</span>
                      <div className="flex bg-[#161620] rounded border border-slate-800 p-0.5">
                        {['none', 'x', 'y', 'z'].map(axis => {
                          const currentMirror = selectedEntity ? selectedEntity.args.mirror : brushArgs.mirror;
                          return (
                            <button
                              key={axis}
                              onClick={() => adjustSelectedProperty('mirror', axis as any)}
                              className={`px-1.5 py-0.5 rounded uppercase font-bold cursor-pointer ${
                                currentMirror === axis
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'text-slate-500'
                              }`}
                            >
                              {axis}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 4: v Transforms */}
        <div className="bg-[#151620] rounded-xl border border-slate-800/90 overflow-hidden shadow-sm">
          <button
            onClick={() => toggleAccordion('transforms')}
            className="w-full px-3 py-2 flex items-center justify-between text-left text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-slate-800/60"
          >
            <span className="font-bold flex items-center gap-1.5 text-[11px]">
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${accordionSections.transforms ? '' : '-rotate-90'}`} />
              Transforms
            </span>
            <span className="text-[10px] text-cyan-400">
              Snap: {gridSnap}
            </span>
          </button>

          {accordionSections.transforms && (
            <div className="p-3 space-y-3">
              {/* Snap step selector */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Grid Step (Espaçamento):</span>
                  <span className="text-cyan-400 font-bold">{gridSnap === 1.0 ? '1 bloco exato' : `${gridSnap}`}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[0.1, 0.25, 0.5, 1.0, 2.0].map(val => (
                    <button
                      key={val}
                      onClick={() => setGridSnap(val)}
                      className={`py-1 rounded text-center text-[10px] font-bold border cursor-pointer transition-colors ${
                        gridSnap === val
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-[#0d0e15] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position (X, Y, Z) */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Position (XYZ)</span>
                {(['x', 'y', 'z'] as const).map(axis => {
                  const curVal = selectedEntity ? selectedEntity.pos[axis] : 0;
                  return (
                    <div key={axis} className="flex items-center gap-2 bg-[#0c0d14] p-1.5 rounded-lg border border-slate-800">
                      <span className="uppercase text-slate-500 font-bold w-4 text-center">{axis}</span>
                      <button
                        onClick={() => adjustSelectedPos(axis, -gridSnap)}
                        className="px-2 py-0.5 bg-[#161620] hover:bg-slate-800 text-slate-300 rounded font-bold cursor-pointer"
                        title={`Diminuir ${axis}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step={gridSnap}
                        value={curVal}
                        onChange={(e) => setSelectedPosValue(axis, parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-transparent text-center font-bold text-white focus:outline-none"
                      />
                      <button
                        onClick={() => adjustSelectedPos(axis, gridSnap)}
                        className="px-2 py-0.5 bg-[#161620] hover:bg-slate-800 text-slate-300 rounded font-bold cursor-pointer"
                        title={`Aumentar ${axis}`}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Rotate (X, Y, Z) */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Rotate (Graus)</span>
                {(['x', 'y', 'z'] as const).map(axis => {
                  const currentRotate = selectedEntity ? selectedEntity.args.rotate : brushArgs.rotate;
                  const val = currentRotate[axis];
                  return (
                    <div key={axis} className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span className="uppercase font-bold text-slate-500">Eixo {axis}</span>
                        <span className="text-cyan-400 font-bold">{Math.round(val)}°</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="315"
                          step="15"
                          value={val}
                          onChange={(e) => setSelectedRotateValue(axis, parseInt(e.target.value, 10))}
                          className="flex-1 accent-cyan-500 h-1 bg-[#090a10] rounded cursor-pointer"
                        />
                        <button
                          onClick={() => setSelectedRotateValue(axis, (val + 45) % 360)}
                          className="px-1.5 py-0.5 bg-[#0c0d14] hover:bg-slate-800 text-[9px] text-slate-300 rounded border border-slate-800 cursor-pointer"
                        >
                          +45°
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scale / Size (X, Y, Z) */}
              <div className="space-y-2 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Scale / Size</span>
                  <span className="text-[9px] text-cyan-400 font-mono">1.0 = Normal (0.67 ao exportar)</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['x', 'y', 'z'] as const).map(axis => {
                    const currentSize = selectedEntity ? selectedEntity.args.size : brushArgs.size;
                    const val = currentSize[axis];
                    return (
                      <div key={axis} className="bg-[#0c0d14] p-1.5 rounded-lg border border-slate-800 text-center">
                        <span className="uppercase text-[9px] text-slate-500 font-bold block">{axis}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={val}
                          onChange={(e) => setSelectedSizeValue(axis, parseFloat(e.target.value) || 0.1)}
                          className="w-full bg-transparent text-center font-bold text-white focus:outline-none text-xs"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Quick Presets for Scale */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: '1.0', sub: 'Padrão', val: 1.0 },
                    { label: '0.5', sub: '1/2 Bloco', val: 0.5 },
                    { label: '2.0', sub: '2 Blocos', val: 2.0 },
                    { label: '0.3', sub: 'Item 1F', val: 0.3 },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        adjustSelectedProperty('size', { x: p.val, y: p.val, z: p.val });
                        showToast(`Escala definida para ${p.val} (${p.sub})`);
                      }}
                      className="bg-[#12141f] hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 py-1 px-0.5 rounded text-center cursor-pointer transition-colors"
                      title={`Definir escala para ${p.val} (${p.sub})`}
                    >
                      <span className="text-[10px] font-bold text-cyan-300 block">{p.label}</span>
                      <span className="text-[8px] text-slate-500 block leading-tight">{p.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Reset to Normal 1.0 */}
                <button
                  type="button"
                  onClick={() => {
                    pushStateToHistory(entities, 'Definir escala normal 1.0');
                    if (selectedIds.length > 0) {
                      setEntities(prev =>
                        prev.map(e => {
                          if (!selectedIds.includes(e.id)) return e;
                          return {
                            ...e,
                            args: { ...e.args, size: { x: 1, y: 1, z: 1 } }
                          };
                        })
                      );
                      showToast(`${selectedIds.length} blocos definidos para 1.0!`);
                    } else {
                      setEntities(prev =>
                        prev.map(e => ({
                          ...e,
                          args: { ...e.args, size: { x: 1, y: 1, z: 1 } }
                        }))
                      );
                      showToast(`Todos os blocos restaurados para escala normal 1.0!`);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
                  title="Garante escala 1.0 normal na simulação (ao exportar .bf / Lua o tamanho é reduzido para 0.67 automaticamente)"
                >
                  <span>🔄 Escala Normal (size = 1.0)</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Bottom Quick Action: Export Lua modal & Publish */}
        <div className="pt-2 space-y-2">
          <button
            onClick={() => setShowCodeModal(true)}
            disabled={entities.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-95 text-white font-extrabold text-xs py-2 rounded-xl cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
          >
            <Download className="w-4 h-4 text-white" /> EXPORTAR PROJETO
          </button>
          <button
            onClick={() => {
              if (entities.length === 0) return;
              setShowPublishModal(true);
            }}
            disabled={entities.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#151620] hover:bg-slate-800 text-cyan-400 text-xs py-1.5 rounded-xl cursor-pointer border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold uppercase tracking-wider"
          >
            <Globe className="w-3.5 h-3.5" /> Compartilhar Online
          </button>
        </div>

      </div>

    </div>
  );
};
