import React from 'react';
import { useI18n } from '../i18n';
import {
  AIPersona,
  Coord5D,
  Move5D,
  MultiverseState,
  PastKingRadarWarning,
  Piece,
  PieceType,
  PromotionRule,
  ThreatVector,
  TimelineActivationDelta,
  VariantId,
} from '../game/types';
import {
  AI_PERSONA_CONFIGS,
  PROMOTION_CANDIDATE_TYPES,
  VARIANT_CONFIGS,
  canSubmitCurrentTurn,
  formatSquare,
  formatTimelineLabel,
  formatTurnStep,
  getActiveTimelineBounds,
} from '../game/engine';
import { ChessPieceSVG, PIECE_AXIS_RULES, PIECE_NAMES } from './ChessPieceSVG';
import { LocaleSwitcher } from './LocaleSwitcher';

interface GameHUDProps {
  state: MultiverseState;
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  selectedCoord: Coord5D | null;
  selectedPiece: Piece | null;
  legalMovesForSelected: Move5D[];
  threats: ThreatVector[];
  radarWarnings: PastKingRadarWarning[];
  pendingPromotionMove: Move5D | null;
  isMuted: boolean;
  showAllHistoryVectors: boolean;
  sliceHighlightEnabled: boolean;
  showMoveLogDrawer: boolean;
  showGuideModal: boolean;
  aiThinking: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onUndoStaged: () => void;
  onSubmitTurn: () => void;
  onToggleHistoryVectors: () => void;
  onToggleSliceHighlight: () => void;
  onToggleMoveLogDrawer: () => void;
  onToggleGuideModal: () => void;
  onChangeVariant: (variant: VariantId) => void;
  onChangeAiPersona: (persona: AIPersona) => void;
  onChangePromotionRule: (rule: PromotionRule) => void;
  onChangeTimelineActivationDelta: (delta: TimelineActivationDelta) => void;
  onConfirmPromotion: (pieceType: PieceType) => void;
  onCancelPromotion: () => void;
  onExecuteMoveDirect: (move: Move5D) => void;
  onHoverMove: (move: Move5D | null) => void;
  onUndoLastTurn: () => void;
  onRewindToTurn: (turnIdx: number) => void;
  onFocusBoard: (l: number, t: number) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state,
  gameState,
  selectedCoord,
  selectedPiece,
  legalMovesForSelected,
  threats,
  radarWarnings,
  pendingPromotionMove,
  isMuted,
  showAllHistoryVectors,
  sliceHighlightEnabled,
  showMoveLogDrawer,
  showGuideModal,
  aiThinking,
  onToggleMute,
  onTogglePause,
  onRestart,
  onReturnToTitle,
  onUndoStaged,
  onSubmitTurn,
  onToggleHistoryVectors,
  onToggleSliceHighlight,
  onToggleMoveLogDrawer,
  onToggleGuideModal,
  onChangeVariant,
  onChangeAiPersona,
  onChangePromotionRule,
  onChangeTimelineActivationDelta,
  onConfirmPromotion,
  onCancelPromotion,
  onExecuteMoveDirect,
  onHoverMove,
  onUndoLastTurn,
  onRewindToTurn,
  onFocusBoard,
}) => {
  const { t, tf } = useI18n();
  const [forensicsCollapsed, setForensicsCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (gameState === 'gameover') {
      setForensicsCollapsed(false);
    }
  }, [gameState, state.winner]);

  const submitStatus = canSubmitCurrentTurn(state);
  const timelineBounds = getActiveTimelineBounds(state);
  const currentVariantConfig =
    VARIANT_CONFIGS.find((v) => v.id === state.variant) ?? VARIANT_CONFIGS[0];

  const spatialMoves = legalMovesForSelected.filter((m) => m.kind === 'spatial');
  const temporalMoves = legalMovesForSelected.filter((m) => m.kind !== 'spatial');
  const forensics = state.checkmateForensics;
  const totalThreatsCount = Math.max(
    threats.length,
    forensics?.fatalThreats?.length ?? 0
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Top-Left Cluster: Turn Status + Tabular Spacetime Metrics */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-3.5 bg-[#0F172A]/95 border border-slate-800 rounded-xl px-4 py-2.5 shadow-xl">
          {/* Active Turn Indicator */}
          <div className="flex items-center gap-2.5 pr-3 border-r border-slate-800">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold border ${
                state.winner
                  ? 'bg-red-600 text-white border-red-300'
                  : state.turnColor === 'w'
                    ? 'bg-slate-100 text-slate-950 border-white'
                    : 'bg-slate-900 text-sky-300 border-sky-400/60'
              }`}
            >
              {state.winner ? '!' : state.turnColor === 'w' ? 'W' : 'B'}
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                {state.winner ? t('matchResult') : t('activeTurn')}
              </div>
              <div className="text-sm font-display font-bold text-slate-100 whitespace-nowrap">
                {state.winner
                  ? state.winner === 'w'
                    ? t('whiteWins')
                    : state.winner === 'b'
                      ? t('blackWins')
                      : t('stalemateShort')
                  : aiThinking
                    ? t('aiThinking')
                    : state.turnColor === 'w'
                      ? t('whiteToMove')
                      : t('blackToMove')}
              </div>
            </div>
          </div>

          {/* Hero-to-Kicker Tabular Metrics */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                {t('present')}
              </div>
              <div className="text-lg font-mono font-bold text-amber-400 tabular-nums leading-tight">
                {formatTurnStep(state.presentStep)}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                {t('timelines')}
              </div>
              <div className="text-lg font-mono font-bold text-slate-100 tabular-nums leading-tight flex items-baseline gap-1">
                <span>{state.timelineOrder.length}</span>
                {timelineBounds.activeSet.size < state.timelineOrder.length && (
                  <span className="text-[10px] font-mono text-amber-300">
                    ({timelineBounds.activeSet.size} {t('act')})
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                {t('timeJumps')}
              </div>
              <div className="text-lg font-mono font-bold text-purple-300 tabular-nums leading-tight">
                {state.timeJumpsCount}
              </div>
            </div>
          </div>

          {/* Active Spacetime Check Warning */}
          {totalThreatsCount > 0 && (
            <div className="pl-3 border-l border-slate-800 flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-mono font-bold tracking-wide">
                {state.winner
                  ? `FATAL CHECKMATE (${totalThreatsCount})`
                  : `SPACETIME CHECK (${totalThreatsCount})`}
              </span>
            </div>
          )}

          {/* Past-King Danger Radar Early Warning */}
          {!state.winner && totalThreatsCount === 0 && radarWarnings.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onFocusBoard(radarWarnings[0].kingCoord.l, radarWarnings[0].kingCoord.t)
              }
              title={radarWarnings[0].alignmentDescription}
              className="pl-3 border-l border-slate-800 flex items-center gap-1.5 text-amber-300 hover:text-amber-200 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wide">
                过去王雷达预警 ({radarWarnings.length})
              </span>
            </button>
          )}
        </div>

        {/* Top-Center Puzzle Objective Banner (if in puzzle mode) */}
        {currentVariantConfig.isPuzzle && (
          <div className="pointer-events-auto hidden 2xl:flex items-center gap-3 bg-[#1E1B4B]/95 border border-purple-500/50 rounded-xl px-4 py-2 shadow-lg">
            <div>
              <div className="text-[10px] font-mono text-purple-300 tracking-wider">
                {t("puzzleObjective")} · {t(("variant_" + currentVariantConfig.id)).toUpperCase()}
              </div>
              <div className="text-xs text-slate-100 font-medium">
                {t(('puzzleGoal_' + currentVariantConfig.id))}
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Utility Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#0F172A]/95 border border-slate-800 rounded-xl p-1.5 shadow-xl">
          <label htmlFor="variant-select" className="sr-only">
            {t("selectRulesetAria")}
          </label>
          <select
            id="variant-select"
            aria-label={t("selectRulesetAria")}
            value={state.variant}
            onChange={(e) => {
              e.currentTarget.blur();
              onChangeVariant(e.target.value as VariantId);
            }}
            className="bg-slate-900 text-slate-200 text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none cursor-pointer"
          >
            {VARIANT_CONFIGS.map((v) => (
              <option key={v.id} value={v.id}>
                {t(('variant_' + v.id))}
              </option>
            ))}
          </select>

          {state.opponentMode === 'ai' && (
            <>
              <label htmlFor="persona-select" className="sr-only">
                {t("selectAiPersona")}
              </label>
              <select
                id="persona-select"
                aria-label={t("selectAiPersona")}
                value={state.aiPersona}
                onChange={(e) => {
                  e.currentTarget.blur();
                  onChangeAiPersona(e.target.value as AIPersona);
                }}
                className="bg-slate-900 text-amber-300 text-xs font-mono px-2 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none cursor-pointer"
              >
                {AI_PERSONA_CONFIGS.map((p) => (
                  <option key={p.id} value={p.id}>
                    AI: {t(('persona_' + p.id))}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Configurable Promotion Rule Toggle */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onChangePromotionRule(
                state.promotionRule === 'choose_piece' ? 'auto_queen' : 'choose_piece'
              );
            }}
            title={t("promotionRuleToggleTitle")}
            className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              state.promotionRule === 'choose_piece'
                ? 'bg-purple-950/90 border-purple-400/80 text-purple-200'
                : 'bg-slate-900 border-amber-500/60 text-amber-300'
            }`}
          >
            {state.promotionRule === 'choose_piece'
              ? t('promotion_choose_piece')
              : t('promotion_auto_queen')}
          </button>

          {/* Configurable Timeline Activation Delta Selector */}
          <label htmlFor="activation-delta-select" className="sr-only">
            {t("selectTimelineActivation")}
          </label>
          <select
            id="activation-delta-select"
            aria-label={t("selectTimelineActivation")}
            value={state.timelineActivationDelta}
            onChange={(e) => {
              e.currentTarget.blur();
              onChangeTimelineActivationDelta(
                Number(e.target.value) as TimelineActivationDelta
              );
            }}
            className="bg-slate-900 text-purple-200 text-xs font-mono px-2 py-1.5 rounded-lg border border-purple-500/60 hover:border-purple-400 focus:outline-none cursor-pointer"
          >
            <option value={2}>{t('delta_2')}</option>
            <option value={1}>{t('delta_1')}</option>
            <option value={99}>{t('delta_99')}</option>
          </select>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSliceHighlight();
            }}
            title="Highlight same (x, y) square across all spacetime boards [S or Hold Alt]"
            className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              sliceHighlightEnabled
                ? 'bg-cyan-950/90 border-cyan-400/80 text-cyan-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('sameSquareSlice')}: {sliceHighlightEnabled ? t('onLabel') : t('offLabel')}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleHistoryVectors();
            }}
            className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              showAllHistoryVectors
                ? 'bg-purple-950/80 border-purple-500/70 text-purple-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('vectorsLabel')} {showAllHistoryVectors ? t('all') : t('recent')}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMoveLogDrawer();
            }}
            className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              showMoveLogDrawer
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            棋谱复盘 [H] ({state.moveHistory.length})
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleGuideModal();
            }}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {t('guide4d')}
          </button>

          {/* Compact Language Switcher */}
          <LocaleSwitcher compact />

          <button
            type="button"
            tabIndex={-1}
            aria-label={isMuted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              {isMuted ? (
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              ) : (
                <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart Match [R]"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Right-Side 5D Move History & Post-Mortem Sandbox Drawer */}
      {showMoveLogDrawer && (
        <aside
          aria-label="5D Move History and Time-Tree Rewind"
          className="pointer-events-auto fixed right-3 top-16 bottom-20 w-80 sm:w-96 z-40 bg-[#0F172A]/95 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-amber-300 tracking-wider">
                5D SPACETIME MOVE LOG · 时空棋谱与沙盒推演
              </div>
              <h3 className="text-sm font-display font-bold text-slate-100">
                点击着法定位镜头 · 点击「回到此步」自由分支推演
              </h3>
            </div>
            <button
              type="button"
              onClick={onToggleMoveLogDrawer}
              className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
            >
              关闭 [H]
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {state.moveHistory.length === 0 ? (
              <div className="text-xs font-mono text-slate-400 text-center py-8">
                尚无已提交的回合记录。在当前 Present 棋盘走子并点击 {t('submitTurn')} 后将在此记录完整 5D 棋谱。
              </div>
            ) : (
              state.moveHistory.map((turnMoves, turnIdx) => {
                const firstMove = turnMoves[0];
                const moverColor = firstMove?.piece.color ?? (turnIdx % 2 === 0 ? 'w' : 'b');
                const canRewind = turnIdx < (state.turnSnapshots?.length ?? 0);
                return (
                  <div
                    key={`turn_log_${turnIdx}`}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                            moverColor === 'w'
                              ? 'bg-slate-100 text-slate-950'
                              : 'bg-slate-950 text-sky-300 border border-sky-500/40'
                          }`}
                        >
                          #{turnIdx + 1} · {moverColor === 'w' ? t('white') : t('black')}
                        </span>
                        {turnMoves.some((m) => m.createdTimeline !== undefined) && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-500/60 text-purple-200 font-mono text-[9px] font-bold">
                            分叉新宇宙
                          </span>
                        )}
                      </div>

                      {canRewind && (
                        <button
                          type="button"
                          onClick={() => onRewindToTurn(turnIdx)}
                          className="px-2 py-0.5 rounded bg-purple-900/80 hover:bg-purple-700 text-purple-100 border border-purple-400/50 font-mono text-[10px] font-semibold cursor-pointer"
                        >
                          回到此步 (Rewind)
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {turnMoves.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onFocusBoard(m.to.l, m.to.t)}
                          className="w-full text-left px-2 py-1 rounded bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono text-slate-200 cursor-pointer"
                        >
                          <span className="truncate">{m.notation}</span>
                          {m.createdTimeline !== undefined && (
                            <span className="text-[10px] text-purple-300 shrink-0">
                              → {formatTimelineLabel(m.createdTimeline)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Non-Blocking Checkmate Forensics Inspector Panel (Keeps Board Position Visible & Interactive!) */}
      {gameState === 'gameover' && (
        <div
          role="dialog"
          aria-label="Checkmate Forensics and Match Resolution"
          className="pointer-events-auto self-center w-full max-w-3xl mt-2 mb-auto"
        >
          {forensicsCollapsed ? (
            <div className="bg-[#0F172A]/95 border-2 border-red-500/80 rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[11px] font-bold">
                  终局复盘模式 · BOARD PRESERVED
                </span>
                <span className="text-xs font-display font-bold text-slate-100">
                  {forensics?.headline ??
                    (state.winner === 'w'
                      ? t('whiteTriumphs')
                      : state.winner === 'b'
                        ? t('blackTriumphs')
                        : t('stalemate'))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForensicsCollapsed(false)}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 rounded-lg cursor-pointer"
                >
                  展开死因解析 (Show Why Checkmated)
                </button>
                {state.lastTurnSnapshot && (
                  <button
                    type="button"
                    onClick={onUndoLastTurn}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-purple-900/90 hover:bg-purple-800 text-purple-100 border border-purple-400/60 rounded-lg cursor-pointer"
                  >
                    悔棋撤回上一步 (Undo Turn)
                  </button>
                )}
                <button
                  type="button"
                  data-start="true"
                  onClick={onRestart}
                  className="px-3 py-1.5 text-xs font-display font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer"
                >
                  再来一局 (Play Again)
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0F172A]/95 border-2 border-red-500/80 rounded-2xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold tracking-wider">
                      为什么会被弄死 · 5D CHECKMATE FORENSICS
                    </span>
                    <span className="text-[11px] font-mono text-amber-300">
                      棋盘已完整保留，可直接拖拽缩放查看红线与棋子
                    </span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-100">
                    {forensics?.headline ??
                      (state.winner === 'w'
                        ? t('whiteTriumphs')
                        : state.winner === 'b'
                          ? t('blackTriumphs')
                          : t('stalemate'))}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setForensicsCollapsed(true)}
                  className="px-3 py-1.5 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg cursor-pointer shrink-0"
                >
                  收起面板 · 自由看盘 (Minimize)
                </button>
              </div>

              {forensics ? (
                <div className="space-y-2.5 mb-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-3">
                      <div className="text-[10px] font-mono font-bold text-red-300 tracking-wider mb-1">
                        致命攻击方 · KILLER PIECE (棋盘红框「凶手」)
                      </div>
                      <div className="font-mono font-bold text-slate-100 text-xs leading-snug">
                        {forensics.attackerLabel}
                      </div>
                    </div>

                    <div className="bg-amber-950/35 border border-amber-500/50 rounded-xl p-3">
                      <div className="text-[10px] font-mono font-bold text-amber-300 tracking-wider mb-1">
                        被绝杀的王 · DOOMED KING (棋盘红框「被杀」)
                      </div>
                      <div className="font-mono font-bold text-slate-100 text-xs leading-snug">
                        {forensics.victimKingLabel}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-purple-300 tracking-wider">
                      死因深度解析 · WHY YOU GOT KILLED &amp; COULD NOT ESCAPE
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {forensics.summary}
                    </p>
                    <p className="text-slate-300 leading-relaxed text-[11px] bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
                      <strong className="text-amber-300">为什么无法解救：</strong>
                      {forensics.whyUnsavable}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  {state.winReason ?? t('win_default')}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span>Timelines: {state.timelinesCreatedCount}</span>
                  <span>·</span>
                  <span>Time Jumps: {state.timeJumpsCount}</span>
                  <span>·</span>
                  <span>Turns: {state.turnCount}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {state.lastTurnSnapshot && (
                    <button
                      type="button"
                      onClick={onUndoLastTurn}
                      className="px-3.5 py-2 bg-purple-700 hover:bg-purple-600 text-white font-mono font-bold text-xs rounded-lg border border-purple-400/60 transition-colors cursor-pointer"
                    >
                      悔棋撤回上一步 (Undo Last Turn)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onToggleMoveLogDrawer}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs rounded-lg border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    打开棋谱任意回溯 (Move Log)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForensicsCollapsed(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    仅看棋盘 (Inspect Board)
                  </button>
                  <button
                    type="button"
                    data-start="true"
                    onClick={onRestart}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    再来一局 (Play Again)
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToTitle}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg border border-slate-800 transition-colors cursor-pointer"
                  >
                    主菜单 (Title Screen)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Unified Perimeter Dock */}
      <div className="pointer-events-auto w-full max-w-6xl mx-auto bg-[#0F172A]/95 border border-slate-800 rounded-xl px-4 py-2.5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Zone: Selected Piece Inspector & Quick Time-Jump Selector */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectedPiece && selectedCoord ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-amber-500/50 flex items-center justify-center shrink-0">
                <ChessPieceSVG type={selectedPiece.type} color={selectedPiece.color} className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-100">
                    {selectedPiece.color === 'w' ? t('white') : t('black')} {t(('piece_' + selectedPiece.type))}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-amber-300">
                    {formatTimelineLabel(selectedCoord.l)} {formatTurnStep(selectedCoord.t)}{' '}
                    {formatSquare(selectedCoord.x, selectedCoord.y)}
                  </span>
                  {!state.winner && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-emerald-300">
                        {spatialMoves.length} Spatial
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-purple-300">
                        {temporalMoves.length} Time/Multiverse
                      </span>
                    </>
                  )}
                </div>

                {/* If piece has cross-timeline/temporal jumps, offer 1-click quick jump buttons with Ghost Hover Preview */}
                {!state.winner && temporalMoves.length > 0 ? (
                  <div className="flex items-center gap-1.5 mt-1 overflow-x-auto pb-0.5">
                    <span className="text-[11px] font-mono text-purple-300 shrink-0">
                      Time Jumps (悬停预览分叉):
                    </span>
                    {temporalMoves.slice(0, 5).map((tm) => (
                      <button
                        key={tm.id}
                        type="button"
                        onMouseEnter={() => onHoverMove(tm)}
                        onMouseLeave={() => onHoverMove(null)}
                        onClick={() => {
                          onHoverMove(null);
                          onExecuteMoveDirect(tm);
                        }}
                        className="px-2 py-0.5 text-[11px] font-mono bg-purple-950/90 hover:bg-cyan-900 text-purple-100 hover:text-cyan-100 border border-purple-500/60 hover:border-cyan-400 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Jump to {formatTimelineLabel(tm.to.l)} {formatTurnStep(tm.to.t)}{' '}
                        {formatSquare(tm.to.x, tm.to.y)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {t(('axisRule_' + selectedPiece.type))}
                  </div>
                )}
              </div>
            </>
          ) : state.winner ? (
            <div className="text-xs text-slate-300">
              <div className="font-semibold text-red-300">
                {forensics?.headline ?? state.winReason ?? tf('win_checkmate', { color: state.winner === 'w' ? t('white') : t('black') })}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                终局棋盘已完整保留：您可自由拖拽缩放棋盘，点击任意棋子查看坐标，或点击「悔棋撤回上一步」/「棋谱复盘 [H]」继续推演。
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-300">
              <div className="font-semibold text-slate-100">
                {submitStatus.canSubmit
                  ? t('readyToSubmit')
                  : tf(submitStatus.reason ?? 'reason_no_move', submitStatus.reasonVars)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {tf('selectAnyPieceHint', { color: state.turnColor === 'w' ? t('white') : t('black') })}
              </div>
            </div>
          )}
        </div>

        {/* Right Zone: Staged Moves + Undo + {t('submitTurn')} */}
        <div className="flex items-center gap-2.5 shrink-0">
          {state.stagedMoves.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 max-w-[260px] truncate">
              <span>Staged ({state.stagedMoves.length}):</span>
              <span className="truncate">
                {state.stagedMoves.map((m) => m.notation).join(', ')}
              </span>
            </div>
          )}

          {state.winner && state.lastTurnSnapshot ? (
            <button
              type="button"
              onClick={onUndoLastTurn}
              className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-purple-700 hover:bg-purple-600 text-white border border-purple-400/60 cursor-pointer whitespace-nowrap shrink-0"
            >
              悔棋撤回上一步
            </button>
          ) : (
            <button
              type="button"
              disabled={state.stagedMoves.length === 0 || Boolean(state.winner)}
              onClick={onUndoStaged}
              className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                state.stagedMoves.length > 0 && !state.winner
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600 cursor-pointer'
                  : 'bg-slate-900/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
              }`}
            >
              {t('undoMove')}
            </button>
          )}

          <button
            type="button"
            disabled={!submitStatus.canSubmit || Boolean(state.winner)}
            onClick={onSubmitTurn}
            className={`px-5 py-2 text-xs font-display font-bold tracking-wider rounded-lg transition-all whitespace-nowrap shrink-0 ${
              submitStatus.canSubmit && !state.winner
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {t('submitTurn')}
          </button>
        </div>
      </div>

      {/* 4D Movement & Canonical Rules Guide Modal */}
      {showGuideModal && (gameState === 'playing' || gameState === 'gameover') && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label={t("guideAria")}
            className="bg-[#0F172A] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="font-display text-lg font-bold text-slate-100">
                {t('guideTitle')}
              </h2>
              <button
                type="button"
                onClick={onToggleGuideModal}
                className="px-3 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                {t('guideClose')}
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed mb-4">
              <p>{t('guideAxisBody')}</p>
              <p>{t('guideTimelineBody')}</p>
              <p>{t('guideRulesBody')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {(['r', 'b', 'n', 'q', 'k', 'p', 'u', 'd'] as PieceType[]).map((pt) => (
                <div
                  key={pt}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <ChessPieceSVG type={pt} color="w" className="w-7 h-7 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-100">{t(('piece_' + pt))}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {t(('axisRule_' + pt))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Optional Rule: Pawn Promotion Choice Modal (Variant / Extended Rule) */}
      {pendingPromotionMove && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Select Promotion Piece"
            className="bg-[#0F172A] border-2 border-purple-500/80 rounded-2xl max-w-lg w-full p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-mono text-[10px] font-bold">
                    可选规则 / 变体扩展 · VARIANT PROMOTION
                  </span>
                  <span className="text-[11px] font-mono text-amber-300">
                    {formatTimelineLabel(pendingPromotionMove.to.l)} ·{' '}
                    {formatTurnStep(pendingPromotionMove.to.t)}{' '}
                    {formatSquare(pendingPromotionMove.to.x, pendingPromotionMove.to.y)}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-100">
                  选择兵底线升变棋子 (Select Promotion Piece)
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancelPromotion}
                className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                取消 [Esc]
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
              {PROMOTION_CANDIDATE_TYPES.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => onConfirmPromotion(pt)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    pt === 'q'
                      ? 'bg-amber-500/15 border-amber-400 hover:bg-amber-500/25'
                      : 'bg-slate-900/90 border-slate-700 hover:border-purple-400 hover:bg-slate-800'
                  }`}
                >
                  <ChessPieceSVG
                    type={pt}
                    color={pendingPromotionMove.piece.color}
                    className="w-10 h-10"
                  />
                  <div className="text-xs font-bold text-slate-100 text-center">
                    {t(('piece_' + pt))} ({pt.toUpperCase()})
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 text-center line-clamp-2">
                    {pt === 'q'
                      ? '全维王后 (原版默认)'
                      : pt === 'u'
                        ? '三维体对角独角兽'
                        : pt === 'd'
                          ? '四维超正方体时空龙'
                          : pt === 'n'
                            ? '四维 2+1 跳跃骑士'
                            : pt === 'r'
                              ? '单轴正交战车'
                              : '双轴对角主教'}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <span>提示：Steam 原版规则为自动升后 (Auto-Queen)</span>
              <button
                type="button"
                onClick={() => {
                  onChangePromotionRule('auto_queen');
                  onConfirmPromotion('q');
                }}
                className="text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                切换为「只升后 (原版)」并升后
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Focused Pause Status Modal */}
      {gameState === 'paused' && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Game Paused"
            className="bg-[#0F172A] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center"
          >
            <h2 className="font-display text-2xl font-bold text-slate-100 tracking-wide mb-1">
              Spacetime Paused
            </h2>
            <p className="text-xs font-mono text-slate-400 mb-6">
              {t(('variant_' + currentVariantConfig.id))} · {t('turnLabel')} {Math.floor(state.presentStep / 2) + 1}
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">PRESENT</div>
                <div className="text-lg font-mono font-bold text-amber-400 tabular-nums mt-0.5">
                  {formatTurnStep(state.presentStep)}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">{t('timelines')}</div>
                <div className="text-lg font-mono font-bold text-slate-100 tabular-nums mt-0.5">
                  {state.timelineOrder.length}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">{t('timeJumps')}</div>
                <div className="text-lg font-mono font-bold text-purple-300 tabular-nums mt-0.5">
                  {state.timeJumpsCount}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Resume Game
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Restart Match
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg border border-slate-800 transition-colors cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
