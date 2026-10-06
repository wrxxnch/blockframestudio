import React, { useState, useMemo } from 'react';
import {
  Shield,
  UserCheck,
  UserPlus,
  Trash2,
  X,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Box,
  Image as ImageIcon,
  Sliders,
  AlertCircle,
  ExternalLink,
  Crown
} from 'lucide-react';
import { AdminUser, ItemDefaultConfig, MINETEST_NODES, MinetestNodeMetadata } from '../types';
import { BETTERCRAFT_ITEMS, BetterCraftItem } from '../bettercraftRegistry';
import { PRIMARY_OWNER_EMAIL, signInWithGoogle } from '../firebase';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  admins: AdminUser[];
  onAddAdmin: (email: string) => Promise<void>;
  onRemoveAdmin: (email: string) => Promise<void>;
  itemDefaults: Record<string, ItemDefaultConfig>;
  onSaveItemDefault: (config: ItemDefaultConfig) => Promise<void>;
  onDeleteItemDefault: (itemId: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialEditingItemId?: string | null;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  admins,
  onAddAdmin,
  onRemoveAdmin,
  itemDefaults,
  onSaveItemDefault,
  onDeleteItemDefault,
  showToast,
  initialEditingItemId = null
}) => {
  const [activeTab, setActiveTab] = useState<'item_defaults' | 'admins'>('item_defaults');
  
  // Admin Management State
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Item Defaults State
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialEditingItemId || 'mcl_farming:cookie'
  );
  const [filterMode, setFilterMode] = useState<'all' | 'customized' | 'bettercraft' | 'minetest'>('all');

  // Active Item Edit Form State
  const activeCustomConfig = itemDefaults[selectedItemId];
  const [editIsNode, setEditIsNode] = useState<boolean>(
    activeCustomConfig ? activeCustomConfig.isNode : false
  );
  const [editImage, setEditImage] = useState<string>(
    activeCustomConfig?.image || ''
  );
  const [editLabel, setEditLabel] = useState<string>(
    activeCustomConfig?.label || ''
  );
  const [editScale, setEditScale] = useState<number>(
    activeCustomConfig?.scale || (activeCustomConfig?.isNode ? 1.0 : 0.3)
  );
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  // Combine items from Bettercraft and Minetest for search
  const allAvailableItems = useMemo(() => {
    const list: Array<{ id: string; name: string; type: 'bettercraft' | 'minetest'; defaultIsNode: boolean; defaultImage?: string; category: string }> = [];
    const seen = new Set<string>();

    // 1. BetterCraft Items
    BETTERCRAFT_ITEMS.forEach(b => {
      seen.add(b.id);
      list.push({
        id: b.id,
        name: b.name,
        type: 'bettercraft',
        defaultIsNode: b.type === 'node',
        defaultImage: b.texture || undefined,
        category: b.category
      });
    });

    // 2. Built-in Minetest Nodes
    MINETEST_NODES.forEach(m => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        list.push({
          id: m.id,
          name: m.name,
          type: 'minetest',
          defaultIsNode: true,
          defaultImage: m.texture,
          category: m.category
        });
      }
    });

    return list;
  }, []);

  // Update selected item form when selected item changes
  const handleSelectItemToEdit = (itemId: string) => {
    setSelectedItemId(itemId);
    const existing = itemDefaults[itemId];
    const itemData = allAvailableItems.find(i => i.id === itemId);
    if (existing) {
      setEditIsNode(existing.isNode);
      setEditImage(existing.image || '');
      setEditLabel(existing.label || itemData?.name || '');
      setEditScale(existing.scale || (existing.isNode ? 1.0 : 0.3));
    } else if (itemData) {
      setEditIsNode(itemData.defaultIsNode);
      setEditImage(itemData.defaultImage || '');
      setEditLabel(itemData.name);
      setEditScale(itemData.defaultIsNode ? 1.0 : 0.3);
    }
  };

  // Sync when initialEditingItemId changes
  React.useEffect(() => {
    if (initialEditingItemId) {
      handleSelectItemToEdit(initialEditingItemId);
    }
  }, [initialEditingItemId]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return allAvailableItems.filter(item => {
      const matchesSearch = item.id.toLowerCase().includes(itemSearch.toLowerCase()) ||
                            item.name.toLowerCase().includes(itemSearch.toLowerCase());
      if (!matchesSearch) return false;

      const isCustomized = Boolean(itemDefaults[item.id]);
      if (filterMode === 'customized') return isCustomized;
      if (filterMode === 'bettercraft') return item.type === 'bettercraft';
      if (filterMode === 'minetest') return item.type === 'minetest';
      return true;
    });
  }, [allAvailableItems, itemSearch, filterMode, itemDefaults]);

  // Current selected item detail
  const selectedItemData = useMemo(() => {
    return allAvailableItems.find(i => i.id === selectedItemId);
  }, [allAvailableItems, selectedItemId]);

  if (!isOpen) return null;

  const handleSaveDefault = async () => {
    if (!selectedItemId) return;
    setIsSavingDefault(true);
    try {
      await onSaveItemDefault({
        id: selectedItemId,
        itemId: selectedItemId,
        isNode: editIsNode,
        image: editImage.trim() || undefined,
        label: editLabel.trim() || undefined,
        scale: editScale || (editIsNode ? 1.0 : 0.3),
        updatedBy: currentUserEmail || 'admin'
      });
      showToast(`Padrão do item "${selectedItemId}" salvo com sucesso!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar configuração do item', 'error');
    } finally {
      setIsSavingDefault(false);
    }
  };

  const handleResetDefault = async () => {
    if (!selectedItemId) return;
    try {
      await onDeleteItemDefault(selectedItemId);
      const original = allAvailableItems.find(i => i.id === selectedItemId);
      if (original) {
        setEditIsNode(original.defaultIsNode);
        setEditImage(original.defaultImage || '');
        setEditLabel(original.name);
        setEditScale(original.defaultIsNode ? 1.0 : 0.3);
      }
      showToast(`Padrão original restaurado para "${selectedItemId}"!`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao restaurar item', 'error');
    }
  };

  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showToast('Por favor, informe um endereço de email válido.', 'error');
      return;
    }

    if (admins.some(a => a.email.toLowerCase() === cleanEmail)) {
      showToast('Este usuário já é um administrador.', 'info');
      return;
    }

    setIsAddingAdmin(true);
    try {
      await onAddAdmin(cleanEmail);
      setNewAdminEmail('');
      showToast(`Administrador "${cleanEmail}" adicionado com sucesso!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Falha ao adicionar administrador', 'error');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0f1017] border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-[#151622] to-[#0f1017]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 shadow-md">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  PAINEL DE ADMINISTRAÇÃO
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Admin Ativo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logado como: <span className="text-amber-300 font-mono font-bold">{currentUserEmail || 'Não conectado'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if not logged in with Google */}
        {!currentUserEmail && (
          <div className="bg-amber-950/70 border-b border-amber-500/40 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Você não está conectado com o Google. Faça login para salvar no banco de dados Firestore permanentemente.</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                  showToast('Login Google efetuado com sucesso!', 'success');
                } catch (err: any) {
                  showToast('Falha no login com Google', 'error');
                }
              }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow shrink-0 self-start sm:self-auto transition-all"
            >
              Fazer Login com Google
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-[#12131d] px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('item_defaults')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x ${
              activeTab === 'item_defaults'
                ? 'bg-[#181926] text-amber-300 border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/30'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Propriedades Padrão de Itens</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
              {Object.keys(itemDefaults).length} customizados
            </span>
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x ${
              activeTab === 'admins'
                ? 'bg-[#181926] text-amber-300 border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/30'
            }`}
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Gerenciar Administradores</span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded-full font-mono">
              {admins.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Item Defaults Editor */}
        {activeTab === 'item_defaults' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-[#0f1017]">
            {/* Left list of items to select */}
            <div className="md:col-span-5 border-r border-slate-800 flex flex-col min-h-0 bg-[#12131d]">
              {/* Search and Filters */}
              <div className="p-3 border-b border-slate-800/80 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Buscar bloco ou item (ex: cookie, espada, diamond)..."
                    className="w-full bg-[#0c0d14] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {itemSearch && (
                    <button
                      onClick={() => setItemSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'customized', label: 'Customizados' },
                    { id: 'bettercraft', label: 'BetterCraft (850+)' },
                    { id: 'minetest', label: 'Minetest' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterMode(tab.id as any)}
                      className={`px-2 py-0.8 rounded font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                        filterMode === tab.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-[#161724] text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items scroll list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Nenhum item encontrado com esse termo.
                  </div>
                ) : (
                  filteredItems.slice(0, 150).map(item => {
                    const isSelected = selectedItemId === item.id;
                    const customConfig = itemDefaults[item.id];
                    const isNode = customConfig ? customConfig.isNode : item.defaultIsNode;
                    const previewImg = customConfig?.image || item.defaultImage;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItemToEdit(item.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                            : 'bg-[#151622] border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {previewImg ? (
                            <img
                              src={previewImg}
                              alt=""
                              className="w-6 h-6 object-contain rounded bg-black/40 border border-slate-800 p-0.5 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center shrink-0">
                              {isNode ? <Box className="w-3.5 h-3.5 text-cyan-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                            </div>
                          )}

                          <div className="truncate">
                            <div className="font-bold truncate text-slate-200 flex items-center gap-1.5">
                              <span>{customConfig?.label || item.name}</span>
                              {customConfig && (
                                <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded font-mono">
                                  SALVO
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {item.id}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isNode ? (
                            <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded">
                              Bloco 3D
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded">
                              1 Face
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {filteredItems.length > 150 && (
                  <div className="text-center text-[10px] text-slate-500 py-2">
                    Exibindo os primeiros 150 itens. Use a busca para filtrar.
                  </div>
                )}
              </div>
            </div>

            {/* Right configuration card */}
            <div className="md:col-span-7 flex flex-col p-5 overflow-y-auto space-y-5 bg-[#0f1017]">
              {selectedItemData ? (
                <>
                  <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                        Configuração de Propriedade Padrão
                      </div>
                      <h3 className="text-lg font-black text-white mt-0.5">
                        {editLabel || selectedItemData.name}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        ID: <span className="text-cyan-400">{selectedItemData.id}</span>
                      </div>
                    </div>

                    {activeCustomConfig && (
                      <button
                        onClick={handleResetDefault}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer transition-colors"
                        title="Restaurar valor de fábrica do mod/game"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar Fábrica</span>
                      </button>
                    )}
                  </div>

                  {/* 1. Escolha: 1 Face Item ou Node 3D */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span>Modo de Renderização Padrão:</span>
                      <span className="text-slate-500 font-normal text-[11px]">(Define como é inserido e renderizado)</span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsNode(false);
                          if (editScale === 1.0) setEditScale(0.3);
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                          !editIsNode
                            ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-[#151622] border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <Sparkles className="w-6 h-6 text-amber-400" />
                        <div className="text-center">
                          <div className="font-extrabold text-xs">1 FACE ITEM (Padrão)</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Item 2D / Display em 1 face plana
                          </div>
                        </div>
                        {!editIsNode && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                            <Check className="w-3.5 h-3.5" /> Selecionado
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditIsNode(true);
                          if (editScale === 0.3) setEditScale(1.0);
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                          editIsNode
                            ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-md ring-1 ring-cyan-500/40'
                            : 'bg-[#151622] border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <Box className="w-6 h-6 text-cyan-400" />
                        <div className="text-center">
                          <div className="font-extrabold text-xs">BLOCO 3D (NODE)</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Cubo sólido 3D de 6 faces
                          </div>
                        </div>
                        {editIsNode && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-300 font-bold">
                            <Check className="w-3.5 h-3.5" /> Selecionado
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. Imagem / Textura na Lista */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Imagem / Textura na Lista e Simulação:</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl border border-slate-800 bg-black/60 flex items-center justify-center overflow-hidden shrink-0">
                        {editImage ? (
                          <img
                            src={editImage}
                            alt=""
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">Sem img</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={editImage}
                          onChange={(e) => setEditImage(e.target.value)}
                          placeholder="URL da imagem (ex: https://... ou /texturas/cookie.png)"
                          className="w-full bg-[#0c0d14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>PNG transparente recomendado para 1 face item</span>
                          {selectedItemData.defaultImage && (
                            <button
                              type="button"
                              onClick={() => setEditImage(selectedItemData.defaultImage || '')}
                              className="text-amber-400 hover:underline cursor-pointer"
                            >
                              Usar textura original
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Nome / Label de exibição */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Nome de Exibição na Lista:
                    </label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Nome do item..."
                      className="w-full bg-[#0c0d14] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* 4. Escala Padrão */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-300">
                        Escala Padrão ao Selecionar / Inserir:
                      </label>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {editScale}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[0.25, 0.3, 0.5, 0.75, 1.0].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditScale(s)}
                          className={`flex-1 py-1 rounded text-xs font-mono font-bold border cursor-pointer transition-colors ${
                            editScale === s
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-[#151622] text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Salvar Button */}
                  <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDefault}
                      disabled={isSavingDefault}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-95 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer shadow-lg disabled:opacity-50 transition-all uppercase tracking-wider"
                    >
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                      <span>{isSavingDefault ? 'SALVANDO NO FIRESTORE...' : 'SALVAR PROPRIEDADE PADRÃO'}</span>
                    </button>
                  </div>

                  {/* Info notice */}
                  <div className="bg-[#12131e] p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      As propriedades salvas ficam gravadas no banco de dados e são aplicadas automaticamente quando qualquer usuário usar o pincel ou biblioteca de itens.
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-500">
                  <Sliders className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm font-bold text-slate-400">Nenhum item selecionado</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Selecione um item da lista à esquerda para editar suas propriedades padrão.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Admin Users Management */}
        {activeTab === 'admins' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0f1017]">
            {/* Top explanation */}
            <div className="bg-gradient-to-r from-cyan-950/30 to-[#151624] p-4 rounded-xl border border-cyan-500/20 flex items-start gap-3">
              <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <div className="font-bold text-white text-sm">Controle de Administradores</div>
                <div className="mt-1 text-slate-400">
                  Usuários com email de administrador podem configurar as propriedades padrão dos itens (1 face item vs 3D node, imagens/texturas) e gerenciar outros administradores.
                </div>
              </div>
            </div>

            {/* Add new admin form */}
            <div className="bg-[#13141f] p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Adicionar Novo Administrador
              </h4>
              <form onSubmit={handleAddAdminSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="Digite o email do novo administrador (ex: usuario@gmail.com)..."
                  className="flex-1 bg-[#0c0d14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={isAddingAdmin}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingAdmin ? 'Adicionando...' : 'Adicionar Admin'}</span>
                </button>
              </form>
            </div>

            {/* Current Admins List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>Administradores Autorizados ({admins.length})</span>
                <span>Permissão</span>
              </div>

              <div className="space-y-2">
                {admins.map((adm) => {
                  const isPrimary = adm.email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase();

                  return (
                    <div
                      key={adm.email}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#141522] border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isPrimary
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}>
                          {isPrimary ? <Crown className="w-4 h-4 text-amber-400" /> : <UserCheck className="w-4 h-4 text-cyan-400" />}
                        </div>

                        <div>
                          <div className="font-bold text-xs text-white font-mono flex items-center gap-2">
                            <span>{adm.email}</span>
                            {isPrimary && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-sans uppercase font-black tracking-wider">
                                Proprietário Principal
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isPrimary ? 'Acesso total permanente' : `Adicionado por: ${adm.addedBy || 'admin'}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPrimary ? (
                          <span className="text-[11px] text-amber-400 font-bold px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/30">
                            Super Admin
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await onRemoveAdmin(adm.email);
                                showToast(`Admin "${adm.email}" removido`, 'info');
                              } catch (err: any) {
                                showToast(err.message || 'Erro ao remover admin', 'error');
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer transition-colors"
                            title="Remover privilégios de administrador deste usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
