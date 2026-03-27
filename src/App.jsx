import { useState, useCallback, useEffect, useRef } from 'react';
import Board from './components/Board.jsx';
import Rack from './components/Rack.jsx';
import MoveList from './components/MoveList.jsx';
import MobileKeyboard from './components/MobileKeyboard.jsx';
import SaveLoad, { autoSave, loadAutoSave } from './components/SaveLoad.jsx';
import { useEngine } from './engine/useEngine.js';
import './App.css';

function createEmptyBoard() {
  return Array.from({ length: 15 }, () => Array(15).fill(null));
}

export default function App() {
  const [boardState, setBoardState] = useState(() => {
    const saved = loadAutoSave();
    return saved ? saved.boardState : createEmptyBoard();
  });
  const [rack, setRack] = useState(() => {
    const saved = loadAutoSave();
    return saved ? (saved.rack || '') : '';
  });
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [highlightedTiles, setHighlightedTiles] = useState(null);

  const engine = useEngine();

  useEffect(() => {
    engine.loadDictionary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on every board/rack change
  const autoSaveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSave(boardState, rack);
    }, 500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [boardState, rack]);

  const handleCellChange = useCallback((r, c, letter, isBlank) => {
    setBoardState(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = { letter, isBlank };
      return next;
    });
  }, []);

  const handleCellClear = useCallback((r, c) => {
    setBoardState(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = null;
      return next;
    });
  }, []);

  const handleCellSelect = useCallback((r, c) => {
    setSelectedCell([r, c]);
  }, []);

  const handleToggleDirection = useCallback(() => {
    setDirection(d => d === 'across' ? 'down' : 'across');
  }, []);

  const handleAnalyze = useCallback(() => {
    engine.analyze(boardState, rack);
    setHighlightedTiles(null);
  }, [engine, boardState, rack]);

  const handleClearBoard = useCallback(() => {
    setBoardState(createEmptyBoard());
    setRack('');
    setSelectedCell(null);
    setHighlightedTiles(null);
  }, []);

  const handleHoverMove = useCallback((move) => {
    setHighlightedTiles(move.tiles);
  }, []);

  const handleLeaveMove = useCallback(() => {
    setHighlightedTiles(null);
  }, []);

  const handlePlayMove = useCallback((move) => {
    setBoardState(prev => {
      const next = prev.map(row => [...row]);
      for (const tile of move.tiles) {
        next[tile.row][tile.col] = { letter: tile.letter, isBlank: tile.isBlank || false };
      }
      return next;
    });
    setHighlightedTiles(null);
    // Clear the move list since the board changed
    engine.clearMoves();
  }, [engine]);

  const handleLoadGame = useCallback((savedBoard, savedRack) => {
    setBoardState(savedBoard);
    setRack(savedRack || '');
    setSelectedCell(null);
    setHighlightedTiles(null);
    engine.clearMoves();
  }, [engine]);

  // Mobile keyboard handlers
  const handleMobileKey = useCallback((key) => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    if (key === '?') {
      // Blank tile — place as blank with no letter yet (shown as ?)
      handleCellChange(r, c, '?', true);
    } else {
      handleCellChange(r, c, key, false);
    }
    // Advance cursor
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 15 && nc < 15) {
      setSelectedCell([nr, nc]);
    }
  }, [selectedCell, direction, handleCellChange]);

  const handleMobileBackspace = useCallback(() => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    handleCellClear(r, c);
    // Move back
    const dr = direction === 'down' ? -1 : 0;
    const dc = direction === 'across' ? -1 : 0;
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15) {
      setSelectedCell([nr, nc]);
    }
  }, [selectedCell, direction, handleCellClear]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Hat Trick</h1>
        <SaveLoad boardState={boardState} rack={rack} onLoad={handleLoadGame} />
      </header>

      {!engine.dictLoaded && (
        <div className="loading-banner">
          {engine.dictLoading
            ? 'Loading dictionary...'
            : engine.error
            ? `Error: ${engine.error}`
            : 'Preparing...'}
        </div>
      )}

      <main className="app-main">
        <div className="board-column">
          <Board
            boardState={boardState}
            onCellChange={handleCellChange}
            onCellClear={handleCellClear}
            selectedCell={selectedCell}
            onCellSelect={handleCellSelect}
            direction={direction}
            onToggleDirection={handleToggleDirection}
            highlightedTiles={highlightedTiles}
          />
          <MobileKeyboard
            onKey={handleMobileKey}
            onBackspace={handleMobileBackspace}
            onToggleDirection={handleToggleDirection}
            direction={direction}
          />
          <div className="board-actions">
            <button className="btn btn-secondary" onClick={handleClearBoard}>
              Clear Board
            </button>
          </div>
        </div>

        <div className="controls-column">
          <Rack rack={rack} onRackChange={setRack} />

          <button
            className="btn btn-primary analyze-btn"
            onClick={handleAnalyze}
            disabled={!engine.dictLoaded || engine.analyzing || rack.length === 0}
          >
            {engine.analyzing ? 'Analyzing...' : 'Analyze'}
          </button>

          {engine.error && (
            <div className="error-msg">{engine.error}</div>
          )}

          <MoveList
            moves={engine.moves}
            totalMoves={engine.totalMoves}
            elapsed={engine.elapsed}
            onHoverMove={handleHoverMove}
            onLeaveMove={handleLeaveMove}
            onPlayMove={handlePlayMove}
            analyzing={engine.analyzing}
          />
        </div>
      </main>
    </div>
  );
}
