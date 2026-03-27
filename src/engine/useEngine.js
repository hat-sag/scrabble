import { useState, useRef, useCallback, useEffect } from 'react';
import { TILE_VALUES, BINGO_BONUS, CENTER_IS_DOUBLE_WORD } from './tile-values.js';
import { getBoardLayout } from './board-layouts.js';

export function useEngine() {
  const workerRef = useRef(null);
  const [dictLoaded, setDictLoaded] = useState(false);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictWordCount, setDictWordCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [moves, setMoves] = useState([]);
  const [totalMoves, setTotalMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('./worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      switch (type) {
        case 'dictionaryLoaded':
          setDictLoaded(true);
          setDictLoading(false);
          setDictWordCount(payload.wordCount);
          break;
        case 'movesGenerated':
          setMoves(payload.moves);
          setTotalMoves(payload.totalMoves);
          setElapsed(payload.elapsed);
          setAnalyzing(false);
          break;
        case 'error':
          setError(payload.message);
          setDictLoading(false);
          setAnalyzing(false);
          break;
      }
    };

    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const loadDictionary = useCallback(async () => {
    if (dictLoaded || dictLoading) return;
    setDictLoading(true);
    setError(null);

    try {
      const resp = await fetch('/twl06.txt');
      if (!resp.ok) throw new Error('Failed to load dictionary');
      const text = await resp.text();
      const words = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length >= 2);
      workerRef.current?.postMessage({ type: 'loadDictionary', payload: { words } });
    } catch (err) {
      setError(err.message);
      setDictLoading(false);
    }
  }, [dictLoaded, dictLoading]);

  const analyze = useCallback((boardState, rackStr) => {
    if (!dictLoaded || analyzing) return;
    setAnalyzing(true);
    setError(null);

    const rack = rackStr.toUpperCase().split('').filter(c => /[A-Z?]/.test(c));
    const layout = getBoardLayout();
    const bonusSquares = layout.map(row => row.map(cell => cell));

    workerRef.current?.postMessage({
      type: 'generateMoves',
      payload: {
        boardState,
        rack,
        config: {
          tileValues: TILE_VALUES,
          bonusSquares,
          bingoBonus: BINGO_BONUS,
          centerIsDoubleWord: CENTER_IS_DOUBLE_WORD,
        },
      },
    });
  }, [dictLoaded, analyzing]);

  return {
    dictLoaded, dictLoading, dictWordCount,
    analyzing, moves, totalMoves, elapsed, error,
    loadDictionary, analyze,
  };
}
