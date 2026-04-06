import { useState, useEffect } from "react";
import { GetSettings, SaveSettings, SelectFolder, UpdateEngine, UpdatePrimate, GetPythonConfig, SavePythonConfig, CheckRequirements, BackupData } from "../../wailsjs/go/main/App";

export default function SettingsTab() {
  const [settings, setSettings] = useState<any>({
    uaPath: "",
    destPath: "",
    qbitHost: "",
    qbitUser: "",
    qbitPass: "",
    autoMove: false,
    primatePath: ""
  });
  const [status, setStatus] = useState("");
  const [gitLog, setGitLog] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [primateLog, setPrimateLog] = useState("");
  const [isUpdatingPrimate, setIsUpdatingPrimate] = useState(false);
  const [configContent, setConfigContent] = useState("");
  const [configStatus, setConfigStatus] = useState("");
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");

  useEffect(() => {
    GetSettings().then((s) => {
      setSettings(s);
      loadConfig(s.uaPath);
    }).catch(console.error);
  }, []);

  const loadConfig = async (path: string) => {
    if(!path) return;
    try {
      const content = await GetPythonConfig();
      setConfigContent(content);
    } catch(e) {
      console.error("Não foi possível carregar config.py");
    }
  };

  const handleSave = async (newSettings: any) => {
    setStatus("Salvando...");
    try {
      await SaveSettings(newSettings);
      setSettings(newSettings);
      setStatus("Configurações salvas com sucesso!");
      setTimeout(() => setStatus(""), 3000);
      if (newSettings.uaPath !== settings.uaPath) {
        loadConfig(newSettings.uaPath);
      }
    } catch (e) {
      console.error(e);
      setStatus("Erro ao salvar as configurações.");
    }
  };

  const handleSelectUA = () => {
    SelectFolder().then((p) => {
      if (p) handleSave({ ...settings, uaPath: p });
    }).catch(console.error);
  };

  const handleSelectDest = () => {
    SelectFolder().then((p) => {
      if (p) setSettings({ ...settings, destPath: p });
    }).catch(console.error);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setGitLog("Conectando ao GitHub (aguarde)...");
    try {
      const res = await UpdateEngine();
      setGitLog(res.trim());
    } catch(e: any) {
      setGitLog(`Erro fatal: ${e}`);
    }
    setIsUpdating(false);
  };

  const handleUpdatePrimate = async () => {
    setIsUpdatingPrimate(true);
    setPrimateLog("Conectando ao GitLab (aguarde)...");
    try {
      const res = await UpdatePrimate();
      setPrimateLog(res.trim());
    } catch(e: any) {
      setPrimateLog(`Erro fatal: ${e}`);
    }
    setIsUpdatingPrimate(false);
  };

  const handleSaveConfig = async () => {
    setConfigStatus("Salvando...");
    try {
      await SavePythonConfig(configContent);
      setConfigStatus("Configuração salva com sucesso! ☑️");
      setTimeout(() => setConfigStatus(""), 3000);
    } catch(e) {
      setConfigStatus("Erro ao salvar config.py");
    }
  };

  const doCheckHealth = async () => {
    setChecking(true);
    setHealth(null);
    try {
      const res = await CheckRequirements();
      setHealth(res);
    } catch(e) {
      console.error(e);
    }
    setChecking(false);
  };

  const handleBackup = async () => {
    setBackupStatus("Realizando backup...");
    try {
      const path = await BackupData();
      setBackupStatus(`Backup salvo em: ${path} ✅`);
      setTimeout(() => setBackupStatus(""), 5000);
    } catch(e: any) {
      setBackupStatus(`Erro no backup: ${e}`);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-gray-300 pb-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-gold drop-shadow-md">UPLOAD ASSISTANT</h1>
        <h2 className="text-xl font-bold text-gray-400">Preferências do Sistema</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="card border border-yellow-900/40 bg-yellow-900/10 shadow-[0_0_15px_rgba(255,204,0,0.1)]">
          <h3 className="text-lg font-bold text-gold mb-2 flex items-center gap-2">Configuração Principal</h3>
          <p className="text-sm mb-4 text-gray-400">
            Aponte a pasta base onde o <strong>Upload-Assistant (Python)</strong> está instalado.
          </p>
          <div className="flex gap-2 items-center mb-4">
            <input className="input flex-1 border-gray-700 bg-black/50 text-gold font-mono text-sm" value={settings.uaPath} readOnly placeholder="Ex: C:\Upload-Assistant" />
            <button className="btn-gold whitespace-nowrap" onClick={handleSelectUA}>Mudar Pasta</button>
          </div>
          
          <h3 className="text-sm font-bold text-gold mb-2">Caminho de Destino (Auto-Move)</h3>
          <p className="text-[10px] text-gray-400 mb-2 italic">
            Define para onde os arquivos serão movidos após o upload ser concluído com sucesso. O qBittorrent será notificado para alterar o local e continuar semeando de lá.
          </p>
          <div className="flex gap-2 items-center mb-4">
            <input className="input flex-1 border-gray-700 bg-black/50 text-gold font-mono text-sm" value={settings.destPath} readOnly placeholder="Pasta final após upload" />
            <button className="btn-gold whitespace-nowrap !bg-gray-700 !text-white !border-gray-600" onClick={handleSelectDest}>Selecionar</button>
          </div>

          <h3 className="text-sm font-bold text-gold mb-2 mt-4">PR1MATE PDF</h3>
          <p className="text-[10px] text-gray-400 mb-2 italic">
            Pasta onde o script <strong>pr1matepdf.py</strong> está instalado.
          </p>
          <div className="flex gap-2 items-center mb-4">
            <input className="input flex-1 border-gray-700 bg-black/50 text-gold font-mono text-sm" value={settings.primatePath} readOnly placeholder="Ex: C:\PRIMATE" />
            <button className="btn-gold whitespace-nowrap !bg-gray-700 !text-white !border-gray-600" onClick={() => SelectFolder().then(p => { if (p) setSettings({...settings, primatePath: p}); })}>Selecionar</button>
          </div>

          <button className="btn-gold w-full mt-2" onClick={() => handleSave(settings)}>Salvar Todas Configs</button>
          {status && <div className="text-sm mt-3 text-green-400 font-bold animate-pulse text-center">{status}</div>}
        </div>

        <div className="card border border-blue-900/40 bg-blue-900/10 shadow-[0_0_15px_rgba(30,58,138,0.2)]">
          <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">qBittorrent API</h3>
          <p className="text-xs mb-4 text-gray-400">Dados para automação de movimentação e notificação de local.</p>
          <div className="space-y-3">
            <input className="input w-full !text-xs" placeholder="Host (ex: http://localhost:8080)" value={settings.qbitHost} onChange={e => setSettings({...settings, qbitHost: e.target.value})} />
            <div className="flex gap-2">
              <input className="input flex-1 !text-xs" placeholder="Usuário" value={settings.qbitUser} onChange={e => setSettings({...settings, qbitUser: e.target.value})} />
              <input className="input flex-1 !text-xs" type="password" placeholder="Senha" value={settings.qbitPass} onChange={e => setSettings({...settings, qbitPass: e.target.value})} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" className="accent-gold" checked={settings.autoMove} onChange={e => setSettings({...settings, autoMove: e.target.checked})} id="autoMove" />
              <label htmlFor="autoMove" className="text-xs text-gray-300 cursor-pointer">Ativar Auto-Move por padrão</label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Editor de Config */}
        <div className="col-span-2 card bg-gray-900/50 border-gray-800 p-0 overflow-hidden flex flex-col h-[500px] relative">
          <div className="bg-gray-900/80 p-4 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="text-gold font-bold uppercase tracking-wider text-xs">Editor do config.py</h3>
              <p className="text-[10px] text-gray-500">Edite as APIs e diretórios diretamente.</p>
            </div>
            <button className="btn-gold !py-1 !px-3 text-xs" onClick={handleSaveConfig}>Salvar Config</button>
          </div>
          <textarea 
            className="flex-1 w-full bg-black/80 text-gray-300 font-mono text-[11px] p-4 resize-none outline-none focus:ring-1 focus:ring-gold/50"
            value={configContent}
            onChange={(e) => setConfigContent(e.target.value)}
            spellCheck="false"
          ></textarea>
           {configStatus && <div className="absolute bottom-4 right-4 bg-green-900/90 text-green-400 text-xs px-3 py-1 rounded shadow-lg">{configStatus}</div>}
        </div>

        {/* Tools & Health */}
        <div className="col-span-1 space-y-6">
          <div className="card border border-purple-900/40 bg-purple-900/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <h3 className="text-lg font-bold text-purple-400 mb-2">Check Health</h3>
            <p className="text-[10px] text-gray-400 mb-4 italic">
              Verifica se as ferramentas externas necessárias (Python, FFmpeg, Git) estão instaladas corretamente e configuradas nas variáveis de ambiente do seu Windows. Sem elas, o script não funciona.
            </p>
            <button className="btn-gold w-full !bg-purple-600 !text-white !border-purple-500 hover:!bg-purple-500 mb-6" onClick={doCheckHealth} disabled={checking}>
              {checking ? 'Verificando...' : 'Verificar Dependências'}
            </button>
            {health && (
              <div className="space-y-3">
                {Object.entries(health).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between items-center p-2 bg-black/40 rounded border border-gray-800">
                      <span className="text-sm font-bold text-gray-300 capitalize">{k}</span>
                      {v === 'OK' ? <span className="text-green-500 font-bold">OK</span> : <span className="text-red-500 font-bold">ERRO</span>}
                    </div>
                    {k === 'git' && v !== 'OK' && (
                      <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-[10px] text-blue-300">
                        <p className="font-bold mb-1">Não tem o Git instalado?</p>
                        <p>Para usar o Auto-Update, baixe o Git em: <a href="https://git-scm.com/download/win" target="_blank" className="underline text-white">git-scm.com</a></p>
                        <p className="mt-1 opacity-70">Após instalar, reinicie este aplicativo.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card border border-green-900/40 bg-green-900/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <h3 className="text-lg font-bold text-green-400 mb-2">Manutenção</h3>
            <p className="text-[10px] text-gray-400 mb-4 italic">
              Cria uma cópia de segurança instantânea do seu banco de dados de estatísticas e do arquivo de configurações. Use isso antes de formatar o PC ou fazer grandes mudanças.
            </p>
            <button className="btn-gold w-full !bg-green-700 !text-white !border-green-600 hover:!bg-green-600" onClick={handleBackup}>
               Fazer Backup das Configs
            </button>
            {backupStatus && <p className="text-[10px] mt-2 text-center text-green-300">{backupStatus}</p>}
          </div>

          <div className="card border border-blue-900/40 bg-blue-900/10 shadow-[0_0_15px_rgba(30,58,138,0.2)]">
            <h3 className="text-lg font-bold text-blue-400 mb-2">Atualização</h3>
            <p className="text-[10px] text-gray-400 mb-4 italic">
              O comando 'Git Pull' sincroniza seu motor Python com as últimas correções do repositório oficial. Isso não altera seu config.py, apenas as regras de upload e trackers.
            </p>
            <button className="btn-gold w-full !bg-blue-600 !text-white !border-blue-500 hover:!bg-blue-500" onClick={handleUpdate} disabled={isUpdating}>
               {isUpdating ? 'Baixando...' : 'Git Pull (Upload-Assistant)'}
            </button>
            {gitLog && <pre className="mt-4 p-2 bg-black/50 border border-gray-800 rounded text-[9px] text-gray-400 whitespace-pre-wrap max-h-24 overflow-y-auto">{gitLog}</pre>}

            <div className="border-t border-blue-900/40 mt-4 pt-4">
              <p className="text-[10px] text-gray-400 mb-3 italic">
                Sincroniza o script PR1MATE PDF com as últimas atualizações do repositório.
              </p>
              <button className="btn-gold w-full !bg-blue-800 !text-white !border-blue-700 hover:!bg-blue-700" onClick={handleUpdatePrimate} disabled={isUpdatingPrimate}>
                {isUpdatingPrimate ? 'Baixando...' : 'Git Pull (PR1MATE PDF)'}
              </button>
              {primateLog && <pre className="mt-4 p-2 bg-black/50 border border-gray-800 rounded text-[9px] text-gray-400 whitespace-pre-wrap max-h-24 overflow-y-auto">{primateLog}</pre>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
