/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Coord5D,
  Move5D,
  MultiverseState,
  OpponentMode,
  VariantId,
} from './game/types';
import {
  applyStagedMovePure,
  canSubmitCurrentTurn,
  computeAITurn,
  createInitialMultiverse,
  findThreatsToColorKings,
  getBoard,
  getLegalMovesForSquare,
  submitTurnPure,
  undoLastStagedMove,
  undoStagedMovesBackToBoard,
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
  const [gameState, setGameState] = useState<ShellState>(
    initialAutostart ? 'playing' : 'title'
  );
  const [multiverse, setMultiverse] = useState<MultiverseState>(() =>
    createInitialMultiverse('tactical_5x5', 'ai')
  );
  const [selectedCoord, setSelectedCoord] = useState<Coord5D | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAllHistoryVectors, setShowAllHistoryVectors] = useState<boolean>(true);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [focusPresentSignal, setFocusPresentSignal] = useState<number>(1);

  const aiTimerRef = useRef<number | null>(null);

  // Sync gameState to document.body.dataset.state per game_title_and_hud.md
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

  // Compute active spacetime threats on either player's Kings
  const activeThreats = useMemo(() => {
    const wThreats = findThreatsToColorKings(multiverse, 'w');
    const bThreats = findThreatsToColorKings(multiverse, 'b');
    return [...wThreats, ...bThreats];
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
    const fresh = createInitialMultiverse(selectedVariant, opponentMode);
    setMultiverse(fresh);
    setSelectedCoord(null);
    setShowGuideModal(false);
    setAiThinking(false);
    document.body.dataset.state = 'playing';
    setGameState('playing');
    setFocusPresentSignal((s) => s + 1);
    soundFX.playSubmitTurn();
  }, [selectedVariant, opponentMode]);

  const handleRestartMatch = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const fresh = createInitialMultiverse(multiverse.variant, multiverse.opponentMode);
    setMultiverse(fresh);
    setSelectedCoord(null);
    setShowGuideModal(false);
    setAiThinking(false);
    document.body.dataset.state = 'playing';
    setGameState('playing');
    setFocusPresentSignal((s) => s + 1);
    soundFX.playSelect();
  }, [multiverse.variant, multiverse.opponentMode]);

  const handleChangeVariantInHUD = useCallback(
    (newVariant: VariantId) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      setSelectedVariant(newVariant);
      const fresh = createInitialMultiverse(newVariant, multiverse.opponentMode);
      setMultiverse(fresh);
      setSelectedCoord(null);
      setAiThinking(false);
      document.body.dataset.state = 'playing';
      setGameState('playing');
      setFocusPresentSignal((s) => s + 1);
      soundFX.playSelect();
    },
    [multiverse.opponentMode]
  );

  const handleExecuteMove = useCallback((move: Move5D) => {
    setMultiverse((prev) => {
      const next = applyStagedMovePure(prev, move);
      if (move.kind !== 'spatial') {
        soundFX.playTimeJump();
      } else {
        soundFX.playSpatialMove(Boolean(move.captured));
      }
      return next;
    });
    setSelectedCoord(null);
  }, []);

  const handleSquareClick = useCallback(
    (coord: Coord5D) => {
      if (gameState !== 'playing' || aiThinking || multiverse.winner) return;

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
      const clickedBoard = getBoard(multiverse, coord.l, coord.t);
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

      // 3. If clicking a board that was already moved on during this uncommitted turn
      // (either the origin board or the newly spawned staged preview board),
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
    soundFX.playSelect();
  }, [aiThinking]);

  const handleSubmitTurn = useCallback(() => {
    if (aiThinking) return;
    setMultiverse((prev) => {
      const check = canSubmitCurrentTurn(prev);
      if (!check.canSubmit) {
        soundFX.playCheckAlert();
        return prev;
      }
      soundFX.playSubmitTurn();
      return submitTurnPure(prev);
    });
    setSelectedCoord(null);
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
        if (showGuideModal) {
          setShowGuideModal(false);
        } else if (selectedCoord) {
          setSelectedCoord(null);
        } else {
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
    showGuideModal,
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
            showAllHistoryVectors={showAllHistoryVectors}
            onSquareClick={handleSquareClick}
            onSubmitTurn={handleSubmitTurn}
            onUndoStaged={handleUndoStaged}
            focusPresentSignal={focusPresentSignal}
          />

          <GameHUD
            state={multiverse}
            gameState={gameState}
            selectedCoord={selectedCoord}
            selectedPiece={selectedPiece}
            legalMovesForSelected={legalMovesForSelected}
            threats={activeThreats}
            isMuted={isMuted}
            showAllHistoryVectors={showAllHistoryVectors}
            showGuideModal={showGuideModal}
            aiThinking={aiThinking}
            onToggleMute={handleToggleMute}
            onTogglePause={handleTogglePause}
            onRestart={handleRestartMatch}
            onReturnToTitle={handleReturnToTitle}
            onUndoStaged={handleUndoStaged}
            onSubmitTurn={handleSubmitTurn}
            onToggleHistoryVectors={() => setShowAllHistoryVectors((v) => !v)}
            onToggleGuideModal={() => setShowGuideModal((v) => !v)}
            onChangeVariant={handleChangeVariantInHUD}
            onExecuteMoveDirect={handleExecuteMove}
          />
        </>
      )}
    </main>
  );
}
