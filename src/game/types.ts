export type PlayerColor = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | 'u' | 'd';

export interface Piece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  hasMoved?: boolean;
}

/**
 * 5D Coordinate:
 * l: Timeline index (integer, e.g. -1, 0, +1)
 * t: Half-turn index (0 = Turn 1 White, 1 = Turn 1 Black, 2 = Turn 2 White, 3 = Turn 2 Black, ...)
 * x: File (0..boardSize-1, left to right a..h)
 * y: Rank (0..boardSize-1, 0 = bottom rank 1 for White, boardSize-1 = top rank)
 */
export interface Coord5D {
  l: number;
  t: number;
  x: number;
  y: number;
}

export interface BoardState {
  id: string;
  l: number;
  t: number; // Half-turn step index (even = White's turn on this board, odd = Black's turn)
  turnNumber: number; // 1-based full turn number: Math.floor(t / 2) + 1
  activeColor: PlayerColor; // 'w' if t % 2 === 0 else 'b'
  size: number; // 8 for standard, 5 for tactical 5x5
  squares: (Piece | null)[][]; // [y][x]
  isLeaf: boolean; // True if this is the latest playable board on timeline l
  parentBoardId?: string;
  spawnedByMoveId?: string;
}

export interface Timeline {
  l: number;
  name: string;
  createdBy: PlayerColor | 'initial';
  parentTimeline?: number;
  branchFromStep?: number; // t step where it branched
  boards: BoardState[]; // ordered by t ascending
}

export type MoveKind = 'spatial' | 'timetravel_branch' | 'timetravel_merge' | 'multiverse_hop';

export interface Move5D {
  id: string;
  from: Coord5D;
  to: Coord5D; // The board/square targeted by the piece's 4D vector
  piece: Piece;
  captured?: Piece;
  promotedTo?: PieceType;
  kind: MoveKind;
  createdTimeline?: number; // If this move branched a new timeline, its L index
  resultingSourceBoard: { l: number; t: number };
  resultingTargetBoard?: { l: number; t: number };
  notation: string;
  axisDelta: { dx: number; dy: number; dt: number; dl: number };
}

export interface ThreatVector {
  from: Coord5D;
  to: Coord5D;
  attacker: Piece;
  king: Piece;
  isCrossTimeline: boolean;
}

export type VariantId =
  | 'standard_8x8'
  | 'tactical_5x5'
  | 'time_lab'
  | 'royal_unicorn'
  | 'puzzle_retrocausal'
  | 'puzzle_multiverse_fork';

export type OpponentMode = 'ai' | 'pass_and_play';

export interface VariantConfig {
  id: VariantId;
  name: string;
  subtitle: string;
  description: string;
  boardSize: number;
  isPuzzle?: boolean;
  puzzleGoal?: string;
}

export interface MultiverseState {
  variant: VariantId;
  opponentMode: OpponentMode;
  boardSize: number;
  timelines: Record<number, Timeline>;
  timelineOrder: number[]; // Sorted list of L indices (e.g. [-1, 0, 1])
  turnColor: PlayerColor;
  turnCount: number; // Total submitted half-turns in the match
  presentStep: number; // The 't' step where "The Present" currently resides
  stagedMoves: Move5D[];
  moveHistory: Move5D[][]; // History of submitted turns
  snapshotsBeforeStaged: MultiverseState[]; // Stack for undoing staged moves within current turn
  winner: PlayerColor | 'draw' | null;
  winReason: string | null;
  /** i18n key describing the match outcome (for translation at render time). */
  winReasonKey?: string;
  /** Interpolation vars for winReasonKey. */
  winReasonVars?: Record<string, string>;
  timeJumpsCount: number;
  timelinesCreatedCount: number;
}
