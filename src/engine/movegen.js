/**
 * GADDAG-based move generator.
 *
 * Algorithm overview:
 * 1. Find all anchor squares (empty squares adjacent to filled squares,
 *    or center square if the board is empty).
 * 2. For each anchor square, compute cross-checks: which letters are
 *    legal in that square considering perpendicular words.
 * 3. For each anchor, use the GADDAG to generate all legal placements
 *    both horizontally and vertically.
 * 4. Score each move and return sorted results.
 */

import { SEPARATOR } from './gaddag.js';

const BOARD_SIZE = 15;

/**
 * Represents a move: placed tiles on the board.
 */
export class Move {
  constructor(row, col, direction, tiles, word, score, tilesUsed) {
    this.row = row;           // starting row
    this.col = col;           // starting col
    this.direction = direction; // 'across' or 'down'
    this.tiles = tiles;       // array of { row, col, letter, isBlank }
    this.word = word;         // the main word formed
    this.score = score;
    this.tilesUsed = tilesUsed; // number of tiles from rack
  }

  get position() {
    if (this.direction === 'across') {
      return `${this.row + 1}${String.fromCharCode(65 + this.col)}`;
    } else {
      return `${String.fromCharCode(65 + this.col)}${this.row + 1}`;
    }
  }

  get isBingo() {
    return this.tilesUsed === 7;
  }
}

/**
 * Generate all legal moves given a board state, rack, and GADDAG.
 */
export function generateMoves(gaddag, boardState, rack, config) {
  const { tileValues, bonusSquares, bingoBonus, centerIsDoubleWord } = config;
  const results = [];

  // boardState is a 15x15 array where each cell is null or { letter, isBlank }
  const isEmpty = boardState.every(row => row.every(cell => cell === null));

  // Find anchors
  const anchors = findAnchors(boardState, isEmpty);

  // Generate moves in both directions
  for (const dir of ['across', 'down']) {
    // Compute cross-checks for perpendicular direction
    const crossChecks = computeCrossChecks(gaddag, boardState, dir);

    for (const [ar, ac] of anchors) {
      generateFromAnchor(
        gaddag, boardState, rack, ar, ac, dir,
        crossChecks, bonusSquares, tileValues, bingoBonus,
        centerIsDoubleWord, results
      );
    }
  }

  // Deduplicate moves (same tiles placed at same positions)
  const seen = new Set();
  const unique = [];
  for (const move of results) {
    const key = move.tiles.map(t => `${t.row},${t.col},${t.letter}`).sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(move);
    }
  }

  unique.sort((a, b) => b.score - a.score);
  return unique;
}

function findAnchors(boardState, isEmpty) {
  const anchors = [];

  if (isEmpty) {
    anchors.push([7, 7]); // center square
    return anchors;
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (boardState[r][c] !== null) continue;
      // Check if adjacent to a filled square
      if (
        (r > 0 && boardState[r - 1][c] !== null) ||
        (r < 14 && boardState[r + 1][c] !== null) ||
        (c > 0 && boardState[r][c - 1] !== null) ||
        (c < 14 && boardState[r][c + 1] !== null)
      ) {
        anchors.push([r, c]);
      }
    }
  }

  return anchors;
}

/**
 * Compute cross-checks for a given primary direction.
 * For direction 'across', we check vertical words formed at each position.
 * Returns a 15x15 array of Sets (which letters are valid at each empty square).
 */
function computeCrossChecks(gaddag, boardState, primaryDir) {
  const checks = Array.from({ length: 15 }, () =>
    Array.from({ length: 15 }, () => null)
  );

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (boardState[r][c] !== null) continue;

      // Check perpendicular direction
      let hasPerp = false;
      let prefix = '';
      let suffix = '';

      if (primaryDir === 'across') {
        // Check vertical neighbors
        // Collect letters above
        let rr = r - 1;
        while (rr >= 0 && boardState[rr][c] !== null) {
          prefix = boardState[rr][c].letter + prefix;
          rr--;
        }
        // Collect letters below
        rr = r + 1;
        while (rr < BOARD_SIZE && boardState[rr][c] !== null) {
          suffix += boardState[rr][c].letter;
          rr++;
        }
      } else {
        // Check horizontal neighbors
        let cc = c - 1;
        while (cc >= 0 && boardState[r][cc] !== null) {
          prefix = boardState[r][cc].letter + prefix;
          cc--;
        }
        cc = c + 1;
        while (cc < BOARD_SIZE && boardState[r][cc] !== null) {
          suffix += boardState[r][cc].letter;
          cc++;
        }
      }

      hasPerp = prefix.length > 0 || suffix.length > 0;

      if (!hasPerp) {
        // Any letter is valid (no perpendicular constraint)
        checks[r][c] = null; // null means "any letter"
      } else {
        // Find which letters form valid perpendicular words
        const validLetters = new Set();
        for (let ch = 65; ch <= 90; ch++) {
          const letter = String.fromCharCode(ch);
          const word = prefix + letter + suffix;
          if (gaddag.hasWord(word)) {
            validLetters.add(letter);
          }
        }
        checks[r][c] = validLetters;
      }
    }
  }

  return checks;
}

