import React, { useState } from 'react';
import { X, Copy, Download, Check, FileCode, Code, Server } from 'lucide-react';
import { BlockFrameEntity } from '../types';
import { generateLuaExport, generateBlockFrameJSON, generateBFExport } from '../blockframeUtils';

interface CodeModalProps {
  entities: BlockFrameEntity[];
  structureName: string;
  onClose: () => void;
}

function generateMinecraftExport(entities: BlockFrameEntity[], structureName: string): string {
  const lines: string[] = [];
  lines.push(`# Minecraft Block Display / Item Display Command (BDStudio compatible)`);
  lines.push(`# Project: ${structureName}`);
  lines.push(`# Total Elements: ${entities.length}`);
  lines.push(``);
  entities.forEach((ent) => {
    const isItem = ent.args.node === false;
    const mcId = ent.node
      .replace(/^mcl_core:/, 'minecraft:')
      .replace(/^mcl_farming:/, 'minecraft:')
      .replace(/^mcl_tools:/, 'minecraft:')
      .replace(/^mcl_armor:/, 'minecraft:')
      .replace(/^default:/, 'minecraft:');

    if (isItem) {
      lines.push(`summon item_display ~${ent.pos.x} ~${ent.pos.y} ~${ent.pos.z} {item:{id:"${mcId}",Count:1b},transformation:{translation:[0f,0f,0f],scale:[${ent.args.size.x}f,${ent.args.size.y}f,${ent.args.size.z}f]}}`);
    } else {
      lines.push(`summon block_display ~${ent.pos.x} ~${ent.pos.y} ~${ent.pos.z} {block_state:{Name:"${mcId}"},transformation:{translation:[0f,0f,0f],scale:[${ent.args.size.x}f,${ent.args.size.y}f,${ent.args.size.z}f]}}`);
    }
  });
  return lines.join('\n');
}

export default function CodeModal({ entities, structureName, onClose }: CodeModalProps) {
  const [activeTab, setActiveTab] = useState<'bf' | 'mc' | 'lua' | 'json'>('bf');
  const [scaleMode, setScaleMode] = useState<'0.67' | '1.0'>('0.67');
  const [copied, setCopied] = useState(false);

  const cleanStructureName = structureName.trim() || 'Project';
  const multiplier = scaleMode === '0.67' ? 0.67 : 1.0;

  const bfCode = generateBFExport(entities, cleanStructureName, multiplier);
  const mcCode = generateMinecraftExport(entities, cleanStructureName);
  const luaCode = generateLuaExport(entities, cleanStructureName, multiplier);
  const jsonCode = generateBlockFrameJSON(entities, cleanStructureName, multiplier);

  const getCodeContent = () => {
    if (activeTab === 'bf') return bfCode;
    if (activeTab === 'mc') return mcCode;
    if (activeTab === 'lua') return luaCode;
    return jsonCode;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getCodeContent();
    const extension = activeTab === 'bf' ? 'bf' : activeTab === 'mc' ? 'mcfunction' : activeTab === 'json' ? 'json' : 'lua';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanStructureName.toLowerCase().replace(/\s+/g, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-[#0f1016] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#14151e] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">
                Exportar Estrutura ({entities.length} elementos)
              </h3>
              <p className="text-[11px] text-slate-400">
                Formatos compatíveis com Luanti (.bf / Lua) e Minecraft (block_display)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 bg-slate-800/40 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex bg-[#0b0c10] border-b border-slate-800 px-6 py-2 gap-2 overflow-x-auto">
          {[
            { id: 'bf', label: 'Luanti .bf (Recomendado)', icon: Server },
            { id: 'mc', label: 'Minecraft (block_display)', icon: Code },
            { id: 'lua', label: 'Mod Lua Script', icon: FileCode },
            { id: 'json', label: 'JSON Puro', icon: Code },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'bf' | 'mc' | 'lua' | 'json')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scale Optimization Banner for Luanti / Minetest */}
        {(activeTab === 'bf' || activeTab === 'lua') && (
          <div className="bg-[#12141e] border-b border-slate-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="font-bold text-emerald-400">Escala BlockFrame:</span>
              <span className="text-slate-400 text-[11px]">
                {scaleMode === '0.67'
                  ? '0.67x padrão (corrige blocos gigantes no /blockframe_load)'
                  : '1.0x original (sem correção)'}
              </span>
            </div>
            <div className="flex bg-[#0a0b10] rounded-lg border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setScaleMode('0.67')}
                className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                  scaleMode === '0.67'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                0.67x (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('1.0')}
                className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                  scaleMode === '1.0'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1.0x Original
              </button>
            </div>
          </div>
        )}

        {/* Code body area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950 font-mono">
          <div className="relative group rounded-xl border border-slate-850 p-4 bg-slate-920 text-slate-200 text-xs leading-relaxed max-h-[380px] overflow-auto whitespace-pre scrollbar-thin">
            {getCodeContent()}
          </div>
        </div>

        {/* Tool actions footer */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-920 border-t border-slate-800">
          <div className="text-[10px] text-purple-400 font-mono">
            {entities.length} blocos inclusos na exportação
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-100 text-xs px-4 py-2 rounded-lg font-bold font-mono transition-all border border-slate-700 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  COPIADO
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  COPIAR CÓDIGO
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs px-4 py-2 rounded-lg font-bold font-mono transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              <Download className="w-4 h-4" />
              BAIXAR ARQUIVO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
