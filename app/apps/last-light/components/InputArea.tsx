'use client';

import { useState, KeyboardEvent } from 'react';
import { QUICK_ACTIONS } from '../lib/constants';

interface InputAreaProps {
  onCommand: (command: string) => void;
  disabled?: boolean;
}

export function InputArea({ onCommand, disabled }: InputAreaProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onCommand(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleQuickAction = (action: string) => {
    onCommand(action.toLowerCase());
  };

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-4">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => handleQuickAction(action)}
              disabled={disabled}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Command input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="What do you do?"
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