/**
 * Generate all moves from a given anchor square in a given direction.
 * Uses the GADDAG traversal algorithm.
 */
function generateFromAnchor(
  gaddag, boardState, rack, anchorRow, anchorCol, direction,
  crossChecks, bonusSquares, tileValues, bingoBonus, centerIsDoubleWord, results
) {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  // Helper to get board cell in the primary direction
  const getCell = (row, col) => {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return undefined;
    return boardState[row][col];
  };

  // Count how many empty squares we can extend left/up from anchor (before hitting another anchor or edge)
  let leftLimit = 0;
  {
    let r = anchorRow - dr;
    let c = anchorCol - dc;
    while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && getCell(r, c) === null) {
      leftLimit++;
      r -= dr;
      c -= dc;
    }
  }

  // Check if there are already tiles to the left/above the anchor
  const hasLeftTiles = (() => {
    const r = anchorRow - dr;
    const c = anchorCol - dc;
    return r >= 0 && c >= 0 && getCell(r, c) !== null;
  })();

  if (hasLeftTiles) {
    // There are existing tiles before the anchor — collect them and go right
    let prefix = [];
    let r = anchorRow - dr;
    let c = anchorCol - dc;
    while (r >= 0 && c >= 0 && getCell(r, c) !== null) {
      prefix.unshift(getCell(r, c).letter);
      r -= dr;
      c -= dc;
    }

    // Navigate the GADDAG through the reversed prefix
    let node = gaddag.root;
    for (let i = prefix.length - 1; i >= 0; i--) {
      node = node.children.get(prefix[i]);
      if (!node) return;
    }
    node = node.children.get(SEPARATOR);
    if (!node) return;
    // Now navigate forward through the prefix
    for (let i = 0; i < prefix.length; i++) {
      node = node.children.get(prefix[i]);
      if (!node) return;
    }

    // Now extend right from the anchor
    extendRight(
      gaddag, boardState, node, anchorRow, anchorCol, direction,
      [...rack], [], crossChecks, bonusSquares, tileValues, bingoBonus,
      centerIsDoubleWord, results, r + dr, c + dc
    );
  } else {
    // No tiles before anchor — we can place 0..leftLimit tiles before it
    // Start at the anchor position going left via GADDAG
    initialLeftPart(
      gaddag, boardState, gaddag.root, anchorRow, anchorCol, direction,
      [...rack], [], 0, leftLimit, crossChecks, bonusSquares,
      tileValues, bingoBonus, centerIsDoubleWord, results
    );
  }
}

/**
 * Build the left part of the word by going left/up from the anchor.
 */
