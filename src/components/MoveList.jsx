import './MoveList.css';

export default function MoveList({ moves, totalMoves, elapsed, onHoverMove, onLeaveMove, onPlayMove, analyzing }) {
  if (analyzing) {
    return (
      <div className="move-list">
        <div className="move-list-header">
          <span className="analyzing-text">Analyzing...</span>
        </div>
      </div>
    );
  }

  if (moves.length === 0) {
    return (
      <div className="move-list">
        <div className="move-list-empty">
          Place tiles on the board, enter your rack, and tap Analyze.
        </div>
      </div>
    );
  }

  return (
    <div className="move-list">
      <div className="move-list-header">
        <span className="move-count">{totalMoves} moves found</span>
        <span className="move-time">{elapsed.toFixed(0)}ms</span>
      </div>
      <div className="move-list-items">
        {moves.slice(0, 15).map((move, i) => (
          <div
            key={i}
            className={`move-item ${move.isBingo ? 'bingo' : ''}`}
            onMouseEnter={() => onHoverMove(move)}
            onMouseLeave={onLeaveMove}
            onTouchStart={() => onHoverMove(move)}
            onTouchEnd={onLeaveMove}
          >
            <div className="move-rank">{i + 1}</div>
            <div className="move-details">
              <div className="move-word">
                {move.word}
                {move.isBingo && <span className="bingo-badge">BINGO!</span>}
              </div>
              <div className="move-meta">
                {move.position} {move.direction} · {move.tilesUsed} tile{move.tilesUsed !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="move-score">{move.score}</div>
            <button
              className="play-btn"
              onClick={(e) => { e.stopPropagation(); onPlayMove(move); }}
              title="Play this move"
            >
              Play
            </button>
          </div>
        ))}
      </div>
      {totalMoves > 15 && (
        <div className="move-list-footer">
          Showing top 15 of {totalMoves}
        </div>
      )}
    </div>
  );
}
