export const welcome = () => {
     const date = new Date(Date.now());
     const hours = date.getHours();
     let greeting = '';

     // Time-based greeting
     if (hours < 12) {
          greeting = 'Good morning! 🌞 Let’s get the day started!';
     } else if (hours < 18) {
          greeting = 'Good afternoon! 🌤️ Keep the momentum going!';
     } else {
          greeting = 'Good evening! 🌙 Hope you had a fantastic day!';
     }

     return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Austin Backend</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

      :root {
        --ink: #0f172a;
        --muted: #475569;
        --accent: #ff7a59;
        --accent-2: #22c55e;
        --panel: rgba(255, 255, 255, 0.9);
        --shadow: 0 20px 60px rgba(2, 6, 23, 0.18);
        --ring: 0 0 0 1px rgba(15, 23, 42, 0.08);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
        color: var(--ink);
        background: radial-gradient(1200px 600px at 10% -20%, #ffe1d6, transparent 60%),
                    radial-gradient(1000px 600px at 120% 10%, #d7f4e3, transparent 55%),
                    linear-gradient(120deg, #f8fafc 0%, #eef2ff 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 20px 56px;
      }

      .wrap {
        width: min(1100px, 100%);
        background: var(--panel);
        border-radius: 28px;
        box-shadow: var(--shadow);
        padding: 36px 36px 28px;
        position: relative;
        overflow: hidden;
      }

      .glow {
        position: absolute;
        inset: -40% -10% auto auto;
        height: 320px;
        width: 320px;
        background: radial-gradient(circle, rgba(255, 122, 89, 0.25), transparent 70%);
        filter: blur(10px);
        pointer-events: none;
      }

      .hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }

      .title {
        font-size: clamp(2rem, 3.5vw, 3rem);
        margin: 0 0 8px;
        letter-spacing: -0.02em;
      }

      .subtitle {
        font-size: 1.1rem;
        color: var(--muted);
        margin: 0;
      }

      .chip-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }

      .chip {
        padding: 8px 14px;
        border-radius: 999px;
        background: #fff;
        box-shadow: var(--ring);
        font-size: 0.9rem;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .chip span {
        height: 8px;
        width: 8px;
        border-radius: 999px;
        background: var(--accent-2);
        display: inline-block;
      }

      .time {
        font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        background: #0f172a;
        color: #e2e8f0;
        padding: 14px 16px;
        border-radius: 14px;
        font-size: 0.95rem;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 16px;
        margin-top: 28px;
      }

      .card {
        background: #ffffff;
        border-radius: 16px;
        padding: 18px;
        box-shadow: var(--ring);
        min-height: 120px;
      }

      .card h3 {
        margin: 0 0 8px;
        font-size: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
      }

      .card p {
        margin: 0;
        font-size: 1.05rem;
      }

      .pulse {
        height: 10px;
        width: 10px;
        border-radius: 999px;
        background: var(--accent-2);
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        animation: pulse 2s infinite;
        display: inline-block;
        margin-right: 8px;
      }

      .footer {
        margin-top: 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .cta {
        background: var(--ink);
        color: #fff;
        border-radius: 12px;
        padding: 10px 16px;
        font-size: 0.95rem;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
        70% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }

      @media (max-width: 720px) {
        .wrap { padding: 28px 22px; }
        .time { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <div class="glow"></div>
      <div class="hero">
        <div>
          <h1 class="title">Austin Backend is live</h1>
          <p class="subtitle">${greeting} Production-grade APIs are ready to serve.</p>
          <div class="chip-row">
            <div class="chip"><span></span> Health: OK</div>
            <div class="chip">Environment: API Gateway</div>
            <div class="chip">Version: v1</div>
          </div>
        </div>
        <div class="time">${date}</div>
      </div>

      <section class="grid">
        <div class="card">
          <h3>Status</h3>
          <p><span class="pulse"></span>Server listening on port 5000</p>
        </div>
        <div class="card">
          <h3>Auth</h3>
          <p>Admin & user auth enabled with JWT + refresh tokens.</p>
        </div>
        <div class="card">
          <h3>Streams</h3>
          <p>Live streaming modules are armed and ready.</p>
        </div>
        <div class="card">
          <h3>Docs</h3>
          <p>Check API docs in the repository for full routes.</p>
        </div>
      </section>

      <div class="footer">
        <span>Tip: Use /api/v1 for all routes.</span>
        <a class="cta" href="/api/v1">Explore API</a>
      </div>
    </main>
  </body>
</html>
     `;
};
