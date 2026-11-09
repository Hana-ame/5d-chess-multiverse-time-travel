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
  puzzleObjective: 'PUZZLE OBJECTIVE',
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

  emptySquare: 'Empty',
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
  puzzleObjective: '谜题目标',
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

  emptySquare: '空',
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
  t: (key: keyof Messages) => string;
  tf: (key: keyof Messages, vars?: VarDict) => string;
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
    (key: keyof Messages) => messages[key],
    [messages]
  );

  const tf = useCallback(
    (key: keyof Messages, vars?: VarDict) => formatMessage(messages[key], vars),
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
