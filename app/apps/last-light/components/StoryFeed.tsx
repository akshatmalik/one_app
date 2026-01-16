'use client';

import { useEffect, useRef } from 'react';
import { StoryEntry } from '../lib/types';

interface StoryFeedProps {
  entries: StoryEntry[];
}

export function StoryFeed({ entries }: StoryFeedProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {entries.map((entry) => (
          <StoryMessage key={entry.id} entry={entry} />
        ))}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}

function StoryMessage({ entry }: { entry: StoryEntry }) {
  // Narration - main story text
  if (entry.type === 'narration') {
    return (
      <div className="py-2">
        <p className="text-gray-700 leading-relaxed text-sm">
          {entry.content}
        </p>
      </div>
    );
  }

  // Player input
  if (entry.type === 'player') {
    return (
      <div className="py-2 pl-8">
        <p className="text-blue-600 text-sm font-mono">
          <span className="text-blue-400 mr-2">&gt;</span>
          {entry.content}
        </p>
      </div>
    );
  }

  // NPC dialogue
  if (entry.type === 'npc') {
    return (
      <div className="py-3 px-4 bg-amber-50 border-l-2 border-amber-400 rounded-r">
        <div className="flex items-start gap-2">
          <span className="text-lg">👤</span>
          <div>
            <p className="text-xs font-semibold text-amber-900 mb-1">
              {entry.speaker || 'Unknown'}
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {entry.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // System messages
  if (entry.type === 'system') {
    return (
      <div className="py-2">
        <p className="text-green-600 text-xs italic">{entry.content}</p>
      </div>
    );
  }

  return null;
}