function initialLeftPart(
  gaddag, boardState, node, anchorRow, anchorCol, direction,
  rack, tilesPlaced, depth, limit, crossChecks, bonusSquares,
  tileValues, bingoBonus, centerIsDoubleWord, results
) {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  // Try extending right from current position (the left part is complete)
  const sepNode = node.children.get(SEPARATOR);
  if (sepNode) {
    // The starting position of the word
    const startRow = anchorRow - depth * dr;
    const startCol = anchorCol - depth * dc;

    extendRight(
      gaddag, boardState, sepNode, anchorRow, anchorCol, direction,
      rack, tilesPlaced, crossChecks, bonusSquares, tileValues,
      bingoBonus, centerIsDoubleWord, results, startRow, startCol
    );
  }

  if (depth >= limit) return;

  // Try placing a tile to the left
  const leftRow = anchorRow - (depth + 1) * dr;
  const leftCol = anchorCol - (depth + 1) * dc;
  if (leftRow < 0 || leftCol < 0) return;

  const crossCheck = crossChecks[leftRow][leftCol];

  // Try each letter in the rack
  const tried = new Set();
  for (let i = 0; i < rack.length; i++) {
    const tile = rack[i];

    if (tile === '?') {
      // Blank tile — try every letter
      for (let ch = 65; ch <= 90; ch++) {
        const letter = String.fromCharCode(ch);
        if (crossCheck !== null && !crossCheck.has(letter)) continue;
        const childNode = node.children.get(letter);
        if (!childNode) continue;

        const newRack = [...rack.slice(0, i), ...rack.slice(i + 1)];
        const newTiles = [...tilesPlaced, { row: leftRow, col: leftCol, letter, isBlank: true }];

        initialLeftPart(
          gaddag, boardState, childNode, anchorRow, anchorCol, direction,
          newRack, newTiles, depth + 1, limit, crossChecks, bonusSquares,
          tileValues, bingoBonus, centerIsDoubleWord, results
        );
      }
    } else {
      if (tried.has(tile)) continue;
      tried.add(tile);
      if (crossCheck !== null && !crossCheck.has(tile)) continue;
      const childNode = node.children.get(tile);
      if (!childNode) continue;

      const newRack = [...rack.slice(0, i), ...rack.slice(i + 1)];
      const newTiles = [...tilesPlaced, { row: leftRow, col: leftCol, letter: tile, isBlank: false }];

      initialLeftPart(
        gaddag, boardState, childNode, anchorRow, anchorCol, direction,
        newRack, newTiles, depth + 1, limit, crossChecks, bonusSquares,
        tileValues, bingoBonus, centerIsDoubleWord, results
      );
    }
  }
}

/**
 * Extend the word to the right/down from the anchor position.
 */
function extendRight(
  gaddag, boardState, node, row, col, direction,
  rack, tilesPlaced, crossChecks, bonusSquares, tileValues,
  bingoBonus, centerIsDoubleWord, results, startRow, startCol
) {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    // Off the board — if terminal, record the move
    if (node.isTerminal && tilesPlaced.length > 0) {
      recordMove(
        boardState, tilesPlaced, direction, bonusSquares,
        tileValues, bingoBonus, centerIsDoubleWord, results, startRow, startCol
      );
    }
    return;
  }

  const cell = boardState[row][col];

  if (cell !== null) {
    // Existing tile on board — must follow it
    const childNode = node.children.get(cell.letter);
    if (childNode) {
      extendRight(
        gaddag, boardState, childNode, row + dr, col + dc, direction,
        rack, tilesPlaced, crossChecks, bonusSquares, tileValues,
        bingoBonus, centerIsDoubleWord, results, startRow, startCol
      );
    }
  } else {
    // Empty square — try placing a tile
    if (node.isTerminal && tilesPlaced.length > 0) {
      recordMove(
        boardState, tilesPlaced, direction, bonusSquares,
        tileValues, bingoBonus, centerIsDoubleWord, results, startRow, startCol
      );
    }

    const crossCheck = crossChecks[row][col];
    const tried = new Set();

    for (let i = 0; i < rack.length; i++) {
      const tile = rack[i];

      if (tile === '?') {
        for (let ch = 65; ch <= 90; ch++) {
          const letter = String.fromCharCode(ch);
          if (crossCheck !== null && !crossCheck.has(letter)) continue;
          const childNode = node.children.get(letter);
          if (!childNode) continue;

          const newRack = [...rack.slice(0, i), ...rack.slice(i + 1)];
          const newTiles = [...tilesPlaced, { row, col, letter, isBlank: true }];

          extendRight(
            gaddag, boardState, childNode, row + dr, col + dc, direction,
            newRack, newTiles, crossChecks, bonusSquares, tileValues,
            bingoBonus, centerIsDoubleWord, results, startRow, startCol
          );
        }
      } else {
        if (tried.has(tile)) continue;
        tried.add(tile);
        if (crossCheck !== null && !crossCheck.has(tile)) continue;
        const childNode = node.children.get(tile);
        if (!childNode) continue;

        const newRack = [...rack.slice(0, i), ...rack.slice(i + 1)];
        const newTiles = [...tilesPlaced, { row, col, letter: tile, isBlank: false }];

        extendRight(
          gaddag, boardState, childNode, row + dr, col + dc, direction,
          newRack, newTiles, crossChecks, bonusSquares, tileValues,
          bingoBonus, centerIsDoubleWord, results, startRow, startCol
        );
      }
    }
  }
}

