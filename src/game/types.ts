export type PlayerColor = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | 'u' | 'd';

export type AIPersona = 'novice' | 'tactician' | 'chronomancer';

/**
 * Configurable Pawn Promotion Rule:
 * - 'auto_queen': Canonical Steam 5D Chess rule (automatically promotes to Queen without prompt).
 * - 'choose_piece': Optional/Variant rule (prompts player to choose Queen, Rook, Bishop, Knight, Unicorn, or Dragon).
 */
export type PromotionRule = 'auto_queen' | 'choose_piece';

/**
 * Configurable Symmetric Timeline Activation Threshold (Δ):
 * Active band is [-maxActiveSide, +maxActiveSide] where maxActiveSide = min(Nw, Nb) + timelineActivationDelta.
 * - 1: Difference <= 1 active (difference >= 2 becomes Inactive optional)
 * - 2: Difference <= 2 active (difference >= 3 becomes Inactive optional)
 * - 99: All timelines always active
 */
export type TimelineActivationDelta = 1 | 2 | 99;

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

export interface EnPassantTarget {
  /** Target square the capturing pawn moves to */
  x: number;
  y: number;
  /** Square of the double-stepped enemy pawn that gets removed */
  pawnX: number;
  pawnY: number;
  byColor: PlayerColor;
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
  /** Strictly single-board 2D spatial en passant target created by the immediately preceding move on this timeline */
  enPassantTarget?: EnPassantTarget | null;
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
  /** Piece type promoted to when a Pawn reaches the promotion rank */
  promotedTo?: PieceType;
  /** Strictly 2D spatial castling metadata (never across time or timelines) */
  isCastling?: boolean;
  castlingRookFromX?: number;
  castlingRookToX?: number;
  /** Strictly 2D spatial en-passant metadata (never across time or timelines) */
  isEnPassant?: boolean;
  enPassantCapturedCoord?: { x: number; y: number };
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

export interface PastKingRadarWarning {
  attackerCoord: Coord5D;
  kingCoord: Coord5D;
  attacker: Piece;
  king: Piece;
  blockerCoord?: Coord5D;
  alignmentDescription: string;
}

export type CheckmateKind =
  | 'spatial_checkmate'
  | 'retrocausal_checkmate'
  | 'multiverse_checkmate'
  | 'king_captured'
  | 'pinned_zugzwang'
  | 'puzzle_solved'
  | 'stalemate';

export interface CheckmateForensics {
  victimColor: PlayerColor;
  winnerColor: PlayerColor | 'draw';
  kind: CheckmateKind;
  headline: string;
  summary: string;
  attackerLabel: string;
  victimKingLabel: string;
  whyUnsavable: string;
  fatalThreats: ThreatVector[];
  killerMoveNotation?: string;
}

export type VariantId =
  | 'standard_8x8'
  | 'tactical_5x5'
  | 'time_lab'
  | 'royal_unicorn'
  | 'puzzle_retrocausal'
  | 'puzzle_multiverse_fork'
  | 'puzzle_unicorn_snipe'
  | 'puzzle_dragon_tesseract';

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
  aiPersona: AIPersona;
  promotionRule: PromotionRule;
  timelineActivationDelta: TimelineActivationDelta;
  boardSize: number;
  timelines: Record<number, Timeline>;
  timelineOrder: number[]; // Sorted list of L indices (e.g. [-1, 0, 1])
  turnColor: PlayerColor;
  turnCount: number; // Total submitted half-turns in the match
  presentStep: number; // The 't' step where "The Present" currently resides
  stagedMoves: Move5D[];
  moveHistory: Move5D[][]; // History of submitted turns
  turnSnapshots: MultiverseState[]; // Historical snapshots before each committed turn for Time-Tree Rewind / Sandbox
  snapshotsBeforeStaged: MultiverseState[]; // Stack for undoing staged moves within current turn
  lastTurnSnapshot?: MultiverseState | null; // Snapshot from start of the human player's previous turn for post-checkmate rewind
  winner: PlayerColor | 'draw' | null;
  winReason: string | null;
  checkmateForensics?: CheckmateForensics | null;
  timeJumpsCount: number;
  timelinesCreatedCount: number;
}
