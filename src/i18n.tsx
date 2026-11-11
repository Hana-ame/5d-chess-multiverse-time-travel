import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Locale = 'en' | 'zh';

type VarDict = Record<string, string | number>;

// ---------------------------------------------------------------------------
// Type-safe translation dictionary. Flat keys, with `{var}` interpolation.
// ---------------------------------------------------------------------------
export interface Messages {
  // Generic / shared
  white: string;
  black: string;
  submitTurn: string;
  undo: string;
  close: string;
  activeTurn: string;
  present: string;
  timelines: string;
  timeJumps: string;
  turns: string;
  spatial: string;
  timeMultiverse: string;
  whiteToMove: string;
  blackToMove: string;
  aiThinking: string;
  all: string;
  recent: string;

  // Title screen
  titleTagline: string;
  titleOverview: string;
  opponentConfig: string;
  vsAi: string;
  passPlay: string;
  startGame: string;
  selected: string;
  boardGrid: string;
  vectorsEnabled: string;
  selectRuleset: string;
  modes: string;
  controlsHint: string;

  // HUD
  vectorsLabel: string;
  guide4d: string;
  unmuteAudio: string;
  muteAudio: string;
  restartMatch: string;
  pauseGame: string;
  selectRulesetAria: string;
  puzzleObjective: string;
  axisRule_p: string;
  axisRule_r: string;
  axisRule_b: string;
  axisRule_n: string;
  axisRule_q: string;
  axisRule_k: string;
  axisRule_u: string;
  axisRule_d: string;
  guideAxisTitle: string;
  guideAxisBody: string;
  guideTimelineTitle: string;
  guideTimelineBody: string;
  guideRulesTitle: string;
  guideRulesBody: string;
  guideAria: string;
  spacetimeCheck: string;
  timeJumpsLabel: string;
  readyToSubmit: string;
  selectPieceHint: string;
  stagedLabel: string;
  undoMove: string;
  guideTitle: string;
  guideClose: string;
  guideP1: string;
  guideP2: string;
  guideP3: string;
  pausedTitle: string;
  resumeGame: string;
  titleScreen: string;
  multiverseResolution: string;
  whiteTriumphs: string;
  blackTriumphs: string;
  stalemate: string;
  playAgain: string;
  turnLabel: string;
  timelineLabel: string;
  jumpTo: string;

  // Variant names
  variant_tactical_5x5: string;
  variant_standard_8x8: string;
  variant_time_lab: string;
  variant_royal_unicorn: string;
  variant_puzzle_retrocausal: string;
  variant_puzzle_multiverse_fork: string;

  // Variant subtitles
  variantSub_tactical_5x5: string;
  variantSub_standard_8x8: string;
  variantSub_time_lab: string;
  variantSub_royal_unicorn: string;
  variantSub_puzzle_retrocausal: string;
  variantSub_puzzle_multiverse_fork: string;

  // Variant descriptions
  variantDesc_tactical_5x5: string;
  variantDesc_standard_8x8: string;
  variantDesc_time_lab: string;
  variantDesc_royal_unicorn: string;
  variantDesc_puzzle_retrocausal: string;
  variantDesc_puzzle_multiverse_fork: string;

  // Puzzle goals
  puzzleGoal_puzzle_retrocausal: string;
  puzzleGoal_puzzle_multiverse_fork: string;

  // Piece names
  piece_p: string;
  piece_n: string;
  piece_b: string;
  piece_r: string;
  piece_q: string;
  piece_k: string;
  piece_u: string;
  piece_d: string;

  // Piece axis rules
  axis_p: string;
  axis_r: string;
  axis_b: string;
  axis_n: string;
  axis_q: string;
  axis_k: string;
  axis_u: string;
  axis_d: string;

  // Board status labels
  status_unplayable_history: string;
  status_playable_present: string;
  status_playable_optional: string;
  status_playable_inactive: string;
  status_staged_submit: string;
  status_playable_white: string;
  status_playable_black: string;
  status_staged_revise: string;
  status_staged: string;
  status_moved_revise: string;
  undoStaged: string;
  undoStagedTitle: string;

  // Timeline row labels
  timeline_active: string;
  timeline_white_inactive: string;
  timeline_black_inactive: string;
  timeline_inactive: string;

  // Board header badges
  badge_time_target: string;
  badge_playable_present: string;
  badge_staged: string;
  badge_moved_revise: string;
  badge_history: string;
  undoStagedMoveTitle: string;

  // Square accessibility
  emptySquare: string;
  legalSpatialMove: string;
  legalTimeTravelTarget: string;

  // Submit / status reasons
  reason_concluded: string;
  reason_move_required: string;
  reason_no_move: string;
  reason_king_check: string;

  // Victory / game over reasons
  win_captured_king: string;
  win_retrocausal: string;
  win_multiverse_fork: string;
  win_checkmate: string;
  win_stalemate: string;
  win_default: string;
  win_checkmate_short: string;
  win_stalemate_short: string;

  // Camera controls
  zoomOut: string;
  zoomIn: string;
  centerOnPresent: string;

