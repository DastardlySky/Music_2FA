import { useState } from 'react';

export const SetupPanel = ({ songs, addSong, removeSong, onComplete }) => {
    const [query, setQuery] = useState('');
    const [pending, setPending] = useState([]); // Array of queries currently downloading
    const [error, setError] = useState('');

    const handleAdd = async (e) => {
        e.preventDefault();
        const currentQuery = query.trim();
        if (!currentQuery) return;

        // Check for local duplicates in existing songs
        if (songs.find(s => s.title.toLowerCase() === currentQuery.toLowerCase())) {
            setError(`"${currentQuery}" is already in your list.`);
            return;
        }

        // Check if we're at the limit
        if (songs.length + pending.length >= 5) {
            setError("You can only add exactly 5 songs.");
            return;
        }

        setQuery(''); // Clear immediately for next entry
        setError('');
        setPending(prev => [...prev, currentQuery]); // Mark as pending

        try {
            await addSong(currentQuery);
        } catch (err) {
            setError(`${currentQuery}: ${err.message}`);
        } finally {
            // Remove from pending list
            setPending(prev => prev.filter(q => q !== currentQuery));
        }
    };

    const isLimitReached = songs.length + pending.length >= 5;

    return (
        <div>
            <h3 className="mb-4">Setup</h3>

            <p className="text-muted small mb-4">
                Please select <strong>exactly 5 unique songs</strong> for your security profile.
            </p>

            <form onSubmit={handleAdd} className="mb-4">
                <div className="mb-3">
                    <label htmlFor="songInput" className="form-label">
                        Add songs ({songs.length + pending.length}/5)
                    </label>
                    <div className="input-group">
                        <input
                            id="songInput"
                            type="text"
                            autoComplete="off"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={isLimitReached ? "Limit reached" : "Type song title and hit Enter..."}
                            className="form-control"
                            disabled={isLimitReached}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!query.trim() || isLimitReached}
                        >
                            Add
                        </button>
                    </div>
                </div>
                {error && <div className="text-danger mt-2 small">{error}</div>}
            </form>

            <div className="mb-4">
                <h6>Your Songs ({songs.length}/5)</h6>
                {(songs.length === 0 && pending.length === 0) ? (
                    <p className="text-muted small">No songs added yet.</p>
                ) : (
                    <ul className="list-group">
                        {/* Pending downloads */}
                        {pending.map((q, i) => (
                            <li key={`pending-${i}`} className="list-group-item list-group-item-light d-flex justify-content-between align-items-center">
                                <span className="text-muted">
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Downloading: {q}...
                                </span>
                            </li>
                        ))}
                        {/* Finished songs */}
                        {songs.map((song) => (
                            <li key={song.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <span className="text-truncate">{song.title}</span>
                                <button
                                    onClick={() => removeSong(song.id)}
                                    className="btn btn-sm btn-outline-danger"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button
                onClick={onComplete}
                disabled={songs.length !== 5 || pending.length > 0}
                className="btn btn-success w-100"
            >
                {pending.length > 0
                    ? 'Wait for downloads...'
                    : songs.length < 5
                        ? `Add ${5 - songs.length} more songs`
                        : songs.length > 5
                            ? 'Too many songs - remove some'
                            : 'Continue'}
            </button>
        </div>
    );
};
