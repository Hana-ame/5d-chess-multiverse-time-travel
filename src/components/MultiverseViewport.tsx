import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardState,
  Coord5D,
  Move5D,
  MultiverseState,
  PastKingRadarWarning,
  ThreatVector,
} from '../game/types';
import {
  canSubmitCurrentTurn,
  formatSquare,
  formatTimelineLabel,
  formatTurnStep,
  getActiveTimelineBounds,
  getBoardPlayableStatus,
  previewMoveOutcome,
} from '../game/engine';
import { ChessPieceSVG, PIECE_NAMES } from './ChessPieceSVG';
import { useI18n } from '../i18n';

interface MultiverseViewportProps {
  state: MultiverseState;
  selectedCoord: Coord5D | null;
  legalMovesForSelected: Move5D[];
  threats: ThreatVector[];
  radarWarnings: PastKingRadarWarning[];
  showAllHistoryVectors: boolean;
  sliceHighlightEnabled: boolean;
  hoveredCoord: Coord5D | null;
  hoveredMove: Move5D | null;
  onHoverSquare: (coord: Coord5D | null, matchingMove: Move5D | null) => void;
  onSquareClick: (coord: Coord5D) => void;
  onSubmitTurn: () => void;
  onUndoStaged: () => void;
  focusPresentSignal: number;
  focusBoardTarget: { l: number; t: number; seq: number } | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const MultiverseViewport: React.FC<MultiverseViewportProps> = ({
  state,
  selectedCoord,
  legalMovesForSelected,
  threats,
  radarWarnings,
  showAllHistoryVectors,
  sliceHighlightEnabled,
  hoveredCoord,
  hoveredMove,
  onHoverSquare,
  onSquareClick,
  onSubmitTurn,
  onUndoStaged,
  focusPresentSignal,
  focusBoardTarget,
}) => {
  const { t: i18nT, tf: i18nTF } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 90 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [altKeyHeld, setAltKeyHeld] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltKeyHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltKeyHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Geometry constants for deterministic spacetime grid layout
  const squarePx = state.boardSize <= 5 ? 38 : state.boardSize === 6 ? 34 : 29;
  const boardInnerPx = squarePx * state.boardSize;
  const boardCardPadding = 10;
  const boardHeaderHeight = 28;
  const boardWidth = boardInnerPx + boardCardPadding * 2;
  const boardHeight = boardInnerPx + boardCardPadding * 2 + boardHeaderHeight;
  const colGap = 54;
  const rowGap = 62;
  const colPitch = boardWidth + colGap;
  const rowPitch = boardHeight + rowGap;

  // Descending timeline order so +L1, +L2 are at the top, L0 in the middle, -L1, -L2 at the bottom
  const sortedRowsDesc = useMemo(() => {
    return [...state.timelineOrder].sort((a, b) => b - a);
  }, [state.timelineOrder]);

  const maxStep = useMemo(() => {
    let maxT = 0;
    for (const l of state.timelineOrder) {
      const boards = state.timelines[l]?.boards ?? [];
      for (const b of boards) {
        if (b.t > maxT) maxT = b.t;
      }
    }
    return maxT;
  }, [state.timelines, state.timelineOrder]);

  const timelineBounds = useMemo(() => getActiveTimelineBounds(state), [state]);
  const activeTimelines = timelineBounds.activeSet;
  const submitStatus = useMemo(() => canSubmitCurrentTurn(state), [state]);

  // Compute Ghost Move & Branch Preview when hovering a legal move
  const ghostPreview = useMemo(() => {
    if (!hoveredMove || state.winner) return null;
    return previewMoveOutcome(state, hoveredMove);
  }, [state, hoveredMove]);

  // Active Slice Coordinate (x, y) when Slice Highlight is ON or Alt is held
  const activeSliceXY = useMemo(() => {
    if (!sliceHighlightEnabled && !altKeyHeld) return null;
    const ref = hoveredCoord ?? selectedCoord;
    if (!ref) return null;
    return { x: ref.x, y: ref.y };
  }, [sliceHighlightEnabled, altKeyHeld, hoveredCoord, selectedCoord]);

  const posTimelineCount = useMemo(
    () => sortedRowsDesc.filter((l) => l > 0).length,
    [sortedRowsDesc]
  );
  const prevPosCountRef = useRef<number>(posTimelineCount);

  // Compensate pan.y when a new positive timeline (+L1, +L2...) is prepended above L0
  useEffect(() => {
    const deltaPos = posTimelineCount - prevPosCountRef.current;
    prevPosCountRef.current = posTimelineCount;
    if (deltaPos !== 0) {
      setPan((prev) => ({
        x: prev.x,
        y: Math.round(prev.y - deltaPos * rowPitch * zoom),
      }));
    }
  }, [posTimelineCount, rowPitch, zoom]);

  // Center camera ONLY on initial game start, match restart, variant change, or explicit reset
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const l0RowIdx = Math.max(0, sortedRowsDesc.indexOf(0));
    prevPosCountRef.current = sortedRowsDesc.filter((l) => l > 0).length;

    const spanWidth = (maxStep + 1) * colPitch - colGap;
    const midSpanX = spanWidth / 2;
    const presentX = state.presentStep * colPitch + boardWidth / 2;
    const targetX = spanWidth <= rect.width - 260 ? midSpanX : presentX - rect.width * 0.22;
    const targetY = l0RowIdx * rowPitch + boardHeight / 2;

    const desiredPanX = Math.round(rect.width * 0.52 - targetX * zoom);
    const desiredPanY = Math.round(rect.height * 0.46 - targetY * zoom);
    setPan({
      x: Math.max(140, desiredPanX),
      y: Math.max(105, desiredPanY),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPresentSignal, state.variant, state.boardSize]);

  // Focus camera on a specific (l, t) board when clicked in the Move History Drawer
  useEffect(() => {
    if (!focusBoardTarget) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rowIdx = sortedRowsDesc.indexOf(focusBoardTarget.l);
    if (rowIdx === -1) return;
    const bx = focusBoardTarget.t * colPitch + boardWidth / 2;
    const by = rowIdx * rowPitch + boardHeight / 2;
    setPan({
      x: Math.round(rect.width * 0.48 - bx * zoom),
      y: Math.round(rect.height * 0.48 - by * zoom),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusBoardTarget?.seq]);

  const getSquareCenterPx = (coord: Coord5D): { cx: number; cy: number } | null => {
    const rowIdx = sortedRowsDesc.indexOf(coord.l);
    if (rowIdx === -1) return null;
    const boardLeft = coord.t * colPitch;
    const boardTop = rowIdx * rowPitch;
    const visualRow = state.boardSize - 1 - coord.y;
    const cx = boardLeft + boardCardPadding + coord.x * squarePx + squarePx / 2;
    const cy =
      boardTop + boardHeaderHeight + boardCardPadding + visualRow * squarePx + squarePx / 2;
    return { cx, cy };
  };

  const getBoardCenterPx = (l: number, t: number): { bx: number; by: number } | null => {
    const rowIdx = sortedRowsDesc.indexOf(l);
    if (rowIdx === -1) return null;
    const bx = t * colPitch + boardWidth / 2;
    const by = rowIdx * rowPitch + boardHeaderHeight + (boardHeight - boardHeaderHeight) / 2;
    return { bx, by };
  };

  // Fast lookup map for legal destination squares
  const legalMovesMap = useMemo(() => {
    const map = new Map<string, Move5D>();
    for (const m of legalMovesForSelected) {
      map.set(`${m.to.l}_${m.to.t}_${m.to.x}_${m.to.y}`, m);
    }
    return map;
  }, [legalMovesForSelected]);

  // Combine active threats with checkmate forensics fatal threats so the kill vector is always visible after game over
  const allVisibleThreats = useMemo(() => {
    const map = new Map<string, ThreatVector>();
    for (const th of threats) {
      map.set(
        `${th.from.l}_${th.from.t}_${th.from.x}_${th.from.y}_to_${th.to.l}_${th.to.t}_${th.to.x}_${th.to.y}`,
        th
      );
    }
    for (const th of state.checkmateForensics?.fatalThreats ?? []) {
      map.set(
        `${th.from.l}_${th.from.t}_${th.from.x}_${th.from.y}_to_${th.to.l}_${th.to.t}_${th.to.x}_${th.to.y}`,
        th
      );
    }
    return Array.from(map.values());
  }, [threats, state.checkmateForensics]);

  const threatenedSquaresSet = useMemo(() => {
    const set = new Set<string>();
    for (const th of allVisibleThreats) {
      set.add(`${th.to.l}_${th.to.t}_${th.to.x}_${th.to.y}`);
    }
    return set;
  }, [allVisibleThreats]);

  const threatenedBoardsSet = useMemo(() => {
    const set = new Set<string>();
    for (const th of allVisibleThreats) {
      set.add(`${th.to.l}_${th.to.t}`);
    }
    return set;
  }, [allVisibleThreats]);

  const stagedSquaresSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of state.stagedMoves) {
      set.add(`${m.from.l}_${m.from.t}_${m.from.x}_${m.from.y}`);
      set.add(`${m.resultingSourceBoard.l}_${m.resultingSourceBoard.t}_${m.to.x}_${m.to.y}`);
      if (m.resultingTargetBoard) {
        set.add(`${m.resultingTargetBoard.l}_${m.resultingTargetBoard.t}_${m.to.x}_${m.to.y}`);
      }
    }
    return set;
  }, [state.stagedMoves]);

