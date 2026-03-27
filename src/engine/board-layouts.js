// Premium square types
export const TW = 'TW'; // 3W (triple word)
export const DW = 'DW'; // 2W (double word)
export const TL = 'TL'; // 3L (triple letter)
export const DL = 'DL'; // 2L (double letter)
export const ST = 'ST'; // center star (no multiplier in Crossplay)

/**
 * NYT Crossplay board layout (15x15)
 * Mapped from the official board screenshot.
 * 56 premium squares: 20 DL, 20 TL, 8 DW, 8 TW
 */
function buildCrossplayLayout() {
  const b = Array.from({ length: 15 }, () => Array(15).fill(null));
  const s = (r, c, t) => { b[r][c] = t; };

  // Row 0:  3L . . 3W . . . 2L . . . 3W . . 3L
  s(0, 0, TL); s(0, 3, TW); s(0, 7, DL); s(0, 11, TW); s(0, 14, TL);

  // Row 1:  . 2W . . . . 3L . 3L . . . . 2W .
  s(1, 1, DW); s(1, 6, TL); s(1, 8, TL); s(1, 13, DW);

  // Row 2:  . . . . 2L . . . . . 2L . . . .
  s(2, 4, DL); s(2, 10, DL);

  // Row 3:  3W . . 2L . . . 2W . . . 2L . . 3W
  s(3, 0, TW); s(3, 3, DL); s(3, 7, DW); s(3, 11, DL); s(3, 14, TW);

  // Row 4:  . . 2L . . 3L . . . 3L . . 2L . .
  s(4, 2, DL); s(4, 5, TL); s(4, 9, TL); s(4, 12, DL);

  // Row 5:  . . . . 3L . . 2L . . 3L . . . .
  s(5, 4, TL); s(5, 7, DL); s(5, 10, TL);

  // Row 6:  . 3L . . . . . . . . . . . 3L .
  s(6, 1, TL); s(6, 13, TL);

  // Row 7:  2L . . 2W . 2L . ★ . 2L . 2W . . 2L
  s(7, 0, DL); s(7, 3, DW); s(7, 5, DL); s(7, 7, ST); s(7, 9, DL); s(7, 11, DW); s(7, 14, DL);

  // Row 8:  . 3L . . . . . . . . . . . 3L .
  s(8, 1, TL); s(8, 13, TL);

  // Row 9:  . . . . 3L . . 2L . . 3L . . . .
  s(9, 4, TL); s(9, 7, DL); s(9, 10, TL);

  // Row 10: . . 2L . . 3L . . . 3L . . 2L . .
  s(10, 2, DL); s(10, 5, TL); s(10, 9, TL); s(10, 12, DL);

  // Row 11: 3W . . 2L . . . 2W . . . 2L . . 3W
  s(11, 0, TW); s(11, 3, DL); s(11, 7, DW); s(11, 11, DL); s(11, 14, TW);

  // Row 12: . . . . 2L . . . . . 2L . . . .
  s(12, 4, DL); s(12, 10, DL);

  // Row 13: . 2W . . . . 3L . 3L . . . . 2W .
  s(13, 1, DW); s(13, 6, TL); s(13, 8, TL); s(13, 13, DW);

  // Row 14: 3L . . 3W . . . 2L . . . 3W . . 3L
  s(14, 0, TL); s(14, 3, TW); s(14, 7, DL); s(14, 11, TW); s(14, 14, TL);

  return b;
}

export const CROSSPLAY_BOARD = buildCrossplayLayout();

export function getBoardLayout() {
  return CROSSPLAY_BOARD;
}
