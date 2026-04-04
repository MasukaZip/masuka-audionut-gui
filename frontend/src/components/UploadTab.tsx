import { useState, useEffect, useCallback } from 'react';
import { SelectFile, SelectFolder, StartUpload, StopUpload, FetchTMDBIDs, ValidateMedia, ParseMediaInfo, GetSettings, GenerateScreenshots, DeletePreviewScreenshots } from '../../wailsjs/go/main/App';
import { UploadRequest, ScreenshotResult } from '../types';
import Console from './Console';
import { EventsOn } from '../../wailsjs/runtime/runtime';

export default function UploadTab() {
  const [req, setReq] = useState<UploadRequest>({
    path: '', tracker: 'CBR', category: 'MOVIE', screens: 5, imageHost: 'imgbox',
    tmdb: '', imdb: '', mal: '', tvdb: '', res: 'AUTO', type: 'AUTO',
    debug: false, internal: false, personal: false, keepImg: false, 
    noSeed: false, skipDupe: true, cleanup: true, forceScreens: false, ffdebug: false, autoY: true,
    autoMove: false, destPath: ''
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [poster, setPoster] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [debugMsg, setDebugMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedSpecs, setParsedSpecs] = useState<any>(null);

  // Screenshot preview states
  const [screenshots, setScreenshots] = useState<ScreenshotResult[]>([]);
  const [generatingScreens, setGeneratingScreens] = useState(false);
  const [screenProgress, setScreenProgress] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [screenshotsApproved, setScreenshotsApproved] = useState(false);

  useEffect(() => {
    GetSettings().then(s => {
      setReq(prev => ({ ...prev, autoMove: s.autoMove, destPath: s.destPath }));
    });

    const offFinished = EventsOn("uploadFinished", () => {
      setRunning(false);
      setProgress(100);
      setStatus("Sucesso!");
    });
    
    const offLog = EventsOn("log", (line: string) => {
      const lower = line.toLowerCase();
      if (lower.includes("processing") || lower.includes("processando")) { setProgress(15); setStatus("Processando vídeo..."); }
      if (lower.includes("generating screenshots") || lower.includes("gerando")) { setProgress(35); setStatus("Gerando capturas de tela..."); }
      if (lower.includes("uploading screens") || lower.includes("fazendo upload de")) { setProgress(55); setStatus("Enviando imagens para o host..."); }
      if (lower.includes("creating torrent") || lower.includes("hashing")) { setProgress(75); setStatus("Criando e realizando hash do .torrent..."); }
      if (lower.includes("uploading torrent") || lower.includes("enviando para")) { setProgress(90); setStatus("Semeando no Tracker..."); }
      if (lower.includes("upload successful") || lower.includes("sucesso")) { setProgress(100); setStatus("Upload Concluído com Sucesso!"); }
      if (lower.includes("error") || lower.includes("erro ")) { setStatus("Possível Erro..."); }
    });

    const offScreenProgress = EventsOn("screenshotProgress", (msg: string) => {
      setScreenProgress(msg);
    });

    return () => {
      offFinished();
      offLog();
      offScreenProgress();
    };
  }, []);

  const handleChange = (field: keyof UploadRequest, val: any) => {
    setReq((prev) => ({ ...prev, [field]: val }));
  };

  const handlePathSet = async (p: string) => {
    if (!p) return;
    setReq((prev) => ({ ...prev, path: p }));
    setPoster('');
    setWarnings([]);
    setScreenshots([]);
    setScreenshotsApproved(false);
    setDebugMsg("Buscando metadados automaticamente e analisando mídia...");
    try {
      const isMovie = req.category === "MOVIE";
      const res = await FetchTMDBIDs(p, isMovie);
      if (res.tmdb) {
        setReq((prev) => ({ ...prev, tmdb: res.tmdb, imdb: res.imdb, tvdb: res.tvdb, category: (res.type === "TV" ? "TV" : (res.type === "MOVIE" ? "MOVIE" : prev.category)) as any }));
        if (res.poster) setPoster(res.poster);
        setDebugMsg(`Extração: ID ${res.tmdb} | TIPO ${res.type} | IMG ${res.poster ? 'OK' : 'VAZIO'}`);
      } else {
        setDebugMsg("Preenchimento Automático falhou/não encontrou.");
      }

      const warns = await ValidateMedia(p);
      if (warns && warns.length > 0) {
        setWarnings(warns);
      }
      
      const specs = await ParseMediaInfo(p);
      if (specs && specs.res) {
        setParsedSpecs(specs);
        if (specs.suggested_cat && specs.suggested_cat !== req.category) {
          setReq((prev) => ({ ...prev, category: specs.suggested_cat as any }));
          setDebugMsg((msg) => msg + ` | Categoria Autodetectada: ${specs.suggested_cat}`);
        }
      } else {
        setParsedSpecs(null);
      }

    } catch (e) {
      console.error(e);
      setDebugMsg("Erro de extração Go.");
      setParsedSpecs(null);
    }
  };

  const handleGenerateScreenshots = useCallback(async () => {
    if (!req.path) { alert("Selecione um arquivo/pasta primeiro!"); return; }
    setGeneratingScreens(true);
    setScreenshots([]);
    setScreenshotsApproved(false);
    try {
      const results = await GenerateScreenshots(req.path, req.screens);
      setScreenshots(results || []);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar screenshots: " + e);
    }
    setGeneratingScreens(false);
  }, [req.path, req.screens]);

  const handleRegenerateScreenshots = useCallback(async () => {
    if (!req.path) return;
    await DeletePreviewScreenshots(req.path);
    handleGenerateScreenshots();
  }, [req.path, handleGenerateScreenshots]);

  const handleApproveScreenshots = () => {
    setScreenshotsApproved(true);
  };

  const handleStart = () => {
    if (!req.path) { alert("Selecione um arquivo/pasta!"); return; }
    setRunning(true);
    StartUpload(req).catch(err => {
      alert("Erro ao iniciar: " + err);
      setRunning(false);
    });
  };

  const handleStop = () => { StopUpload(); };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0] as any;
      if (file.path) {
        handlePathSet(file.path);
      }
    }
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex(Math.max(0, lightboxIndex - 1));
      if (e.key === 'ArrowRight') setLightboxIndex(Math.min(screenshots.length - 1, lightboxIndex + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, screenshots.length]);

  return (
    <div 
      className="p-6 space-y-6 max-w-5xl mx-auto pb-10 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#ffcc00]/10 border-4 border-dashed border-[#ffcc00] rounded-xl backdrop-blur-[2px] pointer-events-none transition-all">
          <span className="text-4xl font-black text-[#ffcc00] drop-shadow-[0_0_10px_rgba(255,204,0,0.8)] tracking-widest uppercase">Solte a pasta AQUI! 📂</span>
        </div>
      )}
      
      <div className="flex-1 space-y-6">
        {/* Target File */}
        <fieldset className="primate-fieldset m-0">
          <legend className="primate-legend">Pasta / Arquivo a Postar</legend>
          <div className="flex gap-2">
            <input className="input flex-1 border-gray-800" value={req.path} readOnly placeholder="Selecione o arquivo..." />
            <button className="btn-gold" onClick={() => SelectFolder().then(p => { if (p) handlePathSet(p); })}>Escolher Pasta</button>
            <button className="btn-gold" onClick={() => SelectFile().then(p => { if (p) handlePathSet(p); })}>Escolher Arquivo</button>
          </div>
          {debugMsg && <div className="mt-2 text-[10px] text-green-400 font-bold uppercase tracking-wider">{debugMsg}</div>}
        </fieldset>

        {parsedSpecs?.banned_group && (
          <div className="bg-red-950/60 border-2 border-red-600 rounded p-4 mt-4 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
            <h3 className="text-red-400 font-black text-base mb-1 flex items-center gap-2">GRUPO BANIDO — ENVIO BLOQUEADO</h3>
            <p className="text-red-300 text-sm">O grupo <span className="font-black text-red-400">{parsedSpecs.banned_group}</span> está na lista de grupos banidos do tracker por baixa qualidade ou práticas desonestas. Este release não pode ser enviado.</p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-red-900/30 border-l-4 border-red-500 rounded-r p-4 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)] mt-4">
            <h3 className="text-red-400 font-bold mb-1 flex items-center gap-2">⚠️ Validador FFprobe: Possível Problema Detectado</h3>
            <ul className="list-disc pl-5 text-red-300 text-sm space-y-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* ========== SCREENSHOT PREVIEW SECTION ========== */}
      {req.path && (
        <fieldset className="primate-fieldset !border-[#ffcc00]/40 shadow-[0_0_20px_rgba(255,204,0,0.08)]">
          <legend className="primate-legend !border-[#ffcc00] !text-[#ffcc00]">Pré-Visualização de Screenshots</legend>
          
          {/* Generate button - shown when no screenshots yet */}
          {screenshots.length === 0 && !generatingScreens && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-gray-500 text-sm text-center">
                Gere uma pré-visualização das screenshots antes do upload para verificar a qualidade.
              </p>
              <button 
                onClick={handleGenerateScreenshots} 
                className="btn-gold px-8 py-3 text-sm uppercase tracking-wider"
                disabled={running}
              >
                Gerar {req.screens} Screenshots para Pré-visualização
              </button>
            </div>
          )}

          {/* Loading state */}
          {generatingScreens && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-[#ffcc00]/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#ffcc00] animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-[#ffcc00] font-bold text-sm animate-pulse">{screenProgress || 'Preparando FFmpeg...'}</p>
                <p className="text-gray-600 text-xs mt-1">Isso pode levar alguns segundos</p>
              </div>
            </div>
          )}

          {/* Screenshot Gallery */}
          {screenshots.length > 0 && !generatingScreens && (
            <>
              <div className="ss-gallery">
                {screenshots.map((ss, i) => (
                  <div 
                    key={i} 
                    className="ss-gallery-item"
                    onClick={() => setLightboxIndex(i)}
                  >
                    <img src={ss.base64} alt={`Screenshot ${i + 1}`} />
                    <div className="ss-gallery-label">
                      <span className="ss-gallery-number">{i + 1}</span>
                      <span className="ss-gallery-text">Screenshot {i + 1}</span>
                    </div>
                    <div className="ss-gallery-zoom">Clique para ampliar</div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5 justify-center">
                <button 
                  onClick={handleRegenerateScreenshots} 
                  className="btn-gold !bg-transparent text-[#ffcc00] !border-[#ffcc00]/50 hover:!bg-[#ffcc00]/10 px-6 text-xs uppercase tracking-wider"
                  disabled={running}
                >
                  Gerar Novas Screenshots
                </button>
                {!screenshotsApproved ? (
                  <button 
                    onClick={handleApproveScreenshots} 
                    className="btn-gold px-8 text-xs uppercase tracking-wider"
                  >
                    Aprovar Screenshots
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-6 py-2 bg-[#ffcc00]/20 border border-[#ffcc00]/50 rounded-md">
                    <span className="text-[#ffcc00] text-xs font-bold uppercase tracking-wider">Screenshots Aprovadas</span>
                  </div>
                )}
              </div>
            </>
          )}
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Settings */}
        <fieldset className="primate-fieldset">
          <legend className="primate-legend">Configurações Base</legend>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="label">Tracker</span>
              <select className="input w-full" value={req.tracker} onChange={e => handleChange('tracker', e.target.value)}>
                <option value="CBR">CBR</option>
              </select>
            </div>
            <div><span className="label">Categoria</span>
              <select className="input w-full" value={req.category} onChange={e => handleChange('category', e.target.value)}>
                {['MOVIE','TV','ANIME'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><span className="label">Hospedagem Img</span>
              <select className="input w-full" value={req.imageHost} onChange={e => handleChange('imageHost', e.target.value)}>
                {['imgbox','pixhost','lensdump','ptpimg','imgbb','ptscreens'].map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div><span className="label">Screenshots</span>
              <input type="number" min={1} max={20} className="input w-full" value={req.screens} onChange={e => handleChange('screens', parseInt(e.target.value)||5)} />
            </div>
          </div>
        </fieldset>

        {/* Media IDs */}
        <fieldset className="primate-fieldset">
          <legend className="primate-legend">IDs Externos (Metadados)</legend>
          <div className="flex gap-4 items-center w-full">
            {poster && (
              <div className="w-[92px] h-[136px] flex items-center justify-center shrink-0 rounded border border-gray-700/50 shadow-[0_0_15px_rgba(255,204,0,0.06)] overflow-hidden bg-black/50">
                <img src={poster} alt="Poster TMDB" className="w-full h-full object-cover block" />
              </div>
            )}
            <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-max w-full">
              {(['tmdb', 'imdb', 'mal', 'tvdb'] as const).map(id => (
                <div key={id}>
                  <span className="label uppercase">{id} ID</span>
                  <input 
                    className="input w-full" 
                    placeholder="opcional" 
                    value={req[id as keyof UploadRequest] as string} 
                    onChange={e => handleChange(id as keyof UploadRequest, e.target.value)} 
                  />
                </div>
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      <div className="grid grid-cols-2 gap-6 items-stretch mb-4">
        {/* Quality */}
        <fieldset className="primate-fieldset flex gap-4">
          <legend className="primate-legend">Qualidade e Formato</legend>
          <div className="flex-1"><span className="label">Resolução</span>
            <select className="input w-full" value={req.res} onChange={e=>handleChange('res',e.target.value)}>
              {['AUTO','2160p','1080p','720p'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex-1"><span className="label">Tipo Release</span>
            <select className="input w-full" value={req.type} onChange={e=>handleChange('type',e.target.value)}>
              {['AUTO','REMUX','ENCODE','WEB-DL'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </fieldset>

        <fieldset className="primate-fieldset border-[#ffcc00]/50 shadow-[0_0_20px_rgba(255,204,0,0.1)] flex flex-col justify-center gap-4 h-full">
          <legend className="primate-legend !border-[#ffcc00] !text-[#ffcc00] font-black tracking-widest">Ação de Execução</legend>
          <div className="flex gap-2 w-full h-full items-stretch">
            <button className="btn-gold uppercase tracking-widest flex-1 px-2 font-black shadow-[0_0_15px_rgba(255,204,0,0.3)]" onClick={handleStart} disabled={running || !!parsedSpecs?.banned_group}>
              {running ? "Enviando..." : parsedSpecs?.banned_group ? "GRUPO BANIDO" : "Iniciar Upload"}
            </button>
            <button className="btn-gold uppercase px-4 text-xs !bg-transparent text-gray-500 border-red-900/50 hover:bg-red-900/30 hover:text-red-400" onClick={handleStop} disabled={!running}>
              Parar
            </button>
          </div>
        </fieldset>
      </div>

      {/* Progresso UI */}
      {(running || progress > 0) && (
        <fieldset className="primate-fieldset !p-3 mt-8 border-gold/50 shadow-[0_0_15px_rgba(255,204,0,0.1)]">
           <div className="flex justify-between items-end mb-2">
             <span className="text-xs text-gold uppercase tracking-wider font-bold animate-pulse">{status || 'Aguardando inicialização...'}</span>
             <span className="text-[10px] text-gray-500 font-bold">{progress}% concluído</span>
           </div>
           
           <div className="w-full bg-[#111] rounded-full h-2.5 border border-[#333]">
             <div 
               className="bg-[#ffcc00] h-full rounded-full transition-all duration-[800ms] shadow-[0_0_10px_rgba(255,204,0,0.8)]" 
               style={{ width: `${progress}%` }}
             ></div>
           </div>
        </fieldset>
      )}

      {/* Flags */}
      <fieldset className="primate-fieldset pb-6">
        <legend className="primate-legend">Opções Adicionais</legend>
        <div className="grid grid-cols-3 gap-y-4 gap-x-2 mt-2">
          {[
            { key: 'debug', label: 'Modo Debug', desc: 'Salva logs detalhados para encontrar erros durante o processo (-d).' },
            { key: 'internal', label: 'Internal', desc: 'Preenche a tag Internal (lançamento exclusivo do grupo interno do tracker).' },
            { key: 'personal', label: 'Release Pessoal', desc: 'Adiciona a flag Personal Release (lançamento próprio seu).' },
            { key: 'keepImg', label: 'Manter Imagens', desc: 'Não deleta os arquivos de imagens/screens gerados no disco após fazer o upload pra host.' },
            { key: 'noSeed', label: 'No Seed', desc: 'Somente cria o torrent e envia pro tracker, mas não alimenta as infos pro seu cliente qBittorrent semear.' },
            { key: 'forceScreens', label: 'Forçar Novas Screens', desc: 'Apaga capturas antigas e força o FFmpeg a tirar prints fresquinhos do vídeo.' },
            { key: 'skipDupe', label: 'Ignorar Dupe / Forçar', desc: 'Força o sistema a continuar enviando mesmo que o Tracker informe que esse arquivo já é uma duplicata.' },
            { key: 'cleanup', label: 'Limpar Temporários', desc: 'Executa a limpeza rotineira (-c) apagando os arquivos inúteis que sobram no fim.' },
            { key: 'ffdebug', label: 'FFmpeg Debug', desc: 'Habilita o Output completo do FFmpeg na sua tela de log, ideal caso imagens não estejam sendo criadas.' },
            { key: 'autoMove', label: 'Auto-Move qBit', desc: 'Após o upload, move os arquivos no qBittorrent para a pasta de destino configurada.' }
          ].map(opt => (
            <div key={opt.key} className="relative flex items-center gap-2 group/tt w-max">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400">
                <input type="checkbox" className="accent-gold w-4 h-4 cursor-pointer"
                  checked={req[opt.key as keyof UploadRequest] as boolean}
                  onChange={e => handleChange(opt.key as keyof UploadRequest, e.target.checked)} />
                <span className="hover:text-white transition-colors">{opt.label}</span>
              </label>
              
              <span className="text-gray-500 hover:text-blue-400 cursor-help text-[10px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full border border-gray-700 hover:border-blue-400 transition-all shadow-sm">?</span>
              <div className="absolute top-6 left-0 w-60 p-2.5 bg-gray-900 border border-t-2 border-t-blue-500 border-gray-700 text-[11px] text-blue-100 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/tt:opacity-100 group-hover/tt:visible transition-all z-50 pointer-events-none">
                {opt.desc}
              </div>
            </div>
          ))}

          {req.autoMove && (
            <div className="col-span-3 flex gap-2 items-center animate-in slide-in-from-top-1">
              <span className="label !mb-0 shrink-0">Destino:</span>
              <input className="input flex-1 !py-1 !text-[11px] border-gold/30" value={req.destPath} onChange={e => handleChange('destPath', e.target.value)} placeholder="Caminho final..." />
              <button className="btn-gold !py-1 !px-3 text-[10px]" onClick={() => SelectFolder().then(p => { if (p) handleChange('destPath', p); })}>Mudar</button>
            </div>
          )}

          <div className="relative flex items-center gap-2 group/tt mt-1 col-span-3 w-max">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gold font-bold">
              <input type="checkbox" className="accent-gold w-4 h-4 cursor-pointer"
                checked={req.autoY} onChange={e => handleChange('autoY', e.target.checked)} />
              <span>Auto-confirmar (y/c/a) em tudo</span>
            </label>
            <span className="text-gold/50 hover:text-gold cursor-help text-[10px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full border border-gold/30 hover:border-gold transition-all">?</span>
            
            <div className="absolute top-6 left-0 w-72 p-2.5 bg-gray-900 border border-t-2 border-t-gold border-gray-700 text-[11px] text-gold/90 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/tt:opacity-100 group-hover/tt:visible transition-all z-50 pointer-events-none">
              Responde automaticamente com <b className="text-white">Yes, Continue, All</b> nos avisos do terminal. Impede que o script trave esperando sua resposta em duplos templates.
            </div>
          </div>
        </div>
      </fieldset>

      {/* Console log box moved to a fieldset */}
      <fieldset className="primate-fieldset pb-0">
        <legend className="primate-legend border-gray-600 text-gray-400">Terminal Output (Logs)</legend>
        <Console />
      </fieldset>

      {/* ========== LIGHTBOX MODAL ========== */}
      {lightboxIndex !== null && screenshots[lightboxIndex] && (
        <div 
          className="ss-lightbox-overlay" 
          onClick={() => setLightboxIndex(null)}
        >
          <div className="ss-lightbox-content" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button 
              className="ss-lightbox-close" 
              onClick={() => setLightboxIndex(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            {/* Image */}
            <img 
              src={screenshots[lightboxIndex].base64} 
              alt={`Screenshot ${lightboxIndex + 1}`} 
              className="ss-lightbox-img"
            />

            {/* Navigation */}
            <div className="ss-lightbox-nav">
              <button 
                onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
                disabled={lightboxIndex === 0}
                className="ss-lightbox-nav-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <span className="text-white text-sm font-bold tracking-wider">
                {lightboxIndex + 1} / {screenshots.length}
              </span>
              <button 
                onClick={() => setLightboxIndex(Math.min(screenshots.length - 1, lightboxIndex + 1))}
                disabled={lightboxIndex === screenshots.length - 1}
                className="ss-lightbox-nav-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
