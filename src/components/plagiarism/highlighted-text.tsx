'use client';

import React from 'react';

const HighlightedText = ({ text, type }: { text: string, type: 'plagiarism' | 'ai' }) => {
  const plagiarismRegex = /<<PLAGIARISM_START>>([\s\S]*?)<<PLAGIARISM_END>>/g;
  const aiRegex = /<<AI_START>>([\s\S]*?)<<AI_END>>/g;

  const regex = type === 'plagiarism' ? plagiarismRegex : aiRegex;
  const className = type === 'plagiarism' ? 'bg-destructive/20' : 'bg-accent/20';

  const parts = text.split(regex);

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <mark key={index} className={`px-1 rounded-sm ${className}`}>
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </div>
  );
};

export default HighlightedText;
