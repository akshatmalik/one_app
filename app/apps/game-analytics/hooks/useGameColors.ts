'use client';

import { useState, useEffect } from 'react';
import { Game } from '../lib/types';

const CACHE_KEY_PREFIX = 'game-color-';

function getCachedColor(gameId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${CACHE_KEY_PREFIX}${gameId}`);
}

function setCachedColor(gameId: string, color: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${gameId}`, color);
  }
}

function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve('#6b7280'); return; }

      canvas.width = 10;
      canvas.height = 10;
      ctx.drawImage(img, 0, 0, 10, 10);

      const data = ctx.getImageData(0, 0, 10, 10).data;
      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > 30 && brightness < 220) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      if (count === 0) { resolve('#6b7280'); return; }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      resolve(
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      );
    };
    img.onerror = () => resolve('#6b7280');
    img.src = imageUrl;
  });
}

export function useGameColors(games: Game[]): Map<string, string> {
  const [colors, setColors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const newColors = new Map<string, string>();
    const toFetch: Game[] = [];

    for (const game of games) {
      if (!game.thumbnail) continue;
      const cached = getCachedColor(game.id);
      if (cached) {
        newColors.set(game.id, cached);
      } else {
        toFetch.push(game);
      }
    }

    setColors(new Map(newColors));

    let index = 0;
    const fetchNext = () => {
      if (index >= toFetch.length) return;
      const game = toFetch[index++];
      if (!game.thumbnail) { fetchNext(); return; }

      extractDominantColor(game.thumbnail).then((color) => {
        setCachedColor(game.id, color);
        setColors((prev) => new Map(prev).set(game.id, color));
        setTimeout(fetchNext, 100);
      });
    };

    fetchNext();
  }, [games.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return colors;
}
