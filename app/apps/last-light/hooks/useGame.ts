'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GameState, StoryEntry } from '../lib/types';
import { gameRepository } from '../lib/storage';
import { generateGameResponse, validateCommand } from '../lib/ai-service';

export function useGame(userId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Initialize or load game
  useEffect(() => {
    const initGame = async () => {
      try {
        setLoading(true);

        // For now, always create a new game
        // Later: check if there's a saved game and offer to continue
        const newGame = await gameRepository.createGame(userId);
        setGameState(newGame);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      } finally {
        setLoading(false);
      }
    };

    initGame();
  }, [userId]);

  // Add story entry
  const addStoryEntry = useCallback((entry: Omit<StoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: StoryEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    setGameState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        storyLog: [...prev.storyLog, newEntry],
      };
    });

    return newEntry;
  }, []);

  // Process player command
  const processCommand = useCallback(
    async (command: string) => {
      if (!gameState || processing) return;

      try {
        setProcessing(true);

        // Build new story entries
        const newEntries: StoryEntry[] = [];

        // Add player input
        newEntries.push({
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          type: 'player',
          content: command,
        });

        // Validate command
        const validation = validateCommand(command);
        if (!validation.isValid) {
          newEntries.push({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            type: 'system',
            content: validation.reason || 'Invalid command.',
          });

          // Update state with validation error
          setGameState((prev) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              storyLog: [...prev.storyLog, ...newEntries],
            };
            gameRepository.updateGame(prev.id, { storyLog: updated.storyLog });
            return updated;
          });
          return;
        }

        // Update behavior tracking
        const updatedBehavior = {
          ...gameState.playerBehavior,
          recentActions: [
            ...gameState.playerBehavior.recentActions,
            command,
          ].slice(-10),
          turnsInLocation: gameState.playerBehavior.turnsInLocation + 1,
          movementCount:
            command.toLowerCase().includes('go') ||
            command.toLowerCase().includes('move')
              ? gameState.playerBehavior.movementCount + 1
              : gameState.playerBehavior.movementCount,
          madeNoise:
            command.toLowerCase().includes('loud') ||
            command.toLowerCase().includes('shout'),
          isBeingStealthy:
            command.toLowerCase().includes('quietly') ||
            command.toLowerCase().includes('sneak'),
        };

        // Generate AI response
        const response = await generateGameResponse(command, {
          ...gameState,
          playerBehavior: updatedBehavior,
        });

        // Add narration to story
        if (response.narration) {
          newEntries.push({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            type: 'narration',
            content: response.narration,
          });
        }

        // Add NPC dialogue if present
        if (response.npcDialogue) {
          newEntries.push({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            type: 'npc',
            content: response.npcDialogue,
            speaker: 'Stranger',
          });
        }

        // Update game state with all changes
        const updates: Partial<GameState> = {
          storyLog: [...gameState.storyLog, ...newEntries],
          ...response.stateChanges,
          playerBehavior: updatedBehavior,
        };

        // Apply hunger/energy changes
        if (!response.stateChanges.hunger && !response.stateChanges.energy) {
          updates.hunger = Math.min(100, (gameState.hunger || 0) + 2);
          updates.energy = Math.max(0, (gameState.energy || 100) - 5);
        }

        const updatedGame = await gameRepository.updateGame(
          gameState.id,
          updates
        );

        setGameState(updatedGame);
      } catch (error) {
        console.error('Failed to process command:', error);
        setGameState((prev) => {
          if (!prev) return null;
          const errorEntry: StoryEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            type: 'system',
            content: 'Something went wrong. Try again.',
          };
          return {
            ...prev,
            storyLog: [...prev.storyLog, errorEntry],
          };
        });
      } finally {
        setProcessing(false);
      }
    },
    [gameState, processing]
  );

  return {
    gameState,
    loading,
    processing,
    processCommand,
  };
}
