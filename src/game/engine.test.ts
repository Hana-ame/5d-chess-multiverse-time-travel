import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStagedMovePure,
  canSubmitCurrentTurn,
  computeAITurn,
  createInitialMultiverse,
  findThreatsToColorKings,
  getBoard,
  getBoardPlayableStatus,
  getLeafBoard,
  getLegalMovesForSquare,
  submitTurnPure,
  undoLastStagedMove,
  undoStagedMovesBackToBoard,
} from './engine';

test('initializes 5x5 tactical multiverse with Timeline 0 at t=0', () => {
  const state = createInitialMultiverse('tactical_5x5', 'ai');
  assert.equal(state.boardSize, 5);
  assert.deepEqual(state.timelineOrder, [0]);
  assert.equal(state.turnColor, 'w');
  assert.equal(state.presentStep, 0);

  const rootBoard = getBoard(state, 0, 0);
  assert.ok(rootBoard);
  assert.equal(rootBoard.isLeaf, true);
  assert.equal(rootBoard.squares[0][0]?.type, 'r');
  assert.equal(rootBoard.squares[0][4]?.type, 'k');

  const status = getBoardPlayableStatus(state, rootBoard);
  assert.equal(status.isPlayableBoard, true);
  assert.equal(status.isMandatoryPresent, true);
  assert.equal(status.statusLabel, 'status_playable_present');
});

test('stages a spatial pawn move on Timeline 0, advances leaf to t=1, and allows revising or submitting turn', () => {
  const state = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const moves = getLegalMovesForSquare(state, { l: 0, t: 0, x: 2, y: 1 });
  assert.ok(moves.length >= 1, 'Pawn at c2 should have legal forward moves');

  const move = moves.find((m) => m.to.x === 2 && m.to.y === 2 && m.kind === 'spatial');
  assert.ok(move, 'Should find 1-step spatial advance');

  const staged = applyStagedMovePure(state, move);
  assert.equal(staged.stagedMoves.length, 1);

  const originBoard = getBoard(staged, 0, 0)!;
  const originStatus = getBoardPlayableStatus(staged, originBoard);
  assert.equal(originStatus.isPlayableBoard, false);
  assert.equal(originStatus.isStagedOriginThisTurn, true);

  const leaf = getLeafBoard(staged, 0);
  assert.ok(leaf);
  assert.equal(leaf.t, 1);
  assert.equal(leaf.activeColor, 'b');
  assert.equal(leaf.squares[2][2]?.type, 'p');
  assert.equal(leaf.squares[1][2], null);

  const leafStatus = getBoardPlayableStatus(staged, leaf);
  assert.equal(leafStatus.isPlayableBoard, true);
  assert.equal(leafStatus.isStagedResultThisTurn, true);

  // Verify revising directly from the origin board rolls back cleanly
  const revised = undoStagedMovesBackToBoard(staged, 0, 0);
  assert.equal(revised.stagedMoves.length, 0);
  assert.equal(getLeafBoard(revised, 0)?.t, 0);

  const submitStatus = canSubmitCurrentTurn(staged);
  assert.equal(submitStatus.canSubmit, true);

  const submitted = submitTurnPure(staged);
  assert.equal(submitted.turnColor, 'b');
  assert.equal(submitted.stagedMoves.length, 0);
  assert.equal(submitted.moveHistory.length, 1);
});

test('executes a backward time-travel move in time_lab and branches Timeline +L1', () => {
  const state = createInitialMultiverse('time_lab', 'pass_and_play');
  // On L0, t=4 (Turn 3 White), White has a Rook at (x=0, y=2) and Queen at (x=3, y=2)
  const rookMoves = getLegalMovesForSquare(state, { l: 0, t: 4, x: 0, y: 2 });
  const timeJumpMove = rookMoves.find((m) => m.kind === 'timetravel_branch');
  assert.ok(timeJumpMove, 'Rook at a3 on T3W should have at least one backward time-travel move');

  const afterJump = applyStagedMovePure(state, timeJumpMove);
  assert.equal(afterJump.timeJumpsCount, 1);
  assert.equal(afterJump.timelinesCreatedCount, 2);
  assert.ok(afterJump.timelineOrder.includes(1), 'Should branch Timeline +1 for White');

  // Verify source board L0 advanced to t=5 without the Rook
  const l0Leaf = getLeafBoard(afterJump, 0);
  assert.ok(l0Leaf);
  assert.equal(l0Leaf.t, 5);
  assert.equal(l0Leaf.squares[2][0], null);

  // Verify new Timeline +1 has a leaf board at target.t + 1 with the Rook
  const l1Leaf = getLeafBoard(afterJump, 1);
  assert.ok(l1Leaf);
  assert.equal(l1Leaf.t, timeJumpMove.to.t + 1);
  assert.equal(l1Leaf.squares[timeJumpMove.to.y][timeJumpMove.to.x]?.type, 'r');

  // Verify undoLastStagedMove restores single timeline state
  const undone = undoLastStagedMove(afterJump);
  assert.deepEqual(undone.timelineOrder, [0]);
  assert.equal(undone.stagedMoves.length, 0);
  assert.equal(undone.timelinesCreatedCount, 1);
});

test('retrocausal puzzle detects cross-timeline check on Black past King and triggers victory', () => {
  const state = createInitialMultiverse('puzzle_retrocausal', 'ai');
  const queenMoves = getLegalMovesForSquare(state, { l: 0, t: 4, x: 3, y: 2 });
  assert.ok(queenMoves.length > 0);

  const staged = applyStagedMovePure(state, queenMoves[0]);
  const threatsOnBlack = findThreatsToColorKings(staged, 'b');
  assert.ok(threatsOnBlack.length > 0, 'White Rook at a5 should threaten Black past King at (L0, T1W, a5)');

  const submitted = submitTurnPure(staged);
  assert.equal(submitted.winner, 'w');
});

test('AI Chronomancer computes and submits a full valid turn', () => {
  let state = createInitialMultiverse('tactical_5x5', 'ai');
  const whiteMoves = getLegalMovesForSquare(state, { l: 0, t: 0, x: 2, y: 1 });
  state = applyStagedMovePure(state, whiteMoves[0]);
  state = submitTurnPure(state);
  assert.equal(state.turnColor, 'b');

  const afterAI = computeAITurn(state);
  assert.equal(afterAI.turnColor, 'w');
  assert.equal(afterAI.moveHistory.length, 2);
  const leaf = getLeafBoard(afterAI, 0);
  assert.ok(leaf && leaf.t >= 2);
});