  // --- New-version (AI Studio) additions ---
  // Match result / gameover header
  matchResult: string;
  whiteWins: string;
  blackWins: string;
  stalemateShort: string;
  // Ruleset / mode selectors
  selectAiPersona: string;
  selectPromotionPiece: string;
  selectTimelineActivation: string;
  thePresent: string;
  checkmateForensicsTitle: string;
  // AI personas
  persona_novice: string;
  persona_tactician: string;
  persona_chronomancer: string;
  persona_badge_novice: string;
  persona_badge_tactician: string;
  persona_badge_chronomancer: string;
  persona_desc_novice: string;
  persona_desc_tactician: string;
  persona_desc_chronomancer: string;
  // Promotion rules
  promotion_auto_queen: string;
  promotion_choose_piece: string;
  // Timeline activation deltas
  delta_1: string;
  delta_2: string;
  delta_99: string;
  // New variants (unicorn snipe / dragon tesseract)
  variant_puzzle_unicorn_snipe: string;
  variant_puzzle_dragon_tesseract: string;
  variantSub_puzzle_unicorn_snipe: string;
  variantSub_puzzle_dragon_tesseract: string;
  variantDesc_puzzle_unicorn_snipe: string;
  variantDesc_puzzle_dragon_tesseract: string;
  puzzleGoal_puzzle_unicorn_snipe: string;
  puzzleGoal_puzzle_dragon_tesseract: string;
  // Board status labels (new version uppercase variants)
  statusPlayablePresent: string;
  statusMoveRequired: string;
  statusHistory: string;
  statusActive: string;
  statusInactive: string;
  statusWhite: string;
  statusBlack: string;
  // Forensics / misc
  active: string;
  inactive: string;
  act: string;
  selectAnyPieceHint: string;
  sameSquareSlice: string;
  onLabel: string;
  offLabel: string;
  promotionRuleToggleTitle: string;
  aiPersonaTitle: string;
  customRulesTitle: string;
  pawnPromotionTitle: string;
  timelineActivationTitle: string;
  deltaSub_2: string;
  deltaSub_1: string;
  deltaSub_99: string;
  deltaN_activation: string;
  promotionPanelTitle: string;
  promotionPanelSub: string;
  promotionQueenTitle: string;
  promotionQueenSub: string;
  title: string;
  axisFile: string;
  axisRank: string;
  axisTurn: string;
  axisTimeline: string;
  overviewPrefix: string;
  overviewSuffix: string;
  legalCastling: string;
  legalEnPassant: string;
  legalSpatial: string;
  legalTimeTravel: string;
}

