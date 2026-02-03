import { useState, useRef, useEffect } from 'react';

export const ChallengeCard = ({ challenge, streak, onSubmit }) => {
    const [playing, setPlaying] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [status, setStatus] = useState('idle');
    const audioRef = useRef(null);

    useEffect(() => {
        setPlaying(false);
        setSelectedId(null);
        setStatus('idle');
    }, [challenge]);

    const handlePlay = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setPlaying(true);
            setTimeout(() => setPlaying(false), 5000);
        }
    };

    const handleOptionClick = (song) => {
        if (status !== 'idle') return;
        setSelectedId(song.id);
        const isCorrect = onSubmit(song.id);
        setStatus(isCorrect ? 'success' : 'failure');
    };

    if (!challenge) return null;

    return (
        <div>
            <h3 className="mb-4">Identify the Song</h3>

            <div className="text-center mb-4">
                <button
                    onClick={handlePlay}
                    className={`btn ${playing ? 'btn-dark' : 'btn-outline-dark'} btn-lg`}
                    disabled={playing}
                >
                    {playing ? 'Playing...' : 'Play Clip (1s)'}
                </button>
            </div>

            <audio ref={audioRef} src={challenge.audioUrl} />

            <div className="mb-4">
                <div className="d-grid gap-2">
                    {challenge.options.map((song) => (
                        <button
                            key={song.id}
                            onClick={() => handleOptionClick(song)}
                            disabled={status !== 'idle'}
                            className={`btn text-start ${status !== 'idle' && song.id === challenge.targetId
                                ? 'btn-success'
                                : status === 'failure' && song.id === selectedId
                                    ? 'btn-danger'
                                    : 'btn-outline-secondary'
                                }`}
                        >
                            {song.title}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-center">
                <small className="text-muted">Step {Math.min(streak + 1, 3)} of 3</small>
                <div className="progress mt-2" style={{ height: '4px' }}>
                    <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${(streak / 3) * 100}%` }}
                        aria-valuenow={streak}
                        aria-valuemin="0"
                        aria-valuemax="3"
                    ></div>
                </div>
            </div>
        </div>
    );
};
