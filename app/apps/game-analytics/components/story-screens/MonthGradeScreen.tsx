'use client';

import { motion } from 'framer-motion';
import { MonthInReviewData, MonthGrade } from '../../lib/calculations';

interface MonthGradeScreenProps {
  grade: MonthGrade;
  monthLabel: string;
}

export function MonthGradeScreen({ grade, monthLabel }: MonthGradeScreenProps) {
  const gradeColor = (g: string) => {
    if (g.startsWith('A')) return 'text-emerald-400';
    if (g.startsWith('B')) return 'text-blue-400';
    if (g.startsWith('C')) return 'text-yellow-400';
    if (g.startsWith('D')) return 'text-orange-400';
    return 'text-red-400';
  };

  const gradeBg = (g: string) => {
    if (g.startsWith('A')) return 'from-emerald-500/20 to-emerald-600/5';
    if (g.startsWith('B')) return 'from-blue-500/20 to-blue-600/5';
    if (g.startsWith('C')) return 'from-yellow-500/20 to-yellow-600/5';
    if (g.startsWith('D')) return 'from-orange-500/20 to-orange-600/5';
    return 'from-red-500/20 to-red-600/5';
  };

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6"
      >
        Report Card
      </motion.div>

      {/* Big Grade */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
        className={`inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br ${gradeBg(grade.overall)} border-2 border-white/10 mb-2`}
      >
        <span className={`text-6xl font-black ${gradeColor(grade.overall)}`}>{grade.overall}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-white/40 mb-8"
      >
        {grade.overallScore}/100
      </motion.div>

      {/* Subject grades */}
      <div className="space-y-3">
        {grade.subjects.map((subject, i) => (
          <motion.div
            key={subject.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
            className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5"
          >
            <span className="text-lg">{subject.emoji}</span>
            <span className="text-sm text-white/60 flex-1 text-left">{subject.name}</span>
            <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${subject.score}%` }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
                className={`h-full rounded-full ${subject.grade.startsWith('A') ? 'bg-emerald-400' : subject.grade.startsWith('B') ? 'bg-blue-400' : subject.grade.startsWith('C') ? 'bg-yellow-400' : 'bg-orange-400'}`}
              />
            </div>
            <span className={`text-lg font-black w-10 text-right ${gradeColor(subject.grade)}`}>
              {subject.grade}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
