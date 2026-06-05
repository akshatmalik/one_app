'use client';

import { useState } from 'react';
import { Key, X, Eye, EyeOff } from 'lucide-react';

interface Props {
  apiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export function APIKeyModal({ apiKey, onSave, onClose }: Props) {
  const [value, setValue] = useState(apiKey);
  const [visible, setVisible] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-400" />
            <h2 className="text-white font-semibold">YouTube API Key</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-gray-400 text-sm">
          Used to fetch live trailer view counts. Stored only in your browser's localStorage — never sent anywhere else.
        </p>

        <div className="relative">
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
          <button
            onClick={() => setVisible(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <p>1. Go to Google Cloud Console → APIs & Services → Credentials</p>
          <p>2. Create API Key → restrict to YouTube Data API v3</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(value.trim()); onClose(); }}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Save & Fetch
          </button>
        </div>
      </div>
    </div>
  );
}
