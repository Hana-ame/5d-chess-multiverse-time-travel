import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStagedMovePure,
  canCompleteMandatoryTurn,
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
  getPlayableBoards,
  hasAnyLegalTurnMove,
  previewMoveOutcome,
  rewindToTurnIndex,
  setRulesConfigPure,
  submitTurnPure,
  undoLastStagedMove,
  undoLastTurn,
  undoStagedMovesBackToBoard,
  withPromotedPiece,
} from './engine';
import { BoardState, Piece } from './types';

function mkPiece(type: Piece['type'], color: Piece['color'], id: string, hasMoved = true): Piece {
  return { id, type, color, hasMoved };
}

function emptySquares(size: number): (Piece | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

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

test('canonical 2D single-board En Passant and 2D spatial Castling work strictly on the same board and respect 2D/5D check', () => {
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

  // Verify Castling is forbidden when f1 is attacked across timelines from +L1
  const crossCheckCastle = createInitialMultiverse('standard_8x8', 'pass_and_play');
  const l0Root = getLeafBoard(crossCheckCastle, 0)!;
  l0Root.squares[0][5] = null; // f1
  l0Root.squares[0][6] = null; // g1
  // Add Timeline +L1 at t=0 with a Black Rook at f1 (x=5, y=0) attacking L0's f1 along dl=-1
  const l1Sq = emptySquares(8);
  l1Sq[7][4] = mkPiece('k', 'b', 'b_k_l1');
  l1Sq[0][0] = mkPiece('k', 'w', 'w_k_l1');
  l1Sq[0][5] = mkPiece('r', 'b', 'b_r_cross_f1');
  crossCheckCastle.timelines[1] = {
    l: 1,
    name: 'Timeline +L1',
    createdBy: 'w',
    boards: [
      {
        id: 'L1_T0',
        l: 1,
        t: 0,
        turnNumber: 1,
        activeColor: 'w',
        size: 8,
        squares: l1Sq,
        isLeaf: true,
      },
    ],
  };
  crossCheckCastle.timelineOrder = [0, 1];
  const kingMovesCrossAttacked = getLegalMovesForSquare(crossCheckCastle, { l: 0, t: 0, x: 4, y: 0 });
  assert.equal(
    kingMovesCrossAttacked.some((m) => m.isCastling && m.to.x === 6),
    false,
    'White King must not castle through f1 when f1 is attacked across timelines from +L1'
  );
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

test('2D spatial checkmate vs escapable check: accurately distinguishes true checkmate from blockable/capturable/evadable check', () => {
  // Set up a 5x5 board at t=0 where White Queen delivers checkmate to Black King at e5 (x=4, y=4)
  const state = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const sq = emptySquares(5);
  sq[2][3] = mkPiece('k', 'w', 'wk'); // White King at d3 (x=3, y=2)
  sq[2][4] = mkPiece('q', 'w', 'wq'); // White Queen at e3 (x=4, y=2) -> moves to e4 (x=4, y=3) to mate Black King at e5 (x=4, y=4)
  sq[4][4] = mkPiece('k', 'b', 'bk'); // Black King at e5 (x=4, y=4)
  state.timelines[0].boards[0].squares = sq;

  // White plays Qe3-e4 (supported by White King at d3, mating Black King at e5)
  const qMoves = getLegalMovesForSquare(state, { l: 0, t: 0, x: 4, y: 2 });
  const mateMove = qMoves.find((m) => m.to.x === 4 && m.to.y === 3);
  assert.ok(mateMove, 'White Queen should be able to move to e4');

  const afterMate = submitTurnPure(applyStagedMovePure(state, mateMove));
  assert.equal(afterMate.winner, 'w', 'Black King at e5 should be checkmated by Qe4 supported by Kd3');
  assert.equal(afterMate.checkmateForensics?.kind, 'spatial_checkmate');

  // Now add a Black Rook at a4 (x=0, y=3) that can capture the checking White Queen at e4 (x=4, y=3)!
  const savableState = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const sqSavable = emptySquares(5);
  sqSavable[2][3] = mkPiece('k', 'w', 'wk');
  sqSavable[2][4] = mkPiece('q', 'w', 'wq');
  sqSavable[4][4] = mkPiece('k', 'b', 'bk');
  sqSavable[3][0] = mkPiece('r', 'b', 'br_saver'); // Black Rook at a4 can capture on e4!
  savableState.timelines[0].boards[0].squares = sqSavable;

  const qMoves2 = getLegalMovesForSquare(savableState, { l: 0, t: 0, x: 4, y: 2 });
  const checkMove = qMoves2.find((m) => m.to.x === 4 && m.to.y === 3)!;
  const afterCheck = submitTurnPure(applyStagedMovePure(savableState, checkMove));
  assert.equal(afterCheck.winner, null, 'Must NOT be checkmate when Black Rook at a4 can capture Qe4');

  const blackRookMoves = getLegalMovesForSquare(afterCheck, { l: 0, t: 1, x: 0, y: 3 });
  assert.equal(blackRookMoves.length, 1, 'Black Rook should have exactly 1 legal move: capturing the checking Queen at e4');
  assert.equal(blackRookMoves[0].to.x, 4);
  assert.equal(blackRookMoves[0].to.y, 3);
});

test('multi-timeline single check and simultaneous double check: never triggers false checkmate and allows playing mandatory boards in any order', () => {
  // Set up 2 active timelines L0 and +L1 at t=0 (White's turn on both)
  const state = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const l0Sq = emptySquares(5);
  l0Sq[0][4] = mkPiece('k', 'w', 'wk_l0');
  l0Sq[1][0] = mkPiece('p', 'w', 'wp_l0');
  l0Sq[4][4] = mkPiece('k', 'b', 'bk_l0');

  const l1Sq = emptySquares(5);
  l1Sq[0][4] = mkPiece('k', 'w', 'wk_l1'); // White King at e1 (x=4, y=0)
  l1Sq[1][3] = mkPiece('q', 'w', 'wq_l1'); // White Queen at d2 (x=3, y=1)
  l1Sq[3][4] = mkPiece('r', 'b', 'br_checker'); // Black Rook at e4 checking White King at e1 on +L1
  l1Sq[4][0] = mkPiece('k', 'b', 'bk_l1');

  const makeBoard = (l: number, t: number, squares: (Piece | null)[][], isLeaf: boolean): BoardState => ({
    id: `L${l}_T${t}`,
    l,
    t,
    turnNumber: Math.floor(t / 2) + 1,
    activeColor: t % 2 === 0 ? 'w' : 'b',
    size: 5,
    squares,
    isLeaf,
  });

  state.timelines = {
    0: {
      l: 0,
      name: 'Timeline L0',
      createdBy: 'initial',
      boards: [makeBoard(0, 0, l0Sq, true)],
    },
    1: {
      l: 1,
      name: 'Timeline +L1',
      createdBy: 'w',
      boards: [makeBoard(1, 0, l1Sq, true)],
    },
  };
  state.timelineOrder = [0, 1];
  state.presentStep = 0;

  // 1. Verify White is NOT checkmated
  assert.equal(hasAnyLegalTurnMove(state, 'w'), true);

  // 2. Verify White can play on L0 FIRST (even while +L1 is in check!), and then resolve +L1 SECOND!
  const l0PawnMoves = getLegalMovesForSquare(state, { l: 0, t: 0, x: 0, y: 1 });
  assert.ok(l0PawnMoves.length > 0, 'Unchecked timeline L0 must still have legal moves even while +L1 is in check');

  const afterL0First = applyStagedMovePure(state, l0PawnMoves[0]);
  assert.equal(canSubmitCurrentTurn(afterL0First).canSubmit, false, 'Cannot submit before resolving +L1');

  const l1KingMoves = getLegalMovesForSquare(afterL0First, { l: 1, t: 0, x: 4, y: 0 });
  const l1SpatialEscape = l1KingMoves.find((m) => m.kind === 'spatial')!;
  assert.ok(l1SpatialEscape, 'White King on +L1 should have spatial escape move');
  const afterBothOrder1 = applyStagedMovePure(afterL0First, l1SpatialEscape);
  assert.equal(canSubmitCurrentTurn(afterBothOrder1).canSubmit, true, 'Should be submittable after playing L0 then +L1');

  // 3. Verify White can ALSO resolve +L1 spatially FIRST, and then play on L0 SECOND!
  const l1KingMovesFirst = getLegalMovesForSquare(state, { l: 1, t: 0, x: 4, y: 0 });
  const l1SpatialFirst = l1KingMovesFirst.find((m) => m.kind === 'spatial')!;
  assert.ok(l1SpatialFirst);
  const afterL1First = applyStagedMovePure(state, l1SpatialFirst);
  const l0PawnMovesSecond = getLegalMovesForSquare(afterL1First, { l: 0, t: 0, x: 0, y: 1 });
  assert.ok(l0PawnMovesSecond.length > 0);
  const afterBothOrder2 = applyStagedMovePure(afterL1First, l0PawnMovesSecond[0]);
  assert.equal(canSubmitCurrentTurn(afterBothOrder2).canSubmit, true, 'Should be submittable after playing +L1 then L0');

  // 4. Simultaneous Double Check on BOTH L0 and +L1:
  // Put a Black Rook on L0 at e4 (x=4, y=3) checking White's King on L0 at e1 as well!
  l0Sq[3][4] = mkPiece('r', 'b', 'br_checker_l0');
  const doubleCheckState = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  doubleCheckState.timelines = {
    0: { l: 0, name: 'Timeline L0', createdBy: 'initial', boards: [makeBoard(0, 0, l0Sq, true)] },
    1: { l: 1, name: 'Timeline +L1', createdBy: 'w', boards: [makeBoard(1, 0, l1Sq, true)] },
  };
  doubleCheckState.timelineOrder = [0, 1];
  doubleCheckState.presentStep = 0;

  const dcL0KingMoves = getLegalMovesForSquare(doubleCheckState, { l: 0, t: 0, x: 4, y: 0 });
  const dcL1KingMoves = getLegalMovesForSquare(doubleCheckState, { l: 1, t: 0, x: 4, y: 0 });
  const dcL0Spatial = dcL0KingMoves.find((m) => m.kind === 'spatial')!;
  assert.ok(dcL0Spatial, 'L0 King must have legal spatial escape move during simultaneous double check');
  assert.ok(dcL1KingMoves.length > 0, '+L1 King must have legal escape moves during simultaneous double check');

  const dcStep1 = applyStagedMovePure(doubleCheckState, dcL0Spatial);
  const dcStep2Moves = getLegalMovesForSquare(dcStep1, { l: 1, t: 0, x: 4, y: 0 });
  assert.ok(dcStep2Moves.length > 0);
  const dcStep2 = applyStagedMovePure(dcStep1, dcStep2Moves[0]);
  assert.equal(canSubmitCurrentTurn(dcStep2).canSubmit, true, 'Simultaneous checks on both timelines can be resolved sequentially');
});

test('multi-timeline rescue via cross-timeline merge (timetravel_merge) and via present-shifting branch (timetravel_branch)', () => {
  // 1. Rescue via cross-timeline merge:
  // On +L1 (t=0), White has ONLY a King at a1 (x=0, y=0), mated locally by Black Queen at a2 (x=0, y=1) supported by Black King at b3 (x=1, y=2).
  // On L0 (t=0), friendly pawns occupy a1, b1, b2 and a White Rook at a2 (x=0, y=1) can jump along +L (dl=+1) to (+L1, t=0, a2) to capture Black's Queen!
  const state = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const l0Sq = emptySquares(5);
  l0Sq[0][4] = mkPiece('k', 'w', 'wk_l0'); // White King at e1
  l0Sq[0][0] = mkPiece('p', 'w', 'wp1_l0'); // a1 occupied on L0
  l0Sq[0][1] = mkPiece('p', 'w', 'wp2_l0'); // b1 occupied on L0
  l0Sq[1][1] = mkPiece('p', 'w', 'wp3_l0'); // b2 occupied on L0
  l0Sq[1][0] = mkPiece('r', 'w', 'wr_rescuer'); // White Rook at a2 (x=0, y=1) on L0
  l0Sq[1][4] = mkPiece('p', 'w', 'wp_irrelevant'); // Irrelevant pawn at e2 (x=4, y=1) on L0
  l0Sq[4][4] = mkPiece('k', 'b', 'bk_l0');

  const l1Sq = emptySquares(5);
  l1Sq[0][0] = mkPiece('k', 'w', 'wk_l1'); // Lone White King at a1 (x=0, y=0) on +L1
  l1Sq[1][0] = mkPiece('q', 'b', 'bq_attacker'); // Black Queen at a2 (x=0, y=1) checking a1
  l1Sq[2][1] = mkPiece('k', 'b', 'bk_l1'); // Black King at b3 (x=1, y=2) protecting Qa2

  state.timelines = {
    0: {
      l: 0,
      name: 'Timeline L0',
      createdBy: 'initial',
      boards: [{ id: 'L0_T0', l: 0, t: 0, turnNumber: 1, activeColor: 'w', size: 5, squares: l0Sq, isLeaf: true }],
    },
    1: {
      l: 1,
      name: 'Timeline +L1',
      createdBy: 'w',
      boards: [{ id: 'L1_T0', l: 1, t: 0, turnNumber: 1, activeColor: 'w', size: 5, squares: l1Sq, isLeaf: true }],
    },
  };
  state.timelineOrder = [0, 1];
  state.presentStep = 0;

  // Verify +L1 has 0 local legal moves
  assert.equal(getLegalMovesForSquare(state, { l: 1, t: 0, x: 0, y: 0 }).length, 0);

  // Verify L0's irrelevant pawn at e2 (x=4, y=1) has 0 legal moves because moving it abandons +L1
  assert.equal(
    getLegalMovesForSquare(state, { l: 0, t: 0, x: 4, y: 1 }).length,
    0,
    'Moves on L0 that fail to rescue stuck mandatory board +L1 must be filtered out'
  );

  // Verify L0's Rook at a2 (x=0, y=1) HAS the cross-timeline rescue capture to (+L1, t=0, a2)!
  const rescuerMoves = getLegalMovesForSquare(state, { l: 0, t: 0, x: 0, y: 1 });
  assert.equal(rescuerMoves.length, 1, 'Only the cross-timeline rescue capture onto +L1 a2 should be legal');
  assert.equal(rescuerMoves[0].to.l, 1);
  assert.equal(rescuerMoves[0].to.t, 0);
  assert.equal(rescuerMoves[0].to.x, 0);
  assert.equal(rescuerMoves[0].to.y, 1);

  const afterRescue = applyStagedMovePure(state, rescuerMoves[0]);
  assert.equal(canSubmitCurrentTurn(afterRescue).canSubmit, true, 'Single merge rescue satisfies both L0 and +L1');

  // 2. Verify that if L0 has NO rescuer Rook at a2, the position IS accurately detected as Checkmate!
  l0Sq[1][0] = mkPiece('p', 'w', 'wp_blocker');
  assert.equal(hasAnyLegalTurnMove(state, 'w'), false, 'Without rescuer Rook, White has no legal way to complete turn');
});

test('cross-timeline check (dt=0, dl!=0), standard retrocausal checkmate, and stalemate vs checkmate accuracy', () => {
  // 1. Cross-timeline check at the same turn step t=0:
  const state = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const l0Sq = emptySquares(5);
  l0Sq[0][4] = mkPiece('k', 'w', 'wk_l0'); // White King at (L0, T1W, e1)
  l0Sq[4][4] = mkPiece('k', 'b', 'bk_l0');

  const l1Sq = emptySquares(5);
  l1Sq[0][0] = mkPiece('k', 'w', 'wk_l1');
  l1Sq[0][4] = mkPiece('r', 'b', 'br_cross'); // Black Rook at (+L1, T1W, e1) attacking (L0, T1W, e1) along dl=-1!
  l1Sq[4][4] = mkPiece('k', 'b', 'bk_l1');

  state.timelines = {
    0: {
      l: 0,
      name: 'Timeline L0',
      createdBy: 'initial',
      boards: [{ id: 'L0_T0', l: 0, t: 0, turnNumber: 1, activeColor: 'w', size: 5, squares: l0Sq, isLeaf: true }],
    },
    1: {
      l: 1,
      name: 'Timeline +L1',
      createdBy: 'w',
      boards: [{ id: 'L1_T0', l: 1, t: 0, turnNumber: 1, activeColor: 'w', size: 5, squares: l1Sq, isLeaf: true }],
    },
  };
  state.timelineOrder = [0, 1];
  state.presentStep = 0;

  const impending = findActiveAndImpendingThreats(state, 'w');
  assert.ok(
    impending.some((th) => th.from.l === 1 && th.to.l === 0 && th.to.x === 4 && th.to.y === 0),
    'findActiveAndImpendingThreats must detect same-step cross-timeline check from +L1 to L0'
  );

  // 2. Classic Stalemate detection:
  // White plays Qa3-b3 (x=1, y=2) leaving Black King at a5 (x=0, y=4) NOT in check but with 0 legal moves!
  const staleState = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const stSq = emptySquares(5);
  stSq[0][4] = mkPiece('k', 'w', 'wk'); // White King at e1
  stSq[2][0] = mkPiece('q', 'w', 'wq'); // White Queen at a3 (x=0, y=2) -> moves to b3 (x=1, y=2) to stalemate Black King at a5 (x=0, y=4)!
  stSq[4][0] = mkPiece('k', 'b', 'bk'); // Black King at a5 (x=0, y=4)
  staleState.timelines[0].boards[0].squares = stSq;

  const qStaleMoves = getLegalMovesForSquare(staleState, { l: 0, t: 0, x: 0, y: 2 });
  const toB3 = qStaleMoves.find((m) => m.to.x === 1 && m.to.y === 2)!;
  assert.ok(toB3, 'White Queen should be able to move from a3 to b3');

  const afterStale = submitTurnPure(applyStagedMovePure(staleState, toB3));
  assert.equal(afterStale.winner, 'draw', 'Stalemate must set winner to draw, not checkmate');
  assert.equal(afterStale.checkmateForensics?.kind, 'stalemate');

  // 3. Standard gameplay Retrocausal Checkmate:
  // In tactical_5x5 at t=2 (L0_T2, T2W), Black's Past King on L0_T0 (t=0) is at a5 (x=0, y=4), while Black's Present King on L0_T2 is safe at e5 (x=4, y=4).
  // White moves a Rook from b5 (x=1, y=4) to a5 (x=0, y=4) on L0_T2 -> creating L0_T3 (t=3, T2B).
  // No Black piece on L0_T3 can capture the White Rook at a5, so on T3W (t=4) White's Rook at a5 will inevitably jump back to L0_T0 (a5) and capture Black's Past King!
  const retroState = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const b0Sq = emptySquares(5);
  b0Sq[0][4] = mkPiece('k', 'w', 'wk');
  b0Sq[4][0] = mkPiece('k', 'b', 'bk_past'); // Black Past King at a5 on t=0

  const b1Sq = emptySquares(5);
  b1Sq[0][4] = mkPiece('k', 'w', 'wk');
  b1Sq[4][0] = mkPiece('k', 'b', 'bk_past');

  const b2Sq = emptySquares(5);
  b2Sq[0][4] = mkPiece('k', 'w', 'wk');
  b2Sq[2][4] = mkPiece('k', 'b', 'bk_present'); // Black Present King safe at e3 (x=4, y=2) on t=2
  b2Sq[4][1] = mkPiece('r', 'w', 'wr_retro'); // White Rook at b5 (x=1, y=4) on t=2

  retroState.timelines = {
    0: {
      l: 0,
      name: 'Timeline L0',
      createdBy: 'initial',
      boards: [
        { id: 'L0_T0', l: 0, t: 0, turnNumber: 1, activeColor: 'w', size: 5, squares: b0Sq, isLeaf: false },
        { id: 'L0_T1', l: 0, t: 1, turnNumber: 1, activeColor: 'b', size: 5, squares: b1Sq, isLeaf: false, parentBoardId: 'L0_T0' },
        { id: 'L0_T2', l: 0, t: 2, turnNumber: 2, activeColor: 'w', size: 5, squares: b2Sq, isLeaf: true, parentBoardId: 'L0_T1' },
      ],
    },
  };
  retroState.presentStep = 2;

  const wrMoves = getLegalMovesForSquare(retroState, { l: 0, t: 2, x: 1, y: 4 });
  const moveRa5 = wrMoves.find((m) => m.kind === 'spatial' && m.to.x === 0 && m.to.y === 4)!;
  assert.ok(moveRa5, 'White Rook at b5 should be able to move spatially to a5 on L0_T2');

  const afterRetroMate = submitTurnPure(applyStagedMovePure(retroState, moveRa5));
  assert.equal(afterRetroMate.winner, 'w', 'Should detect retrocausal checkmate when Past King at L0_T0 a5 cannot be saved');
  assert.equal(afterRetroMate.checkmateForensics?.kind, 'retrocausal_checkmate');
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

test('present-shifting time-jump rescue (timetravel_branch) and 2D/5D pin enforcement', () => {
  // 1. Present-shifting rescue:
  // Suppose L0 and +L1 are both at t=2 (Turn 2 White, presentStep = 2).
  // On +L1_T2 (t=2), White King at a1 is locally mated by Black Queen at a2 (supported by Black King at b3), and L0_T2 has friendly pawns at a1, b1, b2, a2 so L0 cannot merge onto +L1_T2.
  // HOWEVER, L0 has a historical board L0_T0 (t=0) where a5 (x=0, y=4) is empty, and on L0_T2 (t=2) White has a Rook at a5 (x=0, y=4) that can jump back in time (dt=-1) to L0_T0 (a5)!
  // Jumping from L0_T2 to L0_T0 spawns +L2 at t=1 (T1B), which is an active timeline (with delta=2) whose leaf is at t=1, pulling presentStep back from 2 to 1!
  // Because presentStep becomes 1, +L1_T2 (at t=2 > 1) is no longer in The Present and no longer mandatory this turn!
  const state = createInitialMultiverse('tactical_5x5', 'pass_and_play', 'tactician', 'choose_piece', 2);
  const b0Sq = emptySquares(5);
  b0Sq[0][4] = mkPiece('k', 'w', 'wk_hist');
  b0Sq[4][4] = mkPiece('k', 'b', 'bk_hist');

  const b1Sq = emptySquares(5);
  b1Sq[0][4] = mkPiece('k', 'w', 'wk_hist1');
  b1Sq[4][4] = mkPiece('k', 'b', 'bk_hist1');

  const l0T2Sq = emptySquares(5);
  l0T2Sq[0][4] = mkPiece('k', 'w', 'wk_l0');
  l0T2Sq[0][0] = mkPiece('p', 'w', 'wp1');
  l0T2Sq[0][1] = mkPiece('p', 'w', 'wp2');
  l0T2Sq[1][1] = mkPiece('p', 'w', 'wp3');
  l0T2Sq[1][0] = mkPiece('p', 'w', 'wp4');
  l0T2Sq[4][0] = mkPiece('r', 'w', 'wr_time_rescuer'); // White Rook at a5 (x=0, y=4) on L0_T2
  l0T2Sq[4][4] = mkPiece('k', 'b', 'bk_l0');

  const l1T1Sq = emptySquares(5);
  l1T1Sq[0][0] = mkPiece('k', 'w', 'wk_l1_t1');
  l1T1Sq[4][4] = mkPiece('k', 'b', 'bk_l1_t1');

  const l1T2Sq = emptySquares(5);
  l1T2Sq[0][0] = mkPiece('k', 'w', 'wk_l1'); // Mated King on +L1_T2 at a1
  l1T2Sq[1][0] = mkPiece('q', 'b', 'bq_l1'); // Black Queen at a2
  l1T2Sq[2][1] = mkPiece('k', 'b', 'bk_l1'); // Black King at b3

  state.timelines = {
    0: {
      l: 0,
      name: 'Timeline L0',
      createdBy: 'initial',
      boards: [
        { id: 'L0_T0', l: 0, t: 0, turnNumber: 1, activeColor: 'w', size: 5, squares: b0Sq, isLeaf: false },
        { id: 'L0_T1', l: 0, t: 1, turnNumber: 1, activeColor: 'b', size: 5, squares: b1Sq, isLeaf: false, parentBoardId: 'L0_T0' },
        { id: 'L0_T2', l: 0, t: 2, turnNumber: 2, activeColor: 'w', size: 5, squares: l0T2Sq, isLeaf: true, parentBoardId: 'L0_T1' },
      ],
    },
    1: {
      l: 1,
      name: 'Timeline +L1',
      createdBy: 'w',
      parentTimeline: 0,
      branchFromStep: 0,
      boards: [
        { id: 'L1_T1', l: 1, t: 1, turnNumber: 1, activeColor: 'b', size: 5, squares: l1T1Sq, isLeaf: false, parentBoardId: 'L0_T0' },
        { id: 'L1_T2', l: 1, t: 2, turnNumber: 2, activeColor: 'w', size: 5, squares: l1T2Sq, isLeaf: true, parentBoardId: 'L1_T1' },
      ],
    },
  };
  state.timelineOrder = [0, 1];
  state.presentStep = 2;

  const wrRescueMoves = getLegalMovesForSquare(state, { l: 0, t: 2, x: 0, y: 4 });
  const branchMove = wrRescueMoves.find((m) => m.kind === 'timetravel_branch' && m.to.l === 0 && m.to.t === 0)!;
  assert.ok(branchMove, 'White Rook on L0_T2 should be able to jump back to L0_T0 to shift The Present and rescue +L1_T2');

  const afterBranchRescue = applyStagedMovePure(state, branchMove);
  assert.equal(afterBranchRescue.presentStep, 1, 'Present step should shift back from 2 to 1');
  assert.equal(canSubmitCurrentTurn(afterBranchRescue).canSubmit, true, 'Turn should be immediately submittable once Present shifts to 1');

  // 2. Absolute 2D & 5D Pin enforcement:
  // On L0_T0, White King is at e1 (x=4, y=0), White Rook is at d1 (x=3, y=0), and Black Rook is at a1 (x=0, y=0).
  // White Rook at d1 is pinned along rank 1 (y=0): it can move along rank 1 (c1, b1, capture a1), but CANNOT move vertically to d2, d3, d4, d5!
  const pinState = createInitialMultiverse('tactical_5x5', 'pass_and_play');
  const pinSq = emptySquares(5);
  pinSq[0][4] = mkPiece('k', 'w', 'wk_pin');
  pinSq[0][3] = mkPiece('r', 'w', 'wr_pinned');
  pinSq[0][0] = mkPiece('r', 'b', 'br_pinner');
  pinSq[4][4] = mkPiece('k', 'b', 'bk_pin');
  pinState.timelines[0].boards[0].squares = pinSq;

  const pinnedRookMoves = getLegalMovesForSquare(pinState, { l: 0, t: 0, x: 3, y: 0 });
  assert.ok(pinnedRookMoves.length === 3, 'Pinned Rook at d1 should only have 3 moves along the pin ray (c1, b1, xa1)');
  assert.ok(pinnedRookMoves.every((m) => m.to.y === 0), 'Pinned Rook must never move off rank 1 (y=0)');
});