  const attackerSquaresSet = useMemo(() => {
    const set = new Set<string>();
    for (const th of allVisibleThreats) {
      set.add(`${th.from.l}_${th.from.t}_${th.from.x}_${th.from.y}`);
    }
    return set;
  }, [allVisibleThreats]);

  const radarKingSquaresSet = useMemo(() => {
    const set = new Set<string>();
    for (const rw of radarWarnings) {
      set.add(`${rw.kingCoord.l}_${rw.kingCoord.t}_${rw.kingCoord.x}_${rw.kingCoord.y}`);
    }
    return set;
  }, [radarWarnings]);

  // Compute vertical bounds of the Symmetric Active Timeline Band
  const activeBandRows = useMemo(() => {
    const activeRowIndices = sortedRowsDesc
      .map((l, idx) => (activeTimelines.has(l) ? idx : -1))
      .filter((idx) => idx !== -1);
    if (activeRowIndices.length === 0) return null;
    const firstIdx = Math.min(...activeRowIndices);
    const lastIdx = Math.max(...activeRowIndices);
    return {
      top: firstIdx * rowPitch - 14,
      height: (lastIdx - firstIdx) * rowPitch + boardHeight + 28,
    };
  }, [sortedRowsDesc, activeTimelines, rowPitch, boardHeight]);

