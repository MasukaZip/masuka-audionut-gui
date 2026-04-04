import { useState, useEffect } from 'react';
import { GetDashboardData, GetRecentUploads } from '../../wailsjs/go/main/App';

export default function DashboardTab() {
  const [stats, setStats] = useState<any>({ TotalUploads: 0, TotalSizeGB: '0.00 GB', SuccessRate: '0%' });
  const [trackers, setTrackers] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await GetDashboardData();
      if (data) {
        setStats(data.stats || { TotalUploads: 0, TotalSizeGB: '0.00 GB', SuccessRate: '0%' });
        setTrackers(data.trackers || []);
      }
      const recentsList = await GetRecentUploads(10);
      setRecent(recentsList || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-gray-300">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-gold drop-shadow-md uppercase tracking-widest">Dashboard</h1>
          <h2 className="text-sm font-bold text-gray-500 tracking-wider">Métricas e Histórico de Upload</h2>
        </div>
        <button className="btn-gold !py-2 text-xs" onClick={fetchStats} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card bg-gray-900/40 border-gray-800 flex flex-col justify-center text-center py-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
          <span className="text-gray-500 text-sm font-black uppercase tracking-widest mb-2 z-10">Total Uploads</span>
          <span className="text-5xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)] z-10">{stats.totalUploads || 0}</span>
        </div>
        <div className="card bg-gray-900/40 border-gray-800 flex flex-col justify-center text-center py-8 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gold/5 group-hover:bg-gold/10 transition-colors"></div>
          <span className="text-gray-500 text-sm font-black uppercase tracking-widest mb-2 z-10">Total Volume</span>
          <span className="text-5xl font-black text-gold drop-shadow-[0_0_10px_rgba(255,204,0,0.5)] z-10">{stats.totalSizeGB || '0 GB'}</span>
        </div>
        <div className="card bg-gray-900/40 border-gray-800 flex flex-col justify-center text-center py-8 relative overflow-hidden group">
           <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
          <span className="text-gray-500 text-sm font-black uppercase tracking-widest mb-2 z-10">Sucesso</span>
          <span className="text-5xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)] z-10">{stats.successRate || '0%'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Tracker Breakdown */}
        <div className="col-span-1 card bg-black/30 border-gray-800 p-0 overflow-hidden">
          <div className="bg-gray-900/80 p-4 border-b border-gray-800">
            <h3 className="text-gold font-bold uppercase tracking-wider text-xs">Uso por Tracker</h3>
          </div>
          <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
            {trackers.length === 0 ? (
               <p className="text-xs text-gray-500 text-center py-4">Nenhum dado.</p>
            ) : trackers.map((t, i) => {
              const perc = stats.totalUploads > 0 ? (t.count / stats.totalUploads) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-gray-300">{t.tracker}</span>
                    <span className="text-gray-500">{t.count} ({perc.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className="bg-gold h-1.5 rounded-full" style={{ width: `${perc}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historico */}
        <div className="col-span-2 card bg-black/30 border-gray-800 p-0 overflow-hidden">
          <div className="bg-gray-900/80 p-4 border-b border-gray-800">
             <h3 className="text-gold font-bold uppercase tracking-wider text-xs">Últimos Envios</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Tracker</th>
                  <th className="px-4 py-3">Tamanho</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-600 italic">Nenhum upload registrado.</td></tr>
                ) : recent.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-300 max-w-[200px] truncate" title={r.nome}>{r.nome}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-gray-300">{r.tracker}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{(r.tamanho / (1024*1024*1024)).toFixed(2)} GB</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'Sucesso' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                        r.status === 'Falha' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                        'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}