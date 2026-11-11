import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAITurn,
  createInitialMultiverse,
  getLegalMovesForSquare,
  getPlayableBoards,
} from './engine';

type MState = ReturnType<typeof createInitialMultiverse>;
type M5D = ReturnType<typeof getLegalMovesForSquare>[number];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function allLegalFor(state: MState, player: 'w' | 'b'): M5D[] {
  const playable = getPlayableBoards(state, player);
  const moves: M5D[] = [];
  for (const pb of playable) {
    for (let y = 0; y < state.boardSize; y++) {
      for (let x = 0; x < state.boardSize; x++) {
        const p = pb.board.squares[y][x];
        if (p && p.color === player) {
          moves.push(...getLegalMovesForSquare(state, { l: pb.board.l, t: pb.board.t, x, y }));
        }
      }
    }
  }
  return moves;
}

/**
 * REGRESSION: A player who still has at least one legal move (especially a spacetime
 * King escape via branch / merge / hop) must NEVER be declared checkmated.
 *
 * The old submitTurnPure check used `hasUnrescuableMandatoryBoard` — "some legal move
 * lands on the stuck board" — as a proxy for "the stuck board can be saved". That
 * ignored spacetime escapes whose destination is a DIFFERENT board, so a King that
 * COULD jump away was wrongly declared checkmated. Also, computeAITurn only searched
 * `targetBoards[0]`, so when the first mandatory board had no local move it declared
 * mate even if the King could escape from another board.
 */
test('a player with any legal escape (incl. spacetime) is never checkmated', () => {
  const variants = ['standard_8x8'] as const;
  for (const variant of variants) {
    for (const seed of [4]) {
      const rng = mulberry32(seed);
      let state = createInitialMultiverse(variant, 'pass_and_play');
      let guard = 0;
      while (!state.winner && guard < 120) {
        guard++;
        const after = computeAITurn(state);
        if (after.winner && after.winner !== 'draw') {
          const loser = after.winner === 'w' ? 'b' : 'w';
          const loserMoves = allLegalFor(after, loser);
          const escape = loserMoves.filter(
            (m) => m.piece.type === 'k' && (m.from.l !== m.to.l || m.from.t !== m.to.t)
          );
          assert.equal(
            loserMoves.length,
            0,
            `FALSE MATE: variant=${variant} seed=${seed} guard=${guard} winner=${after.winner} ` +
              `loser=${loser} still has ${loserMoves.length} legal moves (${escape.length} King spacetime escapes)`
          );
        }
        state = after;
      }
    }
  }
});
