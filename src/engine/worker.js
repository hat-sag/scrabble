/**
 * Web Worker for running the GADDAG build and move generation off the main thread.
 */
import { GADDAG } from './gaddag.js';
import { generateMoves } from './movegen.js';

let gaddag = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'loadDictionary': {
      try {
        const words = payload.words;
        gaddag = GADDAG.build(words);
        self.postMessage({ type: 'dictionaryLoaded', payload: { wordCount: gaddag.wordCount } });
      } catch (err) {
        self.postMessage({ type: 'error', payload: { message: err.message } });
      }
      break;
    }

    case 'generateMoves': {
      if (!gaddag) {
        self.postMessage({ type: 'error', payload: { message: 'Dictionary not loaded' } });
        return;
      }
      try {
        const { boardState, rack, config } = payload;
        const start = performance.now();
        const moves = generateMoves(gaddag, boardState, rack, config);
        const elapsed = performance.now() - start;

        // Only send top 50 moves (UI shows 15 max) to reduce memory and transfer cost
        const top = moves.slice(0, 50);
        const serialized = top.map(m => ({
          row: m.row,
          col: m.col,
          direction: m.direction,
          tiles: m.tiles,
          word: m.word,
          score: m.score,
          tilesUsed: m.tilesUsed,
          position: m.position,
          isBingo: m.isBingo,
        }));

        self.postMessage({
          type: 'movesGenerated',
          payload: { moves: serialized, totalMoves: moves.length, elapsed },
        });
      } catch (err) {
        self.postMessage({ type: 'error', payload: { message: err.message } });
      }
      break;
    }

    case 'checkWord': {
      if (!gaddag) {
        self.postMessage({ type: 'wordCheckResult', payload: { valid: false } });
        return;
      }
      const valid = gaddag.hasWord(payload.word);
      self.postMessage({ type: 'wordCheckResult', payload: { valid, word: payload.word } });
      break;
    }
  }
};
