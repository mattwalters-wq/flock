'use client';
import { useEffect } from 'react';

// flock — marketing homepage (apex: fans-flock.com).
// Faithful port of the Claude Design handoff (flock-homepage/index.html + styles.css).
// CSS is injected via a <style> so it only applies while this page is mounted and
// never leaks into tenant community pages. Markup is rendered verbatim; the
// scroll-reveal + sticky-nav behaviour is ported into the effect below.

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');";

const CSS = `
:root {
  --paper:#FBFAF8; --surface:#FFFFFF; --surface-2:#F4F1EC;
  --ink:#1A1714; --ink-2:#5A534C; --ink-3:#938A80;
  --line:#E8E3DB; --line-2:#DCD6CC;
  --accent:#E0202F; --accent-deep:#B71724; --accent-ink:#FFFFFF; --accent-wash:#FCEBEC; --accent-line:#F3CDD1;
  --sans:"Schibsted Grotesk", system-ui, -apple-system, sans-serif;
  --mono:"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --container:1200px; --gutter:clamp(20px,5vw,48px); --section-y:clamp(72px,11vh,152px); --radius:16px; --radius-lg:22px;
}
.fm-root *, .fm-root *::before, .fm-root *::after { box-sizing:border-box; }
.fm-root * { margin:0; }
.fm-root { font-family:var(--sans); background:var(--paper); color:var(--ink); line-height:1.5; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
html.fm-html { scroll-behavior:smooth; }
body.fm-body { background:var(--paper); }
.fm-root img, .fm-root svg { display:block; max-width:100%; }
.fm-root a { color:inherit; text-decoration:none; }
.fm-root ::selection { background:var(--accent); color:#fff; }
.fm-root .wrap { width:100%; max-width:var(--container); margin-inline:auto; padding-inline:var(--gutter); }
.fm-root .section { padding-block:var(--section-y); }
.fm-root .section--tight { padding-block:clamp(48px,7vh,96px); }
.fm-root .label { font-family:var(--mono); font-size:0.72rem; letter-spacing:0.22em; text-transform:uppercase; color:var(--ink-3); font-weight:500; }
.fm-root .label--accent { color:var(--accent); }
.fm-root .label .star { color:var(--accent); }
.fm-root .eyebrow { display:inline-flex; align-items:center; gap:0.6em; margin-bottom:clamp(20px,3vw,32px); }
.fm-root .h1 { font-weight:800; font-size:clamp(2.7rem,7.2vw,5.75rem); line-height:0.98; letter-spacing:-0.035em; text-wrap:balance; }
.fm-root .h2 { font-weight:800; font-size:clamp(2rem,4.8vw,3.5rem); line-height:1.02; letter-spacing:-0.03em; text-wrap:balance; }
.fm-root .h3 { font-weight:700; font-size:clamp(1.15rem,1.6vw,1.4rem); line-height:1.15; letter-spacing:-0.015em; }
.fm-root .lede { font-size:clamp(1.075rem,1.55vw,1.3rem); line-height:1.55; color:var(--ink-2); text-wrap:pretty; }
.fm-root .accent-word { color:var(--accent); }
.fm-root .muted { color:var(--ink-3); }
.fm-root .btn { display:inline-flex; align-items:center; justify-content:center; gap:0.55em; padding:0.95em 1.5em; border-radius:999px; font-weight:600; font-size:0.98rem; letter-spacing:-0.01em; border:1px solid transparent; transition:background .18s ease,color .18s ease,border-color .18s ease,transform .18s ease; white-space:nowrap; }
.fm-root .btn:active { transform:translateY(1px); }
.fm-root .btn--primary { background:var(--accent); color:var(--accent-ink); }
.fm-root .btn--primary:hover { background:var(--accent-deep); }
.fm-root .btn--ghost { background:transparent; color:var(--ink); border-color:var(--line-2); }
.fm-root .btn--ghost:hover { border-color:var(--ink); background:var(--surface); }
.fm-root .btn--sm { padding:0.7em 1.2em; font-size:0.9rem; }
.fm-root .nav { position:sticky; top:0; z-index:50; background:color-mix(in srgb, var(--paper) 82%, transparent); backdrop-filter:saturate(1.4) blur(14px); border-bottom:1px solid transparent; transition:border-color .2s ease, background .2s ease; }
.fm-root .nav.is-stuck { border-color:var(--line); }
.fm-root .nav__inner { display:flex; align-items:center; justify-content:space-between; height:72px; }
.fm-root .brand { display:inline-flex; align-items:baseline; gap:0.25em; font-weight:800; font-size:1.4rem; letter-spacing:-0.04em; }
.fm-root .brand .star { color:var(--accent); font-size:0.8em; }
.fm-root .nav__links { display:flex; align-items:center; gap:clamp(20px,2.4vw,40px); }
.fm-root .nav__links a.link { font-size:0.95rem; color:var(--ink-2); font-weight:500; transition:color .15s ease; }
.fm-root .nav__links a.link:hover { color:var(--ink); }
.fm-root .nav__cta { display:flex; align-items:center; gap:14px; }
.fm-root .hero { padding-top:clamp(48px,8vh,104px); padding-bottom:clamp(36px,5vh,64px); }
.fm-root .hero__head { max-width:18ch; }
.fm-root .hero h1 { margin-bottom:clamp(22px,2.6vw,30px); }
.fm-root .hero__lede { max-width:46ch; margin-bottom:clamp(28px,3vw,38px); }
.fm-root .hero__actions { display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin-bottom:22px; }
.fm-root .hero__meta { font-family:var(--mono); font-size:0.82rem; color:var(--ink-3); letter-spacing:0.01em; }
.fm-root .hero__meta b { color:var(--ink-2); font-weight:500; }
.fm-root .frame { margin-top:clamp(48px,7vw,92px); border:1px solid var(--line-2); border-radius:var(--radius-lg); background:var(--surface); box-shadow:0 1px 0 rgba(26,23,20,0.02),0 30px 60px -42px rgba(26,23,20,0.28); overflow:hidden; }
.fm-root .frame__bar { display:flex; align-items:center; gap:7px; padding:13px 18px; border-bottom:1px solid var(--line); background:var(--surface-2); }
.fm-root .frame__bar i { width:11px; height:11px; border-radius:999px; background:var(--line-2); display:block; }
.fm-root .frame__bar .url { margin-left:14px; font-family:var(--mono); font-size:0.78rem; color:var(--ink-3); }
.fm-root .ph { position:relative; background-color:var(--surface-2); background-image:repeating-linear-gradient(-45deg, transparent 0 11px, color-mix(in srgb, var(--ink-3) 8%, transparent) 11px 12px); display:grid; place-items:center; }
.fm-root .ph__tag { font-family:var(--mono); font-size:0.78rem; letter-spacing:0.06em; color:var(--ink-3); background:var(--paper); border:1px solid var(--line); padding:7px 13px; border-radius:999px; }
.fm-root .frame .ph { aspect-ratio:16 / 8.4; }
.fm-root .trust { border-block:1px solid var(--line); background:var(--paper); }
.fm-root .trust__inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:24px 40px; padding-block:26px; }
.fm-root .trust__label { font-family:var(--mono); font-size:0.74rem; letter-spacing:0.16em; text-transform:uppercase; color:var(--ink-3); }
.fm-root .trust__logos { display:flex; flex-wrap:wrap; align-items:center; gap:clamp(20px,3vw,44px); }
.fm-root .trust__logos span { font-weight:700; font-size:clamp(1rem,1.4vw,1.25rem); letter-spacing:-0.02em; color:var(--ink-3); opacity:.85; }
.fm-root .head { max-width:60ch; margin-bottom:clamp(40px,5vw,64px); }
.fm-root .head .h2 { margin-top:16px; }
.fm-root .head .lede { margin-top:22px; }
.fm-root .grid { display:grid; gap:clamp(16px,1.6vw,22px); }
.fm-root .grid--3 { grid-template-columns:repeat(3,1fr); }
.fm-root .card { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); padding:clamp(24px,2.4vw,34px); transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease; }
.fm-root .card:hover { border-color:var(--line-2); box-shadow:0 24px 44px -36px rgba(26,23,20,0.32); }
.fm-root .card__sym { font-family:var(--mono); color:var(--accent); font-size:1.1rem; width:40px; height:40px; display:grid; place-items:center; border:1px solid var(--accent-line); background:var(--accent-wash); border-radius:11px; margin-bottom:22px; }
.fm-root .card h3 { margin-bottom:10px; }
.fm-root .card p { color:var(--ink-2); font-size:0.98rem; line-height:1.55; }
.fm-root .steps { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(20px,3vw,56px); }
.fm-root .step { position:relative; }
.fm-root .step__n { font-family:var(--mono); font-size:0.78rem; letter-spacing:0.12em; color:var(--accent); display:flex; align-items:center; gap:12px; margin-bottom:22px; }
.fm-root .step__n::after { content:""; height:1px; flex:1; background:var(--line); }
.fm-root .step h3 { margin-bottom:12px; font-size:clamp(1.35rem,2vw,1.75rem); font-weight:700; letter-spacing:-0.02em; }
.fm-root .step p { color:var(--ink-2); font-size:1.02rem; line-height:1.6; max-width:34ch; }
.fm-root .rewards { background:var(--ink); color:var(--paper); border-radius:clamp(20px,3vw,34px); padding:clamp(36px,5vw,72px); }
.fm-root .rewards .label { color:rgba(255,255,255,0.6); }
.fm-root .rewards .h2 { color:#fff; }
.fm-root .rewards .lede { color:rgba(255,255,255,0.72); }
.fm-root .reward-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.12); border-radius:var(--radius); overflow:hidden; margin-top:clamp(36px,4vw,56px); }
.fm-root .reward { background:var(--ink); padding:clamp(22px,2vw,30px); min-height:178px; display:flex; flex-direction:column; }
.fm-root .reward__sym { font-family:var(--mono); color:var(--accent); font-size:1.05rem; margin-bottom:auto; }
.fm-root .reward h4 { font-size:1.08rem; font-weight:600; letter-spacing:-0.01em; margin:22px 0 8px; }
.fm-root .reward p { font-size:0.9rem; color:rgba(255,255,255,0.6); line-height:1.5; }
.fm-root .compare { border:1px solid var(--line); border-radius:var(--radius-lg); overflow:hidden; background:var(--surface); }
.fm-root .compare__row { display:grid; grid-template-columns:1.4fr 1fr 2.2fr; align-items:center; gap:18px; padding:clamp(18px,2vw,26px) clamp(20px,2.4vw,34px); border-bottom:1px solid var(--line); }
.fm-root .compare__row:last-child { border-bottom:0; }
.fm-root .compare__name { font-weight:700; font-size:1.08rem; letter-spacing:-0.015em; }
.fm-root .compare__price { font-family:var(--mono); font-size:0.84rem; color:var(--ink-3); }
.fm-root .compare__desc { color:var(--ink-2); font-size:0.96rem; }
.fm-root .compare__tag { font-family:var(--mono); font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-3); border:1px solid var(--line-2); padding:4px 9px; border-radius:999px; white-space:nowrap; }
.fm-root .compare__row--flock { background:var(--accent-wash); }
.fm-root .compare__row--flock .compare__name { color:var(--accent-deep); }
.fm-root .compare__row--flock .compare__desc { color:var(--ink); }
.fm-root .compare__row--flock .compare__tag { color:var(--accent); border-color:var(--accent-line); background:#fff; }
.fm-root .compare__row--flock .compare__price { color:var(--accent); }
.fm-root .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(20px,3vw,40px); border-top:1px solid var(--line); margin-top:clamp(48px,5vw,72px); padding-top:clamp(40px,4vw,56px); }
.fm-root .stats--flush { border-top:0; margin-top:0; padding-top:0; }
.fm-root .stat__num { font-size:clamp(2.4rem,4.5vw,3.4rem); font-weight:800; letter-spacing:-0.04em; line-height:1; }
.fm-root .stat__num .accent-word { color:var(--accent); }
.fm-root .stat__label { color:var(--ink-2); font-size:0.98rem; margin-top:12px; max-width:26ch; }
.fm-root .cta { text-align:center; background:var(--surface); border:1px solid var(--line); border-radius:clamp(22px,3vw,34px); padding:clamp(40px,6vw,88px) clamp(24px,5vw,64px); }
.fm-root .cta .h2 { margin:18px auto 0; max-width:18ch; }
.fm-root .cta__price { font-size:clamp(3.4rem,8vw,5.5rem); font-weight:800; letter-spacing:-0.04em; line-height:1; margin:clamp(22px,3vw,32px) 0 6px; }
.fm-root .cta__sub { font-family:var(--mono); font-size:0.85rem; color:var(--ink-3); }
.fm-root .cta__list { list-style:none; padding:0; display:grid; grid-template-columns:repeat(3,auto); justify-content:center; gap:12px clamp(28px,4vw,52px); margin:clamp(34px,4vw,48px) auto clamp(36px,4vw,48px); text-align:left; width:fit-content; }
.fm-root .cta__list li { display:flex; align-items:center; gap:10px; font-size:0.98rem; color:var(--ink); }
.fm-root .cta__list .tick { color:var(--accent); font-weight:700; }
.fm-root .cta__actions { display:flex; flex-wrap:wrap; gap:14px; justify-content:center; margin-bottom:18px; }
.fm-root .cta__fine { font-family:var(--mono); font-size:0.8rem; color:var(--ink-3); }
.fm-root .footer { border-top:1px solid var(--line); padding-block:clamp(44px,5vw,72px); }
.fm-root .footer__top { display:flex; flex-wrap:wrap; justify-content:space-between; gap:28px 40px; align-items:flex-start; }
.fm-root .footer__tag { color:var(--ink-2); font-size:0.96rem; max-width:30ch; margin-top:14px; }
.fm-root .footer__cols { display:flex; flex-wrap:wrap; gap:clamp(36px,5vw,88px); }
.fm-root .footer__col h5 { font-family:var(--mono); font-size:0.72rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink-3); margin-bottom:16px; font-weight:500; }
.fm-root .footer__col a { display:block; color:var(--ink-2); font-size:0.96rem; padding:5px 0; transition:color .15s ease; }
.fm-root .footer__col a:hover { color:var(--accent); }
.fm-root .footer__bottom { display:flex; flex-wrap:wrap; justify-content:space-between; gap:16px; align-items:center; margin-top:clamp(40px,5vw,64px); padding-top:26px; border-top:1px solid var(--line); }
.fm-root .footer__bottom small { font-family:var(--mono); font-size:0.78rem; color:var(--ink-3); }
@media (prefers-reduced-motion: no-preference) {
  html.fm-js .fm-root .reveal { opacity:0; transform:translateY(18px); transition:opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
  html.fm-js .fm-root .reveal.in { opacity:1; transform:none; }
}
html.fm-force-reveal .fm-root .reveal { opacity:1 !important; transform:none !important; transition:none !important; }
@media (max-width:940px) { .fm-root .grid--3, .fm-root .steps, .fm-root .reward-grid, .fm-root .stats, .fm-root .cta__list { grid-template-columns:repeat(2,1fr); } .fm-root .reward-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:720px) {
  .fm-root .nav__links { display:none; }
  .fm-root .nav__cta .btn--ghost { display:none; }
  .fm-root .grid--3, .fm-root .steps, .fm-root .stats, .fm-root .compare__row, .fm-root .reward-grid, .fm-root .cta__list, .fm-root .footer__top { grid-template-columns:1fr; }
  .fm-root .compare__row { grid-template-columns:1fr; gap:8px; }
  .fm-root .compare__row .compare__tag { justify-self:start; }
  .fm-root .reward-grid { grid-template-columns:1fr 1fr; }
  .fm-root .footer__top { flex-direction:column; }
  .fm-root .frame .ph { aspect-ratio:16 / 13; }
}
@media (max-width:460px) { .fm-root .reward-grid { grid-template-columns:1fr; } }
`;

