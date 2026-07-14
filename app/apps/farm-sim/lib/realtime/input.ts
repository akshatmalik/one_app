// ============================================================================
// Farm Sim — Keyboard input state.
// A plain mutable object held in a ref; avoids React re-renders on keypress.
// ============================================================================

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean; // Z key or Enter — use tool on facing tile
  run: boolean;    // Shift — move faster
}

export function makeInputState(): InputState {
  return { up: false, down: false, left: false, right: false, action: false, run: false };
}

/**
 * Attach keyboard listeners to window.
 * Returns a cleanup function — call it in useEffect's return.
 */
export function attachKeyboard(state: InputState): () => void {
  const onDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': state.up    = true; break;
      case 'ArrowDown':  case 's': case 'S': state.down  = true; break;
      case 'ArrowLeft':  case 'a': case 'A': state.left  = true; break;
      case 'ArrowRight': case 'd': case 'D': state.right = true; break;
      case 'z': case 'Z': case 'Enter':      state.action = true; break;
      case 'Shift':                           state.run   = true; break;
    }
  };

  const onUp = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': state.up    = false; break;
      case 'ArrowDown':  case 's': case 'S': state.down  = false; break;
      case 'ArrowLeft':  case 'a': case 'A': state.left  = false; break;
      case 'ArrowRight': case 'd': case 'D': state.right = false; break;
      case 'z': case 'Z': case 'Enter':      state.action = false; break;
      case 'Shift':                           state.run   = false; break;
    }
  };

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
  };
}
