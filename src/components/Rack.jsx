import { useRef } from 'react';
import { TILE_VALUES } from '../engine/tile-values.js';
import './Rack.css';

export default function Rack({ rack, onRackChange }) {
  const inputRef = useRef(null);
  const tileValues = TILE_VALUES;

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z?]/g, '').slice(0, 7);
    onRackChange(val);
  };

  const tiles = rack.split('');

  return (
    <div className="rack-section">
      <label className="rack-label">Your Rack</label>
      <div className="rack-display">
        {Array.from({ length: 7 }, (_, i) => {
          const letter = tiles[i];
          const isBlank = letter === '?';
          return (
            <div key={i} className={`rack-tile ${letter ? 'has-letter' : 'empty'} ${isBlank ? 'blank' : ''}`}>
              {letter && (
                <>
                  <span className="rack-tile-letter">{isBlank ? '?' : letter}</span>
                  <span className="rack-tile-value">
                    {isBlank ? '0' : tileValues[letter] ?? ''}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="text"
        className="rack-input"
        value={rack}
        onChange={handleChange}
        placeholder="Enter tiles (? for blank)"
        maxLength={7}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
    </div>
  );
}