/**
 * Record a valid move and compute its score.
 */
function recordMove(
  boardState, tilesPlaced, direction, bonusSquares, tileValues,
  bingoBonus, centerIsDoubleWord, results, startRow, startCol
) {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  // Reconstruct the main word
  let word = '';
  let r = startRow;
  let c = startCol;

  // Collect all letters in the main word (board tiles + placed tiles)
  const placedMap = new Map();
  for (const t of tilesPlaced) {
    placedMap.set(`${t.row},${t.col}`, t);
  }

  // Find the actual start of the word (may extend before startRow/startCol due to existing tiles)
  while (r - dr >= 0 && c - dc >= 0) {
    const pr = r - dr;
    const pc = c - dc;
    if (boardState[pr][pc] === null && !placedMap.has(`${pr},${pc}`)) break;
    r = pr;
    c = pc;
  }

  const actualStartRow = r;
  const actualStartCol = c;

  // Now traverse to build the word
  let mainWordScore = 0;
  let mainWordMultiplier = 1;

  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    const placed = placedMap.get(`${r},${c}`);
    const cell = boardState[r][c];

    if (!placed && !cell) break;

    let letter, isNewTile, isBlank;
    if (placed) {
      letter = placed.letter;
      isNewTile = true;
      isBlank = placed.isBlank;
    } else {
      letter = cell.letter;
      isNewTile = false;
      isBlank = cell.isBlank || false;
    }

    word += letter;

    const letterValue = isBlank ? 0 : (tileValues[letter] || 0);
    const bonus = bonusSquares[r]?.[c];

    if (isNewTile) {
      let tileScore = letterValue;
      if (bonus === 'DL') tileScore *= 2;
      else if (bonus === 'TL') tileScore *= 3;
      mainWordScore += tileScore;

      if (bonus === 'DW' || (bonus === 'ST' && centerIsDoubleWord)) mainWordMultiplier *= 2;
      else if (bonus === 'TW') mainWordMultiplier *= 3;
    } else {
      mainWordScore += letterValue;
    }

    r += dr;
    c += dc;
  }

  mainWordScore *= mainWordMultiplier;

  // Don't record single-letter "words" that aren't cross-words
  if (word.length < 2) return;

  // Score cross-words formed by placed tiles
  let crossWordScore = 0;
  const crossDr = direction === 'across' ? 1 : 0;
  const crossDc = direction === 'across' ? 0 : 1;

  for (const t of tilesPlaced) {
    let cr = t.row - crossDr;
    let cc = t.col - crossDc;
    let prefix = '';
    while (cr >= 0 && cc >= 0 && boardState[cr][cc] !== null) {
      prefix = boardState[cr][cc].letter + prefix;
      cr -= crossDr;
      cc -= crossDc;
    }

    cr = t.row + crossDr;
    cc = t.col + crossDc;
    let suffix = '';
    while (cr < BOARD_SIZE && cc < BOARD_SIZE && boardState[cr][cc] !== null) {
      suffix += boardState[cr][cc].letter;
      cr += crossDr;
      cc += crossDc;
    }

    if (prefix.length === 0 && suffix.length === 0) continue;

    // Score this cross-word
    let cwScore = 0;
    let cwMultiplier = 1;

    // Score prefix letters (existing tiles, no multipliers)
    for (const ch of prefix) {
      cwScore += tileValues[ch] || 0;
    }
    // Score suffix letters (existing tiles, no multipliers)
    for (const ch of suffix) {
      cwScore += tileValues[ch] || 0;
    }

    // Score the placed tile (with multipliers since it's new)
    const bonus = bonusSquares[t.row]?.[t.col];
    let tileScore = t.isBlank ? 0 : (tileValues[t.letter] || 0);
    if (bonus === 'DL') tileScore *= 2;
    else if (bonus === 'TL') tileScore *= 3;
    cwScore += tileScore;

    if (bonus === 'DW' || (bonus === 'ST' && centerIsDoubleWord)) cwMultiplier *= 2;
    else if (bonus === 'TW') cwMultiplier *= 3;

    crossWordScore += cwScore * cwMultiplier;
  }

  let totalScore = mainWordScore + crossWordScore;

  // Bingo bonus
  if (tilesPlaced.length === 7) {
    totalScore += bingoBonus;
  }

  results.push(new Move(
    actualStartRow, actualStartCol, direction, tilesPlaced,
    word, totalScore, tilesPlaced.length
  ));
}
