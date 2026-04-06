import { useState, useEffect } from 'react';
import { SelectFile, SelectFolder, GetSettings } from '../../wailsjs/go/main/App';
import { StartPrimateUpload, StopPrimateUpload } from '../../wailsjs/go/main/App';
import Console from './Console';
import { EventsOn } from '../../wailsjs/runtime/runtime';

const TIPOS_CURSO: Record<string, string> = {
  '55': 'Programação/TI',
  '56': 'Idiomas',
  '57': 'Design',
  '58': 'Des. Pessoal',
  '59': 'Arquitetura',
  '60': 'Trader',
  '62': 'Administração',
  '63': 'Concurso',
  '64': 'Copywriting',
  '65': 'Culinária',
  '66': 'ADS',
  '67': 'Investimentos',
  '68': 'Direito',
  '69': 'Dropshipping',
  '70': 'Saúde',
  '71': 'Manutenção',
  '72': 'Finanças',
  '73': 'Desenho',
  '74': 'ENEM/Vestibular',
  '75': 'Cia. Humanas',
  '76': 'Religião',
  '77': 'Audiovisual',
  '78': 'Eletrônica',
  '79': 'Profissional',
  '80': 'Engenharia',
  '81': 'Apostas',
  '82': 'Tráfego Pago',
  '83': 'Medicina',
  '84': 'Hacker',
  '85': 'Diversos',
  '86': 'Marketing',
  '87': 'Música',
};

const TIPOS_VIDEO: Record<string, string> = {
  '4': 'WEB-DL',
  ...TIPOS_CURSO,
};

