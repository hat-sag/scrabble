import { useCallback, useEffect, useRef } from 'react';
import { getBoardLayout, TW, DW, TL, DL, ST } from '../engine/board-layouts.js';
import './Board.css';

const BONUS_LABELS = { [TW]: '3W', [DW]: '2W', [TL]: '3L', [DL]: '2L', [ST]: '★' };
const BONUS_CLASSES = { [TW]: 'tw', [DW]: 'dw', [TL]: 'tl', [DL]: 'dl', [ST]: 'st' };

export default function Board({
  boardState,
  onCellChange,
  onCellClear,
  selectedCell,
  onCellSelect,
  direction,
  onToggleDirection,
  highlightedTiles,
}) {
  const layout = getBoardLayout();
  const boardRef = useRef(null);

  // Auto-focus board when a cell is selected
  useEffect(() => {
    if (selectedCell && boardRef.current) {
      boardRef.current.focus();
    }
  }, [selectedCell]);

  const handleKeyDown = useCallback((e) => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;

    if (e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      onToggleDirection();
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onCellClear(r, c);
      // Move back
      const dr = direction === 'down' ? -1 : 0;
      const dc = direction === 'across' ? -1 : 0;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15) {
        onCellSelect(nr, nc);
      }
      return;
    }

    if (e.key === 'ArrowUp') { e.preventDefault(); if (r > 0) onCellSelect(r - 1, c); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (r < 14) onCellSelect(r + 1, c); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); if (c > 0) onCellSelect(r, c - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); if (c < 14) onCellSelect(r, c + 1); return; }

    const letter = e.key.toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      e.preventDefault();
      onCellChange(r, c, letter, e.shiftKey); // shift+letter = blank tile
      // Advance cursor
      const dr = direction === 'down' ? 1 : 0;
      const dc = direction === 'across' ? 1 : 0;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 15 && nc < 15) {
        onCellSelect(nr, nc);
      }
    }
  }, [selectedCell, direction, onCellChange, onCellClear, onCellSelect, onToggleDirection]);

  const highlightMap = new Map();
  if (highlightedTiles) {
    for (const t of highlightedTiles) {
      highlightMap.set(`${t.row},${t.col}`, t);
    }
  }

  return (
    <div className="board-wrapper">
      <div className="board-labels-top">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} className="board-col-label">{String.fromCharCode(65 + i)}</div>
        ))}
      </div>
      <div className="board-with-rows">
        <div className="board-labels-left">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="board-row-label">{i + 1}</div>
          ))}
        </div>
        <div
          className="board"
          ref={boardRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {Array.from({ length: 15 }, (_, r) => (
            Array.from({ length: 15 }, (_, c) => {
              const cell = boardState[r][c];
              const bonus = layout[r][c];
              const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
              const highlighted = highlightMap.get(`${r},${c}`);

              let className = 'cell';
              if (bonus) className += ` ${BONUS_CLASSES[bonus]}`;
              if (isSelected) className += ' selected';
              if (cell) className += ' filled';
              if (cell?.isBlank) className += ' blank-tile';
              if (highlighted) className += ' highlighted';

              return (
                <div
                  key={`${r}-${c}`}
                  className={className}
                  onClick={() => {
                    if (isSelected) {
                      onToggleDirection();
                    } else {
                      onCellSelect(r, c);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (cell) {
                      onCellClear(r, c);
                    }
                  }}
                >
                  {cell ? (
                    <span className="tile-letter">{cell.letter}</span>
                  ) : highlighted ? (
                    <span className="tile-letter suggested">{highlighted.letter}</span>
                  ) : bonus ? (
                    <span className="bonus-label">{BONUS_LABELS[bonus]}</span>
                  ) : null}
                  {isSelected && (
                    <span className="direction-indicator">
                      {direction === 'across' ? '→' : '↓'}
                    </span>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
}
