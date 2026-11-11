import {
  AIPersona,
  BoardState,
  CheckmateForensics,
  Coord5D,
  Move5D,
  MoveKind,
  MultiverseState,
  OpponentMode,
  PastKingRadarWarning,
  Piece,
  PieceType,
  PlayerColor,
  PromotionRule,
  ThreatVector,
  Timeline,
  TimelineActivationDelta,
  VariantConfig,
  VariantId,
} from './types';

export const PROMOTION_CANDIDATE_TYPES: PieceType[] = ['q', 'r', 'b', 'n', 'u', 'd'];

export const VARIANT_CONFIGS: VariantConfig[] = [
  {
    id: 'tactical_5x5',
    name: '5×5 Tactical Multiverse',
    subtitle: 'Fast Action · Immediate Time Jumps',
    description:
      'Compact 5×5 boards where pieces reach temporal launch vectors by Turn 2. Ideal for rapid multiverse branching and cross-timeline tactics.',
    boardSize: 5,
  },
  {
    id: 'standard_8x8',
    name: '8×8 Standard 5D Chess',
    subtitle: 'Full FIDE + 4D Spacetime Rules',
    description:
      'Classic 8×8 chess expanded across Time (T) and Parallel Timelines (L). Includes 2D spatial castling, 2D en passant, and auto-queen promotion.',
    boardSize: 8,
  },
  {
    id: 'time_lab',
    name: 'Temporal Sandbox Lab',
    subtitle: 'Pre-History Loaded · Ready to Time Travel',
    description:
      'Starts at Turn 3 with open lanes and Queens, Rooks, Knights, and Bishops poised to leap backward in time or across timelines immediately.',
    boardSize: 5,
  },
  {
    id: 'royal_unicorn',
    name: 'Unicorn & Dragon Court',
    subtitle: 'Includes 3D Triagonal & 4D Quadragonal Pieces',
    description:
      'Features the authentic 5D Chess Unicorn (moves equally along 3 axes) and Dragon (moves equally along all 4 axes) alongside standard pieces.',
    boardSize: 6,
  },
  {
    id: 'puzzle_retrocausal',
    name: 'Puzzle I: Retrocausal Strike',
    subtitle: 'Checkmate the Past King in 1 Turn',
    description:
      'Black’s present King is heavily guarded, but Black’s past King on Turn 1 is exposed to a temporal Rook vector. Deliver retrocausal checkmate!',
    boardSize: 5,
    isPuzzle: true,
    puzzleGoal: 'Attack Black’s vulnerable King across spacetime or deliver checkmate.',
  },
  {
    id: 'puzzle_multiverse_fork',
    name: 'Puzzle II: Multiverse Fork',
    subtitle: 'Branch Timeline +L1 & Double-Threaten',
    description:
      'Jump your Queen or Rook back in time to spawn Timeline +L1 while creating an unstoppable cross-timeline fork.',
    boardSize: 5,
    isPuzzle: true,
    puzzleGoal: 'Execute a time-travel move to branch Timeline +L1 and check Black.',
  },
  {
    id: 'puzzle_unicorn_snipe',
    name: 'Puzzle III: Unicorn Tri-Axial Snipe',
    subtitle: '3D Triagonal Vector (|ΔX| = |ΔY| = |ΔT|)',
    description:
      'The Unicorn only moves along 3 axes simultaneously. Leap your Unicorn from L0·T3W (c3) 2 steps left, 2 steps up, and 2 turns into the past to snipe Black’s King at L0·T1W (a5)!',
    boardSize: 5,
    isPuzzle: true,
    puzzleGoal: 'Use your Unicorn (c3) to capture or check Black’s past King at L0·T1W (a5) via a 3-axis triagonal jump.',
  },
  {
    id: 'puzzle_dragon_tesseract',
    name: 'Puzzle IV: Dragon Tesseract Mate',
    subtitle: '4D Quadragonal Vector (|ΔX| = |ΔY| = |ΔT| = |ΔL|)',
    description:
      'The Dragon moves equally along all 4 axes at once! From Timeline +L1·T2W (b4), leap 1 file left, 1 rank up, 1 turn back, and 1 timeline down to L0·T1W (a5)!',
    boardSize: 5,
    isPuzzle: true,
    puzzleGoal: 'Use your Dragon on +L1·T2W (b4) to strike Black’s past King at L0·T1W (a5) across all 4 dimensions.',
  },
];