export default function PrimateTab() {
  const [path, setPath] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [modo, setModo] = useState<'curso' | 'ebook' | 'video'>('curso');
  const [typeId, setTypeId] = useState('63');
  const [multi, setMulti] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [defaultSig, setDefaultSig] = useState(false);
  const [posterPath, setPosterPath] = useState('');
  const [bannerPath, setBannerPath] = useState('');
  const [running, setRunning] = useState(false);
  const [primatePath, setPrimatePath] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    GetSettings().then(s => {
      if (s.primatePath) setPrimatePath(s.primatePath);
    });

    const offFinished = EventsOn('primateFinished', () => setRunning(false));
    return () => { offFinished(); };
  }, []);

  const handlePathSet = (p: string) => {
    if (!p) return;
    setPath(p);
    // Auto-preenche o título com o nome da pasta/arquivo
    const parts = p.replace(/\\/g, '/').split('/');
    let name = parts[parts.length - 1] || parts[parts.length - 2] || '';
    // Remove extensão se for arquivo
    name = name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    if (name) setTitulo(name);
  };

  const handleStart = () => {
    if (!path) { alert('Selecione uma pasta ou arquivo!'); return; }
    if (!titulo) { alert('Preencha o título!'); return; }
    if (!primatePath) { alert('Configure o caminho do PR1MATE nas Configurações!'); return; }
    setRunning(true);
    StartPrimateUpload({
      path, titulo, descricao, modo,
      typeId: modo === 'ebook' ? '' : typeId,
      multi, detalhes, defaultSig, posterPath, bannerPath
    }).catch(err => {
      alert('Erro ao iniciar: ' + err);
      setRunning(false);
    });
  };

  const tiposDisponiveis = modo === 'video' ? TIPOS_VIDEO : TIPOS_CURSO;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4 pb-12">

      {/* Caminho */}
      <fieldset
        className={`primate-fieldset m-0 ${isDragging ? 'border-[#ffcc00]' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handlePathSet((f as any).path || f.name);
        }}
      >
        <legend className="primate-legend">Pasta / Arquivo</legend>
        <div className="flex gap-2">
          <input className="input flex-1 border-gray-800" value={path} readOnly placeholder="Selecione a pasta ou arquivo..." />
          <button className="btn-gold" onClick={() => SelectFolder().then(p => { if (p) handlePathSet(p); })}>Escolher Pasta</button>
          <button className="btn-gold" onClick={() => SelectFile().then(p => { if (p) handlePathSet(p); })}>Escolher Arquivo</button>
        </div>
      </fieldset>

      {/* Título e Descrição */}
      <fieldset className="primate-fieldset m-0">
        <legend className="primate-legend">Informações do Torrent</legend>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Título</label>
            <input className="input w-full border-gray-800" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nome que vai aparecer no tracker" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Descrição <span className="text-gray-600 normal-case">(opcional)</span></label>
            <textarea
              className="input w-full border-gray-800 resize-none font-mono text-sm"
              rows={3}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Suporta BBCode. Se deixar vazio, o script pedirá no terminal."
            />
          </div>
        </div>
      </fieldset>

      {/* Modo e Tipo */}
      <div className="grid grid-cols-2 gap-4">
        <fieldset className="primate-fieldset m-0">
          <legend className="primate-legend">Modo</legend>
          <div className="flex gap-3">
            {(['curso', 'ebook', 'video'] as const).map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="accent-[#ffcc00]"
                  checked={modo === m}
                  onChange={() => {
                    setModo(m);
                    if (m === 'video') setTypeId('4');
                    else if (m === 'curso') setTypeId('63');
                  }}
                />
                <span className="text-sm capitalize">{m}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {modo !== 'ebook' && (
          <fieldset className="primate-fieldset m-0">
            <legend className="primate-legend">Tipo de Curso</legend>
            <select
              className="input w-full border-gray-800 bg-[#1a1a1a]"
              value={typeId}
              onChange={e => setTypeId(e.target.value)}
            >
              {Object.entries(tiposDisponiveis).map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
          </fieldset>
        )}
      </div>

      {/* Opções */}
      <fieldset className="primate-fieldset m-0">
        <legend className="primate-legend">Opções Adicionais</legend>
        <div className="grid grid-cols-3 gap-y-4 gap-x-2 mt-2">
          {[
            { label: 'Multi', desc: 'Agrupa todos os tipos de arquivo (PDFs, vídeos, etc.) em um único torrent.', checked: multi, onChange: setMulti },
            { label: 'Descrição Detalhada', desc: 'Gera automaticamente estatísticas, estrutura de pastas e screenshots na descrição do torrent (-detalhes).', checked: detalhes, onChange: setDetalhes },
            { label: 'Assinatura Padrão', desc: 'Adiciona a imagem de assinatura padrão do PR1MATE ao final da descrição (-default).', checked: defaultSig, onChange: setDefaultSig },
          ].map(opt => (
            <div key={opt.label} className="relative flex items-center gap-2 group/tt w-max">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400">
                <input type="checkbox" className="accent-[#ffcc00] w-4 h-4 cursor-pointer" checked={opt.checked} onChange={e => opt.onChange(e.target.checked)} />
                <span className="hover:text-white transition-colors">{opt.label}</span>
              </label>
              <span className="text-gray-500 hover:text-blue-400 cursor-help text-[10px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full border border-gray-700 hover:border-blue-400 transition-all shadow-sm">?</span>
              <div className="absolute top-6 left-0 w-60 p-2.5 bg-gray-900 border border-t-2 border-t-blue-500 border-gray-700 text-[11px] text-blue-100 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/tt:opacity-100 group-hover/tt:visible transition-all z-50 pointer-events-none">
                {opt.desc}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Poster e Banner */}
      <div className="grid grid-cols-2 gap-4">
        <fieldset className="primate-fieldset m-0">
          <legend className="primate-legend">Poster / Capa <span className="text-gray-600 font-normal">(400x600px)</span></legend>
          <div className="flex gap-2">
            <input className="input flex-1 border-gray-800 text-xs" value={posterPath} readOnly placeholder="Opcional" />
            <button className="btn-gold text-xs" onClick={() => SelectFile().then(p => { if (p) setPosterPath(p); })}>Selecionar</button>
            {posterPath && <button className="btn-gold !bg-transparent text-gray-500 text-xs" onClick={() => setPosterPath('')}>✕</button>}
          </div>
        </fieldset>
        <fieldset className="primate-fieldset m-0">
          <legend className="primate-legend">Banner <span className="text-gray-600 font-normal">(960x540px)</span></legend>
          <div className="flex gap-2">
            <input className="input flex-1 border-gray-800 text-xs" value={bannerPath} readOnly placeholder="Opcional" />
            <button className="btn-gold text-xs" onClick={() => SelectFile().then(p => { if (p) setBannerPath(p); })}>Selecionar</button>
            {bannerPath && <button className="btn-gold !bg-transparent text-gray-500 text-xs" onClick={() => setBannerPath('')}>✕</button>}
          </div>
        </fieldset>
      </div>

      {/* Ação */}
      <fieldset className="primate-fieldset m-0 !border-[#ffcc00]/40 shadow-[0_0_20px_rgba(255,204,0,0.08)]">
        <legend className="primate-legend !border-[#ffcc00] !text-[#ffcc00] font-black tracking-widest">Ação de Execução</legend>
        <div className="flex gap-2">
          <button
            className="btn-gold uppercase tracking-widest flex-1 px-2 font-black shadow-[0_0_15px_rgba(255,204,0,0.3)]"
            onClick={handleStart}
            disabled={running}
          >
            {running ? 'Enviando...' : 'Iniciar Upload'}
          </button>
          <button
            className="btn-gold uppercase px-4 text-xs !bg-transparent text-gray-500 border-red-900/50 hover:bg-red-900/30 hover:text-red-400"
            onClick={() => StopPrimateUpload()}
            disabled={!running}
          >
            Parar
          </button>
        </div>
      </fieldset>

      {/* Console */}
      <Console />
    </div>
  );
}
