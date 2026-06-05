'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { CompositeScore } from '../lib/calculations';
import { TrackedGame } from '../lib/types';

interface Props {
  scores: CompositeScore[];
  games: TrackedGame[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { name: string; score: number; confidence: number; color: string } }[] }) => {
  if (!active || !payload?.length) return null;
  const { name, score, confidence } = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-medium">{name}</p>
      <p className="text-purple-300">Score: <span className="text-white font-bold">{score.toFixed(1)}</span></p>
      <p className="text-gray-400">Confidence: {Math.round(confidence * 100)}%</p>
    </div>
  );
};

export function ScoreChart({ scores, games }: Props) {
  const data = games.map(g => {
    const score = scores.find(s => s.gameId === g.id);
    return {
      name: g.name.replace("Marvel's ", "").replace("Control: ", "").replace("God of War: ", ""),
      fullName: g.name,
      score: score?.composite ?? 0,
      confidence: score?.confidence ?? 0,
      color: g.coverColor,
    };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold text-lg">Composite Interest Score</h2>
        <span className="text-xs text-gray-500">0 – 100</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#D1D5DB', fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={entry.confidence > 0 ? 0.85 : 0.25} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {data.some(d => d.confidence === 0) && (
        <p className="text-xs text-gray-600 mt-3 text-center">Add signal data to see scores populate</p>
      )}
    </div>
  );
}