export const AI_PERSONA_CONFIGS: {
  id: AIPersona;
  name: string;
  badge: string;
  description: string;
}[] = [
  {
    id: 'novice',
    name: 'Novice · 空间新手',
    badge: '2D Focus',
    description: 'Prefers standard 2D spatial moves and rarely initiates timeline splits.',
  },
  {
    id: 'tactician',
    name: 'Tactician · 时空战术家',
    badge: 'Balanced',
    description: 'Balances solid 2D board defense with tactical time jumps and checks.',
  },
  {
    id: 'chronomancer',
    name: 'Chronomancer · 时间狂魔',
    badge: 'Aggressive 5D',
    description: 'Actively hunts past Kings in HISTORY and branches parallel timelines for cross-spacetime forks.',
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
        enPassantTarget: b.enPassantTarget ? { ...b.enPassantTarget } : null,
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
      enPassantCapturedCoord: m.enPassantCapturedCoord ? { ...m.enPassantCapturedCoord } : undefined,
      axisDelta: { ...m.axisDelta },
    })),
    moveHistory: state.moveHistory.map((turn) => turn.map((m) => ({ ...m }))),
    turnSnapshots: includeSnapshots
      ? (state.turnSnapshots ?? []).map((s) => cloneMultiverseState(s, false))
      : [...(state.turnSnapshots ?? [])],
    snapshotsBeforeStaged: includeSnapshots
      ? state.snapshotsBeforeStaged.map((s) => cloneMultiverseState(s, false))
      : [],
    lastTurnSnapshot:
      includeSnapshots && state.lastTurnSnapshot
        ? cloneMultiverseState(state.lastTurnSnapshot, false)
        : state.lastTurnSnapshot ?? null,
    checkmateForensics: state.checkmateForensics
      ? {
          ...state.checkmateForensics,
          fatalThreats: state.checkmateForensics.fatalThreats.map((th) => ({
            ...th,
            from: { ...th.from },
            to: { ...th.to },
            attacker: { ...th.attacker },
            king: { ...th.king },
          })),
        }
      : null,
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

  if (variant === 'puzzle_dragon_tesseract') {
    const size = 5;
    const baseSquares = createEmptyGrid(size);
    baseSquares[0] = buildTactical5x5Row('w', 't0_y0');
    baseSquares[1] = Array.from({ length: size }, (_, x) => makePiece('p', 'w', `t0_y1_${x}`));
    baseSquares[3] = Array.from({ length: size }, (_, x) => makePiece('p', 'b', `t0_y3_${x}`));
    baseSquares[4] = buildTactical5x5Row('b', 't0_y4');
    // Put Black King at a5 (x=0, y=4) on L0_T0 so Dragon at (+L1, T2W, x=1, y=3) can jump (dx=-1, dy=+1, dt=-1, dl=-1) to (L0, T1W, x=0, y=4)!
    baseSquares[4][0] = makePiece('k', 'b', 'past_king');
    baseSquares[4][4] = makePiece('r', 'b', 'past_rook');

    const l0_b0: BoardState = {
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
    sq1[4][0] = null;
    sq1[4][4] = makePiece('k', 'b', 'present_king', true);
    const l0_b1: BoardState = {
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
    const l0_b2: BoardState = {
      id: 'L0_T2',
      l: 0,
      t: 2,
      turnNumber: 2,
      activeColor: 'w',
      size,
      squares: sq2,
      isLeaf: true,
      parentBoardId: 'L0_T1',
    };

    // Timeline +L1 branched from L0_T0, starting at t=1 and currently at t=2 (T2W) with a White Dragon at b4 (x=1, y=3)
    const l1_sq1 = cloneBoardSquares(baseSquares);
    const l1_b1: BoardState = {
      id: 'L1_T1',
      l: 1,
      t: 1,
      turnNumber: 1,
      activeColor: 'b',
      size,
      squares: l1_sq1,
      isLeaf: false,
      parentBoardId: 'L0_T0',
    };

    const l1_sq2 = cloneBoardSquares(l1_sq1);
    l1_sq2[3][1] = makePiece('d', 'w', 'tesseract_dragon', true);
    const l1_b2: BoardState = {
      id: 'L1_T2',
      l: 1,
      t: 2,
      turnNumber: 2,
      activeColor: 'w',
      size,
      squares: l1_sq2,
      isLeaf: true,
      parentBoardId: 'L1_T1',
    };

    return {
      boardSize: size,
      timelines: {
        0: {
          l: 0,
          name: 'Timeline L0',
          createdBy: 'initial',
          boards: [l0_b0, l0_b1, l0_b2],
        },
        1: {
          l: 1,
          name: 'Timeline +L1',
          createdBy: 'w',
          parentTimeline: 0,
          branchFromStep: 0,
          boards: [l1_b1, l1_b2],
        },
      },
      timelineOrder: [0, 1],
      turnColor: 'w',
      turnCount: 2,
    };
  }

  if (
    variant === 'time_lab' ||
    variant === 'puzzle_retrocausal' ||
    variant === 'puzzle_multiverse_fork' ||
    variant === 'puzzle_unicorn_snipe'
  ) {
    const size = 5;
    // Build a 5-board history on L0 (t = 0, 1, 2, 3, 4) so Turn 3 White (t=4) can immediately jump to Turn 1 (t=0) or Turn 2 (t=2)
    const baseSquares = createEmptyGrid(size);
    baseSquares[0] = buildTactical5x5Row('w', 't0_y0');
    baseSquares[1] = Array.from({ length: size }, (_, x) => makePiece('p', 'w', `t0_y1_${x}`));
    baseSquares[3] = Array.from({ length: size }, (_, x) => makePiece('p', 'b', `t0_y3_${x}`));
    baseSquares[4] = buildTactical5x5Row('b', 't0_y4');

    if (variant === 'puzzle_retrocausal' || variant === 'puzzle_unicorn_snipe') {
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
    if (variant === 'puzzle_unicorn_snipe') {
      // Clear b4 (x=1, y=3) on T2W (t=2) so Unicorn's triagonal ray from (t=4, x=2, y=2) through (t=2, x=1, y=3) to (t=0, x=0, y=4) is unobstructed!
      sq2[3][1] = null;
    }
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
    if (variant === 'puzzle_retrocausal' || variant === 'puzzle_unicorn_snipe') {
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
      sq4[0][0] = null;
      sq4[4][0] = makePiece('r', 'w', 'chrono_rook', true);
      sq4[4][4] = makePiece('k', 'b', 'present_king', true);
    } else if (variant === 'puzzle_unicorn_snipe') {
      // Place White Unicorn at c3 (x=2, y=2) on T3W (t=4)
      sq4[2][2] = makePiece('u', 'w', 'chrono_unicorn', true);
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
  opponentMode: OpponentMode = 'ai',
  aiPersona: AIPersona = 'tactician',
  promotionRule: PromotionRule = 'choose_piece',
  timelineActivationDelta: TimelineActivationDelta = 2
): MultiverseState {
  const init = createInitialBoardsForVariant(variant);
  const state: MultiverseState = {
    variant,
    opponentMode,
    aiPersona,
    promotionRule,
    timelineActivationDelta,
    boardSize: init.boardSize,
    timelines: init.timelines,
    timelineOrder: init.timelineOrder,
    turnColor: init.turnColor,
    turnCount: init.turnCount,
    presentStep: 0,
    stagedMoves: [],
    moveHistory: [],
    turnSnapshots: [],
    snapshotsBeforeStaged: [],
    winner: null,
    winReason: null,
    timeJumpsCount: 0,
    timelinesCreatedCount: init.timelineOrder.length,
  };
  state.presentStep = calculatePresentStep(state);
  return state;
}

/**
 * Updates configurable rules (`promotionRule` and `timelineActivationDelta`) on an active MultiverseState
 * and recalculates `presentStep` immediately.
 */
export function setRulesConfigPure(
  state: MultiverseState,
  promotionRule: PromotionRule,
  timelineActivationDelta: TimelineActivationDelta
): MultiverseState {
  const next = cloneMultiverseState(state, true);
  next.promotionRule = promotionRule;
  next.timelineActivationDelta = timelineActivationDelta;
  next.presentStep = calculatePresentStep(next);
  return next;
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

export interface ActiveTimelineBounds {
  activeSet: Set<number>;
  minActiveL: number;
  maxActiveL: number;
  whiteTimelinesCount: number;
  blackTimelinesCount: number;
  maxActiveSide: number;
  activationDelta: TimelineActivationDelta;
}

/**
 * Configurable 5D Chess Timeline Activation Rule:
 * Let Nw be the number of timelines created by White (l > 0) and Nb by Black (l < 0),
 * and Δ = state.timelineActivationDelta (default 2: "相差 2 以内激活", configurable to 1, 2, or 99).
 * The symmetric active band is [-maxActiveSide, +maxActiveSide] where maxActiveSide = min(Nw, Nb) + Δ.
 * Any timeline with |l| > maxActiveSide is Inactive (Optional Playable — does not pull back The Present),
 * and automatically reactivates as soon as the opponent branches a timeline so the difference is <= Δ!
 */
export function getActiveTimelineBounds(state: MultiverseState): ActiveTimelineBounds {
  const posTimelines = state.timelineOrder.filter((l) => l > 0);
  const negTimelines = state.timelineOrder.filter((l) => l < 0);
  const whiteTimelinesCount = posTimelines.length;
  const blackTimelinesCount = negTimelines.length;
  const activationDelta: TimelineActivationDelta = state.timelineActivationDelta ?? 2;
  const maxActiveSide = Math.min(whiteTimelinesCount, blackTimelinesCount) + activationDelta;

  const activeSet = new Set<number>();
  let minActiveL = 0;
  let maxActiveL = 0;

  for (const l of state.timelineOrder) {
    if (Math.abs(l) <= maxActiveSide) {
      activeSet.add(l);
      if (l < minActiveL) minActiveL = l;
      if (l > maxActiveL) maxActiveL = l;
    }
  }

  return {
    activeSet,
    minActiveL,
    maxActiveL,
    whiteTimelinesCount,
    blackTimelinesCount,
    maxActiveSide,
    activationDelta,
  };
}

export function getActiveTimelines(state: MultiverseState): Set<number> {
  return getActiveTimelineBounds(state).activeSet;
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
  promotedTo?: PieceType,
  isCastling?: boolean,
  isEnPassant?: boolean
): string {
  if (isCastling) {
    const castleTag = to.x > from.x ? 'O-O' : 'O-O-O';
    return `${formatTimelineLabel(from.l)}:${castleTag}`;
  }
  const pChar = piece.type === 'p' ? '' : piece.type.toUpperCase();
  const capChar = captured ? 'x' : '-';
  const promoStr = promotedTo ? `=${promotedTo.toUpperCase()}` : '';
  const epStr = isEnPassant ? ' e.p.' : '';
  if (kind === 'spatial') {
    return `${formatTimelineLabel(from.l)}:${pChar}${formatSquare(from.x, from.y)}${capChar}${formatSquare(to.x, to.y)}${promoStr}${epStr}`;
  }
  const jumpSymbol = kind === 'timetravel_branch' ? '>>' : '->';
  return `(${formatTimelineLabel(from.l)} ${formatTurnStep(from.t)})${pChar}${formatSquare(from.x, from.y)} ${jumpSymbol} (${formatTimelineLabel(to.l)} ${formatTurnStep(to.t)})${captured ? 'x' : ''}${formatSquare(to.x, to.y)}${promoStr}`;
}

/**
 * Returns a copy of `move` with `promotedTo` updated to `chosenPieceType` and updated notation.
 */
export function withPromotedPiece(move: Move5D, chosenPieceType: PieceType): Move5D {
  return {
    ...move,
    promotedTo: chosenPieceType,
    notation: buildMoveNotation(
      move.piece,
      move.from,
      move.to,
      move.kind,
      move.captured,
      chosenPieceType,
      move.isCastling,
      move.isEnPassant
    ),
  };
}

/**
 * Helper to check if a 2D square `(x, y)` on a single board `board` is spatially attacked by `byColor`.
 * Used strictly for 2D Spatial Castling validation (King cannot castle out of or through spatial check).
 */
function isSquareSpatiallyAttackedOnBoard(
  board: BoardState,
  targetX: number,
  targetY: number,
  byColor: PlayerColor
): boolean {
  const size = board.size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = board.squares[y][x];
      if (!p || p.color !== byColor) continue;
      const dx = targetX - x;
      const dy = targetY - y;
      if (dx === 0 && dy === 0) continue;

      if (p.type === 'p') {
        const fwd = byColor === 'w' ? 1 : -1;
        if (dy === fwd && Math.abs(dx) === 1) return true;
      } else if (p.type === 'n') {
        if ((Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2)) {
          return true;
        }
      } else if (p.type === 'k') {
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
      } else if (p.type === 'r' || p.type === 'q') {
        if (dx === 0 || dy === 0) {
          const sx = Math.sign(dx);
          const sy = Math.sign(dy);
          const steps = Math.max(Math.abs(dx), Math.abs(dy));
          let clear = true;
          for (let s = 1; s < steps; s++) {
            if (board.squares[y + sy * s][x + sx * s]) {
              clear = false;
              break;
            }
          }
          if (clear) return true;
        }
      }
      if (p.type === 'b' || p.type === 'q') {
        if (Math.abs(dx) === Math.abs(dy)) {
          const sx = Math.sign(dx);
          const sy = Math.sign(dy);
          const steps = Math.abs(dx);
          let clear = true;
          for (let s = 1; s < steps; s++) {
            if (board.squares[y + sy * s][x + sx * s]) {
              clear = false;
              break;
            }
          }
          if (clear) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Generates pseudo-legal moves for a piece located at `from` on board `(from.l, from.t)`.
 * Canonical 5D Chess rules enforced:
 * - Pawn promotion is strictly Auto-Queen ('q').
 * - Castling is strictly 2D spatial (`dt = 0, dl = 0`).
 * - En Passant is strictly single-board 2D spatial (`dt = 0, dl = 0`).
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
    if (destBoard.activeColor !== piece.color) return;

    const targetCell = destBoard.squares[to.y]?.[to.x];
    if (targetCell && targetCell.color === piece.color) return;

    const kind = classifyMoveKind(state, from, to);
    // Canonical 5D Chess: Promotion is strictly auto-Queen ('q')
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

    // 2. Spatial diagonal captures (dx = ±1, dy = forwardDir) + Strictly Single-Board 2D En Passant
    for (const dx of [-1, 1]) {
      const nx = from.x + dx;
      const ny = from.y + forwardDir;
      if (isInsideSquareBounds(size, nx, ny)) {
        const target = srcBoard.squares[ny][nx];
        if (target && target.color !== piece.color) {
          pushMove({ l: from.l, t: from.t, x: nx, y: ny }, dx, forwardDir, 0, 0);
        } else if (
          !target &&
          srcBoard.enPassantTarget &&
          srcBoard.enPassantTarget.byColor !== piece.color &&
          srcBoard.enPassantTarget.x === nx &&
          srcBoard.enPassantTarget.y === ny &&
          srcBoard.enPassantTarget.pawnY === from.y &&
          srcBoard.enPassantTarget.pawnX === nx
        ) {
          const epPawn = srcBoard.squares[srcBoard.enPassantTarget.pawnY]?.[srcBoard.enPassantTarget.pawnX];
          if (epPawn && epPawn.color !== piece.color && epPawn.type === 'p') {
            const toCoord: Coord5D = { l: from.l, t: from.t, x: nx, y: ny };
            moves.push({
              id: `m_${from.l}_${from.t}_${from.x}_${from.y}_ep_${nx}_${ny}`,
              from,
              to: toCoord,
              piece,
              captured: epPawn,
              isEnPassant: true,
              enPassantCapturedCoord: {
                x: srcBoard.enPassantTarget.pawnX,
                y: srcBoard.enPassantTarget.pawnY,
              },
              kind: 'spatial',
              resultingSourceBoard: { l: from.l, t: from.t + 1 },
              notation: buildMoveNotation(piece, from, toCoord, 'spatial', epPawn, undefined, false, true),
              axisDelta: { dx, dy: forwardDir, dt: 0, dl: 0 },
            });
          }
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

    // Strictly 2D Spatial Castling (never generalized to Time or Timeline axes)
    const backRank = piece.color === 'w' ? 0 : size - 1;
    const oppColor: PlayerColor = piece.color === 'w' ? 'b' : 'w';
    if (
      !piece.hasMoved &&
      from.y === backRank &&
      !isSquareSpatiallyAttackedOnBoard(srcBoard, from.x, from.y, oppColor)
    ) {
      for (let rx = 0; rx < size; rx++) {
        if (rx === from.x) continue;
        const cornerPiece = srcBoard.squares[backRank][rx];
        if (!cornerPiece || cornerPiece.color !== piece.color || cornerPiece.type !== 'r' || cornerPiece.hasMoved) {
          continue;
        }
        const dirX = rx > from.x ? 1 : -1;
        const dist = Math.abs(rx - from.x);
        if (dist < 2) continue;

        // Check all squares between King and Rook are empty
        let pathEmpty = true;
        for (let step = 1; step < dist; step++) {
          if (srcBoard.squares[backRank][from.x + dirX * step]) {
            pathEmpty = false;
            break;
          }
        }
        if (!pathEmpty) continue;

        const kingTargetX = dist >= 3 ? from.x + dirX * 2 : from.x + dirX;
        const rookTargetX = kingTargetX - dirX;
        if (kingTargetX === rx) continue;

        // Check squares King steps through and lands on are not spatially attacked on this board
        let safePath = true;
        const stepsCount = Math.abs(kingTargetX - from.x);
        for (let s = 1; s <= stepsCount; s++) {
          if (isSquareSpatiallyAttackedOnBoard(srcBoard, from.x + dirX * s, backRank, oppColor)) {
            safePath = false;
            break;
          }
        }
        if (!safePath) continue;

        const toCoord: Coord5D = { l: from.l, t: from.t, x: kingTargetX, y: backRank };
        moves.push({
          id: `m_${from.l}_${from.t}_${from.x}_${from.y}_castle_${kingTargetX}`,
          from,
          to: toCoord,
          piece,
          isCastling: true,
          castlingRookFromX: rx,
          castlingRookToX: rookTargetX,
          kind: 'spatial',
          resultingSourceBoard: { l: from.l, t: from.t + 1 },
          notation: buildMoveNotation(piece, from, toCoord, 'spatial', undefined, undefined, true, false),
          axisDelta: { dx: kingTargetX - from.x, dy: 0, dt: 0, dl: 0 },
        });
      }
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
        break;
      }
    }
  }

  return moves;
}

/**
 * Finds all active threat vectors targeting Kings of `targetKingColor`.
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
      ((state.variant === 'puzzle_retrocausal' ||
        state.variant === 'puzzle_unicorn_snipe' ||
        state.variant === 'puzzle_dragon_tesseract') &&
        targetKingColor === 'b');

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

/**
 * Finds all active threat vectors AND impending retrocausal/cross-timeline threat vectors
 * against `targetKingColor` Kings on leaf boards where `leaf.activeColor === targetKingColor`.
 */
export function findActiveAndImpendingThreats(
  state: MultiverseState,
  targetKingColor: PlayerColor
): ThreatVector[] {
  const baseThreats = findThreatsToColorKings(state, targetKingColor);
  const seen = new Set<string>(
    baseThreats.map(
      (th) => `${th.from.l}_${th.from.t}_${th.from.x}_${th.from.y}_to_${th.to.l}_${th.to.t}_${th.to.x}_${th.to.y}`
    )
  );
  const result: ThreatVector[] = [...baseThreats];
  const attackerColor: PlayerColor = targetKingColor === 'w' ? 'b' : 'w';

  for (const l of state.timelineOrder) {
    const leaf = getLeafBoard(state, l);
    if (!leaf || leaf.activeColor !== targetKingColor) continue;

    for (let y = 0; y < state.boardSize; y++) {
      for (let x = 0; x < state.boardSize; x++) {
        const piece = leaf.squares[y][x];
        if (!piece || piece.color !== attackerColor) continue;

        const virtualNextCoord: Coord5D = { l: leaf.l, t: leaf.t + 1, x, y };
        const candidateMoves = getPseudoLegalCapturesFromAnyBoard(state, virtualNextCoord, piece);
        for (const m of candidateMoves) {
          if (m.captured && m.captured.type === 'k' && m.captured.color === targetKingColor) {
            const destBoard = getBoard(state, m.to.l, m.to.t);
            if (!destBoard || destBoard.activeColor !== attackerColor) continue;

            const actualFrom: Coord5D = { l: leaf.l, t: leaf.t, x, y };
            const key = `${actualFrom.l}_${actualFrom.t}_${actualFrom.x}_${actualFrom.y}_to_${m.to.l}_${m.to.t}_${m.to.x}_${m.to.y}`;
            if (!seen.has(key)) {
              seen.add(key);
              result.push({
                from: actualFrom,
                to: m.to,
                attacker: piece,
                king: m.captured,
                isCrossTimeline: actualFrom.l !== m.to.l || actualFrom.t !== m.to.t,
              });
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Past-King Danger Radar (`过去王危险预警雷达`):
 * Detects when an enemy sliding piece (`r, b, q, u, d`) on a leaf board is aligned along a 4D vector
 * with a friendly Past King (`t < leaf.t`) in `HISTORY` with at most 1 intermediate blocker piece,
 * giving the player an early radar warning before a sudden retrocausal checkmate happens!
 */
export function findPastKingRadarWarnings(
  state: MultiverseState,
  targetKingColor: PlayerColor
): PastKingRadarWarning[] {
  const warnings: PastKingRadarWarning[] = [];
  const attackerColor: PlayerColor = targetKingColor === 'w' ? 'b' : 'w';
  const size = state.boardSize;
  const seen = new Set<string>();

  for (const l of state.timelineOrder) {
    const leaf = getLeafBoard(state, l);
    if (!leaf) continue;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const piece = leaf.squares[y][x];
        if (!piece || piece.color !== attackerColor) continue;
        if (!['r', 'b', 'q', 'u', 'd'].includes(piece.type)) continue;

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

        for (const baseT of [leaf.t, leaf.t + 1]) {
          for (const dir of DIRECTIONS_4D) {
            // Only look backward in time (dt < 0) or across timelines (dl !== 0)
            if (dir.dt >= 0 && dir.dl === 0) continue;
            if (!allowedAxesCounts.includes(dir.axesCount)) continue;

            let blockerCoord: Coord5D | undefined;
            let blockersCount = 0;

            for (let step = 1; step <= 8; step++) {
              const tx = x + dir.dx * step;
              const ty = y + dir.dy * step;
              if (!isInsideSquareBounds(size, tx, ty)) break;
              const tt = baseT + dir.dt * 2 * step;
              const tl = leaf.l + dir.dl * step;
              const destBoard = getBoard(state, tl, tt);
              if (!destBoard) break;

              const cell = destBoard.squares[ty]?.[tx];
              if (!cell) continue;

              if (cell.type === 'k' && cell.color === targetKingColor && tt < leaf.t) {
                const key = `${leaf.l}_${leaf.t}_${x}_${y}_radar_${tl}_${tt}_${tx}_${ty}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  warnings.push({
                    attackerCoord: { l: leaf.l, t: leaf.t, x, y },
                    kingCoord: { l: tl, t: tt, x: tx, y: ty },
                    attacker: piece,
                    king: cell,
                    blockerCoord,
                    alignmentDescription: blockerCoord
                      ? `历史王 (${formatTimelineLabel(tl)}·${formatTurnStep(tt)} ${formatSquare(tx, ty)}) 与敌方${PIECE_BILINGUAL_NAMES[piece.type]}处于同一跨时间射线（仅 1 子遮挡）`
                      : `历史王 (${formatTimelineLabel(tl)}·${formatTurnStep(tt)} ${formatSquare(tx, ty)}) 已暴露在敌方${PIECE_BILINGUAL_NAMES[piece.type]}的跨时间射线上！`,
                  });
                }
                break;
              } else {
                blockersCount++;
                blockerCoord = { l: tl, t: tt, x: tx, y: ty };
                if (blockersCount > 1) break;
              }
            }
          }
        }
      }
    }
  }

  return warnings;
}

export interface MovePreviewOutcome {
  move: Move5D;
  willBranchNewTimeline: boolean;
  newTimelineIndex?: number;
  isNewTimelineActive?: boolean;
  nextPresentStep: number;
  ghostBoardCoord: { l: number; t: number };
}

/**
 * Computes the exact multiverse outcome of staging `move` without mutating `state`,
 * used by the Ghost Move & Timeline Branch Preview overlay when hovering a time-travel move.
 */
export function previewMoveOutcome(state: MultiverseState, move: Move5D): MovePreviewOutcome {
  const after = applyStagedMovePure(state, move);
  const bounds = getActiveTimelineBounds(after);
  const lastStaged = after.stagedMoves[after.stagedMoves.length - 1];
  const willBranchNewTimeline = lastStaged?.kind === 'timetravel_branch' && lastStaged.createdTimeline !== undefined;
  const newTimelineIndex = lastStaged?.createdTimeline;
  const isNewTimelineActive =
    newTimelineIndex !== undefined ? bounds.activeSet.has(newTimelineIndex) : undefined;
  const ghostBoardCoord =
    lastStaged?.resultingTargetBoard ?? lastStaged?.resultingSourceBoard ?? { l: move.to.l, t: move.to.t + 1 };

  return {
    move,
    willBranchNewTimeline,
    newTimelineIndex,
    isNewTimelineActive,
    nextPresentStep: after.presentStep,
    ghostBoardCoord,
  };
}

const PIECE_BILINGUAL_NAMES: Record<PieceType, string> = {
  p: '兵 (Pawn)',
  n: '骑士 (Knight)',
  b: '主教 (Bishop)',
  r: '战车 (Rook)',
  q: '王后 (Queen)',
  k: '国王 (King)',
  u: '独角兽 (Unicorn)',
  d: '时空龙 (Dragon)',
};

/**
 * Builds a detailed forensic explanation of why Checkmate (or Stalemate / Royal Capture) occurred,
 * identifying the exact killer piece, the doomed King (present or past), and why no move could save it.
 */
export function buildCheckmateForensics(
  state: MultiverseState,
  victimColor: PlayerColor,
  winnerColor: PlayerColor | 'draw'
): CheckmateForensics {
  const lastTurnMoves =
    state.moveHistory.length > 0
      ? state.moveHistory[state.moveHistory.length - 1]
      : state.stagedMoves;
  const killerMoveNotation =
    lastTurnMoves.length > 0 ? lastTurnMoves.map((m) => m.notation).join(', ') : undefined;

  if (winnerColor === 'draw') {
    return {
      victimColor,
      winnerColor: 'draw',
      kind: 'stalemate',
      headline: '多维时空逼和 · Multiverse Stalemate',
      summary:
        '当前行动方在所有必走棋盘上均无合法着法，且没有任何王处于被将军状态，比赛判为逼和（Stalemate）。',
      attackerLabel: '无直接攻击子 (No Direct Attacker)',
      victimKingLabel: `${victimColor === 'w' ? '白方 (White)' : '黑方 (Black)'} 国王`,
      whyUnsavable: '所有走法均会导致己方王自杀（送吃），但当前王本身未被攻击。',
      fatalThreats: [],
      killerMoveNotation,
    };
  }

  let fatalThreats = findActiveAndImpendingThreats(state, victimColor);
  let isPinnedZugzwang = false;

  if (fatalThreats.length === 0) {
    const playable = getPlayableBoards(state, victimColor);
    for (const pb of playable) {
      for (let y = 0; y < state.boardSize && fatalThreats.length === 0; y++) {
        for (let x = 0; x < state.boardSize && fatalThreats.length === 0; x++) {
          const p = pb.board.squares[y][x];
          if (!p || p.color !== victimColor) continue;
          const pseudo = getPseudoLegalMovesForPiece(state, {
            l: pb.board.l,
            t: pb.board.t,
            x,
            y,
          });
          for (const pm of pseudo) {
            const after = applyStagedMovePure(state, pm);
            const afterThreats = findThreatsToColorKings(after, victimColor);
            if (afterThreats.length > 0) {
              const rawTh = afterThreats[0];
              const mappedFrom: Coord5D =
                rawTh.from.l === pm.resultingSourceBoard.l &&
                rawTh.from.t === pm.resultingSourceBoard.t
                  ? { l: pb.board.l, t: pb.board.t, x: rawTh.from.x, y: rawTh.from.y }
                  : rawTh.from;
              const mappedTo: Coord5D =
                rawTh.to.l === pm.resultingSourceBoard.l &&
                rawTh.to.t === pm.resultingSourceBoard.t
                  ? { l: pb.board.l, t: pb.board.t, x: rawTh.to.x, y: rawTh.to.y }
                  : rawTh.to;
              fatalThreats = [
                {
                  ...rawTh,
                  from: mappedFrom,
                  to: mappedTo,
                  isCrossTimeline:
                    mappedFrom.l !== mappedTo.l || mappedFrom.t !== mappedTo.t,
                },
              ];
              isPinnedZugzwang = true;
              break;
            }
          }
        }
      }
    }
  }

  if (fatalThreats.length > 0) {
    const primary = fatalThreats[0];
    const attackerSide = primary.attacker.color === 'w' ? '白方 (White)' : '黑方 (Black)';
    const victimSide = victimColor === 'w' ? '白方 (White)' : '黑方 (Black)';
    const attackerPieceName = PIECE_BILINGUAL_NAMES[primary.attacker.type];
    const fromBoardStr = `${formatTimelineLabel(primary.from.l)} · ${formatTurnStep(primary.from.t)}`;
    const toBoardStr = `${formatTimelineLabel(primary.to.l)} · ${formatTurnStep(primary.to.t)}`;
    const fromSqStr = formatSquare(primary.from.x, primary.from.y);
    const toSqStr = formatSquare(primary.to.x, primary.to.y);

    const attackerLabel = `${attackerSide} ${attackerPieceName} @ ${fromBoardStr} (${fromSqStr})`;
    const isPastKing = primary.to.t < primary.from.t;
    const isCrossLine = primary.from.l !== primary.to.l;

    const victimKingLabel = isPastKing
      ? `${victimSide} 过去的王 (Past King · HISTORY) @ ${toBoardStr} (${toSqStr})`
      : `${victimSide} 当前的王 (Present King) @ ${toBoardStr} (${toSqStr})`;

    if (isPinnedZugzwang) {
      return {
        victimColor,
        winnerColor,
        kind: 'pinned_zugzwang',
        headline: '全员被牵制 / 动则必死 · Fatal Spacetime Pin',
        summary: `你在当前棋盘上的每一步走法，都会导致【${victimKingLabel}】暴露在【${attackerLabel}】的致命攻击之下！`,
        attackerLabel,
        victimKingLabel,
        whyUnsavable:
          '所有可动棋子均处于空间或跨时间绝对牵制状态（Pinned），任何移动都会导致己方王在下个半回合被直接吃掉。',
        fatalThreats,
        killerMoveNotation,
      };
    }

    if (isPastKing && !isCrossLine) {
      const turnsBack = Math.max(1, Math.ceil((primary.from.t - primary.to.t) / 2));
      return {
        victimColor,
        winnerColor,
        kind: 'retrocausal_checkmate',
        headline: '跨时间回溯绝杀 · Retrocausal Past-King Checkmate',
        summary: `位于当前棋盘 ${fromBoardStr} (${fromSqStr}) 的【${attackerSide}${attackerPieceName}】正跨越 ${turnsBack} 个回合的时间维，直接锁定你在过去棋盘 ${toBoardStr} (${toSqStr}) 的【历史王 (Past King)】！`,
        attackerLabel,
        victimKingLabel,
        whyUnsavable: `在 5D 国际象棋中，过去的棋盘（${toBoardStr} · HISTORY）已被历史锁定，你无法移动过去的王，也无法在过去的棋盘上垫子格挡；同时你在当前棋盘 ${fromBoardStr} 上没有任何合法走法能吃掉 ${fromSqStr} 格上的攻击子，导致过去的王必死！`,
        fatalThreats,
        killerMoveNotation,
      };
    }

    if (isCrossLine) {
      return {
        victimColor,
        winnerColor,
        kind: 'multiverse_checkmate',
        headline: '跨平行宇宙绝杀 · Cross-Timeline Multiverse Checkmate',
        summary: `位于平行时间线 ${fromBoardStr} (${fromSqStr}) 的【${attackerSide}${attackerPieceName}】通过四维空间向量跨越宇宙维度，直接将死了位于 ${toBoardStr} (${toSqStr}) 的王！`,
        attackerLabel,
        victimKingLabel,
        whyUnsavable: `攻击来自另一条平行时间线（${formatTimelineLabel(primary.from.l)}），当前必走棋盘上的任何走法均无法同时消除该跨维度威胁或保护 ${toBoardStr} 上的王。`,
        fatalThreats,
        killerMoveNotation,
      };
    }

    return {
      victimColor,
      winnerColor,
      kind: 'spatial_checkmate',
      headline: '当前棋盘空间绝杀 · Spatial Checkmate',
      summary: `位于 ${fromBoardStr} (${fromSqStr}) 的【${attackerSide}${attackerPieceName}】直接将死了同一棋盘 ${toBoardStr} (${toSqStr}) 上的【${victimSide}国王】！`,
      attackerLabel,
      victimKingLabel,
      whyUnsavable: `国王的所有逃生格均被封锁，且没有任何己方棋子能在不暴露其他时空王的前提下吃掉 ${fromSqStr} 的攻击子或垫子格挡。`,
      fatalThreats,
      killerMoveNotation,
    };
  }

  return {
    victimColor,
    winnerColor,
    kind: 'spatial_checkmate',
    headline: '多维时空绝杀 · Multiverse Checkmate',
    summary: `${winnerColor === 'w' ? '白方 (White)' : '黑方 (Black)'} 完成了多维时空绝杀，${victimColor === 'w' ? '白方' : '黑方'}已无任何合法走法可解救国王。`,
    attackerLabel: `${winnerColor === 'w' ? '白方 (White)' : '黑方 (Black)'} 攻击部队`,
    victimKingLabel: `${victimColor === 'w' ? '白方 (White)' : '黑方 (Black)'} 国王`,
    whyUnsavable: '所有必走棋盘上的着法均无法解除时空将军。',
    fatalThreats: [],
    killerMoveNotation,
  };
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
  // Filter out moves that leave ANY of the friendly King(s) in check on ANY board.
  // The old filter only inspected threats touching the move's resultingSourceBoard /
  // resultingTargetBoard, so a king in check on a third board (unrelated to the move)
  // was silently ignored. That let a player stage a move elsewhere while a king sat in
  // check, which then blocked canSubmitCurrentTurn and hung the game. We now reject any
  // move that leaves the mover in check anywhere.
  return pseudo.filter((move) => {
    const nextState = applyStagedMovePure(state, move);
    const threats = findThreatsToColorKings(nextState, state.turnColor);
    return threats.length === 0;
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
    // 1. Standard Spatial Move on the same board (includes 2D Castling and 2D En Passant)
    srcBoard.isLeaf = false;
    const newSquares = cloneBoardSquares(srcBoard.squares);
    newSquares[move.from.y][move.from.x] = null;

    if (
      move.isCastling &&
      move.castlingRookFromX !== undefined &&
      move.castlingRookToX !== undefined
    ) {
      const rook = newSquares[move.from.y][move.castlingRookFromX];
      newSquares[move.from.y][move.castlingRookFromX] = null;
      if (rook) {
        newSquares[move.from.y][move.castlingRookToX] = {
          ...rook,
          hasMoved: true,
        };
      }
    }

    if (move.isEnPassant && move.enPassantCapturedCoord) {
      newSquares[move.enPassantCapturedCoord.y][move.enPassantCapturedCoord.x] = null;
    }

    newSquares[move.to.y][move.to.x] = movedPiece;

    // Record single-board 2D En Passant target if this was a 2-square spatial pawn advance
    const isDoublePawnAdvance =
      move.piece.type === 'p' && Math.abs(move.to.y - move.from.y) === 2 && move.from.x === move.to.x;
    const forwardDir = move.piece.color === 'w' ? 1 : -1;

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
      enPassantTarget: isDoublePawnAdvance
        ? {
            x: move.from.x,
            y: move.from.y + forwardDir,
            pawnX: move.to.x,
            pawnY: move.to.y,
            byColor: move.piece.color,
          }
        : null,
    };
    srcTimeline.boards.push(newBoard);

    const recordedMove: Move5D = {
      ...move,
      resultingSourceBoard: { l: srcBoard.l, t: newT },
    };
    next.stagedMoves.push(recordedMove);
  } else {
    // 2. Inter-Temporal / Multiverse Move!
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
      enPassantTarget: null,
    };
    srcTimeline.boards.push(srcNextBoard);

    const dstBoard = getBoard(next, move.to.l, move.to.t);
    if (dstBoard) {
      const dstNextSquares = cloneBoardSquares(dstBoard.squares);
      dstNextSquares[move.to.y][move.to.x] = movedPiece;
      const dstNextT = dstBoard.t + 1;

      if (dstBoard.isLeaf) {
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
          enPassantTarget: null,
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
          enPassantTarget: null,
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
    const victimColor = move.captured.color;
    next.winner = state.turnColor;
    next.winReason = `Captured ${victimColor === 'w' ? 'White' : 'Black'}'s Royal King across spacetime! · 穿越时空擒获${victimColor === 'w' ? '白方' : '黑方'}国王！`;
    const attackerSide = state.turnColor === 'w' ? '白方 (White)' : '黑方 (Black)';
    const victimSide = victimColor === 'w' ? '白方 (White)' : '黑方 (Black)';
    const fromStr = `${formatTimelineLabel(move.from.l)} · ${formatTurnStep(move.from.t)} (${formatSquare(move.from.x, move.from.y)})`;
    const toStr = `${formatTimelineLabel(move.to.l)} · ${formatTurnStep(move.to.t)} (${formatSquare(move.to.x, move.to.y)})`;
    next.checkmateForensics = {
      victimColor,
      winnerColor: state.turnColor,
      kind: 'king_captured',
      headline: '国王被直接跨越时空捕获 · Royal King Captured',
      summary: `【${attackerSide}${PIECE_BILINGUAL_NAMES[move.piece.type]}】从 ${fromStr} 发动攻击，直接吃掉了位于 ${toStr} 的【${victimSide}国王】！`,
      attackerLabel: `${attackerSide} ${PIECE_BILINGUAL_NAMES[move.piece.type]} @ ${fromStr}`,
      victimKingLabel: `${victimSide} 过去的王 (Past King · HISTORY) @ ${toStr}`,
      whyUnsavable: '国王已在历史或当前时空暴露在可被直接捕获的四维向量路径上。',
      fatalThreats: [
        {
          from: move.from,
          to: move.to,
          attacker: move.piece,
          king: move.captured,
          isCrossTimeline: move.from.l !== move.to.l || move.from.t !== move.to.t,
        },
      ],
      killerMoveNotation: move.notation,
    };
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
 * Rewinds the match back to the start of the human player's previous turn (`lastTurnSnapshot`).
 */
export function undoLastTurn(state: MultiverseState): MultiverseState {
  if (!state.lastTurnSnapshot) return state;
  return cloneMultiverseState(state.lastTurnSnapshot, true);
}

/**
 * Rewinds the multiverse to any historical turn index `turnIdx` (0 .. state.turnSnapshots.length - 1)
 * from the 5D Move History & Time-Tree Drawer (Post-Mortem Sandbox).
 */
export function rewindToTurnIndex(state: MultiverseState, turnIdx: number): MultiverseState {
  if (turnIdx < 0 || turnIdx >= state.turnSnapshots.length) return state;
  const target = cloneMultiverseState(state.turnSnapshots[turnIdx], false);
  target.turnSnapshots = state.turnSnapshots
    .slice(0, turnIdx)
    .map((s) => cloneMultiverseState(s, false));
  target.lastTurnSnapshot =
    turnIdx > 0 ? cloneMultiverseState(state.turnSnapshots[turnIdx - 1], false) : null;
  return target;
}

/**
 * Commits all staged moves and transitions the turn to the next player.
 */
export function submitTurnPure(state: MultiverseState): MultiverseState {
  const check = canSubmitCurrentTurn(state);
  if (!check.canSubmit) {
    return state;
  }

  const next = cloneMultiverseState(state, true);
  const preTurnSnapshot =
    state.snapshotsBeforeStaged.length > 0
      ? cloneMultiverseState(state.snapshotsBeforeStaged[0], false)
      : cloneMultiverseState(state, false);

  next.turnSnapshots = [...(state.turnSnapshots ?? []), preTurnSnapshot];

  if (state.opponentMode === 'pass_and_play' || state.turnColor === 'w') {
    next.lastTurnSnapshot = preTurnSnapshot;
  }

  next.moveHistory.push([...next.stagedMoves]);
  next.stagedMoves = [];
  next.snapshotsBeforeStaged = [];
  next.turnColor = state.turnColor === 'w' ? 'b' : 'w';
  next.turnCount += 1;
  next.presentStep = calculatePresentStep(next);

  // Puzzle win condition checks
  if (
    (next.variant === 'puzzle_retrocausal' ||
      next.variant === 'puzzle_unicorn_snipe' ||
      next.variant === 'puzzle_dragon_tesseract') &&
    state.turnColor === 'w'
  ) {
    const threats = findThreatsToColorKings(next, 'b');
    if (threats.some((t) => t.isCrossTimeline)) {
      next.winner = 'w';
      next.winReason = 'Spacetime Strike Complete! You attacked Black’s past King across dimensions. · 时空打击完成！你跨越维度攻击了黑方的历史王。';
      next.checkmateForensics = buildCheckmateForensics(next, 'b', 'w');
      return next;
    }
  }
  if (next.variant === 'puzzle_multiverse_fork' && state.turnColor === 'w') {
    if (next.timelinesCreatedCount >= 2) {
      next.winner = 'w';
      next.winReason = 'Multiverse Fork Complete! Timeline +L1 spawned successfully. · 多元宇宙分叉完成！时间线 +L1 成功生成。';
      next.checkmateForensics = {
        victimColor: 'b',
        winnerColor: 'w',
        kind: 'puzzle_solved',
        headline: '多维分叉谜题完成 · Multiverse Fork Complete',
        summary: '你成功通过时间旅行开辟了平行时间线 +L1，完成了多维战术分叉目标！',
        attackerLabel: '白方时空部队 (White Time Jumper)',
        victimKingLabel: '黑方阵线 (Black Timeline)',
        whyUnsavable: '成功开辟平行宇宙 +L1。',
        fatalThreats: findActiveAndImpendingThreats(next, 'b'),
      };
      return next;
    }
  }

  // Check if the incoming player has any legal moves on their playable boards
  const playableBoards = getPlayableBoards(next, next.turnColor);
  let totalLegalMoves = 0;
  const stuckMandatoryBoards: BoardState[] = [];
  const allLegalMoves: Move5D[] = [];

  for (const pb of playableBoards) {
    let boardMoves = 0;
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
          boardMoves += moves.length;
          totalLegalMoves += moves.length;
          allLegalMoves.push(...moves);
        }
      }
    }
    if (pb.isMandatory && boardMoves === 0) {
      stuckMandatoryBoards.push(pb.board);
    }
  }

  const hasUnrescuableMandatoryBoard = stuckMandatoryBoards.some(
    (sb) => !allLegalMoves.some((m) => m.to.l === sb.l && m.to.t === sb.t)
  );

  if ((totalLegalMoves === 0 || hasUnrescuableMandatoryBoard) && playableBoards.length > 0) {
    const threats = findActiveAndImpendingThreats(next, next.turnColor);
    const forensics = buildCheckmateForensics(
      next,
      next.turnColor,
      threats.length > 0 ? state.turnColor : 'draw'
    );
    if (threats.length > 0 || forensics.fatalThreats.length > 0) {
      const finalizedForensics =
        forensics.winnerColor === 'draw'
          ? buildCheckmateForensics(next, next.turnColor, state.turnColor)
          : forensics;
      next.winner = state.turnColor;
      next.winReason = finalizedForensics.summary;
      next.checkmateForensics = finalizedForensics;
    } else {
      next.winner = 'draw';
      next.winReason = forensics.summary;
      next.checkmateForensics = forensics;
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
 * adapting its heuristics to `state.aiPersona` ('novice' | 'tactician' | 'chronomancer').
 */
export function computeAITurn(state: MultiverseState): MultiverseState {
  let working = cloneMultiverseState(state, true);
  let safetyCounter = 0;
  const persona = working.aiPersona ?? 'tactician';

  // The AI must keep staging moves until NO mandatory board remains, otherwise
  // submitTurnPure refuses and the game hangs. The old hard cap of 8 left the turn
  // unplayable once timeline branching produced more than 8 mandatory boards. We now
  // loop until the turn is submittable, with a generous safety cap against pathological
  // infinite branching.
  const MAX_AI_STEPS = 400;
  while (safetyCounter < MAX_AI_STEPS && !working.winner) {
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
          if (m.isCastling) {
            score += 90;
          }
          const center = (working.boardSize - 1) / 2;
          const distCenter = Math.abs(m.to.x - center) + Math.abs(m.to.y - center);
          score += (working.boardSize - distCenter) * 10;

          const afterMove = applyStagedMovePure(working, m);
          const remainingThreats = findThreatsToColorKings(afterMove, working.turnColor);
          if (remainingThreats.length === 0) {
            score += 500;
          } else {
            score -= remainingThreats.length * 400;
          }

          const oppColor: PlayerColor = working.turnColor === 'w' ? 'b' : 'w';
          const oppThreats = findActiveAndImpendingThreats(afterMove, oppColor);
          if (oppThreats.length > 0) {
            score += persona === 'chronomancer' ? 320 : persona === 'tactician' ? 220 : 120;
          }

          // Persona-specific time-travel heuristics
          if (m.kind === 'timetravel_branch') {
            if (persona === 'novice') {
              score -= 140; // Novice prefers staying on 2D spatial boards
            } else if (persona === 'chronomancer') {
              score += m.captured || oppThreats.length > 0 ? 180 : 45;
            } else {
              // Tactician
              score += m.captured || oppThreats.length > 0 ? 55 : -40;
            }
          } else if (m.kind === 'timetravel_merge') {
            score += persona === 'novice' ? -30 : m.captured ? 65 : 15;
          }

          allCandidateMoves.push({ move: m, score });
        }
      }
    }

    if (allCandidateMoves.length === 0) {
      const threats = findActiveAndImpendingThreats(working, working.turnColor);
      const winColor: PlayerColor = working.turnColor === 'w' ? 'b' : 'w';
      const forensics = buildCheckmateForensics(
        working,
        working.turnColor,
        threats.length > 0 ? winColor : 'draw'
      );
      if (threats.length > 0 || forensics.fatalThreats.length > 0) {
        const finalized =
          forensics.winnerColor === 'draw'
            ? buildCheckmateForensics(working, working.turnColor, winColor)
            : forensics;
        working.winner = winColor;
        working.winReason = finalized.summary;
        working.checkmateForensics = finalized;
      } else {
        working.winner = 'draw';
        working.winReason = forensics.summary;
        working.checkmateForensics = forensics;
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
