# TabulaRasa

TabulaRasa is a 100% client-side privacy actuator designed to streamline and automate GDPR/RODO Article 17 "Right to Erasure" requests targeting data brokers. 

## Philosophy

Data brokers continuously harvest, analyze, and sell personal information, often hiding behind opaque "legitimate interest" clauses. This creates systemic risks. Under the GDPR (and local equivalents like RODO in Poland), users have the fundamental right to demand any organization delete their personal data permanently.

TabulaRasa provides a standardized framework to assert your right to be forgotten effortlessly.

It features:
- **Zero Tracking Architecture**: Client-side only. We do not track you, nor do we store your data on application servers.
- **Local Storage Only**: Form data, settings, and authentications are stored safely in your browser via `localStorage`.
- **Pre-Compiled Targets**: Comes with an open-source database of common data brokers, their contact DPOs, and mailing addresses.
- **Direct Mailto Execution**: Assembles a legal directive on your machine and pushes it securely to your native email client.

## Technologies Used

- **React 19**
- **Vite 6**
- **Tailwind CSS v4**
- **Zustand** (Local store)
- **Framer Motion** (Micro-interactions)

## Development Setup

```bash
# Install dependencies
npm install

# Start local server
npm run dev
```

For AI agents modifying this project, please consult `AGENTS.md` for strict architectural guidelines.
