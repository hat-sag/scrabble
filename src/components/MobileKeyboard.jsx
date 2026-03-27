import { useCallback } from 'react';
import './MobileKeyboard.css';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export default function MobileKeyboard({ onKey, onBackspace, onToggleDirection, direction }) {
  const handleKey = useCallback((letter, e) => {
    e.preventDefault();
    onKey(letter);
  }, [onKey]);

  return (
    <div className="mobile-keyboard">
      {ROWS.map((row, ri) => (
        <div key={ri} className="kb-row">
          {ri === 2 && (
            <button
              className="kb-key kb-key-dir"
              onPointerDown={(e) => { e.preventDefault(); onToggleDirection(); }}
            >
              {direction === 'across' ? '→' : '↓'}
            </button>
          )}
          {row.map((letter) => (
            <button
              key={letter}
              className="kb-key"
              onPointerDown={(e) => handleKey(letter, e)}
            >
              {letter}
            </button>
          ))}
          {ri === 2 && (
            <button
              className="kb-key kb-key-bksp"
              onPointerDown={(e) => { e.preventDefault(); onBackspace(); }}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="kb-row">
        <button
          className="kb-key kb-key-blank"
          onPointerDown={(e) => { e.preventDefault(); onKey('?'); }}
        >
          Blank
        </button>
      </div>
    </div>
  );
}
