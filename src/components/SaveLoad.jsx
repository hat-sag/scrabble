import { useState, useEffect } from 'react';
import './SaveLoad.css';

const STORAGE_KEY = 'crossplay-saved-games';

// --- Share via URL ---

function encodeGameState(boardState, rack) {
  // Compact encoding: only store occupied cells as "row,col,letter,blank" entries
  const cells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const cell = boardState[r][c];
      if (cell) {
        cells.push(`${r},${c},${cell.letter},${cell.isBlank ? 1 : 0}`);
      }
    }
  }
  const data = JSON.stringify({ c: cells, r: rack });
  return btoa(data);
}

function decodeGameState(hash) {
  try {
    const data = JSON.parse(atob(hash));
    const boardState = Array.from({ length: 15 }, () => Array(15).fill(null));
    for (const entry of data.c) {
      const [r, c, letter, blank] = entry.split(',');
      boardState[+r][+c] = { letter, isBlank: blank === '1' };
    }
    return { boardState, rack: data.r || '' };
  } catch {
    return null;
  }
}

export function loadFromURL() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const decoded = decodeGameState(hash);
  if (decoded) {
    // Clear the hash so it doesn't reload on refresh after changes
    window.history.replaceState(null, '', window.location.pathname);
  }
  return decoded;
}

function getSavedGames() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveGame(name, boardState, rack) {
  const games = getSavedGames();
  games[name] = { boardState, rack, savedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

function deleteGame(name) {
  const games = getSavedGames();
  delete games[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function autoSave(boardState, rack) {
  try {
    localStorage.setItem('crossplay-autosave', JSON.stringify({ boardState, rack }));
  } catch { /* ignore */ }
}

export function loadAutoSave() {
  try {
    const data = JSON.parse(localStorage.getItem('crossplay-autosave'));
    if (data && data.boardState) return data;
  } catch { /* ignore */ }
  return null;
}

export default function SaveLoad({ boardState, rack, onLoad }) {
  const [games, setGames] = useState(getSavedGames);
  const [saveName, setSaveName] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const hash = encodeGameState(boardState, rack);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (showPanel) setGames(getSavedGames());
  }, [showPanel]);

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    saveGame(name, boardState, rack);
    setGames(getSavedGames());
    setSaveName('');
  };

  const handleLoad = (name) => {
    const g = games[name];
    if (g) {
      onLoad(g.boardState, g.rack);
      setShowPanel(false);
    }
  };

  const handleDelete = (name, e) => {
    e.stopPropagation();
    deleteGame(name);
    setGames(getSavedGames());
  };

  const sortedGames = Object.entries(games).sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));

  if (!showPanel) {
    return (
      <button className="btn btn-secondary save-load-toggle" onClick={() => setShowPanel(true)}>
        Games
      </button>
    );
  }

  return (
    <div className="save-load-panel">
      <div className="save-load-header">
        <span className="save-load-title">Saved Games</span>
        <button className="save-load-close" onClick={() => setShowPanel(false)}>&times;</button>
      </div>

      <div className="save-row">
        <input
          type="text"
          className="save-name-input"
          placeholder="Game name..."
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button className="btn btn-primary save-btn" onClick={handleSave} disabled={!saveName.trim()}>
          Save
        </button>
      </div>

      <button className="btn btn-secondary share-btn" onClick={handleShare}>
        {copied ? 'Link copied!' : 'Share game link'}
      </button>

      {sortedGames.length === 0 ? (
        <div className="no-saves">No saved games yet</div>
      ) : (
        <div className="saves-list">
          {sortedGames.map(([name, data]) => (
            <div key={name} className="save-item" onClick={() => handleLoad(name)}>
              <div className="save-item-info">
                <div className="save-item-name">{name}</div>
                <div className="save-item-date">
                  {new Date(data.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              <button className="save-delete-btn" onClick={(e) => handleDelete(name, e)} title="Delete">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
