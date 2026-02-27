import { useState } from 'react';
import { Sparkles, Send, Settings, History } from 'lucide-react';

function App() {
  const [inputMessage, setInputMessage] = useState('');

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-gray-200 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#252526]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h1 className="text-sm font-semibold tracking-wide">CodeSphere AI</h1>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <History className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <Settings className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
        </div>
      </header>

      {/* Message List */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
          <Sparkles className="w-12 h-12 mb-4 text-blue-500/50" />
          <h2 className="text-lg font-medium text-white">How can I help you code?</h2>
          <p className="text-sm mt-2 max-w-xs leading-relaxed">
            I can generate code, explain errors, or refactor selected text.
          </p>
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 border-t border-white/10 bg-[#252526]">
        <div className="relative group">
          <textarea
            className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
            placeholder="Ask CodeSphere AI..."
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button className="absolute right-2 bottom-2 p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-center text-gray-500 mt-2">
          AI-generated code may be inaccurate.
        </div>
      </footer>
    </div>
  );
}

export default App;
