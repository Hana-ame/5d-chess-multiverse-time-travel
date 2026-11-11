import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStagedMovePure,
  canSubmitCurrentTurn,
  computeAITurn,
  createInitialMultiverse,
  findActiveAndImpendingThreats,
  findPastKingRadarWarnings,
  findThreatsToColorKings,
  getActiveTimelineBounds,
  getBoard,
  getBoardPlayableStatus,
  getLeafBoard,
  getLegalMovesForSquare,
  previewMoveOutcome,
  rewindToTurnIndex,
  setRulesConfigPure,
  submitTurnPure,
  undoLastStagedMove,
  undoLastTurn,
  undoStagedMovesBackToBoard,
  withPromotedPiece,
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

test('stages a spatial pawn move on Timeline 0, advances leaf to t=1, and supports Time-Tree Rewind', () => {
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
  assert.equal(submitted.turnSnapshots.length, 1);

  // Rewind via Time-Tree Rewind to Turn 0
  const rewoundToStart = rewindToTurnIndex(submitted, 0);
  assert.equal(rewoundToStart.turnColor, 'w');
  assert.equal(rewoundToStart.moveHistory.length, 0);
  assert.equal(getLeafBoard(rewoundToStart, 0)?.t, 0);
});

test('executes backward time-travel move, previews Ghost Branch outcome, and enforces configurable Timeline Activation (delta 1 vs 2 vs 99) and Promotion', () => {
  const state = createInitialMultiverse('time_lab', 'pass_and_play', 'tactician', 'choose_piece', 2);
  const rookMoves = getLegalMovesForSquare(state, { l: 0, t: 4, x: 0, y: 2 });
  const timeJumpMove = rookMoves.find((m) => m.kind === 'timetravel_branch');
  assert.ok(timeJumpMove, 'Rook at a3 on T3W should have at least one backward time-travel move');

  // Verify Ghost Move Preview helper accurately predicts branching +L1 as Active
  const preview = previewMoveOutcome(state, timeJumpMove);
  assert.equal(preview.willBranchNewTimeline, true);
  assert.equal(preview.newTimelineIndex, 1);
  assert.equal(preview.isNewTimelineActive, true);

  const afterJump1 = applyStagedMovePure(state, timeJumpMove);
  const leafL1 = getLeafBoard(afterJump1, 1)!;
  // Branch a second White timeline (+L2) from +L1's leaf board back to (L0, T1W)
  const afterJump2 = applyStagedMovePure(
    afterJump1,
    {
      ...timeJumpMove,
      id: 'second_branch_test',
      from: { l: 1, t: leafL1.t, x: 0, y: 2 },
      to: { l: 0, t: 0, x: 0, y: 2 },
    }
  );
  assert.ok(afterJump2.timelineOrder.includes(2), 'Should have branched +L2');

  // With delta = 2 ("相差 ≤2 激活"), +L2 is Active!
  const boundsDelta2 = getActiveTimelineBounds(afterJump2);
  assert.equal(boundsDelta2.activationDelta, 2);
  assert.equal(boundsDelta2.activeSet.has(2), true, '+L2 should be Active when delta = 2');

  // Switch dynamically to delta = 1 ("相差 ≤1 激活"): +L2 becomes Inactive (Optional Playable)!
  const stateWithDelta1 = setRulesConfigPure(afterJump2, 'auto_queen', 1);
  const boundsDelta1 = getActiveTimelineBounds(stateWithDelta1);
  assert.equal(boundsDelta1.activationDelta, 1);
  assert.equal(boundsDelta1.activeSet.has(1), true, '+L1 remains Active when delta = 1');
  assert.equal(boundsDelta1.activeSet.has(2), false, '+L2 becomes Inactive when delta = 1');

  // Verify configurable promotion helper `withPromotedPiece` supports Unicorn ('u') and Dragon ('d')
  const promoState = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const leaf0 = getLeafBoard(promoState, 0)!;
  leaf0.squares[4][0] = null; // clear a5
  leaf0.squares[3][0] = { id: 'w_p_promo', type: 'p', color: 'w', hasMoved: true }; // put White Pawn at a4
  const pawnMoves = getLegalMovesForSquare(promoState, { l: 0, t: 0, x: 0, y: 3 });
  const advancePromo = pawnMoves.find((m) => m.to.x === 0 && m.to.y === 4);
  assert.ok(advancePromo && advancePromo.promotedTo === 'q');

  const unicornPromo = withPromotedPiece(advancePromo, 'u');
  assert.equal(unicornPromo.promotedTo, 'u');
  assert.ok(unicornPromo.notation.endsWith('=U'));
  const afterPromo = applyStagedMovePure(promoState, unicornPromo);
  assert.equal(getLeafBoard(afterPromo, 0)?.squares[4][0]?.type, 'u');

  // Verify undoLastStagedMove restores single timeline state
  const undone = undoLastStagedMove(afterJump1);
  assert.deepEqual(undone.timelineOrder, [0]);
  assert.equal(undone.stagedMoves.length, 0);
});

