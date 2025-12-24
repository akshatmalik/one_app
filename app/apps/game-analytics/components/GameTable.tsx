'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { GameWithMetrics } from '../hooks/useAnalytics';

interface GameTableProps {
  games: GameWithMetrics[];
  onEdit?: (game: GameWithMetrics) => void;
  onDelete?: (id: string) => void;
}

type SortKey = 'name' | 'price' | 'hours' | 'rating' | 'costPerHour' | 'blendScore';

export function GameTable({ games, onEdit, onDelete }: GameTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('blendScore');
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = [...games].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortKey) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'price':
        aVal = a.price;
        bVal = b.price;
        break;
      case 'hours':
        aVal = a.hours;
        bVal = b.hours;
        break;
      case 'rating':
        aVal = a.rating;
        bVal = b.rating;
        break;
      case 'costPerHour':
        aVal = a.metrics.costPerHour;
        bVal = b.metrics.costPerHour;
        break;
      case 'blendScore':
      default:
        aVal = a.metrics.blendScore;
        bVal = b.metrics.blendScore;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }

    return sortDesc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader className="cursor-pointer" onClick={() => toggleSort('name')}>
              Name {sortKey === 'name' && (sortDesc ? '↓' : '↑')}
            </TableHeader>
            <TableHeader className="cursor-pointer" onClick={() => toggleSort('price')}>
              Price {sortKey === 'price' && (sortDesc ? '↓' : '↑')}
            </TableHeader>
            <TableHeader className="cursor-pointer" onClick={() => toggleSort('hours')}>
              Hours {sortKey === 'hours' && (sortDesc ? '↓' : '↑')}
            </TableHeader>
            <TableHeader className="cursor-pointer" onClick={() => toggleSort('rating')}>
              Rating {sortKey === 'rating' && (sortDesc ? '↓' : '↑')}
            </TableHeader>
            <TableHeader className="cursor-pointer" onClick={() => toggleSort('costPerHour')}>
              $/Hour {sortKey === 'costPerHour' && (sortDesc ? '↓' : '↑')}
            </TableHeader>
            <TableHeader className="cursor-pointer" onClick={() => toggleSort('blendScore')}>
              Blend Score {sortKey === 'blendScore' && (sortDesc ? '↓' : '↑')}
            </TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map(game => (
            <TableRow key={game.id}>
              <TableCell className="font-medium">{game.name}</TableCell>
              <TableCell>${game.price}</TableCell>
              <TableCell>{game.hours}h</TableCell>
              <TableCell>{game.rating}/10</TableCell>
              <TableCell>${game.metrics.costPerHour.toFixed(2)}</TableCell>
              <TableCell className="font-semibold">
                {game.metrics.blendScore.toFixed(1)}
              </TableCell>
              <TableCell>
                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100">
                  {game.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(game)}
                    >
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(game.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
