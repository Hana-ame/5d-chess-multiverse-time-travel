import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardState,
  Coord5D,
  Move5D,
  MultiverseState,
  ThreatVector,
} from '../game/types';
import {
  canSubmitCurrentTurn,
  formatSquare,
  formatTimelineLabel,
  formatTurnStep,
  getActiveTimelines,
  getBoardPlayableStatus,
} from '../game/engine';
import { ChessPieceSVG } from './ChessPieceSVG';
import { useI18n } from '../i18n';

interface MultiverseViewportProps {
  state: MultiverseState;
  selectedCoord: Coord5D | null;
  legalMovesForSelected: Move5D[];
  threats: ThreatVector[];
  showAllHistoryVectors: boolean;
  onSquareClick: (coord: Coord5D) => void;
  onSubmitTurn: () => void;
  onUndoStaged: () => void;
  focusPresentSignal: number;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const MultiverseViewport: React.FC<MultiverseViewportProps> = ({
  state,
  selectedCoord,
  legalMovesForSelected,
  threats,
  showAllHistoryVectors,
  onSquareClick,
  onSubmitTurn,
  onUndoStaged,
  focusPresentSignal,
}) => {
  const { t, tf } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 90 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

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

  const activeTimelines = useMemo(() => getActiveTimelines(state), [state]);
  const submitStatus = useMemo(() => canSubmitCurrentTurn(state), [state]);

  const posTimelineCount = useMemo(
    () => sortedRowsDesc.filter((l) => l > 0).length,
    [sortedRowsDesc]
  );
  const prevPosCountRef = useRef<number>(posTimelineCount);

  // Compensate pan.y when a new positive timeline (+L1, +L2...) is prepended above L0
  // so existing boards stay locked at their exact screen position.
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

  // Map a 5D coordinate (l, t, x, y) to exact pixel center in the canvas coordinate system
  const getSquareCenterPx = (coord: Coord5D): { cx: number; cy: number } | null => {
    const rowIdx = sortedRowsDesc.indexOf(coord.l);
    if (rowIdx === -1) return null;
    const boardLeft = coord.t * colPitch;
    const boardTop = rowIdx * rowPitch;
    // Note: rank y=boardSize-1 is rendered at the top of the board, y=0 at the bottom
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

  // Fast lookup map for squares with threatened Kings
  const threatenedSquaresSet = useMemo(() => {
    const set = new Set<string>();
    for (const th of threats) {
      set.add(`${th.to.l}_${th.to.t}_${th.to.x}_${th.to.y}`);
    }
    return set;
  }, [threats]);

  // Pointer pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only initiate pan if not clicking a square button or control button
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

  // Collect historical & staged time-travel moves for vector rendering
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
              {t('present').toUpperCase()} · {formatTurnStep(state.presentStep)}
            </span>
            {submitStatus.canSubmit && (
              <button
                type="button"
                onClick={onSubmitTurn}
                className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[10px] font-bold tracking-wide shadow cursor-pointer"
              >
                {t('submitTurn')} ↵
              </button>
            )}
          </div>
        </div>

        {/* 2. Turn Step Column Headers along the top */}
        {Array.from({ length: maxStep + 1 }, (_, stepT) => {
          const isPresent = stepT === state.presentStep;
          const turnNum = Math.floor(stepT / 2) + 1;
          const isWhiteCol = stepT % 2 === 0;
          return (
            <div
              key={`col_hdr_${stepT}`}
              style={{
                left: `${stepT * colPitch}px`,
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
                {t('turnLabel')} {turnNum}
              </span>
              <span
                className={`text-[11px] font-semibold px-1.5 py-0.2 rounded ${
                  isWhiteCol
                    ? 'bg-slate-100 text-slate-950'
                    : 'bg-slate-950 text-sky-300 border border-sky-500/40'
                }`}
              >
                {isWhiteCol ? t('white') + ' (W)' : t('black') + ' (B)'}
              </span>
            </div>
          );
        })}

        {/* 3. Timeline Row Labels on the left (Purple for Active, Creator Color for Inactive per 5D Chess rules) */}
        {sortedRowsDesc.map((l, rowIdx) => {
          const tl = state.timelines[l];
          const isActive = activeTimelines.has(l);
          const firstBoardT = tl?.boards[0]?.t ?? 0;
          const creatorLabel =
            tl?.createdBy === 'w'
              ? t('timeline_white_inactive')
              : tl?.createdBy === 'b'
                ? t('timeline_black_inactive')
                : t('timeline_inactive');
          return (
            <div
              key={`row_hdr_${l}`}
              style={{
                left: `${firstBoardT * colPitch - 122}px`,
                top: `${rowIdx * rowPitch + boardHeight / 2 - 26}px`,
                width: '108px',
              }}
              className={`pointer-events-none absolute px-3 py-2 rounded-lg border text-right font-mono transition-colors ${
                isActive
                  ? 'bg-[#1E1B4B]/95 border-purple-500/70 text-slate-100 shadow-[0_0_14px_rgba(168,85,247,0.2)]'
                  : tl?.createdBy === 'w'
                    ? 'bg-slate-800/85 border-slate-300/60 text-slate-200'
                    : 'bg-slate-950/85 border-sky-500/45 text-sky-300'
              }`}
            >
              <div className="text-sm font-bold tracking-tight">
                {formatTimelineLabel(l)}
              </div>
              <div
                className={`text-[10px] ${
                  isActive ? 'text-purple-300 font-semibold' : 'text-slate-400'
                }`}
              >
                {isActive ? t('timeline_active') : creatorLabel}
              </div>
            </div>
          );
        })}

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
                {/* Sequential horizontal board connectors */}
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

                {/* Branch origin connector from parent timeline */}
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

            // Check if this board has any legal target squares for the currently selected piece
            const hasLegalTargetsOnBoard = legalMovesForSelected.some(
              (m) => m.to.l === board.l && m.to.t === board.t
            );

            // Authentic 5D Chess Board Outlines:
            // - Playable boards (board.isLeaf === true) have a THICK border (border-[3px]).
            // - Unplayable / History boards (board.isLeaf === false) have a THIN border (border).
            // - White boards (activeColor === 'w') vs Black boards (activeColor === 'b') have distinct frame colors.
            let cardFrameClass = '';
            if (pStatus.isMandatoryPresent) {
              cardFrameClass = isWhiteBoard
                ? 'bg-slate-800 border-[3px] border-amber-400 ring-2 ring-white/80 shadow-[0_0_26px_rgba(245,158,11,0.32)]'
                : 'bg-slate-950 border-[3px] border-amber-400 ring-2 ring-sky-400/70 shadow-[0_0_26px_rgba(245,158,11,0.32)]';
            } else if (pStatus.isOptionalPlayable) {
              cardFrameClass = pStatus.isTimelineActive
                ? 'bg-slate-900 border-[3px] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'bg-slate-900 border-[3px] border-purple-400/90 shadow-[0_0_18px_rgba(168,85,247,0.22)]';
            } else if (hasLegalTargetsOnBoard) {
              cardFrameClass =
                'bg-slate-900/95 border-[3px] border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.35)]';
            } else if (pStatus.isStagedResultThisTurn) {
              cardFrameClass = isWhiteBoard
                ? 'bg-slate-900 border-[3px] border-slate-200 shadow-[0_0_18px_rgba(226,232,240,0.22)]'
                : 'bg-slate-950 border-[3px] border-sky-400/85 shadow-[0_0_18px_rgba(56,189,248,0.22)]';
            } else if (pStatus.isPlayableBoard) {
              // Playable leaf board belonging to the other color's turn (Thick White or Black border)
              cardFrameClass = isWhiteBoard
                ? 'bg-slate-900/95 border-[3px] border-slate-200/90 shadow-md'
                : 'bg-slate-950/95 border-[3px] border-sky-500/75 shadow-md';
            } else if (pStatus.isStagedOriginThisTurn) {
              // Origin board of a staged move this turn (can click to revise)
              cardFrameClass =
                'bg-slate-900/90 border-2 border-dashed border-amber-400/70 opacity-95';
            } else {
              // Unplayable History Board (Thin White-tinted or Black-tinted border)
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
                {/* Board Header Bar — Distinct Light Header Pill for White Boards, Dark Pill for Black Boards */}
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
                    {hasLegalTargetsOnBoard && !pStatus.isCurrentPlayerTurnOnBoard ? (
                      <span className="text-[9px] font-bold text-purple-300 tracking-tight">
                        {t('badge_time_target')}
                      </span>
                    ) : pStatus.isMandatoryPresent ? (
                      <span className="text-[9px] font-bold text-amber-300 tracking-tight">
                        {t('badge_playable_present')}
                      </span>
                    ) : pStatus.isOptionalPlayable ? (
                      <span
                        className={`text-[9px] font-bold tracking-tight ${
                          pStatus.isTimelineActive ? 'text-emerald-300' : 'text-purple-300'
                        }`}
                      >
                        {t(pStatus.statusLabel as any)}
                      </span>
                    ) : pStatus.isStagedResultThisTurn ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-sky-300">
                          {t('badge_staged')}
                        </span>
                        <button
                          type="button"
                          onClick={onUndoStaged}
                          className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[9px] font-bold cursor-pointer"
                          title={t('undoStagedMoveTitle')}
                        >
                          {t('undo')}
                        </button>
                      </div>
                    ) : pStatus.isStagedOriginThisTurn ? (
                      <span className="text-[9px] font-semibold text-amber-300/90">
                        {t('badge_moved_revise')}
                      </span>
                    ) : pStatus.isPlayableBoard ? (
                      <span className="text-[9px] font-semibold text-slate-300">
                        {t(pStatus.statusLabel as any)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">
                        {t('badge_history')}
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

                        // Accessible label for browser snapshot & screen readers
                        const squareName = formatSquare(x, y);
                        const pieceDesc = piece
                          ? `${piece.color === 'w' ? t('white') : t('black')} ${t(('piece_' + piece.type) as any)}`
                          : t('emptySquare');
                        const targetDesc = legalMove
                          ? legalMove.kind === 'spatial'
                            ? t('legalSpatialMove')
                            : t('legalTimeTravelTarget')
                          : '';

                        return (
                          <button
                            key={sqKey}
                            type="button"
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
                                    ? 'bg-red-600/75 animate-pulse'
                                    : isTemporalTarget
                                      ? 'bg-purple-600/45 hover:bg-purple-500/65'
                                      : legalMove
                                        ? 'bg-emerald-500/35 hover:bg-emerald-500/55'
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

                            {/* Legal Move Target Reticle / Portal Ring */}
                            {legalMove && !piece && (
                              <span
                                className={`pointer-events-none rounded-full ${
                                  isTemporalTarget
                                    ? 'w-3.5 h-3.5 bg-purple-300 ring-2 ring-amber-300 animate-pulse-subtle'
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

        {/* 6. SVG Overlay: Cross-Spacetime Time-Travel Arcs, Preview Rays, and Check Threat Vectors */}
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

          {/* Preview Rays for Currently Selected Piece's Time-Travel Targets */}
          {selectedCoord &&
            legalMovesForSelected
              .filter((m) => m.kind !== 'spatial')
              .map((m) => {
                const p1 = getSquareCenterPx(m.from);
                const p2 = getSquareCenterPx(m.to);
                if (!p1 || !p2) return null;
                const midX = (p1.cx + p2.cx) / 2;
                const midY = Math.min(p1.cy, p2.cy) - 55;
                return (
                  <path
                    key={`preview_${m.id}`}
                    d={`M ${p1.cx} ${p1.cy} Q ${midX} ${midY} ${p2.cx} ${p2.cy}`}
                    fill="none"
                    stroke="#C084FC"
                    strokeWidth="2.2"
                    strokeDasharray="5 4"
                    opacity="0.85"
                    markerEnd="url(#arrow-timejump)"
                  />
                );
              })}

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

          {/* Active Spacetime Check Threat Vectors */}
          {threats.map((th, idx) => {
            const p1 = getSquareCenterPx(th.from);
            const p2 = getSquareCenterPx(th.to);
            if (!p1 || !p2) return null;
            return (
              <line
                key={`threat_${idx}`}
                x1={p1.cx}
                y1={p1.cy}
                x2={p2.cx}
                y2={p2.cy}
                stroke="#EF4444"
                strokeWidth="3"
                strokeDasharray="6 3"
                markerEnd="url(#arrow-threat)"
              />
            );
          })}
        </svg>
      </div>

      {/* Floating Camera Controls (Bottom-Left above HUD dock) */}
      <div className="pointer-events-auto absolute bottom-20 left-4 z-30 flex items-center gap-1.5 bg-slate-900/95 border border-slate-800 rounded-lg p-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
          aria-label={t('zoomOut')}
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
          aria-label={t('zoomIn')}
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
          {t('centerOnPresent')}
        </button>
      </div>
    </div>
  );
};
