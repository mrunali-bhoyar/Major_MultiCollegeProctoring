'use client';

import { cn } from '@/lib/utils';

const CircularProgress = ({ value, label, color }: { value: number; label: string; color: 'primary' | 'accent' }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;

  const colorClass = color === 'primary' ? 'text-primary' : 'text-accent';

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card/30">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className="text-card"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
          />
          <circle
            className={cn('transform -rotate-90 origin-center', colorClass)}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
          {Math.round(value)}%
        </span>
      </div>
      <p className="font-semibold">{label}</p>
    </div>
  );
};

export default CircularProgress;
