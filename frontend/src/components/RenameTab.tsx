import { useState, useMemo, useEffect } from 'react';
import { SelectFile, SelectFolder, RenameFile, ParseMediaInfo, PreviewEpisodes } from '../../wailsjs/go/main/App';

const CATEGORIES = [
  'Filme / Doc (WEB/Encode)',
  'Remux',
  'Full Disc',
  'Série Completa',
  'Série Episódio',
  'Jogo',
  'Programa',
  'Livro',
  'Audiobook',
  'Revista',
  'Curso'
];

export default function RenameTab() {
  const [path, setPath] = useState('');
  const [cat, setCat] = useState('Filme / Doc (WEB/Encode)');

  const [f, setF] = useState({
    nome: '', ano: '', s: '', e: '',
    res: '', streaming: '', source: '',
    vcodec: '', acodec: '', audio: '', group: '',
    regiao: '', hdr: '',
    versao: '', autor: '', edicao: '', idioma: '',
    plataforma: '', obs: ''
  });

  const [showWarnings, setShowWarnings] = useState(false);

  const handleChange = (key: string, val: string) => {
    setF({ ...f, [key]: val });
    setShowWarnings(false); // Esconde erros ao editar
  };

  const handleApplyMediaInfo = async (selectedPath: string) => {
    setPath(selectedPath);
    setShowWarnings(false);
    
    try {
      const data = await ParseMediaInfo(selectedPath);
      const baseName = selectedPath.split(/[/\\]/).pop() || '';
      const up = baseName.toUpperCase();
      
      let sFound = '';
      let eFound = '';
      const seMatch = up.match(/S(\d{2})(?:E(\d{2}))?/);
      if (seMatch) {
         sFound = seMatch[1];
         if (seMatch[2]) eFound = seMatch[2];
      }

      let anoFound = '';
      const yearMatch = baseName.match(/(?:\.| )(19\d{2}|20\d{2})(?:\.| |$)/);
      if (yearMatch) anoFound = yearMatch[1];

      let finalTitle = '';
      const titleMatch = baseName.match(/(.*?)(?:\.| )(?:(19|20)\d{2}|S\d{2}|(?:1080|2160|720)[pi])/i);
      if (titleMatch && titleMatch[1]) {
        finalTitle = titleMatch[1].replace(/\./g, ' ').replace(/_|-/g, ' ').trim();
      } else {
        finalTitle = baseName.split('.')[0];
      }

      let streaming = '';
      const streamings = ['AMZN', 'NF', 'DSNP', 'HMAX', 'MAX', 'ATVP', 'PMTP', 'PCOK', 'HULU', 'STAN', 'CRAV'];
      for (const s of streamings) {
        if (up.includes(s)) { streaming = s; break; }
      }

      let audio = '';
      if (up.includes('DUAL')) audio = 'DUAL';
      if (up.includes('MULTI')) audio = 'MULTI';

      let group = '';
      const lastDash = baseName.lastIndexOf('-');
      if (lastDash > 0) {
        let remainder = baseName.substring(lastDash + 1).split(/\.[A-Za-z0-9]+$/)[0]; // remove extension like .mkv
        const parts = remainder.split(/\./); 
        group = parts[parts.length - 1]; 
        if(group.toUpperCase() === 'DUAL' || group.toUpperCase() === 'MULTI') group = '';
      }

      let newCat = cat;
      // Auto-selecionar a categoria de Séries se achar padrões
      if (sFound && !eFound && cat !== 'Série Completa') newCat = 'Série Completa';
      if (sFound && eFound && cat !== 'Série Episódio') newCat = 'Série Episódio';
      setCat(newCat);

      setF(prev => ({
        ...prev,
        nome: finalTitle || prev.nome,
        ano: anoFound || prev.ano,
        s: sFound || prev.s,
        e: eFound || prev.e,
        res: data.res || prev.res,
        vcodec: data.vcodec || prev.vcodec,
        acodec: data.acodec || prev.acodec,
        source: data.source || prev.source,
        hdr: data.hdr || prev.hdr,
        streaming: data.streaming || streaming || prev.streaming,
        audio: data.audio || audio || prev.audio,
        group: data.group || group || 'CBR'
      }));
    } catch (err) {
      console.log("Erro ao parsear midia: ", err);
    }
  };


  // Padrões de validação e construção
  const buildName = () => {
    let parts: string[] = [];

    const add = (val: string) => { if (val.trim()) parts.push(val.trim()); };

    if (cat === 'Filme / Doc (WEB/Encode)') {
      add(f.nome); add(f.ano); add(f.res); add(f.streaming); add(f.source);
      add(f.hdr); add(f.acodec); add(f.vcodec);
      // Group concat
      let tg = [];
      if (f.audio) tg.push(f.audio);
      if (f.group) tg.push(f.group);
      if (tg.length > 0) parts.push(tg.join('-'));

    } else if (cat === 'Remux') {
      add(f.nome); add(f.ano); add(f.res); add(f.source); add('REMUX');
      add(f.hdr); add(f.vcodec); add(f.acodec);
      let tg = [];
      if (f.audio) tg.push(f.audio);
      if (f.group) tg.push(f.group);
      if (tg.length > 0) parts.push(tg.join('-'));

    } else if (cat === 'Full Disc') {
      add(f.nome); add(f.ano); add(f.res); add(f.regiao); add(f.source);
      add(f.hdr); add(f.vcodec); add(f.acodec);
      let tg = [];
      if (f.audio) tg.push(f.audio);
      if (f.group) tg.push(f.group);
      if (tg.length > 0) parts.push(tg.join('-'));

    } else if (cat === 'Série Completa') {
      add(f.nome); if(f.s) add(`S${f.s.padStart(2,'0')}`);
      add(f.res); add(f.streaming); add(f.source); add(f.hdr); add(f.acodec); add(f.vcodec);
      let tg = [];
      if (f.audio) tg.push(f.audio);
      if (f.group) tg.push(f.group);
      if (tg.length > 0) parts.push(tg.join('-'));

    } else if (cat === 'Série Episódio') {
      add(f.nome); 
      if(f.s && f.e) add(`S${f.s.padStart(2,'0')}E${f.e.padStart(2,'0')}`);
      add(f.res); add(f.streaming); add(f.source); add(f.hdr); add(f.acodec); add(f.vcodec);
      let tg = [];
      if (f.audio) tg.push(f.audio);
      if (f.group) tg.push(f.group);
      if (tg.length > 0) parts.push(tg.join('-'));

    } else if (cat === 'Jogo') {
      add(f.nome); add(f.versao); add(f.ano); if (f.group) add(`- ${f.group}`);
      if (f.idioma) add(`[${f.idioma}]`);
      if (f.obs) add(`[${f.obs}]`);

    } else if (cat === 'Programa') {
      add(f.nome); add(f.versao); if (f.group) add(f.group);
      if (f.idioma) add(`[${f.idioma}]`);

    } else if (cat === 'Livro') {
      add(f.nome); if(f.versao) add(`vol ${f.versao}`); add('-'); add(f.autor);
      if(f.ano) add(`[${f.ano}]`); if(f.obs) add(`[${f.obs}]`);

    } else if (cat === 'Audiobook') {
      add(f.nome); add('-'); add(f.autor); if(f.ano) add(`[${f.ano}]`); add('[AUDIOBOOK]');

    } else if (cat === 'Revista') {
      add(`${f.nome}:`); if (f.edicao) add(f.edicao); add('-'); add(f.autor);
      if (f.ano) add(`[${f.ano}]`);

    } else if (cat === 'Curso') {
      if(f.plataforma) parts.push(`${f.plataforma}:`);
      add(f.nome); add('-'); add(f.autor); if(f.ano) add(`[${f.ano}]`);
      if(f.obs) add(`[${f.obs}]`);
    }

    return parts.join(' ').replace(/:\s/g, ': ');
  };

  const uploadTitle = buildName();
  // Arquivos e Pastas usam nomes com ponto no Tracker.
  let fileName = uploadTitle.replace(/ /g, '.').replace(/\.\./g, '.');
  
  // Se for um arquivo físico e não uma pasta, precisamos manter a extensão de vídeo (ex: .mkv)
  if (path) {
    const originalName = path.split(/[/\\]/).pop() || '';
    const lastDot = originalName.lastIndexOf('.');
    if (lastDot > 0) {
      const ext = originalName.substring(lastDot).toLowerCase();
      if (['.mkv', '.mp4', '.avi', '.ts', '.m2ts', '.iso', '.vob'].includes(ext)) {
        fileName += originalName.substring(lastDot);
      }
    }
  }

  const warnings = useMemo(() => {
    let w = [];
    if (!f.nome) w.push("Falta o Nome (Título).");
    if (['Filme / Doc (WEB/Encode)', 'Remux', 'Full Disc'].includes(cat)) {
      if (!f.ano) w.push("Falta o Ano.");
      if (!f.res) w.push("Falta a Resolução (ex: 1080p, 2160p).");
      if (!f.source) w.push("Falta o Source (ex: WEB-DL, BluRay).");
      if (!f.group) w.push("Falta a Tag do Grupo (ex: CBR, NoGroup, HANDJOB).");
      if (cat === 'Remux' && !f.audio.includes('DUAL') && !f.audio.includes('MULTI')) {
        w.push("ATENÇÃO: Somente será aceito release REMUX com dublagem (DUAL/MULTI).");
      }
    }
    if (['Série Completa', 'Série Episódio'].includes(cat)) {
      if (!f.s) w.push("Falta a Temporada (S0#).");
      if (cat === 'Série Episódio' && !f.e) w.push("Falta o Episódio (E0#).");
    }
    if (cat === 'Livro' || cat === 'Audiobook' || cat === 'Curso') {
      if (!f.autor) w.push("Falta o Autor/Professor/Editora.");
    }
    return w;
  }, [f, cat]);

  const [epPreviews, setEpPreviews] = useState<string[]>([]);
  
  useEffect(() => {
    if (path && fileName) {
      PreviewEpisodes(path, fileName).then(res => setEpPreviews(res || [])).catch(console.error);
    } else {
      setEpPreviews([]);
    }
  }, [path, fileName]);

  const doRename = () => {
    if (!path) { alert("Selecione um arquivo/pasta!"); return; }
    
    if (warnings.length > 0) {
      if (!showWarnings) {
        setShowWarnings(true);
        return; // Pause execution to show warnings
      }
    }

    RenameFile(path, fileName).then(() => {
      alert(`Renomeado com sucesso para:\n${fileName}`);
      setPath(''); // Reset
      setF({
        nome: '', ano: '', s: '', e: '',
        res: '', streaming: '', source: '',
        vcodec: '', acodec: '', audio: '', group: '',
        regiao: '', hdr: '', versao: '', autor: '', edicao: '', idioma: '',
        plataforma: '', obs: ''
      });
      setShowWarnings(false);
    }).catch(e => {
      alert("Erro ao renomear: " + e);
    });
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-10">
      
      {/* Alvo */}
      <div className="card">
        <h3 className="text-gold border border-gold rounded px-2 py-0.5 text-xs font-bold uppercase mb-3 w-max">Pasta / Arquivo para Renomear</h3>
        <div className="flex gap-2">
          <input className="input flex-1" value={path} readOnly placeholder="Selecione o arquivo ou pasta..." />
          <button className="btn-gold" onClick={() => SelectFolder().then(p => { if(p) handleApplyMediaInfo(p) })}>Pasta</button>
          <button className="btn-gold" onClick={() => SelectFile().then(p => { if(p) handleApplyMediaInfo(p) })}>Arquivo</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card col-span-3">
          <h3 className="text-gold border border-gold rounded px-2 py-0.5 text-xs font-bold uppercase mb-3 w-max">Construção do Padrão</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="col-span-1">
              <span className="label">Categoria/Regra</span>
              <select className="input w-full" value={cat} onChange={e => setCat(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <span className="label">Nome da Obra</span>
              <input className="input w-full" value={f.nome} onChange={e => handleChange('nome', e.target.value)} placeholder="Ex: Spider-Man Into the Spider-Verse" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
             {/* Dynamic Fields */}
             {['Filme / Doc (WEB/Encode)', 'Remux', 'Full Disc', 'Jogo'].includes(cat) && (
               <div><span className="label">Ano</span><input className="input w-full" value={f.ano} onChange={e=>handleChange('ano', e.target.value)} placeholder="2024" /></div>
             )}
             {['Série Completa', 'Série Episódio'].includes(cat) && (
               <div><span className="label">Temporada</span><input type="number" className="input w-full" value={f.s} onChange={e=>handleChange('s', e.target.value)} placeholder="1" /></div>
             )}
             {cat === 'Série Episódio' && (
               <div><span className="label">Episódio</span><input type="number" className="input w-full" value={f.e} onChange={e=>handleChange('e', e.target.value)} placeholder="1" /></div>
             )}
             {['Filme / Doc (WEB/Encode)', 'Remux', 'Full Disc', 'Série Completa', 'Série Episódio'].includes(cat) && (
               <>
                 <div><span className="label">Resolução</span>
                  <input className="input w-full" value={f.res} onChange={e=>handleChange('res', e.target.value)} placeholder="1080p, 2160p..." />
                  <div className="flex gap-1 mt-1 text-[10px] text-gray-500"><button onClick={()=>handleChange('res', '2160p')}>2160</button> | <button onClick={()=>handleChange('res', '1080p')}>1080</button> | <button onClick={()=>handleChange('res', '720p')}>720</button></div>
                 </div>
                 <div><span className="label">Source</span>
                  <input className="input w-full" value={f.source} onChange={e=>handleChange('source', e.target.value)} placeholder="WEB-DL, BluRay..." />
                  <div className="flex gap-1 mt-1 text-[10px] text-gray-500"><button onClick={()=>handleChange('source', 'WEB-DL')}>WEB</button> | <button onClick={()=>handleChange('source', 'BluRay')}>BLU</button> | <button onClick={()=>handleChange('source', 'HDTV')}>HDTV</button></div>
                 </div>
               </>
             )}
            
             {cat === 'Full Disc' && (
               <div><span className="label">Região</span><input className="input w-full" value={f.regiao} onChange={e=>handleChange('regiao', e.target.value)} placeholder="USA, GBR, BRA" /></div>
             )}

             {['Filme / Doc (WEB/Encode)', 'Série Completa', 'Série Episódio'].includes(cat) && (
               <div><span className="label">Streaming</span><input className="input w-full" value={f.streaming} onChange={e=>handleChange('streaming', e.target.value)} placeholder="AMZN, NF, MAX" /></div>
             )}

             {['Filme / Doc (WEB/Encode)', 'Remux', 'Full Disc', 'Série Completa', 'Série Episódio'].includes(cat) && (
               <>
                 <div><span className="label">HDR/DV</span><input className="input w-full" value={f.hdr} onChange={e=>handleChange('hdr', e.target.value)} placeholder="DV HDR" /></div>
                 <div><span className="label">V-Codec</span><input className="input w-full" value={f.vcodec} onChange={e=>handleChange('vcodec', e.target.value)} placeholder="H.264, x265, HEVC" /></div>
                 <div><span className="label">A-Codec & Channels</span><input className="input w-full" value={f.acodec} onChange={e=>handleChange('acodec', e.target.value)} placeholder="DDP5.1, TrueHD 7.1 Atmos" /></div>
               </>
             )}

             {['Jogo', 'Programa'].includes(cat) && (
               <div><span className="label">Versão/Build</span><input className="input w-full" value={f.versao} onChange={e=>handleChange('versao', e.target.value)} placeholder="v1.1.4" /></div>
             )}

             {['Livro'].includes(cat) && (
               <div><span className="label">Volume</span><input className="input w-full" value={f.versao} onChange={e=>handleChange('versao', e.target.value)} placeholder="Ex: 1" /></div>
             )}

             {['Revista'].includes(cat) && (
               <div><span className="label">Edição</span><input className="input w-full" value={f.edicao} onChange={e=>handleChange('edicao', e.target.value)} placeholder="Ex: Ed. 476" /></div>
             )}

             {['Livro', 'Audiobook', 'Revista', 'Curso'].includes(cat) && (
               <>
                 <div><span className="label">Autor / Instituição</span><input className="input w-full" value={f.autor} onChange={e=>handleChange('autor', e.target.value)} placeholder="Fulano / Abril" /></div>
                 <div><span className="label">Ano / Mês-Ano</span><input className="input w-full" value={f.ano} onChange={e=>handleChange('ano', e.target.value)} placeholder="2024 ou 06/2025" /></div>
               </>
             )}

             {['Curso'].includes(cat) && (
               <div><span className="label">Plataforma</span><input className="input w-full" value={f.plataforma} onChange={e=>handleChange('plataforma', e.target.value)} placeholder="UDEMY, DOMESTIKA" /></div>
             )}

             {/* Grupos Genéricos */}
             {['Filme / Doc (WEB/Encode)', 'Remux', 'Full Disc', 'Série Completa', 'Série Episódio'].includes(cat) && (
               <>
                 <div><span className="label">Áudio (DUAL/MULTI)</span>
                  <select className="input w-full" value={f.audio} onChange={e=>handleChange('audio', e.target.value)}>
                    <option value="">Inglês/Orig. (vazio)</option>
                    <option value="DUAL">DUAL</option>
                    <option value="MULTI">MULTI</option>
                  </select>
                 </div>
                 <div><span className="label">Grupo (Release)</span><input className="input w-full" value={f.group} onChange={e=>handleChange('group', e.target.value)} placeholder="NoGroup, CBR, FLUX" /></div>
               </>
             )}

             {['Jogo', 'Programa'].includes(cat) && (
               <>
                 <div><span className="label">Grupo Cracker</span><input className="input w-full" value={f.group} onChange={e=>handleChange('group', e.target.value)} placeholder="TENOKE, RUNE" /></div>
                 <div><span className="label">Idioma (Tag)</span><input className="input w-full" value={f.idioma} onChange={e=>handleChange('idioma', e.target.value)} placeholder="MULTI, INGLES" /></div>
               </>
             )}

             {['Jogo', 'Livro', 'Audiobook', 'Revista', 'Curso'].includes(cat) && (
               <div><span className="label">Obs Extra (Tag final)</span><input className="input w-full" value={f.obs} onChange={e=>handleChange('obs', e.target.value)} placeholder="+DLC, INGLÊS" /></div>
             )}

          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="card border-green-600/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
        
        {path && (
          <div className="mb-6">
            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">Nome Original no Computador (O que vai sumir)</h3>
            <p className="font-mono text-gray-500 bg-black/50 p-3 rounded border border-gray-800 break-all line-through opacity-70">
              {path.split(/[/\\]/).pop()}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">Novo Nome Físico (Como ficará a pasta)</h3>
          <p className="font-mono text-blue-300 bg-blue-900/10 p-3 rounded border border-blue-900/30 break-all">
            {fileName || '...'}
          </p>
        </div>

        {epPreviews.length > 0 && (
          <div className="mb-6">
            <h3 className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">Detecção Bulk: Episódios Internos a Renomear</h3>
            <div className="font-mono text-purple-300 bg-purple-900/10 p-3 rounded border border-purple-900/30 text-[11px] leading-relaxed max-h-48 overflow-y-auto space-y-1">
              {epPreviews.map((p, i) => <div key={i}>{p}</div>)}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-green-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">Título do Fórum (Preview do Post Final)</h3>
          <p className="font-mono text-green-400 bg-green-900/10 p-3 rounded border border-green-900/30 break-all">
            {uploadTitle || 'Prencha os campos acima...'}
          </p>
        </div>

        {showWarnings && warnings.length > 0 && (
          <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded p-4 animate-pulse">
             <h4 className="text-red-400 font-bold text-sm mb-2">⚠️ O seu arquivo não segue os padrões do tracker e poderá ser recusado:</h4>
             <ul className="list-disc pl-5 text-red-300 text-sm space-y-1 mb-3">
               {warnings.map((w, i) => <li key={i}>{w}</li>)}
             </ul>
             <p className="text-sm text-gold font-bold italic">Que tal arrumar?</p>
             <p className="text-xs text-red-400 mt-2">Corrija os campos acima. Caso queira forçar do jeito que está, clique no botão Renomear novamente.</p>
          </div>
        )}

        <div className="mt-5 w-full">
          <button onClick={doRename} className="btn-green uppercase tracking-widest w-full !py-3 font-black shadow-[0_0_15px_rgba(34,197,94,0.3)]">
            Validar & Renomear Fisicamente
          </button>
        </div>
      </div>

    </div>
  );
}
