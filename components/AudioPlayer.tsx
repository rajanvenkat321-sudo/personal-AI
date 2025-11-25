import React, { useRef, useState, useEffect } from 'react';
import { Icons } from './Icon';

interface AudioPlayerProps {
  base64Data: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Stop previous if playing
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }

      // Decode base64
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode Audio Data
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => setIsPlaying(false);
      
      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);

    } catch (e) {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-md border border-slate-700 max-w-sm">
      <button
        onClick={isPlaying ? stopAudio : playAudio}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
      >
        {isPlaying ? (
          <div className="w-3 h-3 bg-white rounded-sm" />
        ) : (
          <Icons.Play className="w-5 h-5 ml-0.5" />
        )}
      </button>
      <div className="flex-1">
        <div className="text-xs text-slate-400 mb-1">Generated Audio</div>
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            {isPlaying && <div className="h-full bg-indigo-400 animate-pulse w-full"></div>}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
