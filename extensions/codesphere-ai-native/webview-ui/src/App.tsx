import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Settings, History, User } from 'lucide-react';
import { useVSCode } from './hooks/useVSCode';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { postMessage } = useVSCode();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { topic, data } = event.data;
      
      if (topic === 'chat/delta') {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.id === data.id) {
            // Update existing assistant message
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + data.delta
            };
            return updated;
          } else {
            // New assistant message
            return [...prev, { id: data.id, role: 'assistant', content: data.delta }];
          }
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    postMessage('chat/send', { text: inputMessage.trim() });
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-gray-200 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#252526] shrink-0">
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
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
            <Sparkles className="w-12 h-12 mb-4 text-blue-500/50" />
            <h2 className="text-lg font-medium text-white">How can I help you code?</h2>
            <p className="text-sm mt-2 max-w-xs leading-relaxed">
              I can generate code, explain errors, or refactor selected text.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-blue-600/10 text-blue-50' : 'bg-white/5 text-gray-200'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 border-t border-white/10 bg-[#252526] shrink-0">
        <div className="relative group">
          <textarea
            className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
            placeholder="Ask CodeSphere AI..."
            rows={2}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="absolute right-2 bottom-2 p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
          >
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