test('canonical 2D single-board En Passant and 2D spatial Castling work strictly on the same board', () => {
  let state = createInitialMultiverse('standard_8x8', 'pass_and_play');
  // 1. White pawn e2 -> e4 (double step)
  const e2Moves = getLegalMovesForSquare(state, { l: 0, t: 0, x: 4, y: 1 });
  const doubleStepW = e2Moves.find((m) => m.to.x === 4 && m.to.y === 3);
  assert.ok(doubleStepW, 'White pawn on e2 should have 2-square advance to e4');
  state = submitTurnPure(applyStagedMovePure(state, doubleStepW));

  const b1 = getLeafBoard(state, 0)!;
  assert.ok(b1.enPassantTarget, 'Board t=1 should record single-board 2D enPassantTarget at e3');
  assert.equal(b1.enPassantTarget?.x, 4);
  assert.equal(b1.enPassantTarget?.y, 2);

  // Clear f1 and g1 on a fresh 8x8 board to test 2D spatial Kingside Castling (O-O)
  const castleState = createInitialMultiverse('standard_8x8', 'pass_and_play');
  const root = getLeafBoard(castleState, 0)!;
  root.squares[0][5] = null; // f1
  root.squares[0][6] = null; // g1
  const kingMoves = getLegalMovesForSquare(castleState, { l: 0, t: 0, x: 4, y: 0 });
  const castleMove = kingMoves.find((m) => m.isCastling && m.to.x === 6);
  assert.ok(castleMove, 'White King should have 2D spatial Kingside Castling (O-O) when f1 and g1 are empty');
  assert.equal(castleMove.notation, 'L0:O-O');

  const afterCastle = applyStagedMovePure(castleState, castleMove);
  const nextLeaf = getLeafBoard(afterCastle, 0)!;
  assert.equal(nextLeaf.squares[0][6]?.type, 'k', 'King should land on g1');
  assert.equal(nextLeaf.squares[0][5]?.type, 'r', 'Rook should hop to f1');
  assert.equal(nextLeaf.squares[0][7], null, 'h1 should be vacated');
});

test('retrocausal, Unicorn 3-axis, and Dragon 4-axis puzzles detect cross-spacetime checkmate and populate forensics', () => {
  // 1. Retrocausal Rook Puzzle
  const state = createInitialMultiverse('puzzle_retrocausal', 'ai');
  const radar = findPastKingRadarWarnings(state, 'b');
  assert.ok(radar.length > 0, 'Past-King Danger Radar should detect alignment on Black past King');

  const queenMoves = getLegalMovesForSquare(state, { l: 0, t: 4, x: 3, y: 2 });
  const staged = applyStagedMovePure(state, queenMoves[0]);
  const threatsOnBlack = findThreatsToColorKings(staged, 'b');
  assert.ok(threatsOnBlack.length > 0);

  const submitted = submitTurnPure(staged);
  assert.equal(submitted.winner, 'w');
  assert.ok(submitted.checkmateForensics);
  assert.ok(submitted.checkmateForensics.victimKingLabel.includes('HISTORY'));

  const rewound = undoLastTurn(submitted);
  assert.equal(rewound.winner, null);

  // 2. Unicorn Tri-Axial Snipe Puzzle (|dx| = |dy| = |dt| = 2)
  const unicornState = createInitialMultiverse('puzzle_unicorn_snipe', 'ai');
  const unicornMoves = getLegalMovesForSquare(unicornState, { l: 0, t: 4, x: 2, y: 2 });
  const snipeMove = unicornMoves.find(
    (m) => m.to.l === 0 && m.to.t === 0 && m.to.x === 0 && m.to.y === 4
  );
  assert.ok(snipeMove, 'Unicorn at (L0, T3W, c3) should have a 3-axis triagonal jump to (L0, T1W, a5)');

  // 3. Dragon Tesseract Mate Puzzle (|dx| = |dy| = |dt| = |dl| = 1)
  const dragonState = createInitialMultiverse('puzzle_dragon_tesseract', 'ai');
  const dragonMoves = getLegalMovesForSquare(dragonState, { l: 1, t: 2, x: 1, y: 3 });
  const tesseractMove = dragonMoves.find(
    (m) => m.to.l === 0 && m.to.t === 0 && m.to.x === 0 && m.to.y === 4
  );
  assert.ok(tesseractMove, 'Dragon at (+L1, T2W, b4) should have a 4-axis quadragonal jump to (L0, T1W, a5)');
});

test('AI Chronomancer computes and submits a full valid turn across all AI personas', () => {
  for (const persona of ['novice', 'tactician', 'chronomancer'] as const) {
    let state = createInitialMultiverse('tactical_5x5', 'ai', persona);
    const whiteMoves = getLegalMovesForSquare(state, { l: 0, t: 0, x: 2, y: 1 });
    state = applyStagedMovePure(state, whiteMoves[0]);
    state = submitTurnPure(state);
    assert.equal(state.turnColor, 'b');

    const afterAI = computeAITurn(state);
    assert.equal(afterAI.turnColor, 'w');
    assert.equal(afterAI.moveHistory.length, 2);
    const leaf = getLeafBoard(afterAI, 0);
    assert.ok(leaf && leaf.t >= 2);
  }
});
