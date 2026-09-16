import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, HelpCircle, CornerDownLeft } from 'lucide-react';

interface ConsoleLine {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'input';
  sender?: string;
}

interface CommandConsoleProps {
  onExecuteCommand: (command: string) => { success: boolean; message: string };
  initialLines?: ConsoleLine[];
}

export default function CommandConsole({ onExecuteCommand }: CommandConsoleProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ConsoleLine[]>([
    {
      id: 'init-1',
      text: '*** BlockFrame Terminal Inicializado ***',
      type: 'info',
      sender: 'System'
    },
    {
      id: 'init-2',
      text: 'Digite comandos como "/blockframe_apply size=2,1.5,1" ou pressione o botão de ajuda para ver a lista de chatcommands disponíveis baseada no mod Luacraft.',
      type: 'info',
      sender: 'System'
    }
  ]);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmdStr = input.trim();
    
    // Add user input to history
    const userLine: ConsoleLine = {
      id: `user-${Date.now()}`,
      text: cmdStr,
      type: 'input',
      sender: 'Você'
    };

    setHistory(prev => [...prev, userLine]);
    setInput('');

    // Execute through master prop callback
    const result = onExecuteCommand(cmdStr);

    // Provide system response
    setTimeout(() => {
      const systemLine: ConsoleLine = {
        id: `sys-${Date.now()}`,
        text: result.message,
        type: result.success ? 'success' : 'error',
        sender: 'Mod BlockFrame'
      };
      setHistory(prev => [...prev, systemLine]);
    }, 100);
  };

  const insertCommandPreset = (cmd: string) => {
    setInput(cmd);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d12] border border-slate-800 rounded-xl overflow-hidden font-mono shadow-xl shadow-cyan-950/5">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0c] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-405 stroke-cyan-400 group-hover:scale-105 transition-all text-cyan-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">Minetest Command Box</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => insertCommandPreset('/blockframe')}
            className="text-[10px] bg-[#16161d] hover:bg-slate-800 text-slate-300 py-0.5 px-2 rounded flex items-center gap-1 cursor-pointer transition-colors border border-slate-800"
            title="Ajuda detalhada dos comandos"
          >
            <HelpCircle className="w-3 h-3 text-purple-400" /> AJUDA
          </button>
        </div>
      </div>

      {/* Screen Logs */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5 text-xs text-slate-300 scrollbar-thin select-text max-h-[160px] min-h-[120px]">
        {history.map((line) => (
          <div
            key={line.id}
            className={`px-2 py-0.5 rounded leading-relaxed ${
              line.type === 'input'
                ? 'text-slate-100 bg-[#16161d] font-semibold'
                : line.type === 'success'
                ? 'text-emerald-400 border-l-2 border-cyan-500 bg-cyan-950/20 px-2'
                : line.type === 'error'
                ? 'text-red-400 border-l-2 border-rose-500 bg-rose-950/20 px-2'
                : 'text-cyan-400/90'
            }`}
          >
            <span className="text-[10px] text-slate-500 mr-2">
              [{line.sender || 'SYS'}]
            </span>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick shortcuts banner */}
      <div className="px-3 py-1 bg-[#16161d] border-t border-b border-slate-800 overflow-x-auto whitespace-nowrap flex items-center gap-2 shrink-0 scrollbar-none">
        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Presets:</span>
        {[
          { label: '/blockframe', cmd: '/blockframe' },
          { label: '/blockframe_scale 1.0', cmd: '/blockframe_scale 1.0' },
          { label: '/blockframe_load Portal', cmd: '/blockframe_load "Portal Místico de Mese"' },
          { label: '/blockframe_apply rot=0,45,0', cmd: '/blockframe_apply rotate=0,45,0' },
          { label: '/blockframe_set col=false glow=15', cmd: '/blockframe_set collision=false glow=15' },
          { label: '/blockframe_undo', cmd: '/blockframe_undo' },
          { label: '/blockframe_del', cmd: '/blockframe_del' }
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={() => insertCommandPreset(btn.cmd)}
            className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Console Input Footer */}
      <form onSubmit={handleSubmit} className="flex bg-[#0a0a0c] p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite o comando do mod (ex: /blockframe_apply size=1,2,1)..."
          className="flex-1 bg-[#16161d] border border-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded-l font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600"
        />
        <button
          type="submit"
          className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)] font-bold px-3 rounded-r transition-all flex items-center justify-center cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
