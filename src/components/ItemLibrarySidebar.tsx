import React, { useState, useMemo } from 'react';
import {
  Search,
  Package,
  Layers,
  GripVertical,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Filter,
  Check
} from 'lucide-react';
import { MinetestNodeMetadata } from '../types';
import { resolveNodeTextureUrl } from '../textureUtils';

/**
 * Thumbnail component with image error recovery and 3D isometric block representation
 */
function ItemThumbnail({ node }: { node: MinetestNodeMetadata }) {
  const [imgError, setImgError] = useState(false);
  const texture = node.texture || resolveNodeTextureUrl(node.id);

  return (
    <div className="w-10 h-10 rounded-lg bg-[#0c0d16] border border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
      {texture && !imgError ? (
        <img
          src={texture}
          alt={node.name}
          className="w-8 h-8 object-contain [image-rendering:pixelated] select-none"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Stylized Isometric 3D Voxel Graphic */
        <svg viewBox="0 0 32 32" className="w-7 h-7 drop-shadow select-none">
          {/* Top Face */}
          <polygon
            points="16,5 27,11 16,17 5,11"
            fill={node.color || '#64748b'}
            className="brightness-125"
          />
          {/* Left Face */}
          <polygon
            points="5,11 16,17 16,27 5,21"
            fill={node.color || '#64748b'}
            className="brightness-75"
          />
          {/* Right Face */}
          <polygon
            points="16,17 27,11 27,21 16,27"
            fill={node.color || '#64748b'}
            className="brightness-95"
          />
          {/* Wireframe Outline */}
          <path
            d="M16,5 L27,11 L16,17 L5,11 Z M16,17 L16,27 M5,11 L5,21 L16,27 L27,21 L27,11"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
          />
        </svg>
      )}

      {node.glow && node.glow > 0 ? (
        <span
          className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] border border-black/50"
          title={`Luz: +${node.glow}`}
        />
      ) : null}
    </div>
  );
}

interface ItemLibrarySidebarProps {
  allAvailableNodes: MinetestNodeMetadata[];
  brushNode: string;
  onSelectBrushNode: (nodeId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenBetterCraftBrowser: () => void;
  customNodes: Array<{ id: string; name: string; color: string; texture?: string }>;
  onAddCustomNode: (id: string, name: string, color: string, texture?: string) => void;
  onDeleteCustomNode: (id: string) => void;
}

// Category filter definitions
const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '📦' },
  { id: 'stone', label: 'Pedras & Minérios', icon: '🪨' },
  { id: 'wood', label: 'Madeiras', icon: '🪵' },
  { id: 'natural', label: 'Natureza & Comida', icon: '🌿' },
  { id: 'special', label: 'Itens & Ferramentas', icon: '⚔️' },
  { id: 'glass', label: 'Vidros & Luz', icon: '💡' },
  { id: 'colored', label: 'Lãs & Cores', icon: '🎨' },
  { id: 'custom', label: 'Customizados', icon: '⭐' },
];

