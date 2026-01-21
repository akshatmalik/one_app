'use client';

import { useState } from 'react';
import { useGame } from './hooks/useGame';
import { StoryFeed } from './components/StoryFeed';
import { StatusBar } from './components/StatusBar';
import { InputArea } from './components/InputArea';
import { DebugPanel } from './components/DebugPanel';

export default function LastLightPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // For now, use a placeholder user ID
  // Later: get from auth context
  const { gameState, loading, processing, processCommand, resetGame } = useGame(
    'local-user'
  );

  // Wrapper for processCommand that logs errors
  const handleCommand = async (command: string) => {
    try {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        `[${timestamp}] Command: ${command}`,
      ].slice(-50));

      await processCommand(command);

      setLogs((prev) => [
        ...prev,
        `[${timestamp}] Success`,
      ].slice(-50));
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      const timestamp = new Date().toLocaleTimeString();

      setErrors((prev) => [
        ...prev,
        `[${timestamp}] ${errorMsg}`,
      ].slice(-20));

      setLogs((prev) => [
        ...prev,
        `[${timestamp}] Error: ${errorMsg}`,
      ].slice(-50));
    }
  };

  if (loading || !gameState) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-2xl mb-2">🧟</div>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (gameState.status === 'game-over') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center max-w-md p-8">
          <div className="text-4xl mb-4">💀</div>
          <h2 className="text-xl font-semibold text-gray-200 mb-2">Game Over</h2>
          <p className="text-gray-400 mb-6">
            {gameState.deathReason || 'You died.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950">
      {/* Status bar */}
      <StatusBar gameState={gameState} onReset={resetGame} />

      {/* Story feed */}
      <StoryFeed entries={gameState.storyLog} />

      {/* Input area */}
      <InputArea onCommand={handleCommand} disabled={processing} />

      {/* Processing indicator */}
      {processing && (
        <div className="fixed bottom-24 right-6 bg-blue-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          Processing...
        </div>
      )}

      {/* Debug panel */}
      <DebugPanel gameState={gameState} errors={errors} logs={logs} />
    </div>
  );
}
