import { useState, useCallback, useEffect } from 'react';
import Board from './components/Board.jsx';
import Rack from './components/Rack.jsx';
import MoveList from './components/MoveList.jsx';
import { useEngine } from './engine/useEngine.js';
import './App.css';

function createEmptyBoard() {
  return Array.from({ length: 15 }, () => Array(15).fill(null));
}

export default function App() {
  const [boardState, setBoardState] = useState(createEmptyBoard);
  const [rack, setRack] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [highlightedTiles, setHighlightedTiles] = useState(null);

  const engine = useEngine();

  useEffect(() => {
    engine.loadDictionary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSelectedCell(null);
    setHighlightedTiles(null);
  }, []);

  const handleHoverMove = useCallback((move) => {
    setHighlightedTiles(move.tiles);
  }, []);

  const handleLeaveMove = useCallback(() => {
    setHighlightedTiles(null);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Crossplay Kibitzer</h1>
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
            analyzing={engine.analyzing}
          />
        </div>
      </main>
    </div>
  );
}
