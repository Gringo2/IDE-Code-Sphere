import { useState, useEffect } from 'react';
import { Database, FileText, Plus, X, Globe, Brain } from 'lucide-react';
import { useVSCode } from './hooks/useVSCode';

interface ContextItem {
  uri: string;
  type: 'file' | 'folder' | 'selection';
}

function ContextManager() {
  const [items, setItems] = useState<ContextItem[]>([]);
  const { postMessage } = useVSCode();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { topic, data } = event.data;
      if (topic === 'context/update') {
        setItems(prev => {
          if (prev.some(i => i.uri === data.uri)) return prev;
          return [...prev, data];
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const removeItem = (uri: string) => {
    setItems(items.filter(i => i.uri !== uri));
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-gray-200 font-sans">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#252526] shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          <h1 className="text-sm font-semibold tracking-wide">Context Manager</h1>
        </div>
        <Plus className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer transition-colors" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Status Section */}
        <section className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-white">Project Insight</span>
          </div>
          <div className="text-[11px] text-gray-400 leading-relaxed">
            CodeSphere is indexing your workspace. {items.length} files are currently in active focus.
          </div>
        </section>

        {/* Context Items */}
        <div className="flex flex-col gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Active Files</h3>
          {items.length === 0 ? (
            <div className="text-center py-10 opacity-40">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="text-[11px]">No active context</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.uri} className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-2 rounded group transition-colors">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[11px] truncate text-gray-300">{item.uri.split(/[\\/]/).pop()}</span>
                </div>
                <X 
                  onClick={() => removeItem(item.uri)}
                  className="w-3 h-3 text-gray-500 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-all" 
                />
              </div>
            ))
          )}
        </div>

        {/* External Sources */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Knowledge Bases</h3>
          <div className="flex items-center gap-2 px-2 py-1.5 opacity-50 cursor-not-allowed">
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px]">Documentation Index</span>
          </div>
        </div>
      </main>
      
      <footer className="p-3 bg-[#252526] border-t border-white/10">
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] py-2 rounded transition-colors font-medium">
          Rebuild Semantic Index
        </button>
      </footer>
    </div>
  );
}

export default ContextManager;