// ---------------------------------------------------------------------------
// English dictionary
// ---------------------------------------------------------------------------
export const en: Messages = {
  white: 'White',
  black: 'Black',
  submitTurn: 'Submit Turn',
  undo: 'Undo',
  close: 'Close [Esc]',
  activeTurn: 'ACTIVE TURN',
  present: 'PRESENT',
  timelines: 'TIMELINES',
  timeJumps: 'TIME JUMPS',
  turns: 'TURNS',
  spatial: 'Spatial',
  timeMultiverse: 'Time/Multiverse',
  whiteToMove: 'White to Move',
  blackToMove: 'Black to Move',
  aiThinking: 'AI Chronomancer Thinking...',
  all: 'All',
  recent: 'Recent',

  titleTagline: 'WITH MULTIVERSE TIME TRAVEL',
  titleOverview:
    'Every piece moves across four axes: File (X), Rank (Y), Turn Time (T), and Parallel Timelines (L). Leap into the past to branch new timelines, evade present threats, or deliver retrocausal checkmate.',
  opponentConfig: 'OPPONENT CONFIGURATION',
  vsAi: 'vs AI Chronomancer',
  passPlay: '2P Pass & Play',
  startGame: 'Start Game',
  selected: 'Selected:',
  boardGrid: 'Board Grid:',
  vectorsEnabled: '4D Vectors Enabled',
  selectRuleset: 'Select Spacetime Ruleset or Puzzle',
  modes: 'Modes',
  controlsHint:
    'Click Piece to Preview 4D Vectors · Click Past Board Square to Branch Timeline · Drag or Scroll to Pan Multiverse · Space Submit Turn · P Pause',

  vectorsLabel: 'Vectors:',
  guide4d: '4D Guide [G]',
  unmuteAudio: 'Unmute Audio [M]',
  muteAudio: 'Mute Audio [M]',
  restartMatch: 'Restart Match',
  pauseGame: 'Pause Game [P]',
  selectRulesetAria: 'Select Ruleset or Scenario',
  spacetimeCheck: 'SPACETIME CHECK',
  timeJumpsLabel: 'Time Jumps:',
  readyToSubmit: 'All Present timelines satisfied — Ready to Submit Turn',
  selectPieceHint:
    'Select any {color} piece on a highlighted leaf board to inspect 4D spatial and temporal destinations.',
  stagedLabel: 'Staged ({count}):',
  undoMove: 'Undo Move',
  guideTitle: '4D Spacetime Piece Movement & Timeline Rules',
  guideClose: 'Close [Esc]',
  guideP1:
    '1. The 4 Axes (X, Y, T, L): Standard chess uses two spatial axes: File (X) and Rank (Y). 5D Chess adds Turn Time (T) (horizontal columns) and Timelines (L) (vertical rows).',
  guideP2:
    '2. Branching the Multiverse: When a piece moves to a historical board in the past, it vacates its origin board and branches a brand new parallel timeline (+L1, +L2 for White; -L1, -L2 for Black).',
  guideP3:
    '3. Advancing The Present: The luminous gold column marks The Present. You must make a move on every active timeline board in The Present before clicking Submit Turn.',
  pausedTitle: 'Spacetime Paused',
  resumeGame: 'Resume Game',
  titleScreen: 'Title Screen',
  multiverseResolution: 'MULTIVERSE RESOLUTION',
  whiteTriumphs: 'White Triumphs Across Time',
  blackTriumphs: 'Black Triumphs Across Time',
  stalemate: 'Multiverse Stalemate',
  playAgain: 'Play Again',
  turnLabel: 'Turn',
  timelineLabel: 'Timeline',
  jumpTo: 'Jump to',

  variant_tactical_5x5: '5×5 Tactical Multiverse',
  variant_standard_8x8: '8×8 Standard 5D Chess',
  variant_time_lab: 'Temporal Sandbox Lab',
  variant_royal_unicorn: 'Unicorn & Dragon Court',
  variant_puzzle_retrocausal: 'Puzzle I: Retrocausal Strike',
  variant_puzzle_multiverse_fork: 'Puzzle II: Multiverse Fork',

  variantSub_tactical_5x5: 'Fast Action · Immediate Time Jumps',
  variantSub_standard_8x8: 'Full FIDE + 4D Spacetime Rules',
  variantSub_time_lab: 'Pre-History Loaded · Ready to Time Travel',
  variantSub_royal_unicorn: 'Includes 3D Triagonal & 4D Quadragonal Pieces',
  variantSub_puzzle_retrocausal: 'Checkmate the Past King in 1 Turn',
  variantSub_puzzle_multiverse_fork: 'Branch Timeline +1 & Double-Threaten',

  variantDesc_tactical_5x5:
    'Compact 5×5 boards where pieces reach temporal launch vectors by Turn 2. Ideal for rapid multiverse branching and cross-timeline tactics.',
  variantDesc_standard_8x8:
    'Classic 8×8 chess expanded across Time (T) and Parallel Timelines (L). Every piece generalizes its movement across 4 axes.',
  variantDesc_time_lab:
    'Starts at Turn 3 with open lanes and Queens, Rooks, Knights, and Bishops poised to leap backward in time or across timelines immediately.',
  variantDesc_royal_unicorn:
    'Features the authentic 5D Chess Unicorn (moves equally along 3 axes) and Dragon (moves equally along all 4 axes) alongside standard pieces.',
  variantDesc_puzzle_retrocausal:
    'Black’s present King is heavily guarded, but Black’s past King on Turn 1 is exposed to a temporal Rook or Bishop vector. Find the winning time attack!',
  variantDesc_puzzle_multiverse_fork:
    'Jump your Queen or Knight back in time to spawn Timeline +1 while creating an unstoppable cross-timeline fork.',

  puzzleGoal_puzzle_retrocausal:
    'Attack Black’s vulnerable King across spacetime or deliver checkmate.',
  puzzleGoal_puzzle_multiverse_fork:
    'Execute a time-travel move to branch Timeline +1 and check Black.',

  piece_p: 'Pawn',
  piece_n: 'Knight',
  piece_b: 'Bishop',
  piece_r: 'Rook',
  piece_q: 'Queen',
  piece_k: 'King',
  piece_u: 'Unicorn (3D Triagonal)',
  piece_d: 'Dragon (4D Quadragonal)',

  axis_p: 'Advances 1 step along Rank (Y) or Timeline (L); captures diagonally in (X,Y) or (T,L).',
  axis_r: 'Slides any number of steps along any 1 axis: File (X), Rank (Y), Time (T), or Timeline (L).',
  axis_b: 'Slides equal steps along any 2 axes simultaneously (e.g. X+Y, X+T, Y+L, T+L).',
  axis_n: 'Jumps 2 steps along any 1 axis and 1 step along any other axis in 4D spacetime.',
  axis_q: 'Slides equal steps along 1, 2, 3, or all 4 axes simultaneously.',
  axis_k: 'Steps 1 unit along any combination of 1, 2, 3, or 4 spacetime axes.',
  axis_u: 'Slides equal steps along any 3 axes simultaneously (3D Triagonal).',
  axis_d: 'Slides equal steps along all 4 axes simultaneously (4D Quadragonal).',

  status_unplayable_history: 'UNPLAYABLE · HISTORY',
  status_playable_present: 'PLAYABLE · PRESENT',
  status_playable_optional: 'PLAYABLE · OPTIONAL',
  status_playable_inactive: 'PLAYABLE · INACTIVE',
  status_staged_submit: 'STAGED · SUBMIT TURN',
  status_playable_white: 'PLAYABLE · WHITE',
  status_playable_black: 'PLAYABLE · BLACK',
  status_staged_revise: 'STAGED · CLICK TO REVISE',

  timeline_active: 'Active Line',
  timeline_white_inactive: 'White Inactive',
  timeline_black_inactive: 'Black Inactive',
  timeline_inactive: 'Inactive Line',

  badge_time_target: 'TIME TARGET',
  badge_playable_present: 'PLAYABLE · PRESENT',
  badge_staged: 'STAGED',
  badge_moved_revise: 'MOVED · REVISE',
  badge_history: 'HISTORY',
  undoStagedMoveTitle: 'Undo staged move',

  legalSpatialMove: ' · Legal Spatial Move',
  legalTimeTravelTarget: ' · Legal Time Travel Target',

  reason_concluded: 'Match has already concluded.',
  reason_move_required: 'Move required on Present board(s): {names}',
  reason_no_move: 'Make at least one move before submitting turn.',
  reason_king_check: 'Your King is under spacetime check! Resolve or evade the threat first.',

  win_captured_king: 'Captured {color}\'s Royal King across spacetime!',
  win_retrocausal: 'Retrocausal Strike Complete! You attacked Black’s past King across time.',
  win_multiverse_fork: 'Multiverse Fork Complete! Timeline +L1 spawned successfully.',
  win_checkmate: 'Multiverse Checkmate! {color} wins across spacetime.',
  win_stalemate: 'Multiverse Stalemate — no legal spacetime moves remain.',
  win_default: 'All spacetime timelines have reached finality.',
  win_checkmate_short: 'Multiverse Checkmate! {color} wins.',
  win_stalemate_short: 'Stalemate across spacetime.',

  zoomOut: 'Zoom Out Multiverse',
  zoomIn: 'Zoom In Multiverse',
  centerOnPresent: 'Center on Present',

  // --- New-version (AI Studio) additions (English) ---
  matchResult: 'MATCH RESULT',
  whiteWins: 'White Wins',
  blackWins: 'Black Wins',
  stalemateShort: 'Stalemate',
  selectAiPersona: 'Select AI Persona',
  selectPromotionPiece: 'Select Promotion Piece',
  selectTimelineActivation: 'Select Timeline Activation Threshold',
  thePresent: 'THE PRESENT',
  checkmateForensicsTitle: 'Checkmate Forensics and Match Resolution',
  persona_novice: 'Novice',
  persona_tactician: 'Tactician',
  persona_chronomancer: 'Chronomancer',
  persona_badge_novice: '2D Focus',
  persona_badge_tactician: 'Balanced',
  persona_badge_chronomancer: 'Aggressive 5D',
  persona_desc_novice: 'Prefers standard 2D spatial moves and rarely initiates timeline splits.',
  persona_desc_tactician: 'Balances solid 2D board defense with tactical time jumps and checks.',
  persona_desc_chronomancer:
    'Actively hunts past Kings in HISTORY and branches parallel timelines for cross-spacetime forks.',
  promotion_auto_queen: 'Auto-Queen',
  promotion_choose_piece: 'Choose Piece',
  delta_1: 'Standard +1 (diff ≤ 1 active)',
  delta_2: 'Wide +2 (diff ≤ 2 active)',
  delta_99: 'All Timelines Always Active',
  variant_puzzle_unicorn_snipe: 'Puzzle III: Unicorn Tri-Axial Snipe',
  variant_puzzle_dragon_tesseract: 'Puzzle IV: Dragon Tesseract Mate',
  variantSub_puzzle_unicorn_snipe: '3D Triagonal Vector (|ΔX| = |ΔY| = |ΔT|)',
  variantSub_puzzle_dragon_tesseract: '4D Quadragonal Vector (|ΔX| = |ΔY| = |ΔT| = |ΔL|)',
  variantDesc_puzzle_unicorn_snipe:
    'The Unicorn only moves along 3 axes simultaneously. Leap your Unicorn from L0·T3W (c3) 2 steps left, 2 steps up, and 2 turns into the past to snipe Black’s King at L0·T1W (a5)!',
  variantDesc_puzzle_dragon_tesseract:
    'The Dragon moves equally along all 4 axes at once! From Timeline +L1·T2W (b4), leap 1 file left, 1 rank up, 1 turn back, and 1 timeline down to L0·T1W (a5)!',
  puzzleGoal_puzzle_unicorn_snipe:
    'Use your Unicorn (c3) to capture or check Black’s past King at L0·T1W (a5) via a 3-axis triagonal jump.',
  puzzleGoal_puzzle_dragon_tesseract:
    'Use your Dragon on +L1·T2W (b4) to strike Black’s past King at L0·T1W (a5) across all 4 dimensions.',
  statusPlayablePresent: 'PLAYABLE · PRESENT',
  statusMoveRequired: 'MOVE REQUIRED',
  statusHistory: 'HISTORY',
  statusActive: 'Active',
  statusInactive: 'Inactive',
  statusWhite: 'White (W)',
  statusBlack: 'Black (B)',
  active: 'Active',
  inactive: 'Inactive',
  act: 'Act',
  selectAnyPieceHint:
    'Select any {color} piece on a highlighted leaf board · Hover purple targets for Ghost Branch Preview · Hold Alt for Same-Square Slice.',
  sameSquareSlice: 'Same-Square Slice [S]',
  onLabel: 'ON',
  offLabel: 'OFF',
  promotionRuleToggleTitle:
    'Toggle pawn promotion rule: choose-piece panel (variant/extended) vs auto-queen (Steam original)',
  aiPersonaTitle: "AI CHRONOMANCER PERSONA",
  customRulesTitle: "CUSTOM RULES CONFIGURATION (switchable in-game)",
  pawnPromotionTitle: "PAWN PROMOTION RULE",
  timelineActivationTitle: "TIMELINE ACTIVATION THRESHOLD",
  deltaSub_2: "Δ≥3 selectable",
  deltaSub_1: "Δ≥2 selectable",
  deltaSub_99: "no cap",
  deltaN_activation: "Δ≤{n} activated",
  promotionPanelTitle: "Choose-piece panel",
  promotionPanelSub: "Variant / Extended (6 pieces)",
  promotionQueenTitle: "Auto-Queen",
  promotionQueenSub: "Steam original (Auto-Q)",
  title: "5D CHESS",
  axisFile: "File (X)",
  axisRank: "Rank (Y)",
  axisTurn: "Turn Time (T)",
  axisTimeline: "Parallel Timelines (L)",
  overviewPrefix: "Every piece moves across four axes:",
  overviewSuffix: ". Leap into the past to branch new timelines, evade present threats, or deliver retrocausal checkmate.",
  emptySquare: "Empty",
  legalCastling: " · Legal 2D Castling",
  legalEnPassant: " · Legal 2D En Passant",
  legalSpatial: " · Legal Spatial Move",
  legalTimeTravel: " · Legal Time Travel Target",
  puzzleObjective: "PUZZLE OBJECTIVE",
  axisRule_p: "Advances 1 step along Rank (Y) or Timeline (L); captures diagonally in (X,Y) or (T,L).",
  axisRule_r: "Slides any number of steps along any 1 axis: File (X), Rank (Y), Time (T), or Timeline (L).",
  axisRule_b: "Slides equal steps along any 2 axes simultaneously (e.g. X+Y, X+T, Y+L, T+L).",
  axisRule_n: "Jumps 2 steps along any 1 axis and 1 step along any other axis in 4D spacetime.",
  axisRule_q: "Slides equal steps along 1, 2, 3, or all 4 axes simultaneously.",
  axisRule_k: "Steps 1 unit along any combination of 1, 2, 3, or 4 spacetime axes.",
  axisRule_u: "Slides equal steps along any 3 axes simultaneously (3D Triagonal).",
  axisRule_d: "Slides equal steps along all 4 axes simultaneously (4D Quadragonal).",
  guideAxisTitle: "1. The 4 Axes (X, Y, T, L):",
  guideAxisBody: "Standard chess uses File (X) and Rank (Y). 5D Chess adds Turn Time (T) (horizontal columns) and Parallel Timelines (L) (vertical rows).",
  guideTimelineTitle: "2. Symmetric Active Timelines (+1 Rule):",
  guideTimelineBody: "When one player branches ≥2 more timelines than the opponent, the excess outer timelines become INACTIVE (still playable, but optional) until the opponent branches a new timeline and reactivates them!",
  guideRulesTitle: "3. Canonical Promotion, Castling & En Passant:",
  guideRulesBody: "Per original Steam 5D Chess rules, Pawn promotion is strictly Auto-Queen, and Castling & En Passant are strictly 2D single-board spatial moves (never generalized across time or timelines).",
  guideAria: "5D Spacetime Movement Guide",
  status_staged: "STAGED",
  status_moved_revise: "MOVED · REVISE",
  undoStaged: "Undo",
  undoStagedTitle: "Undo staged move",
};

