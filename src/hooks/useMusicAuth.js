import { useState, useCallback, useRef } from 'react';

const API_URL = '/api';

export const useMusicAuth = () => {
    // User State
    const [user, setUser] = useState(null); // { username, hasPassword, songsCount }
    const [step, setStep] = useState('register'); // register, setup_songs, setup_password, login, verify, results

    // Data State
    const [songs, setSongs] = useState([]);
    const [currentChallenge, setCurrentChallenge] = useState(null);
    const [sessionMetrics, setSessionMetrics] = useState({
        success: false,
        rounds: [],
        startTime: null
    });

    // Track used songs in current session to avoid repeats
    const usedSongIds = useRef(new Set());

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const registerUser = async (username) => {
        try {
            setLoading(true);
            setError('');
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Registration failed');

            setUser(data.user);

            // Handle returning users who haven't finished setup
            if (data.isReturning) {
                if (data.user.hasPassword) {
                    setStep('login');
                } else {
                    // User exists but has no password -> Fetch existing songs and resume setup
                    const userRes = await fetch(`${API_URL}/users/${data.user.username}`);
                    const fullUser = await userRes.json();
                    setSongs(fullUser.songs || []);

                    // Resume at songs or password depending on progress
                    if (fullUser.songs && fullUser.songs.length >= 5) {
                        setStep('setup_password');
                    } else {
                        setStep('setup_songs');
                    }
                }
            } else {
                // Brand new user
                setStep('setup_songs');
                setSongs([]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addSong = async (query) => {
        if (!user) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/users/${user.username}/songs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add song');
            }

            const data = await res.json();
            setSongs(prev => [...prev, data.song]);
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const removeSong = async (id) => {
        if (!user) return;
        try {
            setLoading(true);
            await fetch(`${API_URL}/users/${user.username}/songs/${id}`, { method: 'DELETE' });
            setSongs(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const setPassword = async (password) => {
        if (!user) return;
        try {
            setLoading(true);
            await fetch(`${API_URL}/users/${user.username}/password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            startVerificationSession();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const login = async (password) => {
        if (!user) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, password })
            });

            if (!res.ok) throw new Error('Invalid password');
            startVerificationSession();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const startVerificationSession = async () => {
        setStep('verify');
        setSessionMetrics({
            startTime: Date.now(),
            rounds: [],
            success: false
        });
        usedSongIds.current.clear();
        await fetchNextChallenge();
    };

    const fetchNextChallenge = async () => {
        try {
            setLoading(true);
            const excludeParam = Array.from(usedSongIds.current).join(',');
            const res = await fetch(`${API_URL}/challenge/${user.username}?exclude=${excludeParam}`);

            if (!res.ok) throw new Error('Failed to get challenge');
            const data = await res.json();

            // Add new target to used list
            usedSongIds.current.add(data.targetId);

            setCurrentChallenge({
                targetId: data.targetId,
                options: data.options,
                audioUrl: data.audioUrl,
                startTime: Date.now()
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = async (songId) => {
        if (!currentChallenge) return;

        const isCorrect = songId === currentChallenge.targetId;
        const duration = Date.now() - currentChallenge.startTime;

        const newRounds = [...sessionMetrics.rounds, {
            success: isCorrect,
            duration,
            timestamp: new Date().toISOString()
        }];

        setSessionMetrics(prev => ({ ...prev, rounds: newRounds }));

        await fetch(`${API_URL}/metrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user.username,
                metric: {
                    type: 'verification_round',
                    session: user.hasPassword ? 'session_2' : 'session_1',
                    success: isCorrect,
                    duration,
                    timestamp: new Date().toISOString()
                }
            })
        });

        if (!isCorrect) {
            setStep('results');
            return false;
        }

        if (newRounds.length >= 3) {
            setStep('results');
            setSessionMetrics(prev => ({ ...prev, success: true }));
            return true;
        }

        await fetchNextChallenge();
        return true;
    };

    return {
        user,
        step,
        songs,
        currentChallenge,
        sessionMetrics,
        loading,
        error,
        registerUser,
        addSong,
        removeSong,
        setPassword,
        login,
        submitAnswer,
        setStep
    };
};