  // Pointer pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom((z) => Math.min(1.5, Math.max(0.55, Number((z + delta).toFixed(2)))));
    } else {
      setPan((p) => ({
        x: p.x - e.deltaX - (e.shiftKey ? e.deltaY : 0),
        y: p.y - (e.shiftKey ? 0 : e.deltaY),
      }));
    }
  };

  const visibleTimeMoves = useMemo(() => {
    const list: { move: Move5D; isStaged: boolean }[] = [];
    if (showAllHistoryVectors) {
      for (const turnMoves of state.moveHistory) {
        for (const m of turnMoves) {
          if (m.kind !== 'spatial') {
            list.push({ move: m, isStaged: false });
          }
        }
      }
    } else if (state.moveHistory.length > 0) {
      const lastTurn = state.moveHistory[state.moveHistory.length - 1];
      for (const m of lastTurn) {
        if (m.kind !== 'spatial') {
          list.push({ move: m, isStaged: false });
        }
      }
    }
    for (const m of state.stagedMoves) {
      list.push({ move: m, isStaged: true });
    }
    return list;
  }, [state.moveHistory, state.stagedMoves, showAllHistoryVectors]);

  // Compute coordinates for Ghost Preview Board when hovering a time-travel move
  const ghostBoardBox = useMemo(() => {
    if (!ghostPreview || hoveredMove?.kind === 'spatial') return null;
    const gL = ghostPreview.ghostBoardCoord.l;
    const gT = ghostPreview.ghostBoardCoord.t;
    const left = gT * colPitch;
    let top = 0;
    const existingRowIdx = sortedRowsDesc.indexOf(gL);
    if (existingRowIdx !== -1) {
      top = existingRowIdx * rowPitch;
    } else if (gL > 0) {
      // New positive timeline (+L1, +L2...) will appear one row above the current top row
      top = -rowPitch;
    } else {
      // New negative timeline (-L1, -L2...) will appear one row below the current bottom row
      top = sortedRowsDesc.length * rowPitch;
    }
    return {
      left,
      top,
      l: gL,
      t: gT,
      isBranch: ghostPreview.willBranchNewTimeline,
      isActive: ghostPreview.isNewTimelineActive ?? true,
      nextPresentStep: ghostPreview.nextPresentStep,
    };
  }, [ghostPreview, hoveredMove, colPitch, rowPitch, sortedRowsDesc]);

  const totalCanvasWidth = (maxStep + 3) * colPitch;
  const totalCanvasHeight = Math.max(2, sortedRowsDesc.length + 1) * rowPitch;

  return (
    <div
      ref={containerRef}
      data-testid="multiverse-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden bg-[#0B0F19] ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Subtle Background Starfield / Spacetime Coordinate Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.28) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          backgroundPosition: `${pan.x % 32}px ${pan.y % 32}px`,
        }}
      />

      {/* Transformed Multiverse World Plane */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: '0 0',
          width: `${totalCanvasWidth}px`,
          height: `${totalCanvasHeight}px`,
        }}
        className="relative"
      >
        {/* 0. Symmetric Active Timeline Band (Covers Mandatory Active Zone [-maxActiveSide .. +maxActiveSide]) */}
        {activeBandRows && state.timelineOrder.length > 1 && (
          <div
            style={{
              left: `-134px`,
              top: `${activeBandRows.top}px`,
              width: `${(maxStep + 1) * colPitch + 150}px`,
              height: `${activeBandRows.height}px`,
            }}
            className="pointer-events-none absolute rounded-2xl border border-purple-500/35 bg-purple-950/[0.12] transition-all duration-200"
          >
            <div className="absolute -top-3 left-3 px-2 py-0.5 rounded bg-[#1E1B4B] border border-purple-400/60 text-[9px] font-mono font-bold text-purple-200 tracking-wider shadow">
              对称激活光带 · ACTIVE ZONE{' '}
              {timelineBounds.activationDelta >= 99
                ? '[全部时间线激活]'
                : `[${formatTimelineLabel(-timelineBounds.maxActiveSide)} .. ${formatTimelineLabel(timelineBounds.maxActiveSide)}] (相差 ≤${timelineBounds.activationDelta} 强制走子区间)`}
            </div>
          </div>
        )}

        {/* 1. "THE PRESENT" Vertical Column Pillar */}
        <div
          style={{
            left: `${state.presentStep * colPitch - 12}px`,
            top: `-68px`,
            width: `${boardWidth + 24}px`,
            height: `${sortedRowsDesc.length * rowPitch + 28}px`,
          }}
          className={`pointer-events-none absolute rounded-2xl border-2 transition-all duration-200 ${
            submitStatus.canSubmit
              ? 'bg-emerald-500/[0.08] border-emerald-400/65 shadow-[0_0_40px_rgba(16,185,129,0.18)]'
              : state.presentStep % 2 === 0
                ? 'bg-slate-100/[0.06] border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.14)]'
                : 'bg-sky-500/[0.07] border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.14)]'
          }`}
        >
          <div
            className={`pointer-events-auto flex items-center justify-between px-2.5 py-1 border-b rounded-t-xl ${
              submitStatus.canSubmit
                ? 'border-emerald-400/40 bg-emerald-500/25'
                : 'border-amber-500/30 bg-amber-500/20'
            }`}
          >
            <span
              className={`font-mono text-[10px] font-bold tracking-wider ${
                submitStatus.canSubmit ? 'text-emerald-200' : 'text-amber-300'
              }`}
            >
              {i18nT('thePresent')} · {formatTurnStep(state.presentStep)}
            </span>
            {submitStatus.canSubmit && !state.winner && (
              <button
                type="button"
                onClick={onSubmitTurn}
                className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[10px] font-bold tracking-wide shadow cursor-pointer"
              >
                {i18nT('submitTurn')} ↵
              </button>
            )}
          </div>
        </div>

        {/* 1B. Ghost Present Column Shift Indicator (When hovering a move that shifts The Present) */}
        {ghostPreview && ghostPreview.nextPresentStep !== state.presentStep && (
          <div
            style={{
              left: `${ghostPreview.nextPresentStep * colPitch - 8}px`,
              top: `-64px`,
              width: `${boardWidth + 16}px`,
              height: `${sortedRowsDesc.length * rowPitch + 20}px`,
            }}
            className="pointer-events-none absolute rounded-2xl border-2 border-dashed border-cyan-400/80 bg-cyan-500/[0.06] z-10"
          >
            <div className="px-2 py-0.5 bg-cyan-950/90 border-b border-cyan-400/50 rounded-t-xl text-[9px] font-mono font-bold text-cyan-200 tracking-wider">
              NEXT PRESENT · 落子后当前指针 → {formatTurnStep(ghostPreview.nextPresentStep)}
            </div>
          </div>
        )}

        {/* 2. Turn Step Column Headers along the top */}
        {Array.from({ length: maxStep + 1 }, (_, t) => {
          const isPresent = t === state.presentStep;
          const turnNum = Math.floor(t / 2) + 1;
          const isWhiteCol = t % 2 === 0;
          return (
            <div
              key={`col_hdr_${t}`}
              style={{
                left: `${t * colPitch}px`,
                top: `-34px`,
                width: `${boardWidth}px`,
              }}
              className={`pointer-events-none absolute flex items-center justify-between px-2.5 py-1 rounded border text-xs font-mono ${
                isPresent
                  ? 'bg-slate-900/95 border-amber-500/50'
                  : isWhiteCol
                    ? 'bg-slate-800/90 border-slate-600/80'
                    : 'bg-slate-950/90 border-slate-800'
              }`}
            >
              <span className={isPresent ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                {i18nT('turnLabel')} {turnNum}
              </span>
              <span
                className={`text-[11px] font-semibold px-1.5 py-0.2 rounded ${
                  isWhiteCol
                    ? 'bg-slate-100 text-slate-950'
                    : 'bg-slate-950 text-sky-300 border border-sky-500/40'
                }`}
              >
                {isWhiteCol ? i18nT('statusWhite') : i18nT('statusBlack')}
              </span>
            </div>
          );
        })}

        {/* 3. Timeline Row Labels on the left (Active Symmetric Zone vs Inactive Optional Zone) */}
        {sortedRowsDesc.map((l, rowIdx) => {
          const tl = state.timelines[l];
          const isActive = activeTimelines.has(l);
          const firstBoardT = tl?.boards[0]?.t ?? 0;
          return (
            <div
              key={`row_hdr_${l}`}
              style={{
                left: `${firstBoardT * colPitch - 126}px`,
                top: `${rowIdx * rowPitch + boardHeight / 2 - 30}px`,
                width: '114px',
              }}
              className={`pointer-events-none absolute px-2.5 py-2 rounded-lg border text-right font-mono transition-colors ${
                isActive
                  ? 'bg-[#1E1B4B]/95 border-purple-500/75 text-slate-100 shadow-[0_0_14px_rgba(168,85,247,0.22)]'
                  : tl?.createdBy === 'w'
                    ? 'bg-slate-900/90 border-dashed border-slate-400/70 text-slate-200'
                    : 'bg-slate-950/90 border-dashed border-sky-500/60 text-sky-300'
              }`}
            >
              <div className="text-sm font-bold tracking-tight flex items-center justify-end gap-1">
                <span>{formatTimelineLabel(l)}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-purple-400' : 'bg-amber-400/80'
                  }`}
                />
              </div>
              <div
                className={`text-[9px] leading-tight mt-0.5 ${
                  isActive ? 'text-purple-300 font-semibold' : 'text-amber-300 font-semibold'
                }`}
              >
                {isActive ? i18nT('statusActive') : i18nT('statusInactive')}
              </div>
            </div>
          );
        })}

        {/* 3B. Ghost Preview Board Card (When hovering a time-travel move) */}
        {ghostBoardBox && hoveredMove && (
          <div
            style={{
              left: `${ghostBoardBox.left}px`,
              top: `${ghostBoardBox.top}px`,
              width: `${boardWidth}px`,
              height: `${boardHeight}px`,
            }}
            className="pointer-events-none absolute rounded-xl border-[3px] border-dashed border-cyan-400 bg-cyan-950/35 shadow-[0_0_30px_rgba(34,211,238,0.28)] flex flex-col items-center justify-between p-3 z-20"
          >
            <div className="w-full flex items-center justify-between border-b border-cyan-400/40 pb-1.5 text-[10px] font-mono">
              <span className="font-bold text-cyan-200">
                {ghostBoardBox.isBranch
                  ? `幽灵分叉 · NEW ${formatTimelineLabel(ghostBoardBox.l)}`
                  : `幽灵跳跃 · ${formatTimelineLabel(ghostBoardBox.l)}`}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  ghostBoardBox.isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-amber-300 border border-amber-400/50'
                }`}
              >
                {ghostBoardBox.isActive ? 'ACTIVE · 激活' : 'INACTIVE · 可选'}
              </span>
            </div>

            <div className="text-center space-y-1 my-auto">
              <div className="w-10 h-10 mx-auto rounded-lg bg-cyan-900/50 border border-cyan-400/60 flex items-center justify-center">
                <ChessPieceSVG
                  type={hoveredMove.promotedTo ?? hoveredMove.piece.type}
                  color={hoveredMove.piece.color}
                  className="w-7 h-7"
                />
              </div>
              <div className="text-xs font-mono font-bold text-cyan-100">
                {formatTimelineLabel(ghostBoardBox.l)} · {formatTurnStep(ghostBoardBox.t)}
              </div>
              <div className="text-[10px] font-mono text-cyan-300">
                落点: {formatSquare(hoveredMove.to.x, hoveredMove.to.y)}
              </div>
            </div>

            <div className="w-full text-center text-[9px] font-mono text-slate-300 bg-slate-950/80 rounded px-2 py-1 border border-cyan-500/30">
              {ghostBoardBox.isBranch
                ? ghostBoardBox.isActive
                  ? `分叉差 ≤${timelineBounds.activationDelta >= 99 ? '∞' : timelineBounds.activationDelta}：此新时间线立即激活 (Active)`
                  : `分叉差 >${timelineBounds.activationDelta}：超出对称上限，暂为可选 (Inactive)`
                : '跳跃至平行时间线当前棋盘'}
            </div>
          </div>
        )}

        {/* 4. SVG Underlay: Timeline Connectors & Branching Elbows */}
        <svg
          width={totalCanvasWidth}
          height={totalCanvasHeight}
          className="pointer-events-none absolute inset-0 overflow-visible"
        >
          <defs>
            <marker
              id="arrow-slate"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
            </marker>
            <marker
              id="arrow-purple"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#A855F7" />
            </marker>
          </defs>

          {sortedRowsDesc.map((l) => {
            const tl = state.timelines[l];
            if (!tl) return null;
            return (
              <g key={`tl_lines_${l}`}>
                {tl.boards.map((b, idx) => {
                  if (idx === 0) return null;
                  const prev = tl.boards[idx - 1];
                  const c1 = getBoardCenterPx(prev.l, prev.t);
                  const c2 = getBoardCenterPx(b.l, b.t);
                  if (!c1 || !c2) return null;
                  return (
                    <line
                      key={`seq_${b.id}`}
                      x1={c1.bx + boardWidth / 2 - 4}
                      y1={c1.by}
                      x2={c2.bx - boardWidth / 2 + 4}
                      y2={c2.by}
                      stroke="#475569"
                      strokeWidth="3"
                      markerEnd="url(#arrow-slate)"
                    />
                  );
                })}

                {tl.parentTimeline !== undefined &&
                  tl.branchFromStep !== undefined &&
                  tl.boards.length > 0 && (() => {
                    const parentCenter = getBoardCenterPx(tl.parentTimeline, tl.branchFromStep);
                    const firstChild = tl.boards[0];
                    const childCenter = getBoardCenterPx(firstChild.l, firstChild.t);
                    if (!parentCenter || !childCenter) return null;
                    const startX = parentCenter.bx;
                    const startY =
                      childCenter.by < parentCenter.by
                        ? parentCenter.by - boardHeight / 2
                        : parentCenter.by + boardHeight / 2;
                    const endX = childCenter.bx - boardWidth / 2 + 2;
                    const endY = childCenter.by;
                    const pathD = `M ${startX} ${startY} C ${startX} ${endY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`;
                    return (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#A855F7"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                        markerEnd="url(#arrow-purple)"
                      />
                    );
                  })()}
              </g>
            );
          })}
        </svg>

        {/* 5. Render Every Spacetime Board (L, T) */}
        {sortedRowsDesc.map((l, rowIdx) => {
          const tl = state.timelines[l];
          if (!tl) return null;

          return tl.boards.map((board: BoardState) => {
            const pStatus = getBoardPlayableStatus(state, board, activeTimelines);
            const isWhiteBoard = pStatus.boardColor === 'w';
            const boardLeft = board.t * colPitch;
            const boardTop = rowIdx * rowPitch;

            const hasLegalTargetsOnBoard = legalMovesForSelected.some(
              (m) => m.to.l === board.l && m.to.t === board.t
            );

            let cardFrameClass = '';
            if (pStatus.isMandatoryPresent) {
              cardFrameClass = isWhiteBoard
                ? 'bg-slate-800 border-[3px] border-amber-400 ring-2 ring-white/80 shadow-[0_0_26px_rgba(245,158,11,0.32)]'
                : 'bg-slate-950 border-[3px] border-amber-400 ring-2 ring-sky-400/70 shadow-[0_0_26px_rgba(245,158,11,0.32)]';
            } else if (pStatus.isOptionalPlayable) {
              cardFrameClass = pStatus.isTimelineActive
                ? 'bg-slate-900 border-[3px] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'bg-slate-900 border-[3px] border-dashed border-amber-400/90 shadow-[0_0_18px_rgba(245,158,11,0.2)]';
            } else if (hasLegalTargetsOnBoard) {
              cardFrameClass =
                'bg-slate-900/95 border-[3px] border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.35)]';
            } else if (pStatus.isStagedResultThisTurn) {
              cardFrameClass = isWhiteBoard
                ? 'bg-slate-900 border-[3px] border-slate-200 shadow-[0_0_18px_rgba(226,232,240,0.22)]'
                : 'bg-slate-950 border-[3px] border-sky-400/85 shadow-[0_0_18px_rgba(56,189,248,0.22)]';
            } else if (pStatus.isPlayableBoard) {
              cardFrameClass = isWhiteBoard
                ? 'bg-slate-900/95 border-[3px] border-slate-200/90 shadow-md'
                : 'bg-slate-950/95 border-[3px] border-sky-500/75 shadow-md';
            } else if (pStatus.isStagedOriginThisTurn) {
              cardFrameClass =
                'bg-slate-900/90 border-2 border-dashed border-amber-400/70 opacity-95';
            } else {
              cardFrameClass = isWhiteBoard
                ? 'bg-slate-900/80 border border-slate-500/60 opacity-90'
                : 'bg-slate-950/85 border border-slate-800 opacity-90';
            }

            return (
              <div
                key={board.id}
                data-testid={`board-${board.id}`}
                data-playable={pStatus.isPlayableBoard ? 'true' : 'false'}
                data-turn-playable={pStatus.isCurrentPlayerTurnOnBoard ? 'true' : 'false'}
                data-board-color={pStatus.boardColor}
                style={{
                  left: `${boardLeft}px`,
                  top: `${boardTop}px`,
                  width: `${boardWidth}px`,
                  height: `${boardHeight}px`,
                }}
                className={`absolute rounded-xl transition-all duration-150 flex flex-col ${cardFrameClass}`}
              >
                {/* Board Header Bar */}
                <div
                  style={{ height: `${boardHeaderHeight}px` }}
                  className={`px-2 flex items-center justify-between border-b text-[10px] font-mono shrink-0 rounded-t-[9px] ${
                    isWhiteBoard
                      ? 'bg-slate-800/95 border-slate-600/80 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                        isWhiteBoard
                          ? 'bg-slate-100 text-slate-950'
                          : 'bg-slate-900 text-sky-300 border border-sky-500/50'
                      }`}
                    >
                      {isWhiteBoard ? 'W' : 'B'}
                    </span>
                    <span className="font-bold text-slate-100">
                      {formatTimelineLabel(board.l)}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{formatTurnStep(board.t)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {threatenedBoardsSet.has(`${board.l}_${board.t}`) && (
                      <span className="px-1 py-0.2 rounded bg-red-600/90 text-white font-mono text-[8px] font-bold tracking-tight animate-pulse">
                        CHECK · 将军
                      </span>
                    )}
                    {hasLegalTargetsOnBoard && !pStatus.isCurrentPlayerTurnOnBoard ? (
                      <span className="text-[9px] font-bold text-purple-300 tracking-tight">
                        TIME TARGET
                      </span>
                    ) : pStatus.isMandatoryPresent ? (
                      <span className="text-[9px] font-bold text-amber-300 tracking-tight">
                        {i18nT('status_playable_present')}
                      </span>
                    ) : pStatus.isOptionalPlayable ? (
                      <span
                        className={`text-[9px] font-bold tracking-tight ${
                          pStatus.isTimelineActive ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {i18nT(pStatus.statusLabel)}
                      </span>
                    ) : pStatus.isStagedResultThisTurn ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-sky-300">
                          {i18nT('status_staged')}
                        </span>
                        <button
                          type="button"
                          onClick={onUndoStaged}
                          className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[9px] font-bold cursor-pointer"
                          title={i18nT("undoStagedTitle")}
                        >
                          Undo
                        </button>
                      </div>
                    ) : pStatus.isStagedOriginThisTurn ? (
                      <span className="text-[9px] font-semibold text-amber-300/90">
                        {i18nT('status_moved_revise')}
                      </span>
                    ) : pStatus.isPlayableBoard ? (
                      <span className="text-[9px] font-semibold text-slate-300">
                        {i18nT(pStatus.statusLabel)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">
                        HISTORY
                      </span>
                    )}
                  </div>
                </div>

                {/* Inner Chessboard Grid */}
                <div
                  style={{
                    padding: `${boardCardPadding}px`,
                  }}
                  className="flex-1 flex items-center justify-center"
                >
                  <div
                    style={{
                      width: `${boardInnerPx}px`,
                      height: `${boardInnerPx}px`,
                      gridTemplateColumns: `repeat(${state.boardSize}, ${squarePx}px)`,
                      gridTemplateRows: `repeat(${state.boardSize}, ${squarePx}px)`,
                    }}
                    className="grid rounded overflow-hidden border border-slate-700/70"
                  >
                    {Array.from({ length: state.boardSize }, (_, rIdx) => {
                      const y = state.boardSize - 1 - rIdx;
                      return Array.from({ length: state.boardSize }, (__, x) => {
                        const isLightSquare = (x + y) % 2 === 1;
                        const piece = board.squares[y][x];
                        const sqKey = `${board.l}_${board.t}_${x}_${y}`;
                        const isSelected =
                          selectedCoord?.l === board.l &&
                          selectedCoord?.t === board.t &&
                          selectedCoord?.x === x &&
                          selectedCoord?.y === y;
                        const legalMove = legalMovesMap.get(sqKey);
                        const isTemporalTarget = legalMove && legalMove.kind !== 'spatial';
                        const isKingThreatened = threatenedSquaresSet.has(sqKey);
                        const isFatalAttacker = attackerSquaresSet.has(sqKey);
                        const isRadarWarnedKing =
                          !isKingThreatened && radarKingSquaresSet.has(sqKey);
                        const isSliceAligned =
                          activeSliceXY !== null &&
                          activeSliceXY.x === x &&
                          activeSliceXY.y === y;

                        const squareName = formatSquare(x, y);
                        const pieceDesc = piece
                          ? `${piece.color === 'w' ? i18nT('white') : i18nT('black')} ${i18nT(('piece_' + piece.type))}`
                          : i18nT('emptySquare');
                        const targetDesc = legalMove
                          ? legalMove.isCastling
                            ? i18nT('legalCastling')
                            : legalMove.isEnPassant
                              ? i18nT('legalEnPassant')
                              : legalMove.kind === 'spatial'
                                ? i18nT('legalSpatial')
                                : i18nT('legalTimeTravel')
                          : isKingThreatened
                            ? ' · Threatened King'
                            : isFatalAttacker
                              ? ' · Checking Attacker'
                              : isRadarWarnedKing
                                ? ' · Past-King Radar Warning'
                                : '';

                        return (
                          <button
                            key={sqKey}
                            type="button"
                            onMouseEnter={() =>
                              onHoverSquare(
                                { l: board.l, t: board.t, x, y },
                                legalMove ?? null
                              )
                            }
                            onMouseLeave={() => onHoverSquare(null, null)}
                            onClick={() =>
                              onSquareClick({ l: board.l, t: board.t, x, y })
                            }
                            aria-label={`${formatTimelineLabel(board.l)} ${formatTurnStep(board.t)} ${squareName} ${pieceDesc}${targetDesc}`}
                            style={{
                              width: `${squarePx}px`,
                              height: `${squarePx}px`,
                            }}
                            className={`
                              relative flex items-center justify-center p-0.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                              ${
                                isSelected
                                  ? 'bg-amber-500/70'
                                  : isKingThreatened
                                    ? 'bg-red-600/80 ring-2 ring-inset ring-red-300 animate-pulse'
                                    : isFatalAttacker
                                      ? 'bg-orange-600/60 ring-2 ring-inset ring-amber-300'
                                      : isRadarWarnedKing
                                        ? 'bg-amber-500/40 ring-2 ring-inset ring-amber-300'
                                        : isTemporalTarget
                                          ? 'bg-purple-600/45 hover:bg-purple-500/65'
                                          : legalMove
                                            ? 'bg-emerald-500/35 hover:bg-emerald-500/55'
                                            : isSliceAligned
                                              ? 'bg-cyan-500/25 ring-2 ring-inset ring-cyan-300/90'
                                              : isLightSquare
                                                ? board.isLeaf
                                                  ? 'bg-[#334155] hover:bg-[#3E4E66]'
                                                  : 'bg-[#243044] hover:bg-[#2E3C54]'
                                                : board.isLeaf
                                                  ? 'bg-[#1E293B] hover:bg-[#28354B]'
                                                  : 'bg-[#151D2B] hover:bg-[#1E293B]'
                              }
                            `}
                          >
                            {/* File & Rank micro coordinates on edges */}
                            {y === 0 && (
                              <span className="pointer-events-none absolute bottom-0 right-0.5 text-[8px] font-mono text-slate-400/70 leading-none">
                                {FILES[x]}
                              </span>
                            )}
                            {x === 0 && (
                              <span className="pointer-events-none absolute top-0.5 left-0.5 text-[8px] font-mono text-slate-400/70 leading-none">
                                {y + 1}
                              </span>
                            )}

                            {/* Same-Square Spacetime Slice Coordinate Badge */}
                            {isSliceAligned && !isSelected && (
                              <span className="pointer-events-none absolute bottom-0 left-0.5 text-[7px] font-mono font-bold text-cyan-200 leading-none">
                                {squareName}
                              </span>
                            )}

                            {/* Piece SVG */}
                            {piece && (
                              <ChessPieceSVG
                                type={piece.type}
                                color={piece.color}
                                className={
                                  state.boardSize <= 5
                                    ? 'w-7 h-7'
                                    : state.boardSize === 6
                                      ? 'w-6 h-6'
                                      : 'w-5 h-5'
                                }
                              />
                            )}

                            {/* Checkmate Killer / Doomed King / Radar Warning Micro Callouts */}
                            {Boolean(state.winner) && isKingThreatened && (
                              <span className="pointer-events-none absolute -top-1.5 inset-x-0 flex justify-center z-30">
                                <span className="px-1 py-0.2 rounded bg-red-600 text-white font-mono text-[7px] font-bold tracking-tighter shadow border border-red-200 leading-none whitespace-nowrap">
                                  被杀 · MATE
                                </span>
                              </span>
                            )}
                            {Boolean(state.winner) && isFatalAttacker && !isKingThreatened && (
                              <span className="pointer-events-none absolute -top-1.5 inset-x-0 flex justify-center z-30">
                                <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-mono text-[7px] font-bold tracking-tighter shadow border border-amber-200 leading-none whitespace-nowrap">
                                  凶手 · KILLER
                                </span>
                              </span>
                            )}
                            {!state.winner && isRadarWarnedKing && (
                              <span className="pointer-events-none absolute -top-1.5 inset-x-0 flex justify-center z-30">
                                <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-mono text-[7px] font-bold tracking-tighter shadow border border-amber-200 leading-none whitespace-nowrap">
                                  雷达预警 · RADAR
                                </span>
                              </span>
                            )}

                            {/* Legal Move Target Reticle / Portal Ring */}
                            {legalMove && !piece && (
                              <span
                                className={`pointer-events-none rounded-full ${
                                  isTemporalTarget
                                    ? 'w-3.5 h-3.5 bg-purple-300 ring-2 ring-amber-300 animate-pulse-subtle'
                                    : legalMove.isCastling || legalMove.isEnPassant
                                      ? 'w-3 h-3 bg-cyan-300 ring-2 ring-white'
                                      : 'w-2.5 h-2.5 bg-emerald-300/90'
                                }`}
                              />
                            )}

                            {/* Legal Capture Corner Reticle */}
                            {legalMove && piece && (
                              <span
                                className={`pointer-events-none absolute inset-0.5 border-2 rounded-sm ${
                                  isTemporalTarget
                                    ? 'border-purple-300'
                                    : 'border-emerald-300'
                                }`}
                              />
                            )}
                          </button>
                        );
                      });
                    })}
                  </div>
                </div>
              </div>
            );
          });
        })}

        {/* 6. SVG Overlay: Cross-Spacetime Time-Travel Arcs, Preview Rays, Radar Lines, and Check Threat Vectors */}
        <svg
          width={totalCanvasWidth}
          height={totalCanvasHeight}
          className="pointer-events-none absolute inset-0 overflow-visible z-20"
        >
          <defs>
            <marker
              id="arrow-timejump"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#C084FC" />
            </marker>
            <marker
              id="arrow-ghost"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#22D3EE" />
            </marker>
            <marker
              id="arrow-staged"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#FBBF24" />
            </marker>
            <marker
              id="arrow-threat"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
            </marker>
          </defs>

          {/* Past-King Danger Radar Alignment Lines (Amber dotted warning rays) */}
          {!state.winner &&
            radarWarnings.map((rw, idx) => {
              const p1 = getSquareCenterPx(rw.attackerCoord);
              const p2 = getSquareCenterPx(rw.kingCoord);
              if (!p1 || !p2) return null;
              return (
                <line
                  key={`radar_${idx}`}
                  x1={p1.cx}
                  y1={p1.cy}
                  x2={p2.cx}
                  y2={p2.cy}
                  stroke="#F59E0B"
                  strokeWidth="1.8"
                  strokeDasharray="3 6"
                  opacity="0.55"
                />
              );
            })}

          {/* Preview Rays for Currently Selected Piece's Time-Travel Targets */}
          {selectedCoord &&
            legalMovesForSelected
              .filter((m) => m.kind !== 'spatial')
              .map((m) => {
                const p1 = getSquareCenterPx(m.from);
                const p2 = getSquareCenterPx(m.to);
                if (!p1 || !p2) return null;
                const isHovered = hoveredMove?.id === m.id;
                const midX = (p1.cx + p2.cx) / 2;
                const midY = Math.min(p1.cy, p2.cy) - 55;
                return (
                  <path
                    key={`preview_${m.id}`}
                    d={`M ${p1.cx} ${p1.cy} Q ${midX} ${midY} ${p2.cx} ${p2.cy}`}
                    fill="none"
                    stroke={isHovered ? '#22D3EE' : '#C084FC'}
                    strokeWidth={isHovered ? '3.5' : '2.2'}
                    strokeDasharray="5 4"
                    opacity={isHovered ? '1' : '0.8'}
                    markerEnd={isHovered ? 'url(#arrow-ghost)' : 'url(#arrow-timejump)'}
                  />
                );
              })}

          {/* Ghost Branch Connector from Target Historical Board to Ghost New Timeline Board */}
          {ghostBoardBox && hoveredMove && (() => {
            const pTarget = getSquareCenterPx(hoveredMove.to);
            if (!pTarget) return null;
            const ghostCenterX = ghostBoardBox.left + boardWidth / 2;
            const ghostCenterY = ghostBoardBox.top + boardHeight / 2;
            return (
              <path
                d={`M ${pTarget.cx} ${pTarget.cy} C ${pTarget.cx} ${ghostCenterY}, ${(pTarget.cx + ghostCenterX) / 2} ${ghostCenterY}, ${ghostBoardBox.left} ${ghostCenterY}`}
                fill="none"
                stroke="#22D3EE"
                strokeWidth="3"
                strokeDasharray="6 4"
                markerEnd="url(#arrow-ghost)"
              />
            );
          })()}

          {/* Executed & Staged Time-Travel Vectors */}
          {visibleTimeMoves.map(({ move, isStaged }) => {
            const p1 = getSquareCenterPx(move.from);
            const p2 = getSquareCenterPx(move.to);
            if (!p1 || !p2) return null;
            const isSameBoard = move.from.l === move.to.l && move.from.t === move.to.t;
            if (isSameBoard) {
              return (
                <line
                  key={`vec_${move.id}`}
                  x1={p1.cx}
                  y1={p1.cy}
                  x2={p2.cx}
                  y2={p2.cy}
                  stroke={isStaged ? '#FBBF24' : '#38BDF8'}
                  strokeWidth="2.5"
                  markerEnd="url(#arrow-staged)"
                />
              );
            }
            const midX = (p1.cx + p2.cx) / 2;
            const curveOffset = move.from.l === move.to.l ? -75 : -40;
            const midY = (p1.cy + p2.cy) / 2 + curveOffset;
            return (
              <g key={`vec_${move.id}`}>
                <path
                  d={`M ${p1.cx} ${p1.cy} Q ${midX} ${midY} ${p2.cx} ${p2.cy}`}
                  fill="none"
                  stroke={isStaged ? '#FBBF24' : '#A855F7'}
                  strokeWidth={isStaged ? '3' : '2.2'}
                  markerEnd={isStaged ? 'url(#arrow-staged)' : 'url(#arrow-timejump)'}
                />
                <circle cx={p1.cx} cy={p1.cy} r="4" fill="#F59E0B" />
              </g>
            );
          })}

          {/* Active & Fatal Spacetime Check Threat Vectors */}
          {allVisibleThreats.map((th, idx) => {
            const p1 = getSquareCenterPx(th.from);
            const p2 = getSquareCenterPx(th.to);
            if (!p1 || !p2) return null;
            const midX = (p1.cx + p2.cx) / 2;
            const midY = (p1.cy + p2.cy) / 2;
            return (
              <g key={`threat_${idx}`}>
                <line
                  x1={p1.cx}
                  y1={p1.cy}
                  x2={p2.cx}
                  y2={p2.cy}
                  stroke="#EF4444"
                  strokeWidth={state.winner ? '8' : '5'}
                  opacity="0.28"
                  strokeLinecap="round"
                />
                <line
                  x1={p1.cx}
                  y1={p1.cy}
                  x2={p2.cx}
                  y2={p2.cy}
                  stroke="#F87171"
                  strokeWidth={state.winner ? '3.5' : '3'}
                  strokeDasharray="7 4"
                  markerEnd="url(#arrow-threat)"
                />
                <circle
                  cx={p1.cx}
                  cy={p1.cy}
                  r="6"
                  fill="#F59E0B"
                  stroke="#FEF3C7"
                  strokeWidth="1.5"
                />
                <circle
                  cx={p2.cx}
                  cy={p2.cy}
                  r="7"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2.5"
                />
                {Boolean(state.winner) && idx === 0 && (
                  <g transform={`translate(${midX}, ${midY - 12})`}>
                    <rect
                      x="-64"
                      y="-11"
                      width="128"
                      height="20"
                      rx="6"
                      fill="#7F1D1D"
                      stroke="#F87171"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#FEE2E2"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {th.isCrossTimeline ? '跨时空绝杀线 · FATAL' : '空间绝杀线 · MATE'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Camera Controls (Bottom-Left above HUD dock) */}
      <div className="pointer-events-auto absolute bottom-20 left-4 z-30 flex items-center gap-1.5 bg-slate-900/95 border border-slate-800 rounded-lg p-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
          aria-label="Zoom Out Multiverse"
          className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
        >
          -
        </button>
        <span className="px-2 text-xs font-mono text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.15).toFixed(2))))}
          aria-label="Zoom In Multiverse"
          className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
        >
          +
        </button>
        <div className="w-px h-4 bg-slate-800 mx-0.5" />
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            const el = containerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const l0RowIdx = Math.max(0, sortedRowsDesc.indexOf(0));
            const targetX = state.presentStep * colPitch + boardWidth / 2;
            const targetY = l0RowIdx * rowPitch + boardHeight / 2;
            setPan({
              x: Math.round(rect.width * 0.45 - targetX),
              y: Math.round(rect.height * 0.44 - targetY),
            });
          }}
          className="px-2.5 py-1 text-xs font-mono text-amber-300 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap"
        >
          {i18nT('centerOnPresent')}
        </button>
        <div className="w-px h-4 bg-slate-800 mx-0.5" />
        <button
          type="button"
          onClick={() => {
            const el = containerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const worldW = (maxStep + 1) * colPitch + 180;
            const worldH = sortedRowsDesc.length * rowPitch + 160;
            const fitZ = Math.min(
              1.15,
              Math.max(0.55, Number(Math.min((rect.width - 120) / worldW, (rect.height - 160) / worldH).toFixed(2)))
            );
            setZoom(fitZ);
            const midX = ((maxStep + 1) * colPitch - colGap) / 2;
            const midY = (sortedRowsDesc.length * rowPitch - rowGap) / 2;
            setPan({
              x: Math.round(rect.width * 0.5 - midX * fitZ),
              y: Math.round(rect.height * 0.48 - midY * fitZ),
            });
          }}
          className="px-2.5 py-1 text-xs font-mono text-purple-300 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap"
          title="缩放以总览全部平行时间线 · Fit entire multiverse in view"
        >
          全景 · Fit All
        </button>
        {allVisibleThreats.length > 0 && (
          <>
            <div className="w-px h-4 bg-slate-800 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const th = allVisibleThreats[0];
                const p1 = getSquareCenterPx(th.from);
                const p2 = getSquareCenterPx(th.to);
                if (!p1 || !p2) return;
                const midX = (p1.cx + p2.cx) / 2;
                const midY = (p1.cy + p2.cy) / 2;
                setPan({
                  x: Math.round(rect.width * 0.5 - midX * zoom),
                  y: Math.round(rect.height * 0.52 - midY * zoom),
                });
              }}
              className="px-2.5 py-1 text-xs font-mono font-bold text-red-300 bg-red-950/80 hover:bg-red-900 border border-red-500/60 rounded cursor-pointer whitespace-nowrap"
            >
              定位绝杀 · Focus Threat
            </button>
          </>
        )}
      </div>
    </div>
  );
};
