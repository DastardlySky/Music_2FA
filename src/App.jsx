import { useState, useEffect } from 'react';
import { useMusicAuth } from './hooks/useMusicAuth';
import { ChallengeCard } from './components/ChallengeCard';
import { SetupPanel } from './components/SetupPanel';

function App() {
  const {
    user,
    step,
    songs,
    currentChallenge,
    sessionMetrics,
    error,
    registerUser,
    login,
    setPassword,
    addSong,
    removeSong,
    submitAnswer,
    setStep
  } = useMusicAuth();

  const [inputVal, setInputVal] = useState('');

  // Clear input when step changes
  useEffect(() => {
    setInputVal('');
  }, [step]);

  // Handlers
  const handleRegister = (e) => {
    e.preventDefault();
    if (inputVal.trim()) registerUser(inputVal.trim());
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputVal.trim()) login(inputVal.trim());
  };

  const handleSetPassword = (e) => {
    e.preventDefault();
    if (inputVal.trim()) setPassword(inputVal.trim());
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">

          <div className="mb-4 text-center">
            <h1>Music 2FA Study</h1>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* REGISTER */}
          {step === 'register' && (
            <div className="card p-4">
              <h3>Welcome</h3>
              <p>Please enter your participant name (username).</p>
              <form onSubmit={handleRegister}>
                <input
                  className="form-control mb-3"
                  placeholder="Username"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary w-100">Start</button>
              </form>
            </div>
          )}

          {/* LOGIN (SESSION 2) */}
          {step === 'login' && (
            <div className="card p-4">
              <h3>Welcome Back, {user?.username}</h3>
              <p>Please enter your password to verify it's you.</p>
              <form onSubmit={handleLogin}>
                <input
                  type="password"
                  name="password_fake"
                  className="form-control mb-3"
                  placeholder="Password"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  autoFocus
                  autoComplete="new-password"
                />
                <button type="submit" className="btn btn-primary w-100">Login</button>
              </form>
            </div>
          )}

          {/* SETUP SONGS */}
          {step === 'setup_songs' && (
            <SetupPanel
              songs={songs}
              addSong={addSong}
              removeSong={removeSong}
              onComplete={() => {
                setStep('setup_password');
                setInputVal('');
              }}
            />
          )}

          {/* SETUP PASSWORD */}
          {step === 'setup_password' && (
            <div className="card p-4">
              <h3>Create Password</h3>
              <p>Create a simple password for your account.</p>
              <form onSubmit={handleSetPassword}>
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="Password"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary w-100">Set Password</button>
              </form>
            </div>
          )}

          {/* VERIFY */}
          {step === 'verify' && (
            <ChallengeCard
              challenge={currentChallenge}
              streak={sessionMetrics.rounds.length}
              onSubmit={submitAnswer}
            />
          )}

          {/* RESULTS */}
          {step === 'results' && (
            <div className="text-center py-5">
              <h2 className={sessionMetrics.success ? "text-success" : "text-danger"}>
                {sessionMetrics.success ? "Access Granted" : "Access Denied"}
              </h2>

              <div className="mt-4 text-start card p-3 bg-light">
                <p><strong>Total Time:</strong> {
                  sessionMetrics.rounds.length > 0
                    ? ((new Date(sessionMetrics.rounds[sessionMetrics.rounds.length - 1].timestamp) - sessionMetrics.startTime) / 1000).toFixed(1)
                    : 0
                }s</p>
                <p><strong>Rounds:</strong> {sessionMetrics.rounds.length}/3</p>
                <ul className="small text-muted">
                  {sessionMetrics.rounds.map((r, i) => (
                    <li key={i}>Round {i + 1}: {r.success ? "Success" : "Fail"} ({r.duration}ms)</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="btn btn-outline-primary mt-4"
              >
                Reset / Next Participant
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
