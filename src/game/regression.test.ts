import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStagedMovePure,
  canSubmitCurrentTurn,
  computeAITurn,
  createInitialMultiverse,
  findActiveAndImpendingThreats,
  findThreatsToColorKings,
  getLegalMovesForSquare,
  getPlayableBoards,
  hasAnyLegalTurnMove,
  submitTurnPure,
} from './engine';

/**
 * REGRESSION: A move that leaves ANY of the mover's kings in check must be illegal,
 * even when the check is on a board that is NOT the current move's resulting board.
 *
 * Furthermore, whenever a match concludes via checkmate or stalemate, the incoming player
 * must truly have zero valid turn completions (`hasAnyLegalTurnMove === false`), and
 * checkmate must be backed by at least one active or impending threat vector.
 */
test('no legal move may leave the mover in check on any board (non-resulting boards included) and all checkmates/stalemates are genuine', () => {
  function mulberry32(seed: number) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  for (const variant of ['tactical_5x5', 'time_lab', 'standard_8x8', 'royal_unicorn'] as const) {
    const rng = mulberry32(4);
    let state = createInitialMultiverse(variant, 'ai');
    let guard = 0;
    while (!state.winner && guard < 20) {
      guard++;
      const playable = getPlayableBoards(state, state.turnColor);
      const mandatory = playable.filter((p) => p.isMandatory);
      const targets = mandatory.length > 0 ? mandatory : playable.filter((p) => p.isActiveTimeline);
      const cands: any[] = [];
      for (const t of targets) {
        for (let y = 0; y < state.boardSize; y++) for (let x = 0; x < state.boardSize; x++) {
          const p = t.board.squares[y][x];
          if (p && p.color === state.turnColor) {
            cands.push(...getLegalMovesForSquare(state, { l: t.board.l, t: t.board.t, x, y }));
          }
        }
      }
      if (cands.length === 0) break;
      const pick = cands[Math.floor(rng() * cands.length)];
      const moverColor = state.turnColor; // the color about to act
      state = applyStagedMovePure(state, pick);
      // The mover must not be in check on ANY board after their own legal move.
      const stillInCheck = findThreatsToColorKings(state, moverColor);
      assert.equal(
        stillInCheck.length,
        0,
        `${variant}: a legal move left the mover (${moverColor}) in check on a non-resulting board. Threats: ` +
          stillInCheck.map((t) => `${t.from.l},${t.from.t}->${t.to.l},${t.to.t}`).join('; ')
      );
      if (canSubmitCurrentTurn(state).canSubmit) {
        state = submitTurnPure(state);
      }
      if (state.winner) break;
      if (state.turnColor === 'b') {
        state = computeAITurn(state);
      }
      if (state.winner) break;
    }

    if (state.winner && state.checkmateForensics?.kind !== 'king_captured') {
      assert.equal(
        hasAnyLegalTurnMove(state, state.turnColor),
        false,
        `${variant}: game ended with winner=${state.winner}, but ${state.turnColor} still had a legal turn move!`
      );
      const threatsOnVictim = findActiveAndImpendingThreats(state, state.turnColor);
      if (state.winner === 'draw') {
        assert.equal(threatsOnVictim.length, 0, `${variant}: stalemate declared while victim was in check`);
      } else {
        assert.ok(threatsOnVictim.length > 0, `${variant}: checkmate declared without any active or impending threat`);
      }
    }
  }
});
