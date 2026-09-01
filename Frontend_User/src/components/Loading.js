import React from 'react';

export default function Loading({ label = 'Loading...', white = false }) {
  return (
    <div className={`flex flex-col items-center justify-center py-24 ${white ? 'bg-white' : ''}`}>
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
      </div>
      <p className="text-gray-500 mt-4">{label}</p>
    </div>
  );
}

export function Spinner({ small }) {
  return (
    <div className={`inline-block border-2 border-white/40 border-t-white rounded-full animate-spin ${small ? 'w-4 h-4' : 'w-6 h-6'}`} />
  );
}
