'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LocalStorageGameRepository } from '../lib/storage';
import { SupabaseGameRepository } from '../lib/supabase-storage';
import { useAuth } from '@/lib/hooks/useAuth';

export function DataMigration({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const migrateData = async () => {
    if (!user) {
      setStatus('error');
      setMessage('You must be logged in to migrate data');
      return;
    }

    setMigrating(true);
    setStatus('idle');
    setMessage('');

    try {
      const localRepo = new LocalStorageGameRepository();
      const supabaseRepo = new SupabaseGameRepository();

      // Get all games from localStorage
      const localGames = await localRepo.getAll();

      if (localGames.length === 0) {
        setStatus('success');
        setMessage('No data to migrate from localStorage');
        setMigrating(false);
        return;
      }

      // Check if Supabase already has games
      const supabaseGames = await supabaseRepo.getAll();

      if (supabaseGames.length > 0) {
        setStatus('error');
        setMessage(`You already have ${supabaseGames.length} games in the cloud. Migration skipped to avoid duplicates.`);
        setMigrating(false);
        return;
      }

      // Migrate each game
      let migrated = 0;
      for (const game of localGames) {
        try {
          const { id, createdAt, updatedAt, ...gameData } = game;
          await supabaseRepo.create(gameData);
          migrated++;
        } catch (error) {
          console.error('Error migrating game:', game.name, error);
        }
      }

      setStatus('success');
      setMessage(`Successfully migrated ${migrated} of ${localGames.length} games to the cloud! 🎉`);

      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    } catch (error) {
      console.error('Migration error:', error);
      setStatus('error');
      setMessage('Failed to migrate data. Please try again.');
    } finally {
      setMigrating(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="p-6 bg-blue-50 border-blue-200">
      <div className="flex items-start gap-4">
        <div className="text-3xl">☁️</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Migrate Your Data to the Cloud
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            You have data stored locally. Migrate it to the cloud to access it from any device!
          </p>

          {status === 'success' && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm">
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
              {message}
            </div>
          )}

          <Button
            onClick={migrateData}
            disabled={migrating || status === 'success'}
            size="sm"
          >
            {migrating ? 'Migrating...' : status === 'success' ? 'Migration Complete' : 'Migrate Now'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
