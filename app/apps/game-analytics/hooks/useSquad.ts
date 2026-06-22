'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SquadMember,
  getSquadMembers,
  addSquadMember,
  refreshSquadMember,
  removeSquadMember,
} from '../lib/squad-storage';

export function useSquad(userId: string | null) {
  const uid = userId ?? 'local-user';
  const [members, setMembers] = useState<SquadMember[]>([]);

  const refresh = useCallback(() => {
    setMembers(getSquadMembers(uid));
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFromCode = useCallback((code: string): boolean => {
    const member = addSquadMember(uid, code);
    if (!member) return false;
    refresh();
    return true;
  }, [uid, refresh]);

  const refreshCode = useCallback((id: string, code: string): boolean => {
    const member = refreshSquadMember(uid, id, code);
    if (!member) return false;
    refresh();
    return true;
  }, [uid, refresh]);

  const remove = useCallback((id: string) => {
    removeSquadMember(uid, id);
    refresh();
  }, [uid, refresh]);

  return { members, addFromCode, refreshCode, remove };
}
