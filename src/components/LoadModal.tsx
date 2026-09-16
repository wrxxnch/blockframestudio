import React, { useState } from 'react';
import { X, FolderOpen, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCode?: (code: string, autoScale067?: boolean) => void;
  onConfirm?: (code: string, autoScale067?: boolean) => void;
  loadInputCode?: string;
  setLoadInputCode?: (code: string) => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LoadModal: React.FC<LoadModalProps> = ({
  isOpen,
  onClose,
  onLoadCode,
  onConfirm,
  loadInputCode = '',
  setLoadInputCode,
}) => {
  const [inputCode, setInputCode] = useState(loadInputCode);
  const [autoScaleTo067, setAutoScaleTo067] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync external input code if provided
  React.useEffect(() => {
    if (loadInputCode) {
      setInputCode(loadInputCode);
    }
  }, [loadInputCode]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputCode(content);
        setLoadInputCode?.(content);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setError('Insira o código do modelo ou carregue um arquivo.');
      return;
    }

    const handler = onLoadCode || onConfirm;
    if (!handler) {
      setError('Ação de carregamento indisponível.');
      return;
    }

    try {
      handler(inputCode, autoScaleTo067);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao processar o formato do modelo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#0e0f17] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#13141f]">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>Carregar Modelo (BlockFrame .bf / JSON)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Importe tabelas de retorno Lua do BlockFrame (<code className="text-emerald-300">local _=&#123;&#125;;_[1]="rel_pos";return &#123;...&#125;</code>) ou estruturas JSON.
          </p>

          {/* File Upload zone */}
          <div className="relative border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-[#08090f]/60 group">
            <input
              type="file"
              accept=".bf,.lua,.json,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <Upload className="w-6 h-6 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              <span className="text-xs font-bold text-slate-300">
                Arraste um arquivo .bf ou clique para selecionar
              </span>
              <span className="text-[10px] text-slate-500">
                Suporta extensões .bf, .lua e .json
              </span>
            </div>
          </div>

          {/* Code Paste Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Ou cole o código diretamente:
              </span>
              {inputCode && (
                <button
                  type="button"
                  onClick={() => setInputCode('')}
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  Limpar
                </button>
              )}
            </div>
            <textarea
              rows={8}
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                if (error) setError(null);
              }}
              placeholder={`local _={};_[1]="rel_pos";return {version=1,entities={{node="mcl_core:apple",args={rotate={y=0,z=0,x=-45},size={y=0.3,z=0.3,x=0.3},pos={y=0,z=0,x=0},glow=0},[_[1]]={y=0,z=0,x=0}}}}`}
              className="w-full bg-[#08090f] border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
            />
          </div>

          {/* Scale notice banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#12141e] border border-cyan-500/20 text-xs">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-slate-200 font-bold">
                Tamanho normal (1.0) na simulação
              </span>
              <span className="text-[10px] text-slate-400">
                Os blocos são editados no tamanho padrão 1.0 no visualizador 3D e reduzidos para 0.67 automaticamente ao exportar.
              </span>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Importar para o Editor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
