import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, X } from 'lucide-react';
import { ConversationMessage } from '../types';
import { chatWithAI } from '../services/advancedGeminiService';

interface AIConversationProps {
  initialContext?: string;
  onClose?: () => void;
}

const AIConversation: React.FC<AIConversationProps> = ({ initialContext, onClose }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    if (initialContext) {
      return [{
        role: 'assistant',
        content: `Merhaba! ${initialContext} hakkında konuşalım. Sorularınızı sorabilirsiniz.`,
        timestamp: Date.now(),
      }];
    }
    return [{
      role: 'assistant',
      content: 'Merhaba! Trading hakkında sorularınızı sorabilirsiniz. Size nasıl yardımcı olabilirim?',
      timestamp: Date.now(),
    }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        content: m.content,
      }));

      const response = await chatWithAI(input, conversationHistory);

      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: ConversationMessage = {
        role: 'assistant',
        content: `⚠️ HATA: ${error.message || 'Bir hata oluştu'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0f1219] border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-[#151921]">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-bold text-white">AI Sohbet</span>
          <span className="text-xs text-slate-500">- Trading asistanınız</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-800"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700 bg-[#151921]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Mesajınızı yazın..."
            className="flex-1 bg-[#0b0e14] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConversation;

