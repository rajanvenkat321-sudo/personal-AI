import React from 'react';
import { Message } from '../types';
import AudioPlayer from './AudioPlayer';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[80%] lg:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
        }`}>
          {message.content}

          {/* Web Sources (Grounding) */}
          {message.metadata?.webSources && message.metadata.webSources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-600/50">
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Sources</div>
              <div className="flex flex-wrap gap-2">
                {message.metadata.webSources.map((source, idx) => (
                  <a 
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-indigo-300 text-xs py-1 px-2 rounded-md transition-colors truncate max-w-[200px]"
                  >
                    <span className="truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Artifacts Display */}
        {message.type !== 'text' && (
          <div className="mt-3 w-full">
            {message.type === 'image' && message.metadata?.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                <img 
                  src={message.metadata.imageUrl} 
                  alt="Generated AI Art" 
                  className="w-full h-auto max-h-[500px] object-cover bg-slate-900" 
                />
              </div>
            )}
            
            {message.type === 'audio' && message.metadata?.audioData && (
              <AudioPlayer base64Data={message.metadata.audioData} />
            )}

            {message.type === 'code' && (
              <div className="bg-[#1e1e1e] p-4 rounded-lg border border-slate-700 font-mono text-xs md:text-sm text-gray-300 overflow-x-auto shadow-inner">
                <code>{message.content}</code>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 mt-1 px-1">
          {message.role === 'model' ? 'Nexus AI' : 'You'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

      </div>
    </div>
  );
};

export default MessageBubble;