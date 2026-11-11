/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AIPersona,
  Coord5D,
  Move5D,
  MultiverseState,
  OpponentMode,
  PieceType,
  PromotionRule,
  TimelineActivationDelta,
  VariantId,
} from './game/types';
import {
  applyStagedMovePure,
  canSubmitCurrentTurn,
  computeAITurn,
  createInitialMultiverse,
  findActiveAndImpendingThreats,
  findPastKingRadarWarnings,
  getBoard,
  getLegalMovesForSquare,
  rewindToTurnIndex,
  setRulesConfigPure,
  submitTurnPure,
  undoLastStagedMove,
  undoLastTurn,
  undoStagedMovesBackToBoard,
  withPromotedPiece,
} from './game/engine';
import { soundFX } from './game/sound';
import { TitleScreen } from './components/TitleScreen';
import { MultiverseViewport } from './components/MultiverseViewport';
import { GameHUD } from './components/GameHUD';

type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const initialAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const [selectedVariant, setSelectedVariant] = useState<VariantId>('tactical_5x5');
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ai');
  const [aiPersona, setAiPersona] = useState<AIPersona>('tactician');
  const [promotionRule, setPromotionRule] = useState<PromotionRule>('choose_piece');
  const [timelineActivationDelta, setTimelineActivationDelta] =
    useState<TimelineActivationDelta>(2);
  const [gameState, setGameState] = useState<ShellState>(
    initialAutostart ? 'playing' : 'title'
  );
  const [multiverse, setMultiverse] = useState<MultiverseState>(() =>
    createInitialMultiverse('tactical_5x5', 'ai', 'tactician', 'choose_piece', 2)
  );
  const [selectedCoord, setSelectedCoord] = useState<Coord5D | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<Coord5D | null>(null);
  const [hoveredMove, setHoveredMove] = useState<Move5D | null>(null);
  const [pendingPromotionMove, setPendingPromotionMove] = useState<Move5D | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAllHistoryVectors, setShowAllHistoryVectors] = useState<boolean>(true);
  const [sliceHighlightEnabled, setSliceHighlightEnabled] = useState<boolean>(false);
  const [showMoveLogDrawer, setShowMoveLogDrawer] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [focusPresentSignal, setFocusPresentSignal] = useState<number>(1);
  const [focusBoardTarget, setFocusBoardTarget] = useState<{
    l: number;
    t: number;
    seq: number;
  } | null>(null);

  const aiTimerRef = useRef<number | null>(null);

  // Sync gameState to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Detect winner transition -> 'gameover'
  useEffect(() => {
    if (multiverse.winner && gameState === 'playing') {
      soundFX.playVictory();
      setGameState('gameover');
    }
  }, [multiverse.winner, gameState]);

  // Compute legal moves for currently selected coordinate
  const legalMovesForSelected = useMemo(() => {
    if (!selectedCoord || aiThinking || multiverse.winner) return [];
    return getLegalMovesForSquare(multiverse, selectedCoord);
  }, [multiverse, selectedCoord, aiThinking]);

  const selectedPiece = useMemo(() => {
    if (!selectedCoord) return null;
    const board = getBoard(multiverse, selectedCoord.l, selectedCoord.t);
    return board?.squares[selectedCoord.y]?.[selectedCoord.x] ?? null;
  }, [multiverse, selectedCoord]);

  // Compute active and impending spacetime threats on either player's Kings
  const activeThreats = useMemo(() => {
    const wThreats = findActiveAndImpendingThreats(multiverse, 'w');
    const bThreats = findActiveAndImpendingThreats(multiverse, 'b');
    return [...wThreats, ...bThreats];
  }, [multiverse]);

  // Compute Past-King Danger Radar warnings
  const radarWarnings = useMemo(() => {
    const wRadar = findPastKingRadarWarnings(multiverse, 'w');
    const bRadar = findPastKingRadarWarnings(multiverse, 'b');
    return [...wRadar, ...bRadar];
  }, [multiverse]);

  // Trigger AI Chronomancer when it is Black's turn in 'ai' mode
  useEffect(() => {
    if (
      gameState === 'playing' &&
      multiverse.opponentMode === 'ai' &&
      multiverse.turnColor === 'b' &&
      !multiverse.winner
    ) {
      setAiThinking(true);
      aiTimerRef.current = window.setTimeout(() => {
        setMultiverse((prev) => {
          if (prev.turnColor !== 'b' || prev.winner) return prev;
          const afterAI = computeAITurn(prev);
          if (afterAI.timeJumpsCount > prev.timeJumpsCount) {
            soundFX.playTimeJump();
          } else {
            soundFX.playSpatialMove(false);
          }
          return afterAI;
        });
        setAiThinking(false);
      }, 420);

      return () => {
        if (aiTimerRef.current) {
          clearTimeout(aiTimerRef.current);
          aiTimerRef.current = null;
        }
      };
    } else {
      setAiThinking(false);
    }
  }, [gameState, multiverse.opponentMode, multiverse.turnColor, multiverse.winner]);

  const handleStartGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const fresh = createInitialMultiverse(
      selectedVariant,
      opponentMode,
      aiPersona,
      promotionRule,
      timelineActivationDelta
    );
    setMultiverse(fresh);
    setSelectedCoord(null);
    setHoveredCoord(null);
    setHoveredMove(null);
    setPendingPromotionMove(null);
    setShowGuideModal(false);
    setAiThinking(false);
    document.body.dataset.state = 'playing';
    setGameState('playing');
    setFocusPresentSignal((s) => s + 1);
    soundFX.playSubmitTurn();
  }, [
    selectedVariant,
    opponentMode,
    aiPersona,
    promotionRule,
    timelineActivationDelta,
  ]);

  const handleRestartMatch = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const fresh = createInitialMultiverse(
      multiverse.variant,
      multiverse.opponentMode,
      multiverse.aiPersona,
      multiverse.promotionRule,
      multiverse.timelineActivationDelta
    );
    setMultiverse(fresh);
    setSelectedCoord(null);
    setHoveredCoord(null);
    setHoveredMove(null);
    setPendingPromotionMove(null);
    setShowGuideModal(false);
    setAiThinking(false);
    document.body.dataset.state = 'playing';
    setGameState('playing');
    setFocusPresentSignal((s) => s + 1);
    soundFX.playSelect();
  }, [
    multiverse.variant,
    multiverse.opponentMode,
    multiverse.aiPersona,
    multiverse.promotionRule,
    multiverse.timelineActivationDelta,
  ]);

  const handleChangeVariantInHUD = useCallback(
    (newVariant: VariantId) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      setSelectedVariant(newVariant);
      const fresh = createInitialMultiverse(
        newVariant,
        multiverse.opponentMode,
        multiverse.aiPersona,
        multiverse.promotionRule,
        multiverse.timelineActivationDelta
      );
      setMultiverse(fresh);
      setSelectedCoord(null);
      setHoveredCoord(null);
      setHoveredMove(null);
      setPendingPromotionMove(null);
      setAiThinking(false);
      document.body.dataset.state = 'playing';
      setGameState('playing');
      setFocusPresentSignal((s) => s + 1);
      soundFX.playSelect();
    },
    [
      multiverse.opponentMode,
      multiverse.aiPersona,
      multiverse.promotionRule,
      multiverse.timelineActivationDelta,
    ]
  );

  const handleChangeAiPersonaInHUD = useCallback((newPersona: AIPersona) => {
    setAiPersona(newPersona);
    setMultiverse((prev) => ({
      ...prev,
      aiPersona: newPersona,
    }));
    soundFX.playSelect();
  }, []);

  const handleChangePromotionRuleInHUD = useCallback((newRule: PromotionRule) => {
    setPromotionRule(newRule);
    setMultiverse((prev) =>
      setRulesConfigPure(prev, newRule, prev.timelineActivationDelta)
    );
    soundFX.playSelect();
  }, []);

  const handleChangeTimelineActivationDeltaInHUD = useCallback(
    (newDelta: TimelineActivationDelta) => {
      setTimelineActivationDelta(newDelta);
      setMultiverse((prev) =>
        setRulesConfigPure(prev, prev.promotionRule, newDelta)
      );
      soundFX.playSelect();
    },
    []
  );

  const commitMoveNow = useCallback((move: Move5D) => {
    setMultiverse((prev) => {
      // Never allow the human to move Black's pieces in AI (vs. Chronomancer) mode,
      // even if a stale selection or a stalled AI turn left turnColor === 'b'.
      if (prev.opponentMode === 'ai' && prev.turnColor === 'b') return prev;
      const next = applyStagedMovePure(prev, move);
      if (move.kind !== 'spatial') {
        soundFX.playTimeJump();
      } else {
        soundFX.playSpatialMove(Boolean(move.captured));
      }
      return next;
    });
    setSelectedCoord(null);
    setHoveredMove(null);
    setPendingPromotionMove(null);
  }, []);

  const handleExecuteMove = useCallback(
    (move: Move5D) => {
      if (move.promotedTo !== undefined && multiverse.promotionRule === 'choose_piece') {
        soundFX.playSelect();
        setPendingPromotionMove(move);
        setHoveredMove(null);
        return;
      }
      commitMoveNow(move);
    },
    [multiverse.promotionRule, commitMoveNow]
  );

  const handleConfirmPromotion = useCallback(
    (pieceType: PieceType) => {
      if (!pendingPromotionMove) return;
      const updatedMove = withPromotedPiece(pendingPromotionMove, pieceType);
      commitMoveNow(updatedMove);
    },
    [pendingPromotionMove, commitMoveNow]
  );

  const handleCancelPromotion = useCallback(() => {
    setPendingPromotionMove(null);
    soundFX.playSelect();
  }, []);

  const handleHoverSquare = useCallback(
    (coord: Coord5D | null, matchingMove: Move5D | null) => {
      setHoveredCoord(coord);
      setHoveredMove(matchingMove);
    },
    []
  );

  const handleSquareClick = useCallback(
    (coord: Coord5D) => {
      if (aiThinking || gameState === 'paused' || gameState === 'title') return;
      // In AI (vs. Chronomancer) mode the human controls White only. Even if the AI
      // stalls or aiThinking has not flipped, the human must NEVER select or move
      // Black's pieces.
      if (multiverse.opponentMode === 'ai' && multiverse.turnColor === 'b') return;

      const clickedBoard = getBoard(multiverse, coord.l, coord.t);

      // If match has ended (Checkmate / Stalemate), allow inspecting any piece on any board
      if (multiverse.winner || gameState === 'gameover') {
        const piece = clickedBoard?.squares[coord.y]?.[coord.x];
        if (piece) {
          soundFX.playSelect();
          setSelectedCoord(coord);
        } else {
          setSelectedCoord(null);
        }
        return;
      }

      // 1. Check if clicking a legal move destination for the currently selected piece
      if (selectedCoord) {
        const matchingMove = legalMovesForSelected.find(
          (m) =>
            m.to.l === coord.l &&
            m.to.t === coord.t &&
            m.to.x === coord.x &&
            m.to.y === coord.y
        );
        if (matchingMove) {
          handleExecuteMove(matchingMove);
          return;
        }
      }

      // 2. Check if clicking a friendly piece on a playable leaf board
      if (
        clickedBoard &&
        clickedBoard.isLeaf &&
        clickedBoard.activeColor === multiverse.turnColor
      ) {
        const piece = clickedBoard.squares[coord.y]?.[coord.x];
        if (piece && piece.color === multiverse.turnColor) {
          if (
            selectedCoord &&
            selectedCoord.l === coord.l &&
            selectedCoord.t === coord.t &&
            selectedCoord.x === coord.x &&
            selectedCoord.y === coord.y
          ) {
            setSelectedCoord(null);
          } else {
            soundFX.playSelect();
            setSelectedCoord(coord);
          }
          return;
        }
      }

      // 3. If clicking a board that was already moved on during this uncommitted turn,
      // roll back that staged move and select the friendly piece so the user can revise their move directly!
      if (multiverse.stagedMoves.length > 0 && clickedBoard) {
        const stagedOriginMove = multiverse.stagedMoves.find(
          (m) => m.from.l === coord.l && m.from.t === coord.t
        );
        if (stagedOriginMove) {
          const rolledBack = undoStagedMovesBackToBoard(multiverse, coord.l, coord.t);
          const restoredBoard = getBoard(rolledBack, coord.l, coord.t);
          const restoredPiece = restoredBoard?.squares[coord.y]?.[coord.x];
          setMultiverse(rolledBack);
          if (restoredPiece && restoredPiece.color === rolledBack.turnColor) {
            soundFX.playSelect();
            setSelectedCoord(coord);
          } else {
            setSelectedCoord(null);
          }
          return;
        }

        const stagedSpawnMove = multiverse.stagedMoves.find(
          (m) =>
            (m.resultingSourceBoard.l === coord.l &&
              m.resultingSourceBoard.t === coord.t) ||
            (m.resultingTargetBoard &&
              m.resultingTargetBoard.l === coord.l &&
              m.resultingTargetBoard.t === coord.t)
        );
        if (stagedSpawnMove) {
          const pieceOnSpawn = clickedBoard.squares[coord.y]?.[coord.x];
          if (pieceOnSpawn && pieceOnSpawn.color === multiverse.turnColor) {
            const rolledBack = undoStagedMovesBackToBoard(
              multiverse,
              stagedSpawnMove.from.l,
              stagedSpawnMove.from.t
            );
            const originBoard = getBoard(
              rolledBack,
              stagedSpawnMove.from.l,
              stagedSpawnMove.from.t
            );
            const targetSquare =
              originBoard?.squares[coord.y]?.[coord.x]?.color === rolledBack.turnColor
                ? { l: stagedSpawnMove.from.l, t: stagedSpawnMove.from.t, x: coord.x, y: coord.y }
                : stagedSpawnMove.from;
            setMultiverse(rolledBack);
            soundFX.playSelect();
            setSelectedCoord(targetSquare);
            return;
          }
        }
      }

      setSelectedCoord(null);
    },
    [
      gameState,
      aiThinking,
      multiverse,
      selectedCoord,
      legalMovesForSelected,
      handleExecuteMove,
    ]
  );

  const handleUndoStaged = useCallback(() => {
    if (aiThinking) return;
    setMultiverse((prev) => undoLastStagedMove(prev));
    setSelectedCoord(null);
    setHoveredMove(null);
    setPendingPromotionMove(null);
    soundFX.playSelect();
  }, [aiThinking]);

  const handleUndoLastTurn = useCallback(() => {
    if (aiThinking) return;
    setMultiverse((prev) => undoLastTurn(prev));
    setSelectedCoord(null);
    setHoveredMove(null);
    setPendingPromotionMove(null);
    document.body.dataset.state = 'playing';
    setGameState('playing');
    soundFX.playSelect();
  }, [aiThinking]);

  const handleRewindToTurn = useCallback(
    (turnIdx: number) => {
      if (aiThinking) return;
      setMultiverse((prev) => rewindToTurnIndex(prev, turnIdx));
      setSelectedCoord(null);
      setHoveredMove(null);
      setPendingPromotionMove(null);
      document.body.dataset.state = 'playing';
      setGameState('playing');
      soundFX.playSelect();
    },
    [aiThinking]
  );

  const handleFocusBoard = useCallback((l: number, t: number) => {
    setFocusBoardTarget((prev) => ({
      l,
      t,
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const handleSubmitTurn = useCallback(() => {
    if (aiThinking) return;
    setMultiverse((prev) => {
      // Never let the human submit Black's turn in AI (vs. Chronomancer) mode.
      if (prev.opponentMode === 'ai' && prev.turnColor === 'b') return prev;
      const check = canSubmitCurrentTurn(prev);
      if (!check.canSubmit) {
        soundFX.playCheckAlert();
        return prev;
      }
      soundFX.playSubmitTurn();
      return submitTurnPure(prev);
    });
    setSelectedCoord(null);
    setHoveredMove(null);
    setPendingPromotionMove(null);
  }, [aiThinking]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundFX.muted = next;
      return next;
    });
  }, []);

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'playing') return 'paused';
      if (prev === 'paused') return 'playing';
      return prev;
    });
  }, []);

  const handleReturnToTitle = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setAiThinking(false);
    setSelectedCoord(null);
    setHoveredMove(null);
    setPendingPromotionMove(null);
    setShowGuideModal(false);
    document.body.dataset.state = 'title';
    setGameState('title');
  }, []);

  // Global keyboard bindings during gameplay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (pendingPromotionMove) {
          setPendingPromotionMove(null);
        } else if (showGuideModal) {
          setShowGuideModal(false);
        } else if (showMoveLogDrawer) {
          setShowMoveLogDrawer(false);
        } else if (selectedCoord) {
          setSelectedCoord(null);
        } else if (gameState === 'playing' || gameState === 'paused') {
          handleTogglePause();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRestartMatch();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowGuideModal((v) => !v);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setSliceHighlightEnabled((v) => !v);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowMoveLogDrawer((v) => !v);
      } else if ((e.key === 'z' || e.key === 'Z') && gameState === 'playing') {
        e.preventDefault();
        handleUndoStaged();
      } else if ((e.key === ' ' || e.key === 'Enter') && gameState === 'playing') {
        e.preventDefault();
        handleSubmitTurn();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    pendingPromotionMove,
    showGuideModal,
    showMoveLogDrawer,
    selectedCoord,
    handleTogglePause,
    handleToggleMute,
    handleRestartMatch,
    handleUndoStaged,
    handleSubmitTurn,
  ]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B0F19] select-none">
      {gameState === 'title' && (
        <TitleScreen
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
          opponentMode={opponentMode}
          onSelectOpponentMode={setOpponentMode}
          aiPersona={aiPersona}
          onSelectAiPersona={setAiPersona}
          promotionRule={promotionRule}
          onSelectPromotionRule={setPromotionRule}
          timelineActivationDelta={timelineActivationDelta}
          onSelectTimelineActivationDelta={setTimelineActivationDelta}
          onStartGame={handleStartGame}
        />
      )}

      {gameState !== 'title' && (
        <>
          <MultiverseViewport
            state={multiverse}
            selectedCoord={selectedCoord}
            legalMovesForSelected={legalMovesForSelected}
            threats={activeThreats}
            radarWarnings={radarWarnings}
            showAllHistoryVectors={showAllHistoryVectors}
            sliceHighlightEnabled={sliceHighlightEnabled}
            hoveredCoord={hoveredCoord}
            hoveredMove={hoveredMove}
            onHoverSquare={handleHoverSquare}
            onSquareClick={handleSquareClick}
            onSubmitTurn={handleSubmitTurn}
            onUndoStaged={handleUndoStaged}
            focusPresentSignal={focusPresentSignal}
            focusBoardTarget={focusBoardTarget}
          />

          <GameHUD
            state={multiverse}
            gameState={gameState}
            selectedCoord={selectedCoord}
            selectedPiece={selectedPiece}
            legalMovesForSelected={legalMovesForSelected}
            threats={activeThreats}
            radarWarnings={radarWarnings}
            pendingPromotionMove={pendingPromotionMove}
            isMuted={isMuted}
            showAllHistoryVectors={showAllHistoryVectors}
            sliceHighlightEnabled={sliceHighlightEnabled}
            showMoveLogDrawer={showMoveLogDrawer}
            showGuideModal={showGuideModal}
            aiThinking={aiThinking}
            onToggleMute={handleToggleMute}
            onTogglePause={handleTogglePause}
            onRestart={handleRestartMatch}
            onReturnToTitle={handleReturnToTitle}
            onUndoStaged={handleUndoStaged}
            onSubmitTurn={handleSubmitTurn}
            onToggleHistoryVectors={() => setShowAllHistoryVectors((v) => !v)}
            onToggleSliceHighlight={() => setSliceHighlightEnabled((v) => !v)}
            onToggleMoveLogDrawer={() => setShowMoveLogDrawer((v) => !v)}
            onToggleGuideModal={() => setShowGuideModal((v) => !v)}
            onChangeVariant={handleChangeVariantInHUD}
            onChangeAiPersona={handleChangeAiPersonaInHUD}
            onChangePromotionRule={handleChangePromotionRuleInHUD}
            onChangeTimelineActivationDelta={handleChangeTimelineActivationDeltaInHUD}
            onConfirmPromotion={handleConfirmPromotion}
            onCancelPromotion={handleCancelPromotion}
            onExecuteMoveDirect={handleExecuteMove}
            onHoverMove={setHoveredMove}
            onUndoLastTurn={handleUndoLastTurn}
            onRewindToTurn={handleRewindToTurn}
            onFocusBoard={handleFocusBoard}
          />
        </>
      )}
    </main>
  );
}