export function ItemLibrarySidebar({
  allAvailableNodes,
  brushNode,
  onSelectBrushNode,
  isOpen,
  onToggleOpen,
  onOpenBetterCraftBrowser,
  customNodes,
  onAddCustomNode,
  onDeleteCustomNode
}: ItemLibrarySidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  
  // New Custom Node Form state
  const [customId, setCustomId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#3b82f6');
  const [customTextureUrl, setCustomTextureUrl] = useState('');

  // Filtering nodes
  const filteredNodes = useMemo(() => {
    return allAvailableNodes.filter(node => {
      const matchesSearch =
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'custom') {
        return customNodes.some(cn => cn.id === node.id);
      }
      if (selectedCategory === 'stone') {
        return node.category === 'stone' || node.id.includes('stone') || node.id.includes('ore') || node.id.includes('ingot') || node.id.includes('diamond');
      }
      if (selectedCategory === 'wood') {
        return node.category === 'wood' || node.id.includes('wood') || node.id.includes('plank') || node.id.includes('tree');
      }
      if (selectedCategory === 'natural') {
        return node.category === 'natural' || node.id.includes('dirt') || node.id.includes('grass') || node.id.includes('sapling') || node.id.includes('apple') || node.id.includes('bread');
      }
      if (selectedCategory === 'glass') {
        return node.category === 'glass' || node.id.includes('glass') || node.id.includes('lamp') || (node.glow && node.glow > 0);
      }
      if (selectedCategory === 'colored') {
        return node.category === 'colored' || node.id.includes('wool') || node.id.includes('concrete') || node.id.includes('dye');
      }
      if (selectedCategory === 'special') {
        return node.category === 'special' || node.category === 'industrial' || node.id.includes('tool') || node.id.includes('sword') || node.id.includes('armor');
      }

      return node.category === selectedCategory;
    });
  }, [allAvailableNodes, searchTerm, selectedCategory, customNodes]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customId.trim() || !customName.trim()) return;
    onAddCustomNode(
      customId.trim().toLowerCase().replace(/\s+/g, '_'),
      customName.trim(),
      customColor,
      customTextureUrl.trim() || undefined
    );
    setCustomId('');
    setCustomName('');
    setCustomTextureUrl('');
  };

  if (!isOpen) {
    return (
      <div className="w-12 bg-[#101118] border-r border-slate-800/90 flex flex-col items-center py-3 z-30 shrink-0 select-none">
        <button
          onClick={onToggleOpen}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer shadow-lg"
          title="Abrir Lista de Itens & Blocos"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-6 [writing-mode:vertical-rl] rotate-180 flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
          <Package className="w-3.5 h-3.5 text-cyan-400 -rotate-90" />
          <span>Itens & Blocos</span>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-72 sm:w-80 bg-[#101118] border-r border-slate-800/90 flex flex-col z-30 shrink-0 h-full max-h-full overflow-hidden select-none shadow-2xl">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 bg-[#141520] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Package className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Itens & Blocos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {allAvailableNodes.length}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 truncate">Clique ou arraste para o 3D</p>
          </div>
        </div>

        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Recolher painel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Sub-tabs: Catálogo vs Custom */}
      <div className="px-3 pt-2.5 pb-1 flex gap-1 border-b border-slate-800/50">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Catálogo</span>
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Criar Bloco ({customNodes.length})</span>
        </button>
      </div>

      {activeTab === 'catalog' && (
        <>
          {/* Quick Search & BetterCraft Modal Trigger */}
          <div className="p-3 space-y-2 border-b border-slate-800/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar bloco ou ID (ex: ouro, diamond, madeira)..."
                className="w-full bg-[#171824] border border-slate-700/70 text-slate-100 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Bettercraft 850+ Catalog Link */}
            <button
              onClick={onOpenBetterCraftBrowser}
              className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 text-xs font-medium flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Explorar Banco 850+ Luanti</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">Ver Tudo</span>
            </button>

            {/* Category Filter Pills (horizontal scroll) */}
            <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none text-[11px]">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-md shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-[#181926] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Draggable Items List with constrained Scrollview */}
          <div
            id="items-library-scrollview"
            className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-235px)] p-2 space-y-1.5 overscroll-contain scrollbar-thin scrollbar-thumb-slate-700/80 scrollbar-track-[#101118]"
          >
            {filteredNodes.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <Filter className="w-8 h-8 mx-auto stroke-1 opacity-50" />
                <p>Nenhum item encontrado para "{searchTerm}"</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="text-cyan-400 hover:underline text-xs"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              filteredNodes.map(node => {
                const isSelectedBrush = brushNode === node.id;
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          id: node.id,
                          name: node.name,
                          category: node.category,
                          color: node.color,
                          texture: node.texture
                        })
                      );
                      e.dataTransfer.setData('text/plain', node.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => onSelectBrushNode(node.id)}
                    className={`group relative flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
                      isSelectedBrush
                        ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'bg-[#151622] hover:bg-[#1c1d2c] border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                    title="Clique para selecionar como pincel ou Arraste para o cenário 3D"
                  >
                    {/* Visual Image / 3D Block Thumbnail */}
                    <ItemThumbnail node={node} />

                    {/* Metadata & Labels */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                          {node.name}
                        </span>
                        {isSelectedBrush && (
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">
                          {node.id}
                        </span>
                        {node.category && node.category !== 'bettercraft' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-slate-400 uppercase font-mono">
                            {node.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Drag Grip Handle */}
                    <div
                      className="text-slate-600 group-hover:text-cyan-400 transition-colors p-1"
                      title="Arraste para o cenário 3D"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="p-2 border-t border-slate-800/80 bg-[#12131d] text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Arraste para a grade 3D</span>
            <span className="text-cyan-400 font-semibold">{filteredNodes.length} itens</span>
          </div>
        </>
      )}

      {/* Custom Nodes Management Tab */}
      {activeTab === 'custom' && (
        <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-4">
          <form onSubmit={handleCreateCustom} className="space-y-3 bg-[#151622] p-3 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Novo Bloco Custom</span>
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">ID Técnico (ex: meu_mod:bloco)</label>
              <input
                type="text"
                required
                value={customId}
                onChange={e => setCustomId(e.target.value)}
                placeholder="meu_jogo:bloco_magico"
                className="w-full bg-[#1a1b2a] border border-slate-700/70 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Nome de Exibição</label>
              <input
                type="text"
                required
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Bloco de Cristal Azul"
                className="w-full bg-[#1a1b2a] border border-slate-700/70 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Cor Base</label>
                <div className="flex items-center gap-2 bg-[#1a1b2a] border border-slate-700/70 px-2 py-1 rounded-lg">
                  <input
                    type="color"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300">{customColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">URL Textura (Opcional)</label>
                <input
                  type="url"
                  value={customTextureUrl}
                  onChange={e => setCustomTextureUrl(e.target.value)}
                  placeholder="https://...png"
                  className="w-full bg-[#1a1b2a] border border-slate-700/70 text-slate-200 px-2 py-1.5 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-md"
            >
              Adicionar Bloco à Biblioteca
            </button>
          </form>

          {/* List of Custom registered blocks */}
          <div className="flex-1 space-y-2">
            <h4 className="text-xs font-bold text-slate-300">Blocos Criados ({customNodes.length})</h4>
            {customNodes.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum bloco customizado adicionado ainda.</p>
            ) : (
              customNodes.map(cn => (
                <div
                  key={cn.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('application/json', JSON.stringify(cn));
                    e.dataTransfer.setData('text/plain', cn.id);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#161725] border border-slate-800 cursor-grab"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded border border-white/20 shrink-0"
                      style={{ backgroundColor: cn.color }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">{cn.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{cn.id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectBrushNode(cn.id)}
                      className="p-1 text-cyan-400 hover:text-cyan-300 text-xs font-bold"
                      title="Usar Pincel"
                    >
                      Pincelar
                    </button>
                    <button
                      onClick={() => onDeleteCustomNode(cn.id)}
                      className="p-1 text-rose-400 hover:text-rose-300"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
