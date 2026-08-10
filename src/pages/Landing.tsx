import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Scroll reveal animation
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Background Video */}
      <div className="landing-video-container">
        <video
          autoPlay
          loop
          muted
          playsInline
          crossOrigin="anonymous"
          poster="https://miaoda-site-img.s3cdn.medo.dev/images/KLing_999f33c2-f6ec-4963-9583-9bbb30b064ee.jpg"
          className="landing-video-bg"
        >
          <source src="https://miaoda-site-img.s3cdn.medo.dev/videos/battlefield_cinematic_loop.mp4" type="video/mp4" />
        </video>
        <div className="landing-video-overlay" />
      </div>

      {/* Background Effects */}
      <div className="landing-bg-grid" />
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      {/* Content */}
      <div className="landing-content">
        {/* Navigation Bar */}
        <nav className="landing-nav">
          <div className="landing-nav-inner">
            <img src="/images/logo.png" alt="Arena Royal" className="landing-logo-img" />
            <div className="landing-nav-links">
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#brackets">Brackets</a>
              <a href="#economy">Economy</a>
            </div>
            <div className="landing-nav-buttons">
              <Link to="/sign-in" className="landing-btn-outline">
                Sign In
              </Link>
              <Link to="/sign-up" className="landing-btn-gradient">
                Join Arena
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-badge fade-in-up">
            <span className="landing-pulse-dot" />
            THE ULTIMATE COMPETITIVE GAMING PLATFORM
          </div>
          <h1 className="landing-hero-title fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span className="landing-gradient-white">WHERE GAMERS</span>
            <br />
            <span className="landing-gradient-purple">PROVE THEIR WORTH</span>
          </h1>
          <p className="landing-hero-subtitle fade-in-up" style={{ animationDelay: '0.2s' }}>
            Compete in <span className="landing-highlight">real tournaments</span>, climb the leaderboards, win real money, and settle every dispute — all in one platform built for serious players.
          </p>
          <div className="landing-hero-buttons fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/sign-up" className="landing-btn-cta">
              Start Competing
            </Link>
            <a href="#features" className="landing-btn-explore">
              Explore Features
            </a>
          </div>
          <div className="landing-stats fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="landing-stat">
              <div className="landing-stat-number">12+</div>
              <div className="landing-stat-label">GAMES</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">LIVE</div>
              <div className="landing-stat-label">TOURNAMENTS</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">A$</div>
              <div className="landing-stat-label">REAL REWARDS</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">~2 MIN</div>
              <div className="landing-stat-label">AVG DISPUTE TIME</div>
            </div>
          </div>
          <div className="landing-scroll-indicator">
            <div className="landing-scroll-text">SCROLL TO EXPLORE</div>
            <div className="landing-scroll-line" />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="landing-section">
          <div className="landing-section-inner">
            <div className="landing-section-tag scroll-reveal">PLATFORM FEATURES</div>
            <h2 className="landing-section-title scroll-reveal">Everything a Serious Gamer Needs</h2>
            <p className="landing-section-desc scroll-reveal">
              From browsing tournaments to collecting your winnings — Arena handles every layer of competitive gaming in one seamless experience.
            </p>
            <div className="landing-features-grid">
              <div className="landing-feature-card landing-feature-featured scroll-reveal">
                <div className="landing-feature-icon">🏆</div>
                <h3 className="landing-feature-title">Tournament System</h3>
                <p className="landing-feature-desc">
                  Browse by game, join upcoming tournaments or catch live action. Full bracket visualization with real-time match progression. Every tournament ends with a winner spotlight and complete route history from Round 1 to Champion.
                </p>
                <div className="landing-feature-tags">
                  <span className="landing-tag">Live Brackets</span>
                  <span className="landing-tag">Winner Spotlight</span>
                  <span className="landing-tag">Match History</span>
                  <span className="landing-tag">Real-time</span>
                </div>
              </div>
              <div className="landing-feature-card scroll-reveal">
                <div className="landing-feature-icon">⚡</div>
                <h3 className="landing-feature-title">Quick Match</h3>
                <p className="landing-feature-desc">
                  Challenge friends directly or accept open challenges. Instant 1v1 action without waiting for a full tournament bracket.
                </p>
                <div className="landing-feature-tags">
                  <span className="landing-tag">1v1 Challenges</span>
                  <span className="landing-tag">Friend Battles</span>
                </div>
              </div>
              <div className="landing-feature-card scroll-reveal">
                <div className="landing-feature-icon">🌍</div>
                <h3 className="landing-feature-title">World Chat</h3>
                <p className="landing-feature-desc">
                  The global hub where all Arena players connect, discuss tournaments, and discover each other. The only place to send friend requests.
                </p>
              </div>
              <div className="landing-feature-card scroll-reveal">
                <div className="landing-feature-icon">💬</div>
                <h3 className="landing-feature-title">Private Messages</h3>
                <p className="landing-feature-desc">
                  DM your friends, coordinate strategies, and send direct Quick Match challenges without going public.
                </p>
              </div>
              <div className="landing-feature-card scroll-reveal">
                <div className="landing-feature-icon">📊</div>
                <h3 className="landing-feature-title">Leaderboard</h3>
                <p className="landing-feature-desc">
                  Global rankings based on wins and performance. Climb the board and cement your legacy as one of Arena's top players.
                </p>
              </div>
              <div className="landing-feature-card scroll-reveal">
                <div className="landing-feature-icon">👤</div>
                <h3 className="landing-feature-title">Player Profile</h3>
                <p className="landing-feature-desc">
                  Your full competitive record — tournaments played, wins, total earnings, and complete tournament history all in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="landing-section landing-section-alt">
          <div className="landing-section-inner">
            <div className="landing-section-tag scroll-reveal">GETTING STARTED</div>
            <h2 className="landing-section-title scroll-reveal">From Sign Up to Champion in 4 Steps</h2>
            <div className="landing-steps">
              <div className="landing-steps-line" />
              <div className="landing-step scroll-reveal">
                <div className="landing-step-number">01</div>
                <h3 className="landing-step-title">Create Your Account</h3>
                <p className="landing-step-desc">
                  Sign up, set up your profile, and fund your Arena Wallet via Stripe to enter paid tournaments.
                </p>
              </div>
              <div className="landing-step scroll-reveal">
                <div className="landing-step-number">02</div>
                <h3 className="landing-step-title">Browse & Join</h3>
                <p className="landing-step-desc">
                  Pick your game, find a tournament that fits your level, and register before the deadline.
                </p>
              </div>
              <div className="landing-step scroll-reveal">
                <div className="landing-step-number">03</div>
                <h3 className="landing-step-title">Compete Live</h3>
                <p className="landing-step-desc">
                  Play your matches, watch the bracket update in real-time, and advance round by round.
                </p>
              </div>
              <div className="landing-step scroll-reveal">
                <div className="landing-step-number">04</div>
                <h3 className="landing-step-title">Win & Withdraw</h3>
                <p className="landing-step-desc">
                  Claim your winnings directly to your wallet and withdraw via Stripe. Real money, real stakes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Brackets Showcase Section */}
        <section id="brackets" className="landing-section">
          <div className="landing-section-inner">
            <div className="landing-section-tag scroll-reveal">SMART INFRASTRUCTURE</div>
            <h2 className="landing-section-title scroll-reveal">Live Brackets. Zero Confusion.</h2>
            <p className="landing-section-desc scroll-reveal">
              Brackets auto-generate based on participant count, update in real-time as matches complete, and archive every route to the championship when it's done.
            </p>
            <div className="landing-bracket-box scroll-reveal">
              <div className="landing-live-badge">
                <span className="landing-pulse-dot landing-pulse-red" />
                LIVE TOURNAMENT
              </div>
              <h3 className="landing-bracket-title">VALORANT — FRIDAY OPEN</h3>
              <p className="landing-bracket-subtitle">Quarter Finals in Progress • 8 Players Remaining</p>
              <div className="landing-bracket-visual">
                {/* Round 1 */}
                <div className="landing-bracket-round">
                  <div className="landing-bracket-round-label">QUARTER FINALS</div>
                  <div className="landing-bracket-matches">
                    <div className="landing-match-card">
                      <div className="landing-match-player landing-match-winner">
                        <span>XenoFX</span>
                        <span className="landing-match-score">2</span>
                      </div>
                      <div className="landing-match-divider" />
                      <div className="landing-match-player">
                        <span>ShadowK</span>
                        <span className="landing-match-score">1</span>
                      </div>
                    </div>
                    <div className="landing-match-card">
                      <div className="landing-match-player landing-match-winner">
                        <span>NightCr</span>
                        <span className="landing-match-score">2</span>
                      </div>
                      <div className="landing-match-divider" />
                      <div className="landing-match-player">
                        <span>BladeRN</span>
                        <span className="landing-match-score">0</span>
                      </div>
                    </div>
                    <div className="landing-match-card">
                      <div className="landing-match-player">
                        <span>PixelGd</span>
                        <span className="landing-match-score">1</span>
                      </div>
                      <div className="landing-match-divider" />
                      <div className="landing-match-player landing-match-winner">
                        <span>AceVlr</span>
                        <span className="landing-match-score">2</span>
                      </div>
                    </div>
                    <div className="landing-match-card">
                      <div className="landing-match-player landing-match-winner">
                        <span>GhostMv</span>
                        <span className="landing-match-score">2</span>
                      </div>
                      <div className="landing-match-divider" />
                      <div className="landing-match-player">
                        <span>ZeroFPS</span>
                        <span className="landing-match-score">1</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="landing-bracket-connector">
                  <div className="landing-connector-line" />
                </div>
                {/* Round 2 */}
                <div className="landing-bracket-round">
                  <div className="landing-bracket-round-label">SEMI FINALS</div>
                  <div className="landing-bracket-matches">
                    <div className="landing-match-card">
                      <div className="landing-match-player landing-match-winner">
                        <span>XenoFX</span>
                        <span className="landing-match-score">2</span>
                      </div>
                      <div className="landing-match-divider" />
                      <div className="landing-match-player">
                        <span>NightCr</span>
                        <span className="landing-match-score">1</span>
                      </div>
                    </div>
                    <div className="landing-match-card landing-match-in-progress">
                      <div className="landing-match-player">
                        <span>AceVlr</span>
                        <span className="landing-match-score">—</span>
                      </div>
                      <div className="landing-match-divider" />
                      <div className="landing-match-player">
                        <span>GhostMv</span>
                        <span className="landing-match-score">—</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="landing-bracket-connector">
                  <div className="landing-connector-line" />
                </div>
                {/* Round 3 */}
                <div className="landing-bracket-round">
                  <div className="landing-bracket-round-label">GRAND FINAL</div>
                  <div className="landing-bracket-matches">
                    <div className="landing-match-card landing-match-pending">
                      <div className="landing-match-player">
                        <span>XenoFX</span>
                        <span className="landing-match-score">—</span>
                      </div>
                      <div className="landing-match-divider" />
                      <div className="landing-match-player">
                        <span>TBD</span>
                        <span className="landing-match-score">—</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="landing-bracket-connector">
                  <div className="landing-connector-line" />
                </div>
                {/* Round 4 */}
                <div className="landing-bracket-round">
                  <div className="landing-bracket-round-label">CHAMPION</div>
                  <div className="landing-bracket-matches">
                    <div className="landing-winner-card">
                      <div className="landing-winner-crown">👑</div>
                      <div className="landing-winner-name">TBD</div>
                      <div className="landing-winner-status">In Progress</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dispute System Section */}
        <section className="landing-section">
          <div className="landing-section-inner">
            <div className="landing-section-tag scroll-reveal">FAIR PLAY GUARANTEED</div>
            <h2 className="landing-section-title scroll-reveal">The Only Platform With a Real Dispute System</h2>
            <p className="landing-section-desc scroll-reveal">
              When a match result is contested, Arena's referee system kicks in. Average resolution time: 2 minutes.
            </p>
            <div className="landing-dispute-box scroll-reveal">
              <div className="landing-dispute-left">
                <h3 className="landing-dispute-title">4-Stage Resolution Pipeline</h3>
                <p className="landing-dispute-desc">
                  Referees and admins are notified instantly. They review bracket context, chat with both players, and resolve with full authority to correct the outcome.
                </p>
                <div className="landing-dispute-stages">
                  <div className="landing-stage-card">
                    <div className="landing-stage-dot landing-stage-green" />
                    <div className="landing-stage-info">
                      <div className="landing-stage-name">Confirmed Disputes</div>
                      <div className="landing-stage-desc">Verified and logged for referee assignment</div>
                    </div>
                    <div className="landing-stage-number">01</div>
                  </div>
                  <div className="landing-stage-card">
                    <div className="landing-stage-dot landing-stage-amber" />
                    <div className="landing-stage-info">
                      <div className="landing-stage-name">Pending Review</div>
                      <div className="landing-stage-desc">Awaiting referee acknowledgement</div>
                    </div>
                    <div className="landing-stage-number">02</div>
                  </div>
                  <div className="landing-stage-card">
                    <div className="landing-stage-dot landing-stage-purple" />
                    <div className="landing-stage-info">
                      <div className="landing-stage-name">Active Investigation</div>
                      <div className="landing-stage-desc">Referee in live chat with both players</div>
                    </div>
                    <div className="landing-stage-number">03</div>
                  </div>
                  <div className="landing-stage-card">
                    <div className="landing-stage-dot landing-stage-blue" />
                    <div className="landing-stage-info">
                      <div className="landing-stage-name">Resolved</div>
                      <div className="landing-stage-desc">Outcome confirmed, bracket updated</div>
                    </div>
                    <div className="landing-stage-number">04</div>
                  </div>
                </div>
              </div>
              <div className="landing-dispute-right">
                <div className="landing-big-stat">~2 MIN</div>
                <div className="landing-big-stat-label">AVERAGE RESOLUTION TIME</div>
                <div className="landing-info-box">
                  <p className="landing-info-small">No other tournament platform offers this.</p>
                  <p className="landing-info-main">Real referees. Real outcomes. No ghosting.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Economy Section */}
        <section id="economy" className="landing-section landing-section-alt">
          <div className="landing-section-inner">
            <div className="landing-section-tag scroll-reveal">ARENA ECONOMY</div>
            <h2 className="landing-section-title scroll-reveal">Real Money. Real Transactions.</h2>
            <p className="landing-section-desc scroll-reveal">
              Arena Currency powers the entire platform economy — backed by Stripe and live exchange rates so you always know what you're playing for.
            </p>
            <div className="landing-economy-grid">
              <div className="landing-economy-card scroll-reveal">
                <div className="landing-economy-icon">💳</div>
                <h3 className="landing-economy-title">Stripe Integration</h3>
                <p className="landing-economy-desc">
                  Add funds and withdraw winnings securely via Stripe. Real money in, real money out.
                </p>
              </div>
              <div className="landing-economy-card scroll-reveal">
                <div className="landing-economy-icon">💰</div>
                <h3 className="landing-economy-title">Arena Currency Wallet</h3>
                <p className="landing-economy-desc">
                  Your spendable balance, transaction history, and full financial overview in one dashboard.
                </p>
              </div>
              <div className="landing-economy-card scroll-reveal">
                <div className="landing-economy-icon">📈</div>
                <h3 className="landing-economy-title">Live Exchange Rates</h3>
                <p className="landing-economy-desc">
                  USD to any currency, updated live — so international players always transact with full transparency.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="landing-section landing-cta-section">
          <div className="landing-cta-glow" />
          <div className="landing-cta-inner">
            <div className="landing-section-tag scroll-reveal">READY TO COMPETE?</div>
            <h2 className="landing-cta-title scroll-reveal">YOUR ARENA AWAITS</h2>
            <p className="landing-cta-desc scroll-reveal">
              Stop watching others compete. Register, find your tournament, and prove you belong at the top.
            </p>
            <div className="landing-cta-buttons scroll-reveal">
              <Link to="/sign-up" className="landing-btn-cta-large">
                Create Free Account
              </Link>
              <Link to="/tournaments" className="landing-btn-explore-large">
                Browse Tournaments
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <img src="/images/logo.png" alt="Arena Royal" className="landing-footer-logo-img" />
            <div className="landing-footer-text">© 2026 Arena. Where Gamers Showcase Their Real Talents.</div>
          </div>
        </footer>
        {/* Footer */}
        <footer className="landing-footer py-20 border-t border-white/5 relative z-10 bg-black/40 backdrop-blur-md">
          <div className="landing-section-inner">
            <div className="flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex flex-col items-center md:items-start gap-4">
                <img src="/images/logo.png" alt="Arena Royal" className="landing-logo-img" />
                <p className="text-muted-foreground text-sm max-w-xs text-center md:text-left">
                  The world's premier competitive gaming platform for serious players.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-10 text-sm font-medium">
                <div className="flex flex-col gap-4">
                  <span className="text-white uppercase tracking-wider text-xs">Platform</span>
                  <a href="#features" className="text-muted-foreground hover:text-white transition-colors">Features</a>
                  <a href="#how-it-works" className="text-muted-foreground hover:text-white transition-colors">How It Works</a>
                  <a href="#economy" className="text-muted-foreground hover:text-white transition-colors">Economy</a>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-white uppercase tracking-wider text-xs">Legal</span>
                  <Link to="/privacy" className="text-muted-foreground hover:text-white transition-colors">Privacy Policy</Link>
                  <Link to="/terms" className="text-muted-foreground hover:text-white transition-colors">Terms & Conditions</Link>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-white uppercase tracking-wider text-xs">Connect</span>
                  <a href="https://twitch.tv" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition-colors">Twitch</a>
                  <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition-colors">Discord</a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition-colors">Twitter</a>
                </div>
              </div>
            </div>
            <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
              <p>&copy; 2026 Nebula Dark LLC. All rights reserved.</p>
              <div className="flex gap-6">
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                <a href="#" className="hover:text-white transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