// ---------------------------------------------------------------------------
// Chinese dictionary
// ---------------------------------------------------------------------------
export const zh: Messages = {
  white: '白方',
  black: '黑方',
  submitTurn: '提交回合',
  undo: '撤销',
  close: '关闭 [Esc]',
  activeTurn: '当前回合',
  present: '现在',
  timelines: '时间线',
  timeJumps: '时间跳跃',
  turns: '回合数',
  spatial: '空间',
  timeMultiverse: '时间/多元宇宙',
  whiteToMove: '白方走棋',
  blackToMove: '黑方走棋',
  aiThinking: 'AI 时之大法师思考中...',
  all: '全部',
  recent: '最近',

  titleTagline: '多元宇宙时空旅行',
  titleOverview:
    '每枚棋子可沿四条轴移动：纵列 (X)、横排 (Y)、回合时间 (T) 和平行时间线 (L)。跃入过去以分支出新时间线、规避当前威胁，或发动逆因果将杀。',
  opponentConfig: '对手配置',
  vsAi: '对战 AI 时之大法师',
  passPlay: '双人同屏对战',
  startGame: '开始游戏',
  selected: '已选：',
  boardGrid: '棋盘规格：',
  vectorsEnabled: '4D 向量已启用',
  selectRuleset: '选择时空规则集或谜题',
  modes: '种模式',
  controlsHint:
    '点击棋子预览 4D 向量 · 点击过去棋盘格分支时间线 · 拖拽或滚动平移多元宇宙 · 空格提交回合 · P 暂停',

  vectorsLabel: '向量：',
  guide4d: '4D 指南 [G]',
  unmuteAudio: '取消静音 [M]',
  muteAudio: '静音 [M]',
  restartMatch: '重新开始对局',
  pauseGame: '暂停游戏 [P]',
  selectRulesetAria: '选择规则集或场景',
  spacetimeCheck: '时空将军',
  timeJumpsLabel: '时间跳跃：',
  readyToSubmit: '所有当前时间线已满足 — 可以提交回合',
  selectPieceHint: '选择高亮叶棋盘上的任意{color}棋子，查看 4D 空间与时间目的地。',
  stagedLabel: '已暂存 ({count})：',
  undoMove: '撤销走子',
  guideTitle: '4D 时空棋子移动与时间线规则',
  guideClose: '关闭 [Esc]',
  guideP1:
    '1. 四大轴 (X, Y, T, L)：标准国际象棋使用两个空间轴：纵列 (X) 和横排 (Y)。5D 国际象棋增加了回合时间 (T)（水平列）和时间线 (L)（垂直行）。',
  guideP2:
    '2. 分支多元宇宙：当棋子移动到过去的某个历史棋盘时，它会离开原点棋盘并分支出一条全新的平行时间线（白方为 +L1、+L2；黑方为 -L1、-L2）。',
  guideP3:
    '3. 推进“现在”：发光的金色柱状区域标记“现在”。你必须在点击“提交回合”之前，对“现在”中的每条活跃时间线棋盘走一步。',
  pausedTitle: '时空已暂停',
  resumeGame: '继续游戏',
  titleScreen: '返回标题',
  multiverseResolution: '多元宇宙裁决',
  whiteTriumphs: '白方穿越时间获胜',
  blackTriumphs: '黑方穿越时间获胜',
  stalemate: '多元宇宙和棋',
  playAgain: '再玩一次',
  turnLabel: '回合',
  timelineLabel: '时间线',
  jumpTo: '跳跃至',

  variant_tactical_5x5: '5×5 战术多元宇宙',
  variant_standard_8x8: '8×8 标准 5D 国际象棋',
  variant_time_lab: '时间沙盒实验室',
  variant_royal_unicorn: '独角兽与龙之庭',
  variant_puzzle_retrocausal: '谜题一：逆因果打击',
  variant_puzzle_multiverse_fork: '谜题二：多元宇宙分叉',

  variantSub_tactical_5x5: '快节奏 · 立即时间跳跃',
  variantSub_standard_8x8: '完整 FIDE + 4D 时空规则',
  variantSub_time_lab: '预载历史 · 可立即时空旅行',
  variantSub_royal_unicorn: '含 3D 三对角与 4D 四对角棋子',
  variantSub_puzzle_retrocausal: '1 回合内将杀过去之王',
  variantSub_puzzle_multiverse_fork: '分支时间线 +1 并双重威胁',

  variantDesc_tactical_5x5:
    '紧凑的 5×5 棋盘，棋子到第 2 回合即可抵达时间发射向量。适合快速多元宇宙分支与跨时间线战术。',
  variantDesc_standard_8x8:
    '经典 8×8 国际象棋扩展至时间 (T) 与平行时间线 (L)。每枚棋子将其移动泛化至 4 条轴。',
  variantDesc_time_lab:
    '从第 3 回合开始，开放通道中后、车、马、象已蓄势待发，可立即向过去跳跃或跨越时间线。',
  variantDesc_royal_unicorn:
    '收录正宗 5D 国际象棋独角兽（沿 3 条轴等距移动）与龙（沿全部 4 条轴等距移动），与标准棋子一同登场。',
  variantDesc_puzzle_retrocausal:
    '黑方当前的王被严密保护，但黑方第 1 回合的过去之王暴露在时间车或象的攻击向量之下。找出制胜的时间攻击！',
  variantDesc_puzzle_multiverse_fork:
    '将你的后或马跳回过去以生成时间线 +1，同时制造一个无法阻挡的跨时间线分叉。',

  puzzleGoal_puzzle_retrocausal: '在时空维度攻击黑方脆弱的王，或完成将杀。',
  puzzleGoal_puzzle_multiverse_fork: '执行一次时空旅行走法以分支时间线 +1 并将军黑方。',

  piece_p: '兵',
  piece_n: '马',
  piece_b: '象',
  piece_r: '车',
  piece_q: '后',
  piece_k: '王',
  piece_u: '独角兽（3D 三对角）',
  piece_d: '龙（4D 四对角）',

  axis_p: '沿横排 (Y) 或时间线 (L) 前进 1 步；在 (X,Y) 或 (T,L) 上斜向吃子。',
  axis_r: '沿任意 1 条轴滑动任意步数：纵列 (X)、横排 (Y)、时间 (T) 或时间线 (L)。',
  axis_b: '同时沿任意 2 条轴等步滑动（如 X+Y、X+T、Y+L、T+L）。',
  axis_n: '在 4D 时空中沿任意 1 条轴跳 2 步、沿另 1 条轴跳 1 步。',
  axis_q: '同时沿 1、2、3 或全部 4 条轴等步滑动。',
  axis_k: '沿 1、2、3 或 4 条时空轴的任意组合移动 1 单位。',
  axis_u: '同时沿任意 3 条轴等步滑动（3D 三对角）。',
  axis_d: '同时沿全部 4 条轴等步滑动（4D 四对角）。',

  status_unplayable_history: '不可玩 · 历史',
  status_playable_present: '可玩 · 现在',
  status_playable_optional: '可玩 · 可选',
  status_playable_inactive: '可玩 · 非活跃',
  status_staged_submit: '已暂存 · 提交回合',
  status_playable_white: '可玩 · 白方',
  status_playable_black: '可玩 · 黑方',
  status_staged_revise: '已暂存 · 点击修改',

  timeline_active: '活跃线',
  timeline_white_inactive: '白方非活跃',
  timeline_black_inactive: '黑方非活跃',
  timeline_inactive: '非活跃线',

  badge_time_target: '时间目标',
  badge_playable_present: '可玩 · 现在',
  badge_staged: '已暂存',
  badge_moved_revise: '已移动 · 可修改',
  badge_history: '历史',
  undoStagedMoveTitle: '撤销暂存走法',

  legalSpatialMove: ' · 合法空间走法',
  legalTimeTravelTarget: ' · 合法时空旅行目标',

  reason_concluded: '对局已结束。',
  reason_move_required: '需要在当前棋盘上走子：{names}',
  reason_no_move: '提交回合前至少走一步。',
  reason_king_check: '你的王正受到时空将军！请先化解或规避威胁。',

  win_captured_king: '在时空维度捕获了{color}的王！',
  win_retrocausal: '逆因果打击完成！你穿越时间攻击了黑方过去的王。',
  win_multiverse_fork: '多元宇宙分叉完成！时间线 +L1 成功生成。',
  win_checkmate: '多元宇宙将杀！{color}穿越时空获胜。',
  win_stalemate: '多元宇宙和棋 — 无合法时空走法。',
  win_default: '所有时空时间线均已达终局。',
  win_checkmate_short: '多元宇宙将杀！{color}获胜。',
  win_stalemate_short: '时空和棋。',

  zoomOut: '缩小多元宇宙',
  zoomIn: '放大多元宇宙',
  centerOnPresent: '聚焦现在',

  // --- New-version (AI Studio) additions (中文) ---
  matchResult: '终局状态',
  whiteWins: '白方绝杀获胜',
  blackWins: '黑方绝杀获胜',
  stalemateShort: '僵局平局',
  selectAiPersona: '选择 AI 性格',
  selectPromotionPiece: '选择升变棋子',
  selectTimelineActivation: '选择时间线激活阈值',
  thePresent: '现在',
  checkmateForensicsTitle: '将杀取证与终局判定',
  persona_novice: '新手 · 空间新手',
  persona_tactician: '战术家 · 时空战术家',
  persona_chronomancer: '时间法师 · 时间狂魔',
  persona_badge_novice: '2D 专注',
  persona_badge_tactician: '均衡',
  persona_badge_chronomancer: '激进 5D',
  persona_desc_novice: '偏好标准 2D 空间走法，很少主动分叉时间线。',
  persona_desc_tactician: '兼顾稳健的 2D 棋盘防守与战术性时间跳跃和将军。',
  persona_desc_chronomancer: '主动猎杀历史中的过去之王，并分叉平行时间线制造跨时空分叉。',
  promotion_auto_queen: '自动升后',
  promotion_choose_piece: '选择棋子',
  delta_1: '标准 +1（差值 ≤ 1 激活）',
  delta_2: '宽 +2（差值 ≤ 2 激活）',
  delta_99: '所有时间线始终激活',
  variant_puzzle_unicorn_snipe: '谜题三：独角兽三轴狙击',
  variant_puzzle_dragon_tesseract: '谜题四：龙之超立方将杀',
  variantSub_puzzle_unicorn_snipe: '3D 三对角向量 (|ΔX| = |ΔY| = |ΔT|)',
  variantSub_puzzle_dragon_tesseract: '4D 四对角向量 (|ΔX| = |ΔY| = |ΔT| = |ΔL|)',
  variantDesc_puzzle_unicorn_snipe:
    '独角兽仅同时沿 3 条轴移动。让你的独角兽从 L0·T3W (c3) 向左 2 步、向上 2 步、回到 2 回合前，狙击黑方位于 L0·T1W (a5) 的王！',
  variantDesc_puzzle_dragon_tesseract:
    '龙同时沿全部 4 条轴等距移动！从时间线 +L1·T2W (b4) 出发，向左 1 格、向上 1 格、回退 1 回合、下降 1 条时间线到 L0·T1W (a5)！',
  puzzleGoal_puzzle_unicorn_snipe:
    '用你的独角兽 (c3) 通过三轴三对角跳跃，吃掉或将军黑方位于 L0·T1W (a5) 的过去之王。',
  puzzleGoal_puzzle_dragon_tesseract:
    '用你在 +L1·T2W (b4) 的龙，跨全部 4 个维度打击黑方位于 L0·T1W (a5) 的过去之王。',
  statusPlayablePresent: '可玩 · 现在',
  statusMoveRequired: '必须走棋',
  statusHistory: '历史',
  statusActive: '活跃',
  statusInactive: '非活跃',
  statusWhite: '白方 (W)',
  statusBlack: '黑方 (B)',
  active: '活跃',
  inactive: '非活跃',
  act: '激活',
  selectAnyPieceHint:
    '选择高亮叶棋盘上的任意{color}棋子 · 悬停紫色目标可预览幽灵分支 · 按住 Alt 同格切片。',
  sameSquareSlice: '同格切片 [S]',
  onLabel: '开',
  offLabel: '关',
  promotionRuleToggleTitle: '切换兵底线升变规则：自选升变面板（变体/扩展） vs 只升王后（Steam原版）',
  aiPersonaTitle: "AI 风格与难度",
  customRulesTitle: "可选升变与时间线激活规则（局内亦可随时切换）",
  pawnPromotionTitle: "兵底线升变规则",
  timelineActivationTitle: "时间线对称激活上限",
  deltaSub_2: "差≥3 可选",
  deltaSub_1: "差≥2 可选",
  deltaSub_99: "无上限",
  deltaN_activation: "相差 ≤{n} 激活",
  promotionPanelTitle: "自选升变面板",
  promotionPanelSub: "变体/扩展 (6种棋子)",
  promotionQueenTitle: "只升王后",
  promotionQueenSub: "原版规则 (Auto-Q)",
  title: "5D 国际象棋",
  axisFile: "横列 (X)",
  axisRank: "纵列 (Y)",
  axisTurn: "回合时间 (T)",
  axisTimeline: "平行时间线 (L)",
  overviewPrefix: "每枚棋子横跨四个轴：",
  overviewSuffix: "。跃入过去可分支新时间线、规避当前威胁、或发动逆因果将杀。",
  emptySquare: "空",
  legalCastling: " · 合法 2D 王车易位",
  legalEnPassant: " · 合法 2D 吃过路兵",
  legalSpatial: " · 合法空间移动",
  legalTimeTravel: " · 合法时间旅行目标",
  puzzleObjective: "谜题目标",
  axisRule_p: "沿纵列 (Y) 或时间线 (L) 前进 1 步；在 (X,Y) 或 (T,L) 斜吃。",
  axisRule_r: "沿任一单轴滑动任意步：横列 (X)、纵列 (Y)、时间 (T) 或时间线 (L)。",
  axisRule_b: "沿任意 2 轴同时等距滑动（如 X+Y、X+T、Y+L、T+L）。",
  axisRule_n: "在 4D 时空沿任一轴跳 2 步、沿另一轴跳 1 步。",
  axisRule_q: "沿 1、2、3 或全部 4 轴同时等距滑动。",
  axisRule_k: "沿任意 1、2、3 或 4 个时空轴组合走 1 单位。",
  axisRule_u: "沿任意 3 轴同时等距滑动（3D 三对角）。",
  axisRule_d: "沿全部 4 轴同时等距滑动（4D 四对角）。",
  guideAxisTitle: "1. 四轴 (X, Y, T, L)：",
  guideAxisBody: "标准国际象棋使用横列 (X) 和纵列 (Y)。5D 国际象棋新增回合时间 (T)（水平列）和平行时间线 (L)（垂直行）。",
  guideTimelineTitle: "2. 对称激活时间线 (+1 规则)：",
  guideTimelineBody: "当一方比分出对手多出 ≥2 条时间线时，多出的外侧时间线变为非激活（可选走子，但非必须），直到对手分支新时间线重新激活它们！",
  guideRulesTitle: "3. 标准升变、王车易位与吃过路兵：",
  guideRulesBody: "按 Steam 原版 5D 国际象棋规则，兵升变严格为自动变王后，王车易位与吃过路兵严格为 2D 单棋盘空间走法（绝不跨时间或时间线泛化）。",
  guideAria: "5D 时空移动指南",
  status_staged: "已暂存",
  status_moved_revise: "已移动 · 可修改",
  undoStaged: "撤销",
  undoStagedTitle: "撤销暂存走子",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function formatMessage(
  template: string,
  vars?: VarDict
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

const LOCALE_KEY = '5d-chess-locale';

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(LOCALE_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  const nav = window.navigator.language?.toLowerCase() ?? '';
  return nav.startsWith('zh') ? 'zh' : 'en';
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof Messages | string) => string;
  tf: (key: keyof Messages | string, vars?: VarDict) => string;
  messages: Messages;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_KEY, l);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
  }, [locale]);

  const messages = useMemo(() => (locale === 'zh' ? zh : en), [locale]);

  const t = useCallback(
    (key: keyof Messages | string) => messages[key as keyof Messages],
    [messages]
  );

  const tf = useCallback(
    (key: keyof Messages | string, vars?: VarDict) =>
      formatMessage(messages[key as keyof Messages], vars),
    [messages]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tf, messages }),
    [locale, setLocale, t, tf, messages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