const BODY_HTML = `
<header class="nav" id="fm-nav">
  <div class="wrap nav__inner">
    <a class="brand" href="#top" aria-label="flock home">flock<span class="star">✦</span></a>
    <nav class="nav__links" aria-label="Primary">
      <a class="link" href="#how">how it works</a>
      <a class="link" href="#rewards">rewards</a>
      <a class="link" href="#compare">replaces</a>
      <a class="link" href="#pricing">pricing</a>
    </nav>
    <div class="nav__cta">
      <a class="link" href="/login" style="font-size:.95rem;font-weight:500;color:var(--ink-2);white-space:nowrap">sign in</a>
      <a class="btn btn--primary btn--sm" href="/start">get started</a>
    </div>
  </div>
</header>

<main id="top">
  <section class="section hero">
    <div class="wrap">
      <div class="eyebrow">
        <span class="label label--accent"><span class="star">✦</span>&nbsp; the future of fan relationships</span>
      </div>
      <h1 class="h1 hero__head">social media <span class="accent-word">broke</span> the artist–fan relationship.</h1>
      <p class="lede hero__lede">You built an audience on platforms that own your fans, throttle your reach, and take the relationship hostage. Flock gives it back — a community you own, on your own terms.</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="/start">launch your community&nbsp;<span class="star">✦</span></a>
        <a class="btn btn--ghost" href="#how">see how it works</a>
      </div>
      <p class="hero__meta"><b>free in beta</b> · no credit card needed · early artists get a founder rate</p>

      <div class="frame reveal" role="img" aria-label="Placeholder for product screenshot of an artist's flock community dashboard">
        <div class="frame__bar">
          <i></i><i></i><i></i>
          <span class="url">yourname.fans-flock.com</span>
        </div>
        <div class="ph">
          <span class="ph__tag">product shot · community dashboard · 1600×840</span>
        </div>
      </div>
    </div>
  </section>

  <section class="trust">
    <div class="wrap trust__inner">
      <span class="trust__label">built for independent artists &amp; their teams</span>
      <div class="trust__logos" aria-label="Replaces these tools">
        <span>your website</span>
        <span>linktree</span>
        <span>patreon</span>
        <span>mailchimp</span>
        <span>bandsintown</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="head reveal">
        <span class="label label--accent">the problem</span>
        <h2 class="h2">you have 50,000 followers.<br /><span class="muted">500 of them see your posts.</span></h2>
      </div>
      <div class="grid grid--3">
        <article class="card reveal">
          <div class="card__sym">↓</div>
          <h3 class="h3">organic reach is dead</h3>
          <p>Instagram shows your post to 2–5% of followers. Reaching the rest costs money, every single time.</p>
        </article>
        <article class="card reveal">
          <div class="card__sym">✕</div>
          <h3 class="h3">you don't own the list</h3>
          <p>The platform shuts down, changes the rules, or bans you — and your audience disappears overnight.</p>
        </article>
        <article class="card reveal">
          <div class="card__sym">∅</div>
          <h3 class="h3">no real connection</h3>
          <p>Likes and comments build dopamine loops for the platform, not loyalty or revenue for you.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section" id="how" style="background:var(--surface-2);">
    <div class="wrap">
      <div class="head reveal">
        <span class="label label--accent">how it works</span>
        <h2 class="h2">your community. your currency. your rules.</h2>
        <p class="lede">Every artist gets a fully branded fan community with its own loyalty system — their own economy, their own language, their own world. Here's the loop.</p>
      </div>
      <div class="steps">
        <div class="step reveal">
          <div class="step__n">step 01</div>
          <h3>fans join your world</h3>
          <p>A fully white-label community on your own subdomain. Fans see your brand — never "flock."</p>
        </div>
        <div class="step reveal">
          <div class="step__n">step 02</div>
          <h3>they earn your currency</h3>
          <p>Stamps, points, echoes, drops — whatever fits your world. Fans earn it by showing up: check-ins, streams, shares.</p>
        </div>
        <div class="step reveal">
          <div class="step__n">step 03</div>
          <h3>they unlock rewards</h3>
          <p>Spend currency on tiers, merch, signed vinyl, livestreams and more. The relationship is yours, forever.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="rewards">
    <div class="wrap">
      <div class="rewards reveal">
        <span class="label">everything included</span>
        <h2 class="h2" style="margin-top:16px;max-width:16ch;">one platform for the whole fan relationship.</h2>
        <p class="lede" style="margin-top:20px;max-width:48ch;">No add-ons, no revenue share. Every flock community ships with all of it from day one.</p>
        <div class="reward-grid">
          <div class="reward"><div class="reward__sym">◎</div><h4>your own subdomain</h4><p>Fully white-label, or bring your own domain.</p></div>
          <div class="reward"><div class="reward__sym">✦</div><h4>custom fan currency</h4><p>Name it, theme it, fans earn it.</p></div>
          <div class="reward"><div class="reward__sym">♪</div><h4>show check-ins</h4><p>Fans check in at gigs with a code.</p></div>
          <div class="reward"><div class="reward__sym">♛</div><h4>reward tiers</h4><p>Postcards, merch, signed vinyl, zoom calls.</p></div>
          <div class="reward"><div class="reward__sym">▤</div><h4>member feeds</h4><p>Solo or band — each member gets a feed.</p></div>
          <div class="reward"><div class="reward__sym">▶</div><h4>livestream embeds</h4><p>Go live on YouTube or Twitch, in-house.</p></div>
          <div class="reward"><div class="reward__sym">⌖</div><h4>fan map</h4><p>See where your community actually is.</p></div>
          <div class="reward"><div class="reward__sym">✉</div><h4>direct email digest</h4><p>Reach every fan — no algorithm in between.</p></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--tight" id="compare">
    <div class="wrap">
      <div class="head reveal">
        <span class="label label--accent">your website. your link in bio. your social. all of it.</span>
        <h2 class="h2">one login replaces five tools.</h2>
      </div>
      <div class="compare reveal">
        <div class="compare__row">
          <div class="compare__name">your website</div>
          <div class="compare__price">$20–50/mo</div>
          <div class="compare__desc">squarespace, wix, wordpress. static. no engagement. <span class="compare__tag">replaced</span></div>
        </div>
        <div class="compare__row">
          <div class="compare__name">linktree</div>
          <div class="compare__price">$5–24/mo</div>
          <div class="compare__desc">a list of links. no community. no fans. just clicks. <span class="compare__tag">replaced</span></div>
        </div>
        <div class="compare__row">
          <div class="compare__name">patreon</div>
          <div class="compare__price">8–12% of revenue</div>
          <div class="compare__desc">they take a cut of every dollar your fans pay you. <span class="compare__tag">replaced</span></div>
        </div>
        <div class="compare__row">
          <div class="compare__name">mailchimp</div>
          <div class="compare__price">$20+/mo</div>
          <div class="compare__desc">one-way broadcast. no community, no engagement. <span class="compare__tag">replaced</span></div>
        </div>
        <div class="compare__row">
          <div class="compare__name">bandsintown</div>
          <div class="compare__price">free → paid</div>
          <div class="compare__desc">show listings only. fans still belong to them. <span class="compare__tag">replaced</span></div>
        </div>
        <div class="compare__row compare__row--flock">
          <div class="compare__name">flock&nbsp;<span class="star" style="color:var(--accent)">✦</span></div>
          <div class="compare__price">free in beta</div>
          <div class="compare__desc">website + link in bio + community + shows + rewards + email. yours forever. <span class="compare__tag">all of it</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="background:var(--surface-2);">
    <div class="wrap">
      <div class="head reveal">
        <span class="label label--accent">the math</span>
        <h2 class="h2">own the relationship. keep the upside.</h2>
      </div>
      <div class="stats stats--flush reveal">
        <div class="stat">
          <div class="stat__num">100<span class="accent-word">%</span></div>
          <p class="stat__label">of the fan relationship stays yours — no revenue share, ever.</p>
        </div>
        <div class="stat">
          <div class="stat__num">5<span class="accent-word">→1</span></div>
          <p class="stat__label">tools collapsed into a single platform you actually own.</p>
        </div>
        <div class="stat">
          <div class="stat__num">$<span class="accent-word">0</span></div>
          <p class="stat__label">to launch in beta — early artists keep a founder rate.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="pricing">
    <div class="wrap">
      <div class="cta reveal">
        <span class="label label--accent">beta access</span>
        <div class="cta__price">free</div>
        <p class="cta__sub">for independent artists while we build</p>
        <ul class="cta__list">
          <li><span class="tick">✓</span> your own community</li>
          <li><span class="tick">✓</span> custom fan currency</li>
          <li><span class="tick">✓</span> show check-ins</li>
          <li><span class="tick">✓</span> reward tiers</li>
          <li><span class="tick">✓</span> member feeds</li>
          <li><span class="tick">✓</span> direct email digest</li>
          <li><span class="tick">✓</span> fan map</li>
          <li><span class="tick">✓</span> livestream embeds</li>
          <li><span class="tick">✓</span> no revenue share. ever.</li>
        </ul>
        <div class="cta__actions">
          <a class="btn btn--primary" href="/start">launch your community&nbsp;<span class="star">✦</span></a>
          <a class="btn btn--ghost" href="#compare">see what's included</a>
        </div>
        <p class="cta__fine">free in beta · no credit card needed · early artists get a founder rate</p>
      </div>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="wrap">
    <div class="footer__top">
      <div>
        <a class="brand" href="#top">flock<span class="star">✦</span></a>
        <p class="footer__tag">fan communities for independent artists. your community, your currency, your rules.</p>
      </div>
      <div class="footer__cols">
        <div class="footer__col">
          <h5>product</h5>
          <a href="#how">how it works</a>
          <a href="#rewards">rewards</a>
          <a href="#compare">what it replaces</a>
          <a href="#pricing">pricing</a>
        </div>
        <div class="footer__col">
          <h5>company</h5>
          <a href="/start">get started</a>
          <a href="/contact">contact</a>
          <a href="/login">sign in</a>
        </div>
        <div class="footer__col">
          <h5>legal</h5>
          <a href="/privacy">privacy</a>
          <a href="/terms">terms</a>
        </div>
      </div>
    </div>
    <div class="footer__bottom">
      <small>© 2026 flock · made for independent artists</small>
      <small>free in beta ✦</small>
    </div>
  </div>
</footer>
`;

export function MarketingHome() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('fm-js');
    document.body.classList.add('fm-body');

    const nav = document.getElementById('fm-nav');
    const onScroll = () => { if (nav) nav.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // reveal-on-scroll — content is never permanently hidden (failsafe force-reveal).
    const reveals = Array.from(document.querySelectorAll('.fm-root .reveal'));
    const forceReveal = () => root.classList.add('fm-force-reveal');
    let io;
    if (!('IntersectionObserver' in window)) {
      forceReveal();
    } else {
      let ioFired = false;
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { ioFired = true; e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach((el) => io.observe(el));
      requestAnimationFrame(() => reveals.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
      }));
      setTimeout(() => { if (!ioFired) forceReveal(); }, 1000);
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (io) io.disconnect();
      root.classList.remove('fm-js', 'fm-force-reveal');
      document.body.classList.remove('fm-body');
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT + CSS }} />
      <div className="fm-root" dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </>
  );
}
