import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, RefreshCw, AlertTriangle, Play } from 'lucide-react';
import { MOVIES_AND_SERIES, VideoContent } from '../data';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

interface CineAIChatProps {
  currentWatchlist: string[];
  onPlayContent: (content: VideoContent) => void;
}

export default function CineAIChat({ currentWatchlist, onPlayContent }: CineAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `### Bem-vindo ao CineAI! 🎬🍿\n\nEu sou o seu conselheiro de cinema e TV pessoal. Posso te ajudar a descobrir o que assistir com base no seu humor, criar conceitos de filmes divertidos ou responder a qualquer dúvida cinematográfica!\n\n**O que você gostaria de assistir hoje?** Aqui estão algumas ideias para começar:`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts
  const suggestions = [
    '🍿 Recomende um suspense psicológico imperdível',
    '🚀 Qual é o melhor filme de Ficção Científica do catálogo?',
    '😂 Preciso de uma comédia leve para descontrair',
    '⚡ Sugira algo para assistir comendo pipoca'
  ];

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Check server status (API Key exists?)
  useEffect(() => {
    fetch('/api/cineai/status')
      .then(res => res.json())
      .then(data => {
        setHasApiKey(data.hasKey);
      })
      .catch(err => {
        console.error('Error checking API key status:', err);
        setHasApiKey(false); // fallback
      });
  }, []);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/cineai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
          currentWatchlist
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na comunicação com a IA.');
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.text
      }]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      // In case of error (e.g. key missing), we show a friendly mock message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `### Modo de Demonstração CineAI 🍿\n\nA chave API do Gemini não está ativa ou ocorreu um pequeno contratempo. \n\nNo entanto, com base no seu pedido por *"**${textToSend}**"*, eu recomendo fortemente:\n\n* **Estelar: Última Fronteira** (Ficção Científica): Uma jornada espetacular pelo espaço com excelente pontuação de **4.9★**.\n* **Sombras de Neon** (Série Cyberpunk): Mistério eletrizante e cheio de ação pelas ruas futuristas de Neo-Sampa!\n\n*Configure a \`GEMINI_API_KEY\` no AI Studio para me dar acesso total à rede inteligente de cinema!*`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe manual rendering of bold, lists and headings in markdown
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      // Headings
      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="text-base md:text-lg font-bold text-red-500 mt-3 mb-1">{trimmed.replace('### ', '')}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="text-lg md:text-xl font-extrabold text-white mt-4 mb-2">{trimmed.replace('## ', '')}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={idx} className="text-xl md:text-2xl font-black text-red-600 mt-5 mb-3">{trimmed.replace('# ', '')}</h2>;
      }

      // Bold text replacement inside line
      let processed = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /\*(.*?)\*/g;
      
      // Simplified bullet points
      const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
      if (isBullet) {
        processed = trimmed.substring(2);
      }

      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      
      // Let's do a simple bold parsing
      const parts = processed.split('**');
      const parsedElements = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="text-red-400 font-bold">{part}</strong>;
        }
        // Check italics
        if (part.includes('*')) {
          const italicParts = part.split('*');
          return italicParts.map((iPart, iIdx) => {
            if (iIdx % 2 === 1) {
              return <em key={iIdx} className="text-zinc-300 italic">{iPart}</em>;
            }
            return iPart;
          });
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-zinc-300 text-sm md:text-base leading-relaxed mb-1">
            {parsedElements}
          </li>
        );
      }

      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-zinc-300 text-sm md:text-base leading-relaxed mb-1.5">
          {parsedElements}
        </p>
      );
    });
  };

  // Helper to find and play matching local movie directly from chat
  const handleQuickPlay = (movieTitle: string) => {
    const found = MOVIES_AND_SERIES.find(m => m.title.toLowerCase().includes(movieTitle.toLowerCase()));
    if (found) {
      onPlayContent(found);
    }
  };

  return (
    <div id="cineai-chat-root" className="flex flex-col h-[calc(100vh-140px)] bg-zinc-950/40 rounded-2xl border border-zinc-900 overflow-hidden backdrop-blur-md">
      {/* Chat Header */}
      <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-600/20 text-red-500 animate-pulse">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white flex items-center">
              CineAI Assistant <span className="ml-2 text-[10px] bg-red-600/10 text-red-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border border-red-500/10">PRO</span>
            </h2>
            <p className="text-xs text-gray-400">Dicas, recomendações e curiosidades em tempo real</p>
          </div>
        </div>

        {/* API Key warning badge */}
        {hasApiKey === false && (
          <div className="flex items-center space-x-2 text-[10px] md:text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            <AlertTriangle size={12} />
            <span className="hidden md:inline">Chave API Ausente (Modo Local)</span>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-grow p-4 md:p-6 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map(msg => (
          <div 
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`
                max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-xl border
                ${msg.sender === 'user' 
                  ? 'bg-red-600 text-white border-red-500 rounded-tr-none' 
                  : 'bg-zinc-900/90 text-zinc-100 border-zinc-800/80 rounded-tl-none'
                }
              `}
            >
              {msg.sender === 'ai' ? (
                <div className="space-y-1">
                  {renderMarkdown(msg.text)}
                  
                  {/* Inline smart triggers if local movies are mentioned */}
                  <div className="mt-3 pt-2 border-t border-zinc-800/60 flex flex-wrap gap-2">
                    {MOVIES_AND_SERIES.map(item => {
                      if (msg.text.toLowerCase().includes(item.title.toLowerCase())) {
                        return (
                          <button
                            key={item.id}
                            onClick={() => onPlayContent(item)}
                            className="text-xs bg-red-600/20 hover:bg-red-600 hover:text-white text-red-400 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition duration-150 cursor-pointer"
                          >
                            <Play size={10} fill="currentColor" />
                            <span>Assistir "{item.title}"</span>
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900/90 text-zinc-300 border border-zinc-800 rounded-2xl rounded-tl-none p-4 shadow-xl flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-zinc-400 font-mono">CineAI está analisando o catálogo...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts area */}
      {messages.length === 1 && !isLoading && (
        <div className="px-4 py-2 border-t border-zinc-900 flex flex-col space-y-2">
          <span className="text-xs font-mono text-zinc-500">Perguntas frequentes sugeridas:</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s.substring(2))}
                className="text-left text-xs bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-3 py-2 rounded-xl transition duration-150 cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-4 bg-zinc-900/40 border-t border-zinc-900 flex items-center space-x-3"
      >
        <input
          id="cineai-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Peça uma recomendação de filme, tire dúvidas sobre diretores ou peça curiosidades..."
          className="flex-grow bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition"
          disabled={isLoading}
        />
        <button
          id="btn-cineai-chat-send"
          type="submit"
          className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-xl shadow-lg hover:shadow-red-900/20 active:scale-95 transition cursor-pointer"
          disabled={isLoading || !input.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
