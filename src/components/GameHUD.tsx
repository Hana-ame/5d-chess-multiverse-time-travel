import React from 'react';
import {
  Coord5D,
  Move5D,
  MultiverseState,
  Piece,
  PieceType,
  ThreatVector,
  VariantId,
} from '../game/types';
import {
  VARIANT_CONFIGS,
  canSubmitCurrentTurn,
  formatSquare,
  formatTimelineLabel,
  formatTurnStep,
} from '../game/engine';
import { ChessPieceSVG } from './ChessPieceSVG';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useI18n } from '../i18n';

interface GameHUDProps {
  state: MultiverseState;
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  selectedCoord: Coord5D | null;
  selectedPiece: Piece | null;
  legalMovesForSelected: Move5D[];
  threats: ThreatVector[];
  isMuted: boolean;
  showAllHistoryVectors: boolean;
  showGuideModal: boolean;
  aiThinking: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onUndoStaged: () => void;
  onSubmitTurn: () => void;
  onToggleHistoryVectors: () => void;
  onToggleGuideModal: () => void;
  onChangeVariant: (variant: VariantId) => void;
  onExecuteMoveDirect: (move: Move5D) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state,
  gameState,
  selectedCoord,
  selectedPiece,
  legalMovesForSelected,
  threats,
  isMuted,
  showAllHistoryVectors,
  showGuideModal,
  aiThinking,
  onToggleMute,
  onTogglePause,
  onRestart,
  onReturnToTitle,
  onUndoStaged,
  onSubmitTurn,
  onToggleHistoryVectors,
  onToggleGuideModal,
  onChangeVariant,
  onExecuteMoveDirect,
}) => {
  const { t, tf } = useI18n();
  const submitStatus = canSubmitCurrentTurn(state);
  const currentVariantConfig =
    VARIANT_CONFIGS.find((v) => v.id === state.variant) ?? VARIANT_CONFIGS[0];

  const spatialMoves = legalMovesForSelected.filter((m) => m.kind === 'spatial');
  const temporalMoves = legalMovesForSelected.filter((m) => m.kind !== 'spatial');

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Cluster: Turn Status + Tabular Spacetime Metrics */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-4 bg-[#0F172A]/95 border border-slate-800 rounded-xl px-4 py-2.5 shadow-xl">
          {/* Active Turn Indicator */}
          <div className="flex items-center gap-2.5 pr-3 border-r border-slate-800">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold border ${
                state.turnColor === 'w'
                  ? 'bg-slate-100 text-slate-950 border-white'
                  : 'bg-slate-900 text-sky-300 border-sky-400/60'
              }`}
            >
              {state.turnColor === 'w' ? 'W' : 'B'}
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                {t('activeTurn')}
              </div>
              <div className="text-sm font-display font-bold text-slate-100 whitespace-nowrap">
                {aiThinking
                  ? t('aiThinking')
                  : state.turnColor === 'w'
                    ? t('whiteToMove')
                    : t('blackToMove')}
              </div>
            </div>
          </div>

          {/* Hero-to-Kicker Tabular Metrics */}
          <div className="flex items-center gap-5">
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
              <div className="text-lg font-mono font-bold text-slate-100 tabular-nums leading-tight">
                {state.timelineOrder.length}
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
          {threats.length > 0 && (
            <div className="pl-3 border-l border-slate-800 flex items-center gap-2 text-red-400">
              <span className="text-xs font-mono font-bold tracking-wide">
                {t('spacetimeCheck')} ({threats.length})
              </span>
            </div>
          )}
        </div>

        {/* Top-Center Puzzle Objective Banner (if in puzzle mode) */}
        {currentVariantConfig.isPuzzle && (
          <div className="pointer-events-auto hidden xl:flex items-center gap-3 bg-[#1E1B4B]/95 border border-purple-500/50 rounded-xl px-4 py-2 shadow-lg">
            <div>
              <div className="text-[10px] font-mono text-purple-300 tracking-wider">
                {t('puzzleObjective')} · {t(currentVariantConfig.name as any)}
              </div>
              <div className="text-xs text-slate-100 font-medium">
                {t(currentVariantConfig.puzzleGoal as any)}
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#0F172A]/95 border border-slate-800 rounded-xl p-1.5 shadow-xl">
          <label htmlFor="variant-select" className="sr-only">
            {t('selectRulesetAria')}
          </label>
          <select
            id="variant-select"
            aria-label={t('selectRulesetAria')}
            value={state.variant}
            onChange={(e) => {
              e.currentTarget.blur();
              onChangeVariant(e.target.value as VariantId);
            }}
            className="bg-slate-900 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none cursor-pointer"
          >
            {VARIANT_CONFIGS.map((v) => (
              <option key={v.id} value={v.id}>
                {t(v.name as any)}
              </option>
            ))}
          </select>

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
              onToggleGuideModal();
            }}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {t('guide4d')}
          </button>

          {/* Compact Language Switcher */}
          <LocaleSwitcher compact />

          {/* Compact Square SVG Utility Buttons: Mute [M], Restart [R], Pause [P] */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={isMuted ? t('unmuteAudio') : t('muteAudio')}
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
            aria-label={t('restartMatch')}
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
            aria-label={t('pauseGame')}
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
                    {selectedPiece.color === 'w' ? t('white') : t('black')} {t(('piece_' + selectedPiece.type) as any)}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-amber-300">
                    {formatTimelineLabel(selectedCoord.l)} {formatTurnStep(selectedCoord.t)}{' '}
                    {formatSquare(selectedCoord.x, selectedCoord.y)}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-emerald-300">
                    {spatialMoves.length} {t('spatial')}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-purple-300">
                    {temporalMoves.length} {t('timeMultiverse')}
                  </span>
                </div>

                {/* If piece has cross-timeline/temporal jumps, offer 1-click quick jump buttons */}
                {temporalMoves.length > 0 ? (
                  <div className="flex items-center gap-1.5 mt-1 overflow-x-auto pb-0.5">
                    <span className="text-[11px] font-mono text-purple-300 shrink-0">
                      {t('timeJumpsLabel')}
                    </span>
                    {temporalMoves.slice(0, 5).map((tm) => (
                      <button
                        key={tm.id}
                        type="button"
                        onClick={() => onExecuteMoveDirect(tm)}
                        className="px-2 py-0.5 text-[11px] font-mono bg-purple-950/90 hover:bg-purple-800 text-purple-100 border border-purple-500/60 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {t('jumpTo')} {formatTimelineLabel(tm.to.l)} {formatTurnStep(tm.to.t)}{' '}
                        {formatSquare(tm.to.x, tm.to.y)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {t(('axis_' + selectedPiece.type) as any)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-300">
              <div className="font-semibold text-slate-100">
                {submitStatus.canSubmit
                  ? t('readyToSubmit')
                  : tf(submitStatus.reason as any, submitStatus.reasonVars)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {tf('selectPieceHint', { color: state.turnColor === 'w' ? t('white') : t('black') })}
              </div>
            </div>
          )}
        </div>

        {/* Right Zone: Staged Moves + Undo + Submit Turn */}
        <div className="flex items-center gap-2.5 shrink-0">
          {state.stagedMoves.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 max-w-[260px] truncate">
              <span>{tf('stagedLabel', { count: state.stagedMoves.length })}</span>
              <span className="truncate">
                {state.stagedMoves.map((m) => m.notation).join(', ')}
              </span>
            </div>
          )}

          <button
            type="button"
            disabled={state.stagedMoves.length === 0}
            onClick={onUndoStaged}
            className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              state.stagedMoves.length > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600 cursor-pointer'
                : 'bg-slate-900/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
            }`}
          >
            {t('undoMove')}
          </button>

          <button
            type="button"
            disabled={!submitStatus.canSubmit}
            onClick={onSubmitTurn}
            className={`px-5 py-2 text-xs font-display font-bold tracking-wider rounded-lg transition-all whitespace-nowrap shrink-0 ${
              submitStatus.canSubmit
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {t('submitTurn')}
          </button>
        </div>
      </div>

      {/* 4D Movement Guide Modal */}
      {showGuideModal && gameState === 'playing' && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="5D Spacetime Movement Guide"
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

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-5">
              <p>{t('guideP1')}</p>
              <p>{t('guideP2')}</p>
              <p>{t('guideP3')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {(['r', 'b', 'n', 'q', 'k', 'p', 'u', 'd'] as PieceType[]).map((pt) => (
                <div
                  key={pt}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <ChessPieceSVG type={pt} color="w" className="w-7 h-7 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-100">{t(('piece_' + pt) as any)}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {t(('axis_' + pt) as any)}
                    </div>
                  </div>
                </div>
              ))}
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
              {t('pausedTitle')}
            </h2>
            <p className="text-xs font-mono text-slate-400 mb-6">
              {t(currentVariantConfig.name as any)} · {t('turnLabel')} {Math.floor(state.presentStep / 2) + 1}
            </p>

            {/* 3 Tabular Stat Tiles */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">{t('present')}</div>
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
                {t('resumeGame')}
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                {t('restartMatch')}
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg border border-slate-800 transition-colors cursor-pointer"
              >
                {t('titleScreen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Focused Victory / Game Over Status Modal */}
      {gameState === 'gameover' && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Match Concluded"
            className="bg-[#0F172A] border border-amber-500/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center"
          >
            <div className="text-xs font-mono text-amber-400 tracking-widest mb-1">
              {t('multiverseResolution')}
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-100 tracking-wide mb-2">
              {state.winner === 'w'
                ? t('whiteTriumphs')
                : state.winner === 'b'
                  ? t('blackTriumphs')
                  : t('stalemate')}
            </h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {state.winReasonKey
                ? tf(state.winReasonKey as any, state.winReasonVars)
                : state.winReason ?? t('win_default')}
            </p>

            {/* 3 Tabular Mastery Metric Tiles */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">{t('timelines')}</div>
                <div className="text-lg font-mono font-bold text-amber-400 tabular-nums mt-0.5">
                  {state.timelinesCreatedCount}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">{t('timeJumps')}</div>
                <div className="text-lg font-mono font-bold text-purple-300 tabular-nums mt-0.5">
                  {state.timeJumpsCount}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">{t('turns')}</div>
                <div className="text-lg font-mono font-bold text-slate-100 tabular-nums mt-0.5">
                  {state.turnCount}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                {t('playAgain')}
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg border border-slate-800 transition-colors cursor-pointer"
              >
                {t('titleScreen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
