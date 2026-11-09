import React from 'react';
import { PieceType, PlayerColor } from '../game/types';

interface ChessPieceSVGProps {
  type: PieceType;
  color: PlayerColor;
  className?: string;
}

export const PIECE_NAMES: Record<PieceType, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
  u: 'Unicorn (3D Triagonal)',
  d: 'Dragon (4D Quadragonal)',
};

export const PIECE_AXIS_RULES: Record<PieceType, string> = {
  p: 'Advances 1 step along Rank (Y) or Timeline (L); captures diagonally in (X,Y) or (T,L).',
  r: 'Slides any number of steps along any 1 axis: File (X), Rank (Y), Time (T), or Timeline (L).',
  b: 'Slides equal steps along any 2 axes simultaneously (e.g. X+Y, X+T, Y+L, T+L).',
  n: 'Jumps 2 steps along any 1 axis and 1 step along any other axis in 4D spacetime.',
  q: 'Slides equal steps along 1, 2, 3, or all 4 axes simultaneously.',
  k: 'Steps 1 unit along any combination of 1, 2, 3, or 4 spacetime axes.',
  u: 'Slides equal steps along any 3 axes simultaneously (3D Triagonal).',
  d: 'Slides equal steps along all 4 axes simultaneously (4D Quadragonal).',
};

export const ChessPieceSVG: React.FC<ChessPieceSVGProps> = ({ type, color, className = 'w-7 h-7' }) => {
  const isWhite = color === 'w';
  const fillPrimary = isWhite ? '#F8FAFC' : '#0F172A';
  const fillAccent = isWhite ? '#E2E8F0' : '#1E293B';
  const strokeColor = isWhite ? '#0F172A' : '#E2E8F0';
  const innerStroke = isWhite ? '#475569' : '#94A3B8';

  return (
    <svg
      viewBox="0 0 45 45"
      className={`${className} select-none pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)]`}
      aria-hidden="true"
    >
      {type === 'p' && (
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,16.8 18.4,18.7 20.4,19.5 C 17.5,21.2 15.5,24.5 15.5,29 L 29.5,29 C 29.5,24.5 27.5,21.2 24.6,19.5 C 26.6,18.7 28,16.8 28,14.5 C 28,11.5 25.5,9 22.5,9 z" />
          <path d="M 12.5,33 L 32.5,33 L 34,37 L 11,37 L 12.5,33 z" fill={fillAccent} />
          <line x1="16" y1="29" x2="29" y2="29" stroke={innerStroke} strokeWidth="1.5" />
        </g>
      )}

      {type === 'r' && (
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 11,36 L 34,36 L 33,32 L 12,32 L 11,36 z" fill={fillAccent} />
          <path d="M 14,32 L 14,19 L 31,19 L 31,32 L 14,32 z" />
          <path d="M 12,19 L 33,19 L 33,11 L 29,11 L 29,14 L 25,14 L 25,11 L 20,11 L 20,14 L 16,14 L 16,11 L 12,11 L 12,19 z" />
          <line x1="15" y1="22" x2="30" y2="22" stroke={innerStroke} strokeWidth="1.4" />
        </g>
      )}

      {type === 'n' && (
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
          <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
          <circle cx="15.5" cy="14.5" r="1.4" fill={strokeColor} />
        </g>
      )}

      {type === 'b' && (
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 z" fill={fillAccent} />
          <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
          <circle cx="22.5" cy="8" r="2.2" />
          <path d="M 19.5,17.5 L 25.5,17.5 M 22.5,14.5 L 22.5,20.5" stroke={innerStroke} strokeWidth="1.8" />
        </g>
      )}

      {type === 'q' && (
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
          <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" fill={fillAccent} />
          <circle cx="6" cy="12" r="1.8" />
          <circle cx="14" cy="9" r="1.8" />
          <circle cx="22.5" cy="8" r="1.8" />
          <circle cx="31" cy="9" r="1.8" />
          <circle cx="39" cy="12" r="1.8" />
        </g>
      )}

      {type === 'k' && (
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 22.5,11.63 L 22.5,6" strokeWidth="2.6" />
          <path d="M 20,8 L 25,8" strokeWidth="2.6" />
          <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" fill={fillAccent} />
          <path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 11.5,29.5 11.5,29.5 L 11.5,37 z" />
          <path d="M 11.5,30 C 17,27 27,27 32.5,30" stroke={innerStroke} strokeWidth="1.5" fill="none" />
          <path d="M 11.5,33.5 C 17,30.5 27,30.5 32.5,33.5" stroke={innerStroke} strokeWidth="1.5" fill="none" />
        </g>
      )}

      {type === 'u' && (
        /* Authentic 5D Chess Unicorn: Horned Knight silhouette with golden/violet triagonal horn */
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 23,12 C 32.5,13 37.5,19 37,38 L 15,38 C 15,30 24,32 22,19" />
          <path d="M 23,19 C 23,21.5 18,25.5 16,27 C 13.5,28.8 13,31 11,30.5 C 9.5,29.5 7,28 7,25 C 7,22 13,14 13,14 L 16,11 L 20,11 L 23,12" />
          {/* Spiraled Unicorn Horn */}
          <polygon points="15,12 5,3 19,10" fill="#F59E0B" stroke={strokeColor} strokeWidth="1.8" />
          <circle cx="15.5" cy="15.5" r="1.4" fill="#F59E0B" />
        </g>
      )}

      {type === 'd' && (
        /* Authentic 5D Chess Dragon: Winged drake crest with 4D diamond core */
        <g fill={fillPrimary} stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 11,37 L 34,37 L 31,29 L 14,29 Z" fill={fillAccent} />
          <path d="M 22.5,9 L 36,15 L 30,28 L 22.5,24 L 15,28 L 9,15 Z" />
          <polygon points="22.5,13 27,20 22.5,27 18,20" fill="#A855F7" stroke={strokeColor} strokeWidth="1.6" />
        </g>
      )}
    </svg>
  );
};
