import {
  BoardState,
  Coord5D,
  Move5D,
  MoveKind,
  MultiverseState,
  OpponentMode,
  Piece,
  PieceType,
  PlayerColor,
  ThreatVector,
  Timeline,
  VariantConfig,
  VariantId,
} from './types';

export const VARIANT_CONFIGS: VariantConfig[] = [
  {
    id: 'tactical_5x5',
    name: 'variant_tactical_5x5',
    subtitle: 'variantSub_tactical_5x5',
    description: 'variantDesc_tactical_5x5',
    boardSize: 5,
  },
  {
    id: 'standard_8x8',
    name: 'variant_standard_8x8',
    subtitle: 'variantSub_standard_8x8',
    description: 'variantDesc_standard_8x8',
    boardSize: 8,
  },
  {
    id: 'time_lab',
    name: 'variant_time_lab',
    subtitle: 'variantSub_time_lab',
    description: 'variantDesc_time_lab',
    boardSize: 5,
  },
  {
    id: 'royal_unicorn',
    name: 'variant_royal_unicorn',
    subtitle: 'variantSub_royal_unicorn',
    description: 'variantDesc_royal_unicorn',
    boardSize: 6,
  },
  {
    id: 'puzzle_retrocausal',
    name: 'variant_puzzle_retrocausal',
    subtitle: 'variantSub_puzzle_retrocausal',
    description: 'variantDesc_puzzle_retrocausal',
    boardSize: 5,
    isPuzzle: true,
    puzzleGoal: 'puzzleGoal_puzzle_retrocausal',
  },
  {
    id: 'puzzle_multiverse_fork',
    name: 'variant_puzzle_multiverse_fork',
    subtitle: 'variantSub_puzzle_multiverse_fork',
    description: 'variantDesc_puzzle_multiverse_fork',
    boardSize: 5,
    isPuzzle: true,
    puzzleGoal: 'puzzleGoal_puzzle_multiverse_fork',
  },
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function formatSquare(x: number, y: number): string {
  return `${FILES[x] ?? x}${y + 1}`;
}

export function formatTimelineLabel(l: number): string {
  if (l === 0) return 'L0';
  return l > 0 ? `+L${l}` : `-L${Math.abs(l)}`;
}

export function formatTurnStep(t: number): string {
  const turnNum = Math.floor(t / 2) + 1;
  const side = t % 2 === 0 ? 'W' : 'B';
  return `T${turnNum}${side}`;
}

function makePiece(type: PieceType, color: PlayerColor, idSuffix: string, hasMoved = false): Piece {
  return {
    id: `${color}_${type}_${idSuffix}`,
    type,
    color,
    hasMoved,
  };
}

function createEmptyGrid(size: number): (Piece | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

export function cloneBoardSquares(squares: (Piece | null)[][]): (Piece | null)[][] {
  return squares.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function cloneMultiverseState(state: MultiverseState, includeSnapshots = false): MultiverseState {
  const timelinesCopy: Record<number, Timeline> = {};
  for (const lKey of Object.keys(state.timelines)) {
    const l = Number(lKey);
    const tl = state.timelines[l];
    timelinesCopy[l] = {
      ...tl,
      boards: tl.boards.map((b) => ({
        ...b,
        squares: cloneBoardSquares(b.squares),
      })),
    };
  }

  return {
    ...state,
    timelines: timelinesCopy,
    timelineOrder: [...state.timelineOrder],
    stagedMoves: state.stagedMoves.map((m) => ({
      ...m,
      from: { ...m.from },
      to: { ...m.to },
      piece: { ...m.piece },
      captured: m.captured ? { ...m.captured } : undefined,
      axisDelta: { ...m.axisDelta },
    })),
    moveHistory: state.moveHistory.map((turn) => turn.map((m) => ({ ...m }))),
    snapshotsBeforeStaged: includeSnapshots
      ? state.snapshotsBeforeStaged.map((s) => cloneMultiverseState(s, false))
      : [],
  };
}

function buildStandard8x8Row(color: PlayerColor, rowTag: string): (Piece | null)[] {
  const order: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  return order.map((type, x) => makePiece(type, color, `${rowTag}_${x}`));
}

function buildTactical5x5Row(color: PlayerColor, rowTag: string): (Piece | null)[] {
  const order: PieceType[] = ['r', 'n', 'b', 'q', 'k'];
  return order.map((type, x) => makePiece(type, color, `${rowTag}_${x}`));
}

function buildRoyalUnicorn6x6Row(color: PlayerColor, rowTag: string): (Piece | null)[] {
  const order: PieceType[] = ['r', 'u', 'd', 'q', 'k', 'b'];
  return order.map((type, x) => makePiece(type, color, `${rowTag}_${x}`));
}

function createInitialBoardsForVariant(variant: VariantId): {
  boardSize: number;
  timelines: Record<number, Timeline>;
  timelineOrder: number[];
  turnColor: PlayerColor;
  turnCount: number;
} {
  if (variant === 'standard_8x8') {
    const size = 8;
    const squares = createEmptyGrid(size);
    squares[0] = buildStandard8x8Row('w', 't0_y0');
    squares[1] = Array.from({ length: size }, (_, x) => makePiece('p', 'w', `t0_y1_${x}`));
    squares[6] = Array.from({ length: size }, (_, x) => makePiece('p', 'b', `t0_y6_${x}`));
    squares[7] = buildStandard8x8Row('b', 't0_y7');

    const board0: BoardState = {
      id: 'L0_T0',
      l: 0,
      t: 0,
      turnNumber: 1,
      activeColor: 'w',
      size,
      squares,
      isLeaf: true,
    };

    return {
      boardSize: size,
      timelines: {
        0: {
          l: 0,
          name: 'Timeline 0',
          createdBy: 'initial',
          boards: [board0],
        },
      },
      timelineOrder: [0],
      turnColor: 'w',
      turnCount: 0,
    };
  }

  if (variant === 'royal_unicorn') {
    const size = 6;
    const squares = createEmptyGrid(size);
    squares[0] = buildRoyalUnicorn6x6Row('w', 't0_y0');
    squares[1] = Array.from({ length: size }, (_, x) => makePiece('p', 'w', `t0_y1_${x}`));
    squares[4] = Array.from({ length: size }, (_, x) => makePiece('p', 'b', `t0_y4_${x}`));
    squares[5] = buildRoyalUnicorn6x6Row('b', 't0_y5');

    const board0: BoardState = {
      id: 'L0_T0',
      l: 0,
      t: 0,
      turnNumber: 1,
      activeColor: 'w',
      size,
      squares,
      isLeaf: true,
    };

    return {
      boardSize: size,
      timelines: {
        0: {
          l: 0,
          name: 'Timeline 0',
          createdBy: 'initial',
          boards: [board0],
        },
      },
      timelineOrder: [0],
      turnColor: 'w',
      turnCount: 0,
    };
  }

  if (variant === 'time_lab' || variant === 'puzzle_retrocausal' || variant === 'puzzle_multiverse_fork') {
    const size = 5;
    // Build a 5-board history on L0 (t = 0, 1, 2, 3, 4) so Turn 3 White (t=4) can immediately jump to Turn 1 (t=0) or Turn 2 (t=2)
    const baseSquares = createEmptyGrid(size);
    baseSquares[0] = buildTactical5x5Row('w', 't0_y0');
    baseSquares[1] = Array.from({ length: size }, (_, x) => makePiece('p', 'w', `t0_y1_${x}`));
    baseSquares[3] = Array.from({ length: size }, (_, x) => makePiece('p', 'b', `t0_y3_${x}`));
    baseSquares[4] = buildTactical5x5Row('b', 't0_y4');

    if (variant === 'puzzle_retrocausal') {
      // Clear file 'a' and diagonal on t=0 so Black's King or Queen on t=0 can be targeted by a temporal Rook/Bishop/Queen from t=4!
      // Put Black's King at (x=0, y=4) on t=0 so White's Rook at (x=0, y=4) on t=4 can jump 2 turns back (dt=-2, dx=0, dy=0) to attack Black's past King!
      baseSquares[4][0] = makePiece('k', 'b', 'past_king');
      baseSquares[4][4] = makePiece('r', 'b', 'past_rook');
      baseSquares[3][0] = null;
      baseSquares[1][0] = null;
    }

    const b0: BoardState = {
      id: 'L0_T0',
      l: 0,
      t: 0,
      turnNumber: 1,
      activeColor: 'w',
      size,
      squares: cloneBoardSquares(baseSquares),
      isLeaf: false,
    };

    const sq1 = cloneBoardSquares(baseSquares);
    // White advanced pawn or opened lane
    sq1[1][2] = null;
    sq1[2][2] = makePiece('p', 'w', 't1_p', true);
    const b1: BoardState = {
      id: 'L0_T1',
      l: 0,
      t: 1,
      turnNumber: 1,
      activeColor: 'b',
      size,
      squares: sq1,
      isLeaf: false,
      parentBoardId: 'L0_T0',
    };

    const sq2 = cloneBoardSquares(sq1);
    sq2[3][1] = null;
    sq2[2][1] = makePiece('p', 'b', 't2_p', true);
    const b2: BoardState = {
      id: 'L0_T2',
      l: 0,
      t: 2,
      turnNumber: 2,
      activeColor: 'w',
      size,
      squares: sq2,
      isLeaf: false,
      parentBoardId: 'L0_T1',
    };

    const sq3 = cloneBoardSquares(sq2);
    sq3[0][3] = null;
    sq3[2][3] = makePiece('q', 'w', 't3_q', true);
    if (variant === 'puzzle_retrocausal') {
      // Clear (x=0, y=4) on b3 so the temporal line from t=5 through t=3 to t=1 is open!
      sq3[4][0] = null;
      sq3[4][4] = makePiece('k', 'b', 'present_king', true);
    }
    const b3: BoardState = {
      id: 'L0_T3',
      l: 0,
      t: 3,
      turnNumber: 2,
      activeColor: 'b',
      size,
      squares: sq3,
      isLeaf: false,
      parentBoardId: 'L0_T2',
    };

    const sq4 = cloneBoardSquares(sq3);
    if (variant === 'puzzle_retrocausal') {
      // Place White Rook at (x=0, y=4) on t=4 so it aims straight back through t=3 (empty) to Black's past King at t=1 (and can jump to t=0)!
      sq4[0][0] = null;
      sq4[4][0] = makePiece('r', 'w', 'chrono_rook', true);
      sq4[4][4] = makePiece('k', 'b', 'present_king', true);
    } else {
      sq4[1][0] = null;
      sq4[2][0] = makePiece('r', 'w', 'chrono_rook', true);
    }

    const b4: BoardState = {
      id: 'L0_T4',
      l: 0,
      t: 4,
      turnNumber: 3,
      activeColor: 'w',
      size,
      squares: sq4,
      isLeaf: true,
      parentBoardId: 'L0_T3',
    };

    return {
      boardSize: size,
      timelines: {
        0: {
          l: 0,
          name: 'Timeline 0',
          createdBy: 'initial',
          boards: [b0, b1, b2, b3, b4],
        },
      },
      timelineOrder: [0],
      turnColor: 'w',
      turnCount: 4,
    };
  }

  // Default: tactical_5x5
  const size = 5;
  const squares = createEmptyGrid(size);
  squares[0] = buildTactical5x5Row('w', 't0_y0');
  squares[1] = Array.from({ length: size }, (_, x) => makePiece('p', 'w', `t0_y1_${x}`));
  squares[3] = Array.from({ length: size }, (_, x) => makePiece('p', 'b', `t0_y3_${x}`));
  squares[4] = buildTactical5x5Row('b', 't0_y4');

  const board0: BoardState = {
    id: 'L0_T0',
    l: 0,
    t: 0,
    turnNumber: 1,
    activeColor: 'w',
    size,
    squares,
    isLeaf: true,
  };

  return {
    boardSize: size,
    timelines: {
      0: {
        l: 0,
        name: 'Timeline 0',
        createdBy: 'initial',
        boards: [board0],
      },
    },
    timelineOrder: [0],
    turnColor: 'w',
    turnCount: 0,
  };
}

export function createInitialMultiverse(
  variant: VariantId = 'tactical_5x5',
  opponentMode: OpponentMode = 'ai'
): MultiverseState {
  const init = createInitialBoardsForVariant(variant);
  const state: MultiverseState = {
    variant,
    opponentMode,
    boardSize: init.boardSize,
    timelines: init.timelines,
    timelineOrder: init.timelineOrder,
    turnColor: init.turnColor,
    turnCount: init.turnCount,
    presentStep: 0,
    stagedMoves: [],
    moveHistory: [],
    snapshotsBeforeStaged: [],
    winner: null,
    winReason: null,
    timeJumpsCount: 0,
    timelinesCreatedCount: 1,
  };
  state.presentStep = calculatePresentStep(state);
  return state;
}

/**
 * Finds a board at (l, t) if it exists in the multiverse.
 */
export function getBoard(state: MultiverseState, l: number, t: number): BoardState | undefined {
  const tl = state.timelines[l];
  if (!tl) return undefined;
  return tl.boards.find((b) => b.t === t);
}

/**
 * Returns the leaf (latest) board of timeline l.
 */
export function getLeafBoard(state: MultiverseState, l: number): BoardState | undefined {
  const tl = state.timelines[l];
  if (!tl || tl.boards.length === 0) return undefined;
  return tl.boards[tl.boards.length - 1];
}

/**
 * In 5D Chess, if one player creates excessively more timelines than the other,
 * the excess outer timelines become inactive until the opponent catches up (+1 maximum excess).
 * Returns the set of active timeline indices.
 */
export function getActiveTimelines(state: MultiverseState): Set<number> {
  const posTimelines = state.timelineOrder.filter((l) => l > 0);
  const negTimelines = state.timelineOrder.filter((l) => l < 0);
  const maxActiveSide = Math.min(posTimelines.length, negTimelines.length) + 1;

  const active = new Set<number>();
  for (const l of state.timelineOrder) {
    if (l === 0) {
      active.add(0);
    } else if (l > 0 && l <= maxActiveSide) {
      active.add(l);
    } else if (l < 0 && Math.abs(l) <= maxActiveSide) {
      active.add(l);
    }
  }
  return active;
}

/**
 * Calculates "The Present": the minimum half-turn step `t` among all active timelines' leaf boards.
 */
export function calculatePresentStep(state: MultiverseState): number {
  const activeSet = getActiveTimelines(state);
  let minT = Infinity;
  for (const l of state.timelineOrder) {
    if (!activeSet.has(l)) continue;
    const leaf = getLeafBoard(state, l);
    if (leaf && leaf.t < minT) {
      minT = leaf.t;
    }
  }
  if (minT === Infinity) {
    // Fallback to any leaf
    for (const l of state.timelineOrder) {
      const leaf = getLeafBoard(state, l);
      if (leaf && leaf.t < minT) minT = leaf.t;
    }
  }
  return minT === Infinity ? 0 : minT;
}

export interface BoardPlayableStatus {
  /** True iff this board is the latest (rightmost) board on its timeline (Thick Outline in 5D Chess) */
  isPlayableBoard: boolean;
  /** Which player's turn this board represents ('w' = White board, 'b' = Black board) */
  boardColor: PlayerColor;
  /** True iff this board's timeline is currently Active under the +1 timeline advantage rule */
  isTimelineActive: boolean;
  /** True iff the current player can select and move pieces on this board right now */
  isCurrentPlayerTurnOnBoard: boolean;
  /** True iff this board is on an Active timeline at or behind The Present and MUST be played before submitting */
  isMandatoryPresent: boolean;
  /** True iff this board is playable by the current player right now, but optional (ahead of the Present or on an Inactive timeline) */
  isOptionalPlayable: boolean;
  /** True iff this non-leaf board was played on during the current uncommitted turn (clicking it can revise the staged move) */
  isStagedOriginThisTurn: boolean;
  /** True iff this leaf board was just spawned by a staged move during the current uncommitted turn */
  isStagedResultThisTurn: boolean;
  /** Canonical 5D Chess status badge label */
  statusLabel: string;
}

/**
 * Computes the canonical 5D Chess playable status for any board in the multiverse.
 */
export function getBoardPlayableStatus(
  state: MultiverseState,
  board: BoardState,
  activeTimelinesInput?: Set<number>
): BoardPlayableStatus {
  const activeTimelines = activeTimelinesInput ?? getActiveTimelines(state);
  const isTimelineActive = activeTimelines.has(board.l);
  const isPlayableBoard = board.isLeaf;
  const boardColor = board.activeColor;
  const isCurrentPlayerTurnOnBoard =
    isPlayableBoard && boardColor === state.turnColor && !state.winner;
  const isMandatoryPresent =
    isCurrentPlayerTurnOnBoard && isTimelineActive && board.t <= state.presentStep;
  const isOptionalPlayable = isCurrentPlayerTurnOnBoard && !isMandatoryPresent;

  const isStagedOriginThisTurn =
    !board.isLeaf &&
    state.stagedMoves.some((m) => m.from.l === board.l && m.from.t === board.t);
  const isStagedResultThisTurn =
    board.isLeaf &&
    Boolean(
      board.spawnedByMoveId &&
        state.stagedMoves.some((m) => m.id === board.spawnedByMoveId)
    );

  let statusLabel = 'status_unplayable_history';
  if (isMandatoryPresent) {
    statusLabel = 'status_playable_present';
  } else if (isOptionalPlayable && isTimelineActive) {
    statusLabel = 'status_playable_optional';
  } else if (isOptionalPlayable && !isTimelineActive) {
    statusLabel = 'status_playable_inactive';
  } else if (isStagedResultThisTurn) {
    statusLabel = 'status_staged_submit';
  } else if (isPlayableBoard) {
    statusLabel = boardColor === 'w' ? 'status_playable_white' : 'status_playable_black';
  } else if (isStagedOriginThisTurn) {
    statusLabel = 'status_staged_revise';
  }

  return {
    isPlayableBoard,
    boardColor,
    isTimelineActive,
    isCurrentPlayerTurnOnBoard,
    isMandatoryPresent,
    isOptionalPlayable,
    isStagedOriginThisTurn,
    isStagedResultThisTurn,
    statusLabel,
  };
}

/**
 * Returns all leaf boards that belong to `color` (where `leaf.activeColor === color`).
 * Also flags which ones are mandatory (on active timelines at or before the Present).
 */
export function getPlayableBoards(
  state: MultiverseState,
  color: PlayerColor = state.turnColor
): {
  board: BoardState;
  isMandatory: boolean;
  isActiveTimeline: boolean;
}[] {
  const activeTimelines = getActiveTimelines(state);
  const presentT = calculatePresentStep(state);
  const result: { board: BoardState; isMandatory: boolean; isActiveTimeline: boolean }[] = [];

  for (const l of state.timelineOrder) {
    const leaf = getLeafBoard(state, l);
    if (!leaf) continue;
    if (leaf.activeColor === color) {
      const isAct = activeTimelines.has(l);
      const isMandatory = isAct && leaf.t <= presentT;
      result.push({
        board: leaf,
        isMandatory,
        isActiveTimeline: isAct,
      });
    }
  }
  return result;
}

/**
 * Checks whether the current player has satisfied all mandatory moves on active timelines
 * so that "The Present" has shifted to the opponent's turn color.
 */
export function canSubmitCurrentTurn(state: MultiverseState): {
  canSubmit: boolean;
  reason?: string;
  reasonVars?: Record<string, string>;
  remainingMandatoryBoards: BoardState[];
} {
  if (state.winner) {
    return { canSubmit: false, reason: 'reason_concluded', remainingMandatoryBoards: [] };
  }

  const playable = getPlayableBoards(state, state.turnColor);
  const mandatory = playable.filter((p) => p.isMandatory).map((p) => p.board);

  if (mandatory.length > 0) {
    const names = mandatory.map((b) => `${formatTimelineLabel(b.l)} (${formatTurnStep(b.t)})`).join(', ');
    return {
      canSubmit: false,
      reason: 'reason_move_required',
      reasonVars: { names },
      remainingMandatoryBoards: mandatory,
    };
  }

  if (state.stagedMoves.length === 0) {
    return {
      canSubmit: false,
      reason: 'reason_no_move',
      remainingMandatoryBoards: [],
    };
  }

  // Verify no friendly King is left under attack
  const threatsOnFriendly = findThreatsToColorKings(state, state.turnColor);
  if (threatsOnFriendly.length > 0) {
    return {
      canSubmit: false,
      reason: 'reason_king_check',
      remainingMandatoryBoards: [],
    };
  }

  return {
    canSubmit: true,
    remainingMandatoryBoards: [],
  };
}

/**
 * Generates all 4D unit direction vectors (dx, dy, dt, dl) where each component is in {-1, 0, 1}
 * and not all zero (80 vectors total).
 */
const DIRECTIONS_4D: { dx: number; dy: number; dt: number; dl: number; axesCount: number }[] = [];
for (const dx of [-1, 0, 1]) {
  for (const dy of [-1, 0, 1]) {
    for (const dt of [-1, 0, 1]) {
      for (const dl of [-1, 0, 1]) {
        if (dx === 0 && dy === 0 && dt === 0 && dl === 0) continue;
        const axesCount =
          (dx !== 0 ? 1 : 0) + (dy !== 0 ? 1 : 0) + (dt !== 0 ? 1 : 0) + (dl !== 0 ? 1 : 0);
        DIRECTIONS_4D.push({ dx, dy, dt, dl, axesCount });
      }
    }
  }
}

/**
 * Generates all 4D Knight jump vectors: 2 steps along one axis, 1 step along another axis.
 * 4 choices for the '2' axis * 3 choices for the '1' axis * 4 sign combinations = 48 vectors!
 */
const KNIGHT_VECTORS_4D: { dx: number; dy: number; dt: number; dl: number }[] = [];
const AXES = ['x', 'y', 't', 'l'] as const;
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    if (i === j) continue;
    for (const s1 of [-2, 2]) {
      for (const s2 of [-1, 1]) {
        const vec = { dx: 0, dy: 0, dt: 0, dl: 0 };
        vec[`d${AXES[i]}` as 'dx' | 'dy' | 'dt' | 'dl'] = s1;
        vec[`d${AXES[j]}` as 'dx' | 'dy' | 'dt' | 'dl'] = s2;
        KNIGHT_VECTORS_4D.push(vec);
      }
    }
  }
}

function isInsideSquareBounds(size: number, x: number, y: number): boolean {
  return x >= 0 && x < size && y >= 0 && y < size;
}

function classifyMoveKind(
  state: MultiverseState,
  from: Coord5D,
  to: Coord5D
): MoveKind {
  if (from.l === to.l && from.t === to.t) {
    return 'spatial';
  }
  const destBoard = getBoard(state, to.l, to.t);
  if (destBoard && destBoard.isLeaf) {
    return 'timetravel_merge';
  }
  if (from.l !== to.l && from.t === to.t) {
    return 'multiverse_hop';
  }
  return 'timetravel_branch';
}

function buildMoveNotation(
  piece: Piece,
  from: Coord5D,
  to: Coord5D,
  kind: MoveKind,
  captured?: Piece,
  promotedTo?: PieceType
): string {
  const pChar = piece.type === 'p' ? '' : piece.type.toUpperCase();
  const capChar = captured ? 'x' : '-';
  const promoStr = promotedTo ? `=${promotedTo.toUpperCase()}` : '';
  if (kind === 'spatial') {
    return `${ formatTimelineLabel(from.l) }:${pChar}${formatSquare(from.x, from.y)}${capChar}${formatSquare(to.x, to.y)}${promoStr}`;
  }
  const jumpSymbol = kind === 'timetravel_branch' ? '>>' : '->';
  return `(${formatTimelineLabel(from.l)} ${formatTurnStep(from.t)})${pChar}${formatSquare(from.x, from.y)} ${jumpSymbol} (${formatTimelineLabel(to.l)} ${formatTurnStep(to.t)})${captured ? 'x' : ''}${formatSquare(to.x, to.y)}${promoStr}`;
}

/**
 * Generates pseudo-legal moves for a piece located at `from` on board `(from.l, from.t)`.
 * Note: one temporal unit `dt` corresponds to 1 full turn = 2 half-turn steps (`t + dt * 2`),
 * ensuring a piece always lands on a board of the same turn parity (where it is that player's turn to move).
 */
export function getPseudoLegalMovesForPiece(
  state: MultiverseState,
  from: Coord5D
): Move5D[] {
  const srcBoard = getBoard(state, from.l, from.t);
  if (!srcBoard) return [];
  const piece = srcBoard.squares[from.y]?.[from.x];
  if (!piece) return [];

  const moves: Move5D[] = [];
  const size = state.boardSize;

  const pushMove = (to: Coord5D, dx: number, dy: number, dt: number, dl: number) => {
    const destBoard = getBoard(state, to.l, to.t);
    if (!destBoard) return;
    // Destination board must have the same activeColor as the moving piece
    if (destBoard.activeColor !== piece.color) return;

    const targetCell = destBoard.squares[to.y]?.[to.x];
    if (targetCell && targetCell.color === piece.color) return;

    const kind = classifyMoveKind(state, from, to);
    const isPawnPromotion =
      piece.type === 'p' &&
      ((piece.color === 'w' && to.y === size - 1) || (piece.color === 'b' && to.y === 0));
    const promotedTo: PieceType | undefined = isPawnPromotion ? 'q' : undefined;

    moves.push({
      id: `m_${from.l}_${from.t}_${from.x}_${from.y}_to_${to.l}_${to.t}_${to.x}_${to.y}`,
      from,
      to,
      piece,
      captured: targetCell ?? undefined,
      promotedTo,
      kind,
      resultingSourceBoard: { l: from.l, t: from.t + 1 },
      notation: buildMoveNotation(piece, from, to, kind, targetCell ?? undefined, promotedTo),
      axisDelta: { dx, dy, dt, dl },
    });
  };

  if (piece.type === 'p') {
    const forwardDir = piece.color === 'w' ? 1 : -1;
    // 1. Spatial forward advance (1 square, and 2 squares if unmoved)
    const ny1 = from.y + forwardDir;
    if (isInsideSquareBounds(size, from.x, ny1)) {
      if (!srcBoard.squares[ny1][from.x]) {
        pushMove({ l: from.l, t: from.t, x: from.x, y: ny1 }, 0, forwardDir, 0, 0);
        const ny2 = from.y + forwardDir * 2;
        if (!piece.hasMoved && isInsideSquareBounds(size, from.x, ny2) && !srcBoard.squares[ny2][from.x]) {
          pushMove({ l: from.l, t: from.t, x: from.x, y: ny2 }, 0, forwardDir * 2, 0, 0);
        }
      }
    }

    // 2. Spatial diagonal captures (dx = ±1, dy = forwardDir)
    for (const dx of [-1, 1]) {
      const nx = from.x + dx;
      const ny = from.y + forwardDir;
      if (isInsideSquareBounds(size, nx, ny)) {
        const target = srcBoard.squares[ny][nx];
        if (target && target.color !== piece.color) {
          pushMove({ l: from.l, t: from.t, x: nx, y: ny }, dx, forwardDir, 0, 0);
        }
      }
    }

    // 3. Multiverse Pawn step (1 step along timeline axis dl = forwardDir, same square)
    const nl = from.l + forwardDir;
    const adjBoard = getBoard(state, nl, from.t);
    if (adjBoard && isInsideSquareBounds(size, from.x, from.y) && !adjBoard.squares[from.y][from.x]) {
      pushMove({ l: nl, t: from.t, x: from.x, y: from.y }, 0, 0, 0, forwardDir);
    }

    // 4. Multiverse Pawn diagonal capture (dl = forwardDir, dt = ±1)
    for (const dt of [-1, 1]) {
      const targetT = from.t + dt * 2;
      const diagBoard = getBoard(state, nl, targetT);
      if (diagBoard) {
        const target = diagBoard.squares[from.y]?.[from.x];
        if (target && target.color !== piece.color) {
          pushMove({ l: nl, t: targetT, x: from.x, y: from.y }, 0, 0, dt, forwardDir);
        }
      }
    }

    return moves;
  }

  if (piece.type === 'n') {
    for (const vec of KNIGHT_VECTORS_4D) {
      const tx = from.x + vec.dx;
      const ty = from.y + vec.dy;
      if (!isInsideSquareBounds(size, tx, ty)) continue;
      const tt = from.t + vec.dt * 2;
      const tl = from.l + vec.dl;
      const destBoard = getBoard(state, tl, tt);
      if (!destBoard) continue;
      pushMove({ l: tl, t: tt, x: tx, y: ty }, vec.dx, vec.dy, vec.dt, vec.dl);
    }
    return moves;
  }

  if (piece.type === 'k') {
    for (const dir of DIRECTIONS_4D) {
      const tx = from.x + dir.dx;
      const ty = from.y + dir.dy;
      if (!isInsideSquareBounds(size, tx, ty)) continue;
      const tt = from.t + dir.dt * 2;
      const tl = from.l + dir.dl;
      const destBoard = getBoard(state, tl, tt);
      if (!destBoard) continue;
      pushMove({ l: tl, t: tt, x: tx, y: ty }, dir.dx, dir.dy, dir.dt, dir.dl);
    }
    return moves;
  }

  // Sliding 4D pieces:
  // Rook ('r'): axesCount === 1
  // Bishop ('b'): axesCount === 2
  // Unicorn ('u'): axesCount === 3
  // Dragon ('d'): axesCount === 4
  // Queen ('q'): axesCount >= 1 (1, 2, 3, or 4 axes!)
  const allowedAxesCounts =
    piece.type === 'r'
      ? [1]
      : piece.type === 'b'
        ? [2]
        : piece.type === 'u'
          ? [3]
          : piece.type === 'd'
            ? [4]
            : [1, 2, 3, 4]; // Queen

  for (const dir of DIRECTIONS_4D) {
    if (!allowedAxesCounts.includes(dir.axesCount)) continue;

    for (let step = 1; step <= 12; step++) {
      const tx = from.x + dir.dx * step;
      const ty = from.y + dir.dy * step;
      if (!isInsideSquareBounds(size, tx, ty)) break;

      const tt = from.t + dir.dt * 2 * step;
      const tl = from.l + dir.dl * step;
      const destBoard = getBoard(state, tl, tt);
      // In 5D Chess, sliding rays stop if a spacetime board does not exist at the intermediate coordinate
      if (!destBoard) break;

      const occupant = destBoard.squares[ty][tx];
      if (!occupant) {
        pushMove(
          { l: tl, t: tt, x: tx, y: ty },
          dir.dx * step,
          dir.dy * step,
          dir.dt * step,
          dir.dl * step
        );
      } else {
        if (occupant.color !== piece.color) {
          pushMove(
            { l: tl, t: tt, x: tx, y: ty },
            dir.dx * step,
            dir.dy * step,
            dir.dt * step,
            dir.dl * step
          );
        }
        // Ray is blocked by the occupant piece on this spacetime square
        break;
      }
    }
  }

  return moves;
}

/**
 * Finds all active threat vectors targeting Kings of `targetKingColor`.
 * In 5D Chess:
 * - When `leaf.activeColor === attackerColor`, it is `attackerColor`'s turn to move on `leaf`,
 *   so any 4D capture (`dt, dl, dx, dy`) from `leaf` onto a King of `targetKingColor` is an active threat.
 * - When `leaf.activeColor !== attackerColor`, `attackerColor` cannot initiate a cross-timeline jump from `leaf`
 *   (except in `puzzle_retrocausal` where aligning a temporal vector solves the puzzle), so only same-board
 *   spatial threats (`coord.l === m.to.l && coord.t === m.to.t`) apply on `leaf`.
 */
export function findThreatsToColorKings(
  state: MultiverseState,
  targetKingColor: PlayerColor
): ThreatVector[] {
  const attackerColor: PlayerColor = targetKingColor === 'w' ? 'b' : 'w';
  const threats: ThreatVector[] = [];

  for (const l of state.timelineOrder) {
    const leaf = getLeafBoard(state, l);
    if (!leaf) continue;

    const allowCrossSpacetimeFromLeaf =
      leaf.activeColor === attackerColor ||
      (state.variant === 'puzzle_retrocausal' && targetKingColor === 'b');

    for (let y = 0; y < state.boardSize; y++) {
      for (let x = 0; x < state.boardSize; x++) {
        const piece = leaf.squares[y][x];
        if (!piece || piece.color !== attackerColor) continue;

        const coord: Coord5D = { l: leaf.l, t: leaf.t, x, y };
        const candidateMoves = getPseudoLegalCapturesFromAnyBoard(state, coord, piece);
        for (const m of candidateMoves) {
          if (m.captured && m.captured.type === 'k' && m.captured.color === targetKingColor) {
            const isCrossTimeline = coord.l !== m.to.l || coord.t !== m.to.t;
            if (isCrossTimeline && !allowCrossSpacetimeFromLeaf) continue;

            threats.push({
              from: coord,
              to: m.to,
              attacker: piece,
              king: m.captured,
              isCrossTimeline,
            });
          }
        }
      }
    }
  }

  return threats;
}

function getPseudoLegalCapturesFromAnyBoard(
  state: MultiverseState,
  from: Coord5D,
  piece: Piece
): { to: Coord5D; captured: Piece }[] {
  const captures: { to: Coord5D; captured: Piece }[] = [];
  const size = state.boardSize;

  const checkTarget = (to: Coord5D): boolean => {
    const destBoard = getBoard(state, to.l, to.t);
    if (!destBoard) return false;
    const cell = destBoard.squares[to.y]?.[to.x];
    if (!cell) return true; // continue ray
    if (cell.color !== piece.color) {
      captures.push({ to, captured: cell });
    }
    return false; // stop ray
  };

  if (piece.type === 'p') {
    const forwardDir = piece.color === 'w' ? 1 : -1;
    for (const dx of [-1, 1]) {
      const nx = from.x + dx;
      const ny = from.y + forwardDir;
      if (isInsideSquareBounds(size, nx, ny)) {
        checkTarget({ l: from.l, t: from.t, x: nx, y: ny });
      }
    }
    const nl = from.l + forwardDir;
    for (const dt of [-1, 1]) {
      checkTarget({ l: nl, t: from.t + dt * 2, x: from.x, y: from.y });
    }
    return captures;
  }

  if (piece.type === 'n') {
    for (const vec of KNIGHT_VECTORS_4D) {
      const tx = from.x + vec.dx;
      const ty = from.y + vec.dy;
      if (!isInsideSquareBounds(size, tx, ty)) continue;
      checkTarget({ l: from.l + vec.dl, t: from.t + vec.dt * 2, x: tx, y: ty });
    }
    return captures;
  }

  if (piece.type === 'k') {
    for (const dir of DIRECTIONS_4D) {
      const tx = from.x + dir.dx;
      const ty = from.y + dir.dy;
      if (!isInsideSquareBounds(size, tx, ty)) continue;
      checkTarget({ l: from.l + dir.dl, t: from.t + dir.dt * 2, x: tx, y: ty });
    }
    return captures;
  }

  const allowedAxesCounts =
    piece.type === 'r'
      ? [1]
      : piece.type === 'b'
        ? [2]
        : piece.type === 'u'
          ? [3]
          : piece.type === 'd'
            ? [4]
            : [1, 2, 3, 4];

  for (const dir of DIRECTIONS_4D) {
    if (!allowedAxesCounts.includes(dir.axesCount)) continue;
    for (let step = 1; step <= 12; step++) {
      const tx = from.x + dir.dx * step;
      const ty = from.y + dir.dy * step;
      if (!isInsideSquareBounds(size, tx, ty)) break;
      const tt = from.t + dir.dt * 2 * step;
      const tl = from.l + dir.dl * step;
      const keepGoing = checkTarget({ l: tl, t: tt, x: tx, y: ty });
      if (!keepGoing) break;
    }
  }

  return captures;
}

/**
 * Returns legal moves for a piece at `from` on a playable leaf board.
 */
export function getLegalMovesForSquare(state: MultiverseState, from: Coord5D): Move5D[] {
  const srcBoard = getBoard(state, from.l, from.t);
  if (!srcBoard || !srcBoard.isLeaf) return [];
  if (srcBoard.activeColor !== state.turnColor) return [];

  const piece = srcBoard.squares[from.y]?.[from.x];
  if (!piece || piece.color !== state.turnColor) return [];

  const pseudo = getPseudoLegalMovesForPiece(state, from);
  // Filter out moves that immediately put or leave friendly King in check from or on the resulting board(s)
  return pseudo.filter((move) => {
    const nextState = applyStagedMovePure(state, move);
    const threats = findThreatsToColorKings(nextState, state.turnColor);
    const directSelfCheck = threats.some(
      (th) =>
        (th.from.l === move.resultingSourceBoard.l && th.from.t === move.resultingSourceBoard.t) ||
        (move.resultingTargetBoard &&
          th.from.l === move.resultingTargetBoard.l &&
          th.from.t === move.resultingTargetBoard.t) ||
        (th.to.l === move.resultingSourceBoard.l && th.to.t === move.resultingSourceBoard.t) ||
        (move.resultingTargetBoard &&
          th.to.l === move.resultingTargetBoard.l &&
          th.to.t === move.resultingTargetBoard.t)
    );
    return !directSelfCheck;
  });
}

function allocateNewTimelineIndex(state: MultiverseState, color: PlayerColor): number {
  if (color === 'w') {
    const maxL = Math.max(0, ...state.timelineOrder);
    return maxL + 1;
  } else {
    const minL = Math.min(0, ...state.timelineOrder);
    return minL - 1;
  }
}

/**
 * Pure function that applies a single staged move `move` to `state` and returns a new `MultiverseState`.
 */
export function applyStagedMovePure(state: MultiverseState, move: Move5D): MultiverseState {
  const next = cloneMultiverseState(state, true);
  // Save snapshot for Undo within the turn
  next.snapshotsBeforeStaged.push(cloneMultiverseState(state, false));

  const srcTimeline = next.timelines[move.from.l];
  const srcBoard = getBoard(next, move.from.l, move.from.t);
  if (!srcTimeline || !srcBoard) return next;

  const movedPiece: Piece = {
    ...move.piece,
    type: move.promotedTo ?? move.piece.type,
    hasMoved: true,
  };

  const nextColor: PlayerColor = state.turnColor === 'w' ? 'b' : 'w';

  if (move.from.l === move.to.l && move.from.t === move.to.t) {
    // 1. Standard Spatial Move on the same board
    srcBoard.isLeaf = false;
    const newSquares = cloneBoardSquares(srcBoard.squares);
    newSquares[move.from.y][move.from.x] = null;
    newSquares[move.to.y][move.to.x] = movedPiece;

    const newT = srcBoard.t + 1;
    const newBoard: BoardState = {
      id: `L${srcBoard.l}_T${newT}`,
      l: srcBoard.l,
      t: newT,
      turnNumber: Math.floor(newT / 2) + 1,
      activeColor: nextColor,
      size: next.boardSize,
      squares: newSquares,
      isLeaf: true,
      parentBoardId: srcBoard.id,
      spawnedByMoveId: move.id,
    };
    srcTimeline.boards.push(newBoard);

    const recordedMove: Move5D = {
      ...move,
      resultingSourceBoard: { l: srcBoard.l, t: newT },
    };
    next.stagedMoves.push(recordedMove);
  } else {
    // 2. Inter-Temporal / Multiverse Move!
    // (A) Source board advances to t + 1 WITHOUT the piece (it vanished from this timeline!)
    srcBoard.isLeaf = false;
    const srcNextSquares = cloneBoardSquares(srcBoard.squares);
    srcNextSquares[move.from.y][move.from.x] = null;
    const srcNextT = srcBoard.t + 1;
    const srcNextBoard: BoardState = {
      id: `L${srcBoard.l}_T${srcNextT}`,
      l: srcBoard.l,
      t: srcNextT,
      turnNumber: Math.floor(srcNextT / 2) + 1,
      activeColor: nextColor,
      size: next.boardSize,
      squares: srcNextSquares,
      isLeaf: true,
      parentBoardId: srcBoard.id,
      spawnedByMoveId: move.id,
    };
    srcTimeline.boards.push(srcNextBoard);

    // (B) Target board: either it is currently a Leaf (merge/hop) or it is a historical board (branches a new timeline!)
    const dstBoard = getBoard(next, move.to.l, move.to.t);
    if (dstBoard) {
      const dstNextSquares = cloneBoardSquares(dstBoard.squares);
      dstNextSquares[move.to.y][move.to.x] = movedPiece;
      const dstNextT = dstBoard.t + 1;

      if (dstBoard.isLeaf) {
        // Hop onto an existing active leaf board -> advances that timeline as well!
        dstBoard.isLeaf = false;
        const dstTimeline = next.timelines[dstBoard.l];
        const mergedBoard: BoardState = {
          id: `L${dstBoard.l}_T${dstNextT}`,
          l: dstBoard.l,
          t: dstNextT,
          turnNumber: Math.floor(dstNextT / 2) + 1,
          activeColor: nextColor,
          size: next.boardSize,
          squares: dstNextSquares,
          isLeaf: true,
          parentBoardId: dstBoard.id,
          spawnedByMoveId: move.id,
        };
        dstTimeline.boards.push(mergedBoard);

        const recordedMove: Move5D = {
          ...move,
          kind: 'timetravel_merge',
          resultingSourceBoard: { l: srcBoard.l, t: srcNextT },
          resultingTargetBoard: { l: dstBoard.l, t: dstNextT },
        };
        next.stagedMoves.push(recordedMove);
        next.timeJumpsCount += 1;
      } else {
        // Historical board -> BRANCHES A NEW PARALLEL TIMELINE!
        const newL = allocateNewTimelineIndex(next, state.turnColor);
        const branchedBoard: BoardState = {
          id: `L${newL}_T${dstNextT}`,
          l: newL,
          t: dstNextT,
          turnNumber: Math.floor(dstNextT / 2) + 1,
          activeColor: nextColor,
          size: next.boardSize,
          squares: dstNextSquares,
          isLeaf: true,
          parentBoardId: dstBoard.id,
          spawnedByMoveId: move.id,
        };

        next.timelines[newL] = {
          l: newL,
          name: `Timeline ${formatTimelineLabel(newL)}`,
          createdBy: state.turnColor,
          parentTimeline: dstBoard.l,
          branchFromStep: dstBoard.t,
          boards: [branchedBoard],
        };
        next.timelineOrder.push(newL);
        next.timelineOrder.sort((a, b) => a - b);

        const recordedMove: Move5D = {
          ...move,
          kind: 'timetravel_branch',
          createdTimeline: newL,
          resultingSourceBoard: { l: srcBoard.l, t: srcNextT },
          resultingTargetBoard: { l: newL, t: dstNextT },
        };
        next.stagedMoves.push(recordedMove);
        next.timeJumpsCount += 1;
        next.timelinesCreatedCount += 1;
      }
    }
  }

  next.presentStep = calculatePresentStep(next);

  // Check if any enemy King was directly captured (in puzzles or variants)
  if (move.captured?.type === 'k') {
    next.winner = state.turnColor;
    next.winReasonKey = 'win_captured_king';
    next.winReasonVars = { color: move.captured.color === 'w' ? 'White' : 'Black' };
  }

  return next;
}

/**
 * Undoes the most recent staged move in the current turn.
 */
export function undoLastStagedMove(state: MultiverseState): MultiverseState {
  if (state.snapshotsBeforeStaged.length === 0) return state;
  const previous = state.snapshotsBeforeStaged[state.snapshotsBeforeStaged.length - 1];
  const restored = cloneMultiverseState(previous, false);
  restored.snapshotsBeforeStaged = state.snapshotsBeforeStaged
    .slice(0, -1)
    .map((s) => cloneMultiverseState(s, false));
  return restored;
}

/**
 * Commits all staged moves and transitions the turn to the next player.
 * Also checks whether the incoming player has any legal response or is in Checkmate / Stalemate.
 */
export function submitTurnPure(state: MultiverseState): MultiverseState {
  const check = canSubmitCurrentTurn(state);
  if (!check.canSubmit) {
    return state;
  }

  const next = cloneMultiverseState(state, false);
  next.moveHistory.push([...next.stagedMoves]);
  next.stagedMoves = [];
  next.snapshotsBeforeStaged = [];
  next.turnColor = state.turnColor === 'w' ? 'b' : 'w';
  next.turnCount += 1;
  next.presentStep = calculatePresentStep(next);

  // Puzzle win condition checks
  if (next.variant === 'puzzle_retrocausal' && state.turnColor === 'w') {
    const threats = findThreatsToColorKings(next, 'b');
    if (threats.some((t) => t.isCrossTimeline)) {
      next.winner = 'w';
      next.winReasonKey = 'win_retrocausal';
      return next;
    }
  }
  if (next.variant === 'puzzle_multiverse_fork' && state.turnColor === 'w') {
    if (next.timelinesCreatedCount >= 2) {
      next.winner = 'w';
      next.winReasonKey = 'win_multiverse_fork';
      return next;
    }
  }

  // Check if the incoming player has any legal moves on their playable boards
  const playableBoards = getPlayableBoards(next, next.turnColor);
  let totalLegalMoves = 0;
  for (const pb of playableBoards) {
    for (let y = 0; y < next.boardSize; y++) {
      for (let x = 0; x < next.boardSize; x++) {
        const piece = pb.board.squares[y][x];
        if (piece && piece.color === next.turnColor) {
          const moves = getLegalMovesForSquare(next, {
            l: pb.board.l,
            t: pb.board.t,
            x,
            y,
          });
          totalLegalMoves += moves.length;
        }
      }
    }
  }

  if (totalLegalMoves === 0 && playableBoards.length > 0) {
    const threats = findThreatsToColorKings(next, next.turnColor);
    if (threats.length > 0) {
      next.winner = state.turnColor;
      next.winReasonKey = 'win_checkmate';
      next.winReasonVars = { color: state.turnColor === 'w' ? 'White' : 'Black' };
    } else {
      next.winner = 'draw';
      next.winReasonKey = 'win_stalemate';
    }
  }

  return next;
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 340,
  r: 500,
  u: 450,
  d: 480,
  q: 900,
  k: 10000,
};

/**
 * Undoes staged moves back to the snapshot where `(l, t)` was a playable leaf board,
 * allowing a player to click directly on a board they already moved on this turn to revise their move.
 */
export function undoStagedMovesBackToBoard(
  state: MultiverseState,
  l: number,
  t: number
): MultiverseState {
  const moveIdx = state.stagedMoves.findIndex(
    (m) =>
      (m.from.l === l && m.from.t === t) ||
      (m.resultingSourceBoard.l === l && m.resultingSourceBoard.t === t) ||
      (m.resultingTargetBoard &&
        m.resultingTargetBoard.l === l &&
        m.resultingTargetBoard.t === t)
  );
  if (moveIdx === -1 || moveIdx >= state.snapshotsBeforeStaged.length) {
    return state;
  }
  const targetSnapshot = state.snapshotsBeforeStaged[moveIdx];
  const restored = cloneMultiverseState(targetSnapshot, false);
  restored.snapshotsBeforeStaged = state.snapshotsBeforeStaged
    .slice(0, moveIdx)
    .map((s) => cloneMultiverseState(s, false));
  return restored;
}

/**
 * AI Chronomancer: selects and stages moves across all mandatory boards for the current turn,
 * then returns the state ready to be committed (or already committed).
 */
export function computeAITurn(state: MultiverseState): MultiverseState {
  let working = cloneMultiverseState(state, true);
  let safetyCounter = 0;

  while (safetyCounter < 8 && !working.winner) {
    safetyCounter++;
    const playable = getPlayableBoards(working, working.turnColor);
    const mandatory = playable.filter((p) => p.isMandatory);

    if (mandatory.length === 0 && working.stagedMoves.length > 0) {
      break;
    }

    const targetBoards = mandatory.length > 0 ? mandatory : playable.filter((p) => p.isActiveTimeline);
    if (targetBoards.length === 0) break;

    const boardToPlay = targetBoards[0].board;
    const allCandidateMoves: { move: Move5D; score: number }[] = [];

    for (let y = 0; y < working.boardSize; y++) {
      for (let x = 0; x < working.boardSize; x++) {
        const p = boardToPlay.squares[y][x];
        if (!p || p.color !== working.turnColor) continue;
        const legal = getLegalMovesForSquare(working, {
          l: boardToPlay.l,
          t: boardToPlay.t,
          x,
          y,
        });
        for (const m of legal) {
          let score = 0;
          if (m.captured) {
            score += PIECE_VALUES[m.captured.type] * 2 - PIECE_VALUES[m.piece.type] * 0.1;
          }
          if (m.promotedTo) {
            score += 750;
          }
          // Reward center control & forward piece development
          const center = (working.boardSize - 1) / 2;
          const distCenter = Math.abs(m.to.x - center) + Math.abs(m.to.y - center);
          score += (working.boardSize - distCenter) * 10;

          // Check if this move resolves existing threats on AI king
          const afterMove = applyStagedMovePure(working, m);
          const remainingThreats = findThreatsToColorKings(afterMove, working.turnColor);
          if (remainingThreats.length === 0) {
            score += 500;
          } else {
            score -= remainingThreats.length * 400;
          }

          // Bonus for checking opponent's King
          const oppColor: PlayerColor = working.turnColor === 'w' ? 'b' : 'w';
          const oppThreats = findThreatsToColorKings(afterMove, oppColor);
          if (oppThreats.length > 0) {
            score += 220;
          }

          // Only reward timeline branching when it captures a piece or checks the opponent's King,
          // so the AI doesn't spam empty backward time jumps and strand timelines
          if (m.kind === 'timetravel_branch') {
            if (m.captured || oppThreats.length > 0) {
              score += 55;
            } else {
              score -= 40;
            }
          } else if (m.kind === 'timetravel_merge') {
            score += m.captured ? 65 : 15;
          }

          allCandidateMoves.push({ move: m, score });
        }
      }
    }

    if (allCandidateMoves.length === 0) {
      // No legal moves on this board -> opponent wins by checkmate or draw
      const threats = findThreatsToColorKings(working, working.turnColor);
      if (threats.length > 0) {
        working.winner = working.turnColor === 'w' ? 'b' : 'w';
        working.winReasonKey = 'win_checkmate_short';
        working.winReasonVars = { color: working.winner === 'w' ? 'White' : 'Black' };
      } else {
        working.winner = 'draw';
        working.winReasonKey = 'win_stalemate_short';
      }
      return working;
    }

    allCandidateMoves.sort((a, b) => b.score - a.score);
    const chosen = allCandidateMoves[0].move;
    working = applyStagedMovePure(working, chosen);
  }

  if (!working.winner) {
    return submitTurnPure(working);
  }
  return working;
}
