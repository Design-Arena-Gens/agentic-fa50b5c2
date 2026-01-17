## Jarvis Control Deck

Jarvis is a desktop-focused command hub that listens to natural language (text or voice) and executes curated actions on your workstation:

- Launch frequently used applications (`Launch VS Code`, `Open Spotify`)
- Open favorite websites (`Open the website YouTube`)
- Inspect local system health (`What is our system status?`)
- Trigger whitelisted shell commands (`Run the command status`)
- Organize quick scratch-pad notes (`Take note that...`, `Read my notes`)

> Remote deployments (including Vercel) run in a sandbox and cannot touch your computer. Use `npm run dev` or `npm run start` locally to control your machine.

### Prerequisites

- Node.js 18+
- npm 9+

### Run Locally

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and begin chatting with Jarvis.

### Production Build

```bash
npm run build
npm run start
```

### Extend Jarvis

- Add or modify command handlers in `src/lib/command-registry.ts`.
- Register extra quick prompts in `src/app/page.tsx`.
- Voice features rely on the Web Speech API. Unsupported browsers fall back to text only.
