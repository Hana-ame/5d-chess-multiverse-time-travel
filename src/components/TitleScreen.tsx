import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import {
  AIPersona,
  OpponentMode,
  PromotionRule,
  TimelineActivationDelta,
  VariantId,
} from '../game/types';
import { AI_PERSONA_CONFIGS, VARIANT_CONFIGS } from '../game/engine';
import { ChessPieceSVG } from './ChessPieceSVG';
import { LocaleSwitcher } from './LocaleSwitcher';

interface TitleScreenProps {
  selectedVariant: VariantId;
  onSelectVariant: (v: VariantId) => void;
  opponentMode: OpponentMode;
  onSelectOpponentMode: (m: OpponentMode) => void;
  aiPersona: AIPersona;
  onSelectAiPersona: (p: AIPersona) => void;
  promotionRule: PromotionRule;
  onSelectPromotionRule: (r: PromotionRule) => void;
  timelineActivationDelta: TimelineActivationDelta;
  onSelectTimelineActivationDelta: (d: TimelineActivationDelta) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedVariant,
  onSelectVariant,
  opponentMode,
  onSelectOpponentMode,
  aiPersona,
  onSelectAiPersona,
  promotionRule,
  onSelectPromotionRule,
  timelineActivationDelta,
  onSelectTimelineActivationDelta,
  onStartGame,
}) => {
  const { t, tf } = useI18n();
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          onStartGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 18;
    const ny = (e.clientY / window.innerHeight - 0.5) * 14;
    setParallax({ x: nx, y: ny });
  };

  const currentVariantObj =
    VARIANT_CONFIGS.find((v) => v.id === selectedVariant) ?? VARIANT_CONFIGS[0];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-40 bg-[#0B0F19] text-[#F1F5F9] flex flex-col justify-between overflow-y-auto overflow-x-hidden select-none"
    >
      {/* Interactive Multiverse Spacetime Diagram Stage (Background Centerpiece) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <svg
          viewBox="0 0 1440 900"
          className="w-full h-full opacity-35"
          style={{
            transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
            transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <defs>
            <linearGradient id="timeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="presentGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[180, 340, 500, 660, 820, 980, 1140, 1300].map((x) => (
            <line
              key={`v_${x}`}
              x1={x}
              y1={0}
              x2={x}
              y2={900}
              stroke="#1E293B"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
          ))}
          {[190, 450, 710].map((y) => (
            <line key={`h_${y}`} x1={0} y1={y} x2={1440} y2={y} stroke="#1E293B" strokeWidth="1.5" />
          ))}

          <rect x="910" y="0" width="140" height="900" fill="url(#presentGlow)" />
          <line x1="980" y1="0" x2="980" y2="900" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="6 6" />

          {[
            { x: 280, y: 390, label: 'L0 · T1W', border: '#475569' },
            { x: 480, y: 390, label: 'L0 · T1B', border: '#475569' },
            { x: 680, y: 390, label: 'L0 · T2W', border: '#475569' },
            { x: 920, y: 390, label: 'L0 · T2B', border: '#F59E0B' },
            { x: 680, y: 130, label: '+L1 · T1B', border: '#A855F7' },
            { x: 920, y: 130, label: '+L1 · T2W', border: '#F59E0B' },
            { x: 920, y: 650, label: '-L1 · T2B', border: '#38BDF8' },
          ].map((b, idx) => (
            <g key={idx} transform={`translate(${b.x}, ${b.y})`}>
              <rect
                width="120"
                height="120"
                rx="6"
                fill="#0F172A"
                stroke={b.border}
                strokeWidth="2"
              />
              {[0, 1, 2, 3].map((r) =>
                [0, 1, 2, 3].map((c) => (
                  <rect
                    key={`${r}_${c}`}
                    x={8 + c * 26}
                    y={8 + r * 26}
                    width="26"
                    height="26"
                    fill={(r + c) % 2 === 0 ? '#334155' : '#1E293B'}
                  />
                ))
              )}
              <text
                x="6"
                y="-8"
                fill="#94A3B8"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                {b.label}
              </text>
            </g>
          ))}

          <path
            d="M 740 435 C 620 310, 460 310, 340 435"
            fill="none"
            stroke="url(#timeArcGrad)"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          <path
            d="M 340 390 C 420 240, 540 190, 680 190"
            fill="none"
            stroke="#A855F7"
            strokeWidth="2.5"
          />
          <path
            d="M 980 190 C 1040 310, 1040 560, 980 710"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-6 pt-8 pb-4 flex flex-col lg:flex-row items-stretch justify-between gap-10 my-auto">
        {/* Left Column: Custom Inline SVG Title Lockup + Overview + Primary Start CTA */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <div className="mb-3">
            <svg
              viewBox="0 0 540 118"
              className="w-full max-w-[500px] h-auto overflow-visible"
              role="img"
              aria-label="5D Chess With Multiverse Time Travel"
            >
              <defs>
                <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
              </defs>

              <g transform="translate(8, 12)">
                <polygon
                  points="44,4 82,26 82,70 44,92 6,70 6,26"
                  fill="#111827"
                  stroke="url(#crestGold)"
                  strokeWidth="2.5"
                />
                <polygon
                  points="44,20 68,34 68,62 44,76 20,62 20,34"
                  fill="#1E1B4B"
                  stroke="#A855F7"
                  strokeWidth="2"
                />
                <line x1="44" y1="4" x2="44" y2="20" stroke="#F59E0B" strokeWidth="1.8" />
                <line x1="82" y1="26" x2="68" y2="34" stroke="#F59E0B" strokeWidth="1.8" />
                <line x1="82" y1="70" x2="68" y2="62" stroke="#F59E0B" strokeWidth="1.8" />
                <line x1="44" y1="92" x2="44" y2="76" stroke="#F59E0B" strokeWidth="1.8" />
                <line x1="6" y1="70" x2="20" y2="62" stroke="#F59E0B" strokeWidth="1.8" />
                <line x1="6" y1="26" x2="20" y2="34" stroke="#F59E0B" strokeWidth="1.8" />
                <circle cx="44" cy="48" r="6" fill="#F59E0B" />
              </g>

              <text
                x="108"
                y="54"
                fill="#F8FAFC"
                fontFamily="Cinzel, Georgia, serif"
                fontWeight="700"
                fontSize="44"
                letterSpacing="3"
              >
                {t('title')}
              </text>
              <line x1="108" y1="68" x2="520" y2="68" stroke="#334155" strokeWidth="1.5" />
              <line x1="108" y1="68" x2="260" y2="68" stroke="#F59E0B" strokeWidth="2.5" />
              <text
                x="108"
                y="92"
                fill="#F59E0B"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="600"
                fontSize="14.5"
                letterSpacing="4.5"
              >
                {t('titleTagline')}
              </text>
            </svg>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-[56ch]">
            {t('overviewPrefix')} <strong className="text-white font-semibold">{t('axisFile')}</strong>,{' '}
            <strong className="text-white font-semibold">{t('axisRank')}</strong>,{' '}
            <strong className="text-amber-300 font-semibold">{t('axisTurn')}</strong>, and{' '}
            <strong className="text-purple-300 font-semibold">{t('axisTimeline')}</strong>. {t('overviewSuffix')}
          </p>

          {/* Opponent Mode & AI Persona Selector */}
          <div className="mb-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[11px] font-mono text-slate-400 mb-1 tracking-wider">
                  {t('opponentConfig')}
                </div>
                <div className="inline-flex p-1 bg-slate-900/90 border border-slate-800 rounded-lg gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectOpponentMode('ai')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      opponentMode === 'ai'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {t('vsAi')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectOpponentMode('pass_and_play')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      opponentMode === 'pass_and_play'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {t('passPlay')}
                  </button>
                </div>
              </div>
            </div>

            {opponentMode === 'ai' && (
              <div>
                <div className="text-[11px] font-mono text-slate-400 mb-1 tracking-wider">
                  {t('aiPersonaTitle')}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {AI_PERSONA_CONFIGS.map((p) => {
                    const active = aiPersona === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectAiPersona(p.id)}
                        className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-800 border-amber-500/80 text-slate-100 shadow-sm'
                            : 'bg-slate-900/75 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-100 truncate">{t(('persona_' + p.id))}</div>
                        <div className="text-[10px] font-mono text-amber-300 mt-0.5">{t(('persona_badge_' + p.id))}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Configurable Promotion & Timeline Activation Rules */}
            <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="text-[11px] font-mono text-amber-300 tracking-wider font-semibold">
                {t('customRulesTitle')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Promotion Rule */}
                <div>
                  <div className="text-[10px] font-mono text-slate-400 mb-1">
                    {t('pawnPromotionTitle')}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectPromotionRule('choose_piece')}
                      className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        promotionRule === 'choose_piece'
                          ? 'bg-purple-950/90 border-purple-400 text-purple-100 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{t("promotionPanelTitle")}</div>
                      <div className="text-[9px] font-mono text-purple-300">{t("promotionPanelSub")}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectPromotionRule('auto_queen')}
                      className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        promotionRule === 'auto_queen'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{t("promotionQueenTitle")}</div>
                      <div className="text-[9px] font-mono text-amber-300">{t("promotionQueenSub")}</div>
                    </button>
                  </div>
                </div>

                {/* 2. Timeline Activation Threshold */}
                <div>
                  <div className="text-[10px] font-mono text-slate-400 mb-1">
                    {t('timelineActivationTitle')}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { val: 2 as TimelineActivationDelta, label: t('delta_2'), sub: t('deltaSub_2') },
                        { val: 1 as TimelineActivationDelta, label: t('delta_1'), sub: t('deltaSub_1') },
                        { val: 99 as TimelineActivationDelta, label: t('delta_99'), sub: t('deltaSub_99') },
                      ] as const
                    ).map((opt) => {
                      const active = timelineActivationDelta === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => onSelectTimelineActivationDelta(opt.val)}
                          className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-purple-950/90 border-purple-400 text-purple-100 shadow-sm'
                              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-[11px] font-bold whitespace-nowrap">{opt.label}</div>
                          <div className="text-[9px] font-mono text-purple-300 whitespace-nowrap">
                            {opt.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Start Action */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartGame();
              }}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-lg tracking-wider rounded-lg shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {t('startGame')}
            </button>

            <div className="text-xs text-slate-400 font-mono">
              <div>
                {t('selected')}: <span className="text-slate-200 font-semibold">{t(('variant_' + currentVariantObj.id))}</span>
              </div>
              <div>
                {t('boardGrid')} <span className="text-amber-400">{currentVariantObj.boardSize}×{currentVariantObj.boardSize}</span> ·{' '}
                {promotionRule === 'choose_piece' ? t('promotion_choose_piece') : t('promotion_auto_queen')} ·{' '}
                {timelineActivationDelta >= 99 ? t('delta_99') : tf('deltaN_activation', { n: timelineActivationDelta })}
              </div>
            </div>

            {/* Locale Switcher */}
            <div className="mt-6">
              <LocaleSwitcher />
            </div>
          </div>
        </div>

        {/* Right Column: Spacetime Variant & Puzzle Selector */}
        <div className="w-full lg:w-[470px] flex flex-col justify-center">
          <div className="hud-glass border border-slate-700/80 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h2 className="font-display text-base font-bold tracking-wide text-slate-100">
                {t('selectRuleset')}
              </h2>
              <span className="text-xs font-mono text-slate-400">{VARIANT_CONFIGS.length} {t('modes')}</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-[390px] overflow-y-auto pr-1">
              {VARIANT_CONFIGS.map((variant) => {
                const isSelected = variant.id === selectedVariant;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelectVariant(variant.id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/95 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-100">
                          {t(('variant_' + variant.id))}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          · {variant.boardSize}×{variant.boardSize}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            variant.isPuzzle
                              ? 'bg-purple-950/90 text-purple-200 border border-purple-500/50'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {variant.isPuzzle ? 'PUZZLE · 残局' : 'MATCH · 对局'}
                        </span>
                      </div>
                      <div className="text-xs text-amber-400/90 font-medium mt-0.5">
                        {t(('variantSub_' + variant.id))}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {t(('variantDesc_' + variant.id))}
                      </p>
                    </div>

                    <div className="shrink-0 pt-1">
                      <ChessPieceSVG
                        type={
                          variant.id === 'royal_unicorn' || variant.id === 'puzzle_unicorn_snipe'
                            ? 'u'
                            : variant.id === 'puzzle_dragon_tesseract'
                              ? 'd'
                              : variant.id === 'puzzle_retrocausal'
                                ? 'r'
                                : variant.id === 'time_lab'
                                  ? 'q'
                                  : 'n'
                        }
                        color={isSelected ? 'w' : 'b'}
                        className="w-8 h-8"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe-Margin Control Hint Line */}
      <div className="relative z-10 w-full py-4 px-6 text-center text-xs font-mono text-slate-400 tracking-wide">
        {t('controlsHint')}
      </div>
    </div>
  );
};
