import React, { useEffect, useRef } from 'react';

interface TranscriptionProps {
  text: string;
}

const Transcription: React.FC<TranscriptionProps> = ({ text }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  if (!text) return null;

  return (
    <div className="absolute bottom-32 left-0 right-0 px-6 pointer-events-none flex justify-center z-10">
      <div 
        ref={containerRef}
        className="bg-black/60 backdrop-blur-md rounded-2xl p-6 max-w-2xl w-full max-h-48 overflow-y-auto no-scrollbar pointer-events-auto border border-white/10 shadow-2xl transition-all"
      >
         <p className="text-lg md:text-xl font-medium text-gray-100 leading-relaxed whitespace-pre-wrap font-sans">
           {text}
           <span className="inline-block w-2 h-5 ml-1 bg-blue-400 animate-pulse align-middle"></span>
         </p>
      </div>
    </div>
  );
};

export default Transcription;
