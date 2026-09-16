import React from 'react';
import { X, Keyboard, MousePointer, Move, Box, Sparkles, Layers, ShieldCheck } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#0e0f17] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#13141f]">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <span>BDStudio - Atalhos & Controles</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300 overflow-y-auto max-h-[70vh]">
          
          {/* Section: Snapping 1 Block */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Espaçamento Perfeito de 1 Bloco (Snap Step 1.0)</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              No Step 1.0, cada bloco é alinhado aos eixos inteiros (<code className="text-emerald-300">Math.round</code>), garantindo <strong>zero sobreposição</strong>. Ao clicar na face de um bloco existente, o novo bloco é posicionado perfeitamente adjacente na direção normal daquela face.
            </p>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Mouse & Navigation */}
            <div className="bg-[#141520] p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                <MousePointer className="w-4 h-4 text-cyan-400" />
                <span>Navegação da Câmera 3D</span>
              </div>
              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-300">Girar Câmera (Orbit):</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">Botão Esquerdo + Arrastar</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-300">Deslocar (Pan):</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">Botão Direito / Shift + Arrastar</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-300">Zoom:</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">Scroll do Mouse</span>
                </li>
              </ul>
            </div>

            {/* Interaction Modes */}
            <div className="bg-[#141520] p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Move className="w-4 h-4 text-emerald-400" />
                <span>Ações no Viewport</span>
              </div>
              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-300">Colocar Bloco:</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">Clique na Grade ou Face</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-300">Selecionar Bloco:</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">Clique no Bloco (Modo Seleção)</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-semibold text-slate-300">Deletar Bloco:</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">Clique no Bloco (Modo Borracha)</span>
                </li>
              </ul>
            </div>

            {/* Blocks vs Items */}
            <div className="bg-[#141520] p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Box className="w-4 h-4 text-amber-400" />
                <span>Blocks vs Items</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong>Blocks</strong>: Nós sólidos 3D cúbicos com texturas nas 6 faces.<br />
                <strong>Items</strong>: Entidades 2D de face única com rotação isométrica (<code className="text-amber-300">x=-45°</code>) e escala reduzida (<code className="text-amber-300">size 0.3</code>), ideais para maçãs, espadas, ferramentas e itens decorativos.
              </p>
            </div>

            {/* Export options */}
            <div className="bg-[#141520] p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Formatos de Exportação</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong>Minecraft</strong>: Comandos <code className="text-emerald-300">/summon block_display</code> e <code className="text-amber-300">item_display</code> com transformation tags.<br />
                <strong>Luanti / Minetest</strong>: Arquivo nativo <code className="text-cyan-300">.bf</code> em formato de tabela Lua.
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#13141f] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 cursor-pointer transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
