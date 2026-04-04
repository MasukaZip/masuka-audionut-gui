import { useState, useEffect, useRef } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { ManualTerminalInput } from '../../wailsjs/go/main/App';

export default function Console() {
  const [logs, setLogs] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = EventsOn('log', (chunk: string) => {
      setLogs((prev) => [...prev, chunk]);
    });
    return () => off();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSend = () => {
    if (!input.trim()) return;
    ManualTerminalInput(input);
    setLogs((prev) => [...prev, `\n<span style="color:#e5a00d">> ${input} (manual)</span>\n`]);
    setInput('');
  };

  const filteredLogs = () => {
    if (!filter.trim()) return logs.join('').split('\n');
    const f = filter.toLowerCase();
    return logs.join('').split('\n').filter(line => {
      const plainText = line.replace(/<[^>]*>?/gm, '').toLowerCase();
      return plainText.includes(f);
    });
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2">
        <h3 className="text-gold border border-gold rounded px-2 py-0.5 text-xs font-bold uppercase w-max">
          Logs do Terminal
        </h3>
        
        <div className="flex-1 max-w-xs ml-4">
          <input 
            type="text" 
            placeholder="Filtrar logs..." 
            className="input !py-0.5 !px-2 !text-[10px] w-full border-gray-800"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white ml-auto">
          Limpar
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-[#222] rounded p-3 h-64 overflow-y-auto font-mono text-xs text-green-400">
        <div dangerouslySetInnerHTML={{ __html: filteredLogs().join('<br/>') }} />
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Digite (ex: y, c, a)..." 
          className="input flex-1 h-9"
        />
        <button onClick={handleSend} className="btn-gold px-4 h-9">Enviar</button>
        <button onClick={() => { ManualTerminalInput('y'); setLogs(p => [...p, `<br/><span style="color:#e5a00d">> y (forçado)</span><br/>`]); }} className="btn-gold px-4 h-9">
          Forçar 'y'
        </button>
      </div>
    </div>
  );
}
