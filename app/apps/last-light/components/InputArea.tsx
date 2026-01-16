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
    <div className="border-t border-gray-700 bg-gray-800 px-3 py-2 md:px-6 md:py-4">
      <div className="max-w-3xl mx-auto space-y-2 md:space-y-3">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => handleQuickAction(action)}
              disabled={disabled}
              className="px-2 py-1 md:px-3 text-xs text-gray-300 border border-gray-600 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            className="flex-1 px-3 py-2 md:px-4 text-sm bg-gray-900 text-gray-200 placeholder-gray-500 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-800"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="px-4 py-2 md:px-6 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
