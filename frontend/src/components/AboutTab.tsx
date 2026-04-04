export default function AboutTab() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-gray-300">
      
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-gold drop-shadow-md">UPLOAD ASSISTANT</h1>
        <div className="inline-block mt-4 px-4 py-1 border border-gold/50 rounded-full text-sm text-gold">
          Desenvolvido por: <span className="font-bold">Masuka</span>
        </div>
      </div>

      <div className="card border border-gray-700 bg-gray-800/50 mt-12">
        <h3 className="text-lg font-bold text-white mb-2">Sobre este Projeto</h3>
        <p className="leading-relaxed text-sm">
          Este aplicativo é uma interface gráfica moderna e ágil (GUI) desenhada para facilitar a automação de uploads e padronizações. O motor principal do software — o cérebro que organiza tudo por debaixo dos panos — é guiado pelo poderoso script <strong>Upload-Assistant</strong> escrito originalmente em Python.
        </p>
      </div>

      <div className="card border border-blue-900/40 bg-blue-900/10 shadow-[0_0_15px_rgba(30,58,138,0.2)]">
        <h3 className="text-lg font-bold text-blue-400 mb-2">Créditos e Referência do Motor Base</h3>
        <p className="text-sm mb-4">
          O projeto original em linha de comando que possibilita toda a comunicação com trackers, criação de torrents e automações de media info é mantido e desenvolvido pela comunidade e pelo dev <strong>Audionut</strong>.
        </p>
        <a 
          href="https://github.com/Audionut/Upload-Assistant" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors bg-blue-900/30 px-4 py-2 rounded border border-blue-500/30 hover:bg-blue-600/50"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          Visitar repositório original (Upload-Assistant)
        </a>
      </div>

      <div className="card border border-green-900/40 bg-green-900/10">
        <h3 className="text-lg font-bold text-green-400 mb-2">Recursos da GUI em Go + Wails</h3>
        <ul className="list-disc pl-5 text-sm space-y-2">
          <li><strong>Otimização Extrema:</strong> Interface reconstruída do zero utilizando React e a potência do binário compilado nativo da linguagem Golang.</li>
          <li><strong>Automação de Validação:</strong> Ferramentas de correção de nomes com validações restritas aos guias dos Trackers.</li>
          <li><strong>Extração Assíncrona:</strong> Uso direto do <code className="bg-black/50 px-1 rounded">ffprobe</code> integrado para metadados instantâneos.</li>
          <li><strong>Leve e Rápido:</strong> Baixo consumo de memória em background, monitoramento em tempo integral da saída do terminal.</li>
        </ul>
      </div>

    </div>
  );
}
