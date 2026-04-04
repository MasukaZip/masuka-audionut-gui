import { useState } from 'react';
import UploadTab from './components/UploadTab';
import RenameTab from './components/RenameTab';
import AboutTab from './components/AboutTab';
import SettingsTab from './components/SettingsTab';
import DashboardTab from './components/DashboardTab';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="min-h-screen bg-[#151515] text-gray-300 flex flex-col font-sans">
      
      {/* Centered Header / Navigation */}
      <header className="pt-10 pb-6 text-center">
        <h1 className="text-4xl font-extrabold text-[#ffcc00] tracking-widest drop-shadow-[0_2px_10px_rgba(255,204,0,0.15)] uppercase">
          UPLOAD ASSISTANT
        </h1>
        <p className="text-xs text-gray-500 mt-2 font-mono tracking-wider">
          Feito por <span className="text-[#ffcc00] font-bold">Masuka</span>
        </p>

        <nav className="flex justify-center gap-4 mt-8">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'upload' ? 'bg-[#ffcc00] text-black shadow-[0_0_10px_rgba(255,204,0,0.3)]' : 'border border-gray-700 text-gray-400 hover:border-[#ffcc00] hover:text-[#ffcc00]'}`}
          >
            Upload
          </button>
          <button 
            onClick={() => setActiveTab('rename')}
            className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'rename' ? 'bg-[#ffcc00] text-black shadow-[0_0_10px_rgba(255,204,0,0.3)]' : 'border border-gray-700 text-gray-400 hover:border-[#ffcc00] hover:text-[#ffcc00]'}`}
          >
            Renomear e Info
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'dashboard' ? 'bg-[#ffcc00] text-black shadow-[0_0_10px_rgba(255,204,0,0.3)]' : 'border border-gray-700 text-gray-400 hover:border-[#ffcc00] hover:text-[#ffcc00]'}`}
          >
            Estatísticas
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'settings' ? 'bg-[#ffcc00] text-black shadow-[0_0_10px_rgba(255,204,0,0.3)]' : 'border border-gray-700 text-gray-400 hover:border-[#ffcc00] hover:text-[#ffcc00]'}`}
          >
            Configurações
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'about' ? 'bg-[#ffcc00] text-black shadow-[0_0_10px_rgba(255,204,0,0.3)]' : 'border border-gray-700 text-gray-400 hover:border-[#ffcc00] hover:text-[#ffcc00]'}`}
          >
            Sobre / Referência
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full px-4">
        {activeTab === 'upload' && <UploadTab />}
        {activeTab === 'rename' && <RenameTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'about' && <AboutTab />}
      </main>
    </div>
  );
}

export default App;
