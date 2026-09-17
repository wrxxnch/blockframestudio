import React, { useState, useMemo } from 'react';
import {
  Search,
  Package,
  Layers,
  Sparkles,
  Code2,
  Copy,
  Check,
  X,
  ExternalLink,
  Plus,
  Box,
  Wrench,
  Shield,
  Zap,
  Leaf,
  Hammer
} from 'lucide-react';
import { BETTERCRAFT_ITEMS, BetterCraftItem, generateLuaRegistrationCode, updateBetterCraftItem, removeBetterCraftItem } from '../bettercraftRegistry';
import { resolveNodeTextureUrl } from '../textureUtils';

interface BetterCraftBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBrush: (item: BetterCraftItem) => void;
  onInsertEntity: (item: BetterCraftItem) => void;
  isAdmin?: boolean;
}

const CATEGORIES = [
  'All',
  'Blocks & Ores',
  'Vegetation & Food',
  'Tools & Weapons',
  'Armor',
  'Redstone & Tech',
  'Construction & Decor',
  'Items & Materials',
];

const TYPES = ['All', 'node', 'craft', 'tool'];

export default function BetterCraftBrowser({
  isOpen,
  onClose,
  onSelectBrush,
  onInsertEntity,
  isAdmin = false,
}: BetterCraftBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [inspectItem, setInspectItem] = useState<BetterCraftItem | null>(null);
  const [copiedLua, setCopiedLua] = useState(false);
  const [, refreshCatalog] = useState(0);

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase().trim();
    return BETTERCRAFT_ITEMS.filter((item) => {
      const matchSearch =
        !s ||
        item.name.toLowerCase().includes(s) ||
        item.id.toLowerCase().includes(s) ||
        item.mod.toLowerCase().includes(s);

      const matchCat =
        selectedCategory === 'All' || item.category === selectedCategory;

      const matchType =
        selectedType === 'All' ||
        (selectedType === 'node' && item.type === 'node') ||
        (selectedType === 'tool' && item.type === 'tool') ||
        (selectedType === 'craft' && item.type !== 'node' && item.type !== 'tool');

      return matchSearch && matchCat && matchType;
    });
  }, [search, selectedCategory, selectedType]);

  const handleCopyLua = (item: BetterCraftItem) => {
    const lua = generateLuaRegistrationCode(item);
    navigator.clipboard.writeText(lua);
    setCopiedLua(true);
    setTimeout(() => setCopiedLua(false), 2000);
  };

  const handleEditCatalogItem = (item: BetterCraftItem) => {
    const nextType = window.prompt('Tipo do registro: node ou item', item.type === 'node' ? 'node' : 'item')?.trim().toLowerCase();
    if (nextType !== 'node' && nextType !== 'item') return;
    const nextTexture = window.prompt(nextType === 'item' ? 'Imagem inventory_image' : 'Primeiro tile', item.textureName)?.trim();
    if (!nextTexture) return;
    updateBetterCraftItem(item.id, { type: nextType, textureName: nextTexture });
    refreshCatalog(value => value + 1);
  };

  const handleRemoveCatalogItem = (item: BetterCraftItem) => {
    if (!window.confirm(`Remover ${item.id} do catálogo?`)) return;
    removeBetterCraftItem(item.id);
    refreshCatalog(value => value + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121218] border border-slate-700/70 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-[#181822]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-sans tracking-wide">
                  BetterCraft Items Registry
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {BETTERCRAFT_ITEMS.length} Itens Luanti
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Catálogo oficial extraído de{' '}
                <span className="font-mono text-cyan-400 text-[11px]">
                  games/bettercraft/mods/ITEMS
                </span>{' '}
                com texturas reais e lógica de registro Luanti
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800 bg-[#14141c] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou id (ex: mcl_core:apple, composter, bamboo, cookie, sword)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-colors ${
                    selectedType === t
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'All' ? 'Todos Tipos' : t === 'node' ? 'Bloco (Node)' : t === 'tool' ? 'Ferramenta' : 'Item (Craft)'}
                </button>
              ))}
            </div>
          </div>

          {/* Categories pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium'
                    : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0e0e13]">
          <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
            <span>
              Mostrando <strong className="text-slate-300">{filteredItems.length}</strong> itens encontrados
            </span>
            <span className="text-[11px] text-slate-500">
              Clique em um item para usar como pincel ou inspecionar seu código Lua
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            {filteredItems.map((item) => {
              const isNode = item.type === 'node';
              return (
                <div
                  key={item.id}
                  className="group relative bg-[#161620] hover:bg-[#1c1c28] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 flex flex-col justify-between transition-all duration-150 hover:shadow-lg hover:shadow-cyan-950/20 text-left"
                >
                  {/* Top bar: icon & badges */}
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center p-1 relative overflow-hidden group-hover:border-cyan-500/40">
                        {item.texture || resolveNodeTextureUrl(item.id) ? (
                          <img
                            src={item.texture || resolveNodeTextureUrl(item.id)}
                            alt={item.name}
                            className="w-8 h-8 object-contain pixelated"
                            style={{ imageRendering: 'pixelated' }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-md"
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        <div
                          className="absolute inset-x-0 bottom-0 h-0.5 opacity-60"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>

                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          isNode
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : item.type === 'tool'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-cyan-300">
                      {item.name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5" title={item.id}>
                      {item.id}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-1">
                    <button
                      onClick={() => {
                        onSelectBrush(item);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                      title="Definir como bloco/item do pincel"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Pincel</span>
                    </button>

                    <button
                      onClick={() => {
                        onInsertEntity(item);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Inserir na cena imediatamente"
                    >
                      <Box className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setInspectItem(item)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Ver definição e registro Lua"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => handleEditCatalogItem(item)} className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-[10px]" title="Editar tipo e textura">Editar</button>
                        <button onClick={() => handleRemoveCatalogItem(item)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[10px]" title="Remover registro inválido">Remover</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-medium text-slate-400">Nenhum item encontrado</p>
              <p className="text-xs text-slate-600 mt-1">Tente pesquisar por outro termo ou categoria</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 px-6 border-t border-slate-800 bg-[#14141c] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>
              Repositório:{' '}
              <a
                href="https://github.com/wrxxnch/luanti-bettercraft"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                wrxxnch/luanti-bettercraft <ExternalLink className="w-3 h-3" />
              </a>
            </span>
            <span>•</span>
            <span>Formato compatível com Luanti BlockFrame (.bf)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
          >
            Fechar Catálogo
          </button>
        </div>
      </div>

      {/* Inspect Item Lua Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#14141d] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#191924]">
              <div className="flex items-center gap-3">
                {inspectItem.texture && (
                  <img
                    src={inspectItem.texture}
                    alt={inspectItem.name}
                    className="w-8 h-8 object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{inspectItem.name}</h3>
                  <p className="text-xs font-mono text-cyan-400">{inspectItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-[#0f0f14] overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Mod</span>
                  <span className="text-slate-200 font-mono">{inspectItem.mod}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Tipo</span>
                  <span className="text-slate-200 font-mono capitalize">{inspectItem.type}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Textura</span>
                  <span className="text-slate-200 font-mono truncate block" title={inspectItem.textureName}>
                    {inspectItem.textureName || 'default'}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Categoria</span>
                  <span className="text-slate-200 font-mono">{inspectItem.category}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-amber-400" />
                    Lógica de Registro Luanti (core.register_{inspectItem.type === 'node' ? 'node' : inspectItem.type === 'tool' ? 'tool' : 'craftitem'})
                  </span>
                  <button
                    onClick={() => handleCopyLua(inspectItem)}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    {copiedLua ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLua ? 'Copiado!' : 'Copiar Lua'}
                  </button>
                </div>
                <pre className="p-3 bg-black/60 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto select-all scrollbar-thin max-h-56">
                  {generateLuaRegistrationCode(inspectItem)}
                </pre>
              </div>
            </div>

            <div className="p-3 px-4 border-t border-slate-800 bg-[#161620] flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onSelectBrush(inspectItem);
                  setInspectItem(null);
                  onClose();
                }}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                Definir como Bloco Ativo
              </button>
              <button
                onClick={() => setInspectItem(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
