import React, { useState, useRef, useEffect } from 'react';
import { AgentMode, Message } from './types';
import { generateResponse } from './services/geminiService';
import { Icons } from './components/Icon';
import MessageBubble from './components/MessageBubble';

const App: React.FC = () => {
  const [mode, setMode] = useState<AgentMode>(AgentMode.ORCHESTRATOR);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Welcome to Nexus AI. I am your unified intelligence hub.\n\nI can route your requests to specialized agents:\n• Need code? I'll call the Engineer.\n• Need art? I'll call the Artist.\n• Need research? I'll search the web.\n\nJust tell me what you need.",
      type: 'text',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleModeChange = (newMode: AgentMode) => {
    setMode(newMode);
    // Optional: Add a system message indicating mode switch
    const modeLabels = {
        [AgentMode.ORCHESTRATOR]: "Orchestrator Mode: Auto-routing enabled.",
        [AgentMode.CODER]: "Coder Mode: Optimized for software engineering.",
        [AgentMode.ARTIST]: "Artist Mode: Image generation enabled.",
        [AgentMode.SPEAKER]: "Speaker Mode: Text-to-Speech synthesis.",
        [AgentMode.ANALYST]: "Analyst Mode: Vision and data analysis.",
    }
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Switched to ${modeLabels[newMode]}`,
        type: 'text',
        timestamp: Date.now()
    }]);
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text',
      timestamp: Date.now()
    };

    // If attachment exists, we might want to display it
    // For simplicity, we just process it in the backend call, but visually showing it is good
    if (attachment) {
        // Simple visual indication for user message attachment
        userMsg.content += `\n[Attached Image]`;
    }

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await generateResponse(userMsg.content, mode, messages, attachment);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result.content || "...",
        type: (result.type as any) || 'text',
        timestamp: Date.now(),
        metadata: result.metadata
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "I encountered an error processing your request.",
        type: 'error',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      setAttachment(undefined); // Clear attachment after send
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
        // We no longer auto-switch. Orchestrator can handle files now.
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar / Dock */}
      <div className="w-16 md:w-20 bg-slate-950 flex flex-col items-center py-6 border-r border-slate-800 z-20">
        <div className="mb-8 p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            {/* Logo placeholder */}
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        </div>

        <nav className="flex flex-col gap-4 w-full px-2">
            <ModeButton active={mode === AgentMode.ORCHESTRATOR} onClick={() => handleModeChange(AgentMode.ORCHESTRATOR)} icon={<Icons.Orchestrator className="w-6 h-6"/>} label="Hub" />
            <ModeButton active={mode === AgentMode.CODER} onClick={() => handleModeChange(AgentMode.CODER)} icon={<Icons.Coder className="w-6 h-6"/>} label="Code" />
            <ModeButton active={mode === AgentMode.ARTIST} onClick={() => handleModeChange(AgentMode.ARTIST)} icon={<Icons.Artist className="w-6 h-6"/>} label="Draw" />
            <ModeButton active={mode === AgentMode.SPEAKER} onClick={() => handleModeChange(AgentMode.SPEAKER)} icon={<Icons.Speaker className="w-6 h-6"/>} label="Speak" />
            <ModeButton active={mode === AgentMode.ANALYST} onClick={() => handleModeChange(AgentMode.ANALYST)} icon={<Icons.Analyst className="w-6 h-6"/>} label="Vision" />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-slate-900">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <span className="text-indigo-400">Nexus</span> 
                <span className="text-slate-500">/</span>
                <span>{mode === AgentMode.ORCHESTRATOR ? 'Hub' : mode.charAt(0) + mode.slice(1).toLowerCase()}</span>
            </h1>
            <div className="ml-auto text-xs text-slate-500 hidden md:block">
                Powered by Gemini Multimodal
            </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
            <div className="max-w-4xl mx-auto min-h-full pb-4">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                
                {isLoading && (
                    <div className="flex w-full justify-start mb-6">
                         <div className="bg-slate-800 px-5 py-3 rounded-2xl rounded-bl-none flex items-center gap-2 border border-slate-700">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-slate-900/90 backdrop-blur-sm border-t border-slate-800">
            <div className="max-w-4xl mx-auto relative">
                
                {/* Attachment Preview */}
                {attachment && (
                    <div className="absolute -top-24 left-0 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                        <img src={attachment} alt="Upload preview" className="h-16 w-16 object-cover rounded" />
                        <button 
                            onClick={() => { setAttachment(undefined); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                            ×
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all shadow-lg">
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Upload Image"
                    >
                        <Icons.Attach className="w-6 h-6" />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                    />

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={`Message the ${mode === AgentMode.ORCHESTRATOR ? 'Hub' : mode.toLowerCase()}...`}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 p-3 max-h-32 resize-none"
                        rows={1}
                        style={{ minHeight: '48px' }}
                    />

                    <button 
                        onClick={handleSendMessage}
                        disabled={isLoading || (!input.trim() && !attachment)}
                        className={`p-3 rounded-lg transition-all ${
                            isLoading || (!input.trim() && !attachment)
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25'
                        }`}
                    >
                        <Icons.Send className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-center mt-2 text-xs text-slate-500">
                    AI can make mistakes. Check important info.
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

// Sub-component for sidebar buttons
const ModeButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all group ${
            active 
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
        }`}
    >
        <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
            {icon}
        </div>
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

export default App;