import Link from 'next/link';

export const metadata = {
  title: 'flock · fan communities for independent artists',
  description: 'Social media is broken for artists. Flock gives you a direct line to your fans - your own community, your own currency, your own rules.',
};

export default function MarketingPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0E0C0F', color: '#F5EFE6', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .fade-1 { animation: fadeUp 0.8s ease-out 0.1s both; }
        .fade-2 { animation: fadeUp 0.8s ease-out 0.25s both; }
        .fade-3 { animation: fadeUp 0.8s ease-out 0.4s both; }
        .fade-4 { animation: fadeUp 0.8s ease-out 0.55s both; }
        .cta-btn { background: #8B1A2B; color: #F5EFE6; border: none; padding: 16px 36px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .cta-btn:hover { background: #A31F33; transform: translateY(-1px); }
        .ghost-btn { background: transparent; color: #F5EFE6; border: 1px solid rgba(245,239,230,0.25); padding: 14px 28px; border-radius: 10px; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .ghost-btn:hover { border-color: rgba(245,239,230,0.6); }
        .feature-card { background: rgba(245,239,230,0.04); border: 1px solid rgba(245,239,230,0.08); border-radius: 14px; padding: 28px; transition: all 0.2s; }
        .feature-card:hover { background: rgba(245,239,230,0.07); border-color: rgba(245,239,230,0.15); }
        .artist-card { background: rgba(245,239,230,0.05); border: 1px solid rgba(245,239,230,0.1); border-radius: 12px; padding: 20px 24px; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14,12,15,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(245,239,230,0.06)' }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>
          flock <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8B1A2B', letterSpacing: '2px', verticalAlign: 'middle', marginLeft: 4 }}>✦</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#how" style={{ color: 'rgba(245,239,230,0.6)', textDecoration: 'none', fontSize: 13 }}>how it works</a>
          <a href="#pricing" style={{ color: 'rgba(245,239,230,0.6)', textDecoration: 'none', fontSize: 13 }}>pricing</a>
          <a href="/start" className="cta-btn" style={{ padding: '10px 22px', fontSize: 13 }}>get started</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(139,26,43,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="fade-1" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>
          ✦ the future of fan relationships
        </div>

        <h1 className="fade-2" style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '-2px', marginBottom: 28, maxWidth: 900 }}>
          social media<br />
          <span style={{ color: '#8B1A2B' }}>broke</span> the artist<br />
          fan relationship.
        </h1>

        <p className="fade-3" style={{ fontSize: 18, color: 'rgba(245,239,230,0.6)', lineHeight: 1.7, maxWidth: 540, marginBottom: 48 }}>
          You built an audience on platforms that own your fans, throttle your reach, and take the relationship hostage. Flock gives it back.
        </p>

        <div className="fade-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/start" className="cta-btn">launch your community ✦</a>
          <a href="#how" className="ghost-btn">see how it works</a>
        </div>

        <div className="fade-4" style={{ marginTop: 80, display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { stat: 'your domain', label: 'fully white-label' },
            { stat: 'your rules', label: 'no algorithm' },
            { stat: 'your fans', label: 'direct relationship' },
          ].map(s => (
            <div key={s.stat} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F5EFE6', marginBottom: 4 }}>{s.stat}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,239,230,0.4)', letterSpacing: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM STATEMENT */}
      <section style={{ padding: '100px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>the problem</div>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 48 }}>
          you have 50,000 followers.<br />
          <span style={{ color: 'rgba(245,239,230,0.35)' }}>500 of them see your posts.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            { icon: '↓', title: 'organic reach is dead', desc: 'Instagram shows your post to 2-5% of followers. The rest costs money.' },
            { icon: '✗', title: 'you don\'t own the list', desc: 'Platform shuts down, bans you, or changes the algorithm. Your audience disappears.' },
            { icon: '⌀', title: 'no real connection', desc: 'Likes and comments don\'t build loyalty. They build dopamine loops for the platform.' },
            { icon: '↗', title: 'they take the relationship', desc: 'The platform has the data. The relationship. The leverage. You have the content.' },
          ].map(p => (
            <div key={p.title} className="feature-card">
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, color: '#8B1A2B', marginBottom: 12 }}>{p.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(245,239,230,0.5)', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUTION */}
      <section id="how" style={{ padding: '100px 24px', background: 'rgba(245,239,230,0.02)', borderTop: '1px solid rgba(245,239,230,0.06)', borderBottom: '1px solid rgba(245,239,230,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>the solution</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 16 }}>
            your community.<br />your currency.<br />your rules.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.5)', lineHeight: 1.7, maxWidth: 520, marginBottom: 64 }}>
            Flock gives every artist a fully branded fan community with a custom loyalty system - their own economy, their own language, their own world.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 64 }}>
            {[
              { icon: '◎', title: 'your own subdomain', desc: 'thestamps.fans-flock.com or connect your own domain. Fully white-label. Fans never see "flock".' },
              { icon: '✦', title: 'custom fan currency', desc: 'Call them stamps. points. chips. pins. tokens. crystals. Whatever fits your world. Fans earn them, spend them, flex them.' },
              { icon: '○', title: 'member feeds', desc: 'Solo or band. Each member gets their own feed tab. Fans follow the artists and the people behind them.' },
              { icon: '♫', title: 'show check-ins', desc: 'Fans check in at shows with a code. They earn currency, you get attendance data, everyone wins.' },
              { icon: '♛', title: 'reward tiers', desc: 'Design a loyalty ladder. Postcards, merch, signed vinyl, zoom calls, meet and greets. You set the milestones.' },
              { icon: '✉', title: 'direct email', desc: 'Send a community roundup to every fan who opted in. No algorithm. No throttle. Just your words in their inbox.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: '#C9922A', marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,239,230,0.5)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Currency showcase */}
          <div style={{ background: 'rgba(245,239,230,0.04)', border: '1px solid rgba(245,239,230,0.08)', borderRadius: 16, padding: '40px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,239,230,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 20 }}>every artist, their own language</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { name: 'The Stamps', currency: 'stamps', color: '#8B1A2B' },
                { name: 'Emma Donovan', currency: 'dreamtime', color: '#C9922A' },
                { name: 'Dustin Tebbutt', currency: 'echoes', color: '#6B8B6A' },
                { name: 'some DJ', currency: 'drops', color: '#6B5B8D' },
                { name: 'indie band', currency: 'pins', color: '#4A7A8B' },
                { name: 'your artist', currency: 'yours', color: '#8B6A2B' },
              ].map(a => (
                <div key={a.name} className="artist-card" style={{ minWidth: 140 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color + '33', border: `1px solid ${a.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontFamily: "'DM Mono', monospace", fontSize: 14, color: a.color }}>✦</div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: a.color }}>earns {a.currency}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '100px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>how it works</div>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 56 }}>up in minutes. yours forever.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { num: '01', title: 'sign up and name your world', desc: 'Choose your community name, your subdomain, your brand colours, and what to call your fan currency. Takes 3 minutes.' },
            { num: '02', title: 'invite your fans', desc: 'Share your link. Fans sign up, create a profile, and start earning currency just by being there.' },
            { num: '03', title: 'post, connect, reward', desc: 'Post to your community feed. Audio drops, videos, polls, deep cuts. Fans earn currency for engaging.' },
            { num: '04', title: 'play the long game', desc: 'Fans climb your loyalty ladder. The ones who show up the most, come to shows, refer friends - they earn the rewards that matter.' },
          ].map((step, i) => (
            <div key={step.num} style={{ display: 'flex', gap: 32, padding: '32px 0', borderBottom: i < 3 ? '1px solid rgba(245,239,230,0.08)' : 'none' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#8B1A2B', minWidth: 36, paddingTop: 4 }}>{step.num}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: 'rgba(245,239,230,0.5)', lineHeight: 1.7 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 24px', background: 'rgba(245,239,230,0.02)', borderTop: '1px solid rgba(245,239,230,0.06)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>pricing</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 16 }}>simple. honest. no surprises.</h2>
          <p style={{ fontSize: 15, color: 'rgba(245,239,230,0.5)', marginBottom: 48 }}>We don't take a cut of your merch or ticket sales. We just charge for the platform.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              {
                name: 'indie',
                price: '$39',
                period: '/month',
                desc: 'For solo artists getting started',
                features: ['1 artist community', 'up to 500 fans', 'custom fan currency', 'all core features', 'email support'],
                cta: 'start free trial',
                highlight: false,
              },
              {
                name: 'pro',
                price: '$79',
                period: '/month',
                desc: 'For artists and bands serious about their community',
                features: ['1 community', 'unlimited fans', 'custom domain', 'all core features', 'fan map & analytics', 'priority support'],
                cta: 'start free trial',
                highlight: true,
              },
              {
                name: 'label',
                price: 'let\'s talk',
                period: '',
                desc: 'For labels and managers with multiple artists',
                features: ['multiple communities', 'white-label', 'custom integrations', 'dedicated support', 'SLA'],
                cta: 'get in touch',
                highlight: false,
              },
            ].map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? 'rgba(139,26,43,0.12)' : 'rgba(245,239,230,0.04)',
                border: `1px solid ${plan.highlight ? 'rgba(139,26,43,0.4)' : 'rgba(245,239,230,0.08)'}`,
                borderRadius: 16, padding: '32px 28px',
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: plan.highlight ? '#8B1A2B' : 'rgba(245,239,230,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: 'rgba(245,239,230,0.4)' }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(245,239,230,0.5)', marginBottom: 28, lineHeight: 1.5 }}>{plan.desc}</div>
                <div style={{ marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13, color: 'rgba(245,239,230,0.7)' }}>
                      <span style={{ color: '#8B1A2B', fontFamily: "'DM Mono', monospace" }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <a href="/start" className={plan.highlight ? 'cta-btn' : 'ghost-btn'} style={{ display: 'block', textAlign: 'center', width: '100%' }}>{plan.cta}</a>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.3)', letterSpacing: '0.5px' }}>
            14-day free trial · no credit card required · cancel anytime
          </div>
        </div>
      </section>

      {/* MANIFESTO / CLOSING CTA */}
      <section style={{ padding: '120px 24px', textAlign: 'center', maxWidth: 740, margin: '0 auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>the manifesto</div>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 28 }}>
          the best fan relationships<br />
          <span style={{ color: 'rgba(245,239,230,0.35)' }}>were never built on social media.</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.5)', lineHeight: 1.8, marginBottom: 20 }}>
          They were built in living rooms. At intimate shows. Through email lists and forums and MySpace pages and zines. Direct. Unmediated. Real.
        </p>
        <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.5)', lineHeight: 1.8, marginBottom: 52 }}>
          Flock is the infrastructure for that. A place you own. Fans who chose to be there. A community that grows because people give a damn, not because an algorithm decided to show your post today.
        </p>
        <a href="/start" className="cta-btn" style={{ fontSize: 16, padding: '18px 48px' }}>build your community ✦</a>
        <div style={{ marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.3)' }}>free for 14 days · no credit card needed</div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(245,239,230,0.06)', padding: '40px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700 }}>flock ✦</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,239,230,0.3)', letterSpacing: '0.5px' }}>
          fan communities for independent artists · built by monda management
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="/start" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>get started</a>
          <a href="mailto:hello@fans-flock.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>contact</a>
        </div>
      </footer>
    </div>
  );
}
