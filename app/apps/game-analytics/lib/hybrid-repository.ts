import { isFirebaseConfigured } from '@/lib/firebase';

/**
 * Generic Hybrid repository base.
 *
 * Every domain (games, budget, goals, profile, rankings, recommendations,
 * purchase queue) implemented the same "switch between Firebase and
 * localStorage based on whether there's a real signed-in user" wrapper. This
 * base centralizes that switching so each Hybrid subclass only forwards its
 * domain-specific methods to `this.repo`.
 */

export interface UserScopedRepository {
  setUserId(userId: string): void;
}

export abstract class HybridRepository<R extends UserScopedRepository> {
  protected useFirebase = false;

  constructor(protected firebaseRepo: R, protected localRepo: R) {}

  setUserId(userId: string): void {
    // Only use Firebase for real user IDs, not the 'local-user' sentinel.
    const isRealUser = !!userId && userId !== 'local-user';
    this.useFirebase = isRealUser && isFirebaseConfigured();
    this.firebaseRepo.setUserId(userId);
    this.localRepo.setUserId(userId || 'local-user');
  }

  protected get repo(): R {
    return this.useFirebase ? this.firebaseRepo : this.localRepo;
  }
}
