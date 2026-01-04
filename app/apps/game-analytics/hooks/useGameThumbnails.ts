'use client';

import { useState, useEffect } from 'react';
import { Game } from '../lib/types';
import { searchRAWGGame } from '../lib/rawg-api';

/**
 * Hook to fetch and manage game thumbnails from RAWG API
 * Automatically fetches thumbnails for games that don't have them
 */
export function useGameThumbnails(
  games: Game[],
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>
) {
  const [loading, setLoading] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(0);

  useEffect(() => {
    // Find games without thumbnails
    const gamesNeedingThumbnails = games.filter(g => !g.thumbnail && g.status !== 'Wishlist');

    if (gamesNeedingThumbnails.length === 0) {
      return;
    }

    let isCancelled = false;

    const fetchThumbnails = async () => {
      setLoading(true);
      let count = 0;

      // Process games one at a time to avoid rate limiting
      for (const game of gamesNeedingThumbnails) {
        if (isCancelled) break;

        try {
          const rawgData = await searchRAWGGame(game.name);

          if (rawgData?.backgroundImage && !isCancelled) {
            await updateGame(game.id, {
              thumbnail: rawgData.backgroundImage,
            });
            count++;
            setFetchedCount(count);
          }

          // Small delay to be respectful to the API
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error fetching thumbnail for ${game.name}:`, error);
        }
      }

      if (!isCancelled) {
        setLoading(false);
      }
    };

    // Start fetching after a short delay to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      fetchThumbnails();
    }, 1000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [games, updateGame]);

  return { loading, fetchedCount };
}

/**
 * Manually fetch thumbnail for a single game
 */
export async function fetchGameThumbnail(
  gameName: string,
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>,
  gameId: string
): Promise<boolean> {
  try {
    const rawgData = await searchRAWGGame(gameName);

    if (rawgData?.backgroundImage) {
      await updateGame(gameId, {
        thumbnail: rawgData.backgroundImage,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fetching thumbnail for ${gameName}:`, error);
    return false;
  }
}
