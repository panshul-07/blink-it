# Yield Accounting - Architecture 1 Fullstack Project

Implementation of **Architecture 1: Centralized Efficiency Oracle with Smart Contract Enforcement** using the requested stack:

- Backend: `Node.js + Express + GraphQL`
- Frontend: `React + TypeScript`
- Blockchain: `Solidity + Hardhat`
- Core logic: DDPs, yield standards oracle, atomic swap enforcement, graduated response system, alerts, and lineage

## Project Structure

- `/Users/panshulaj/Documents/New project/backend` - GraphQL API service
- `/Users/panshulaj/Documents/New project/frontend` - React dashboard
- `/Users/panshulaj/Documents/New project/blockchain` - smart contracts, deploy scripts, tests
- `/Users/panshulaj/Documents/New project/src` - original Python MVP logic (kept as reference)
- `/Users/panshulaj/Documents/New project/tests` - Python unit tests for MVP logic

## Backend Features

- Processor/Input/Output DDP data models
- Yield standards oracle management per process type
- Token ledger events (mint/burn)
- Swap enforcement rules:
  - Reject claims above `maximumPct`
  - Accept normal range
  - Below minimum uses graduated response:
    - 1st violation: warning
    - 2nd violation: 5% mint reduction
    - 3rd violation: audit flag + 10% mint reduction
    - Persistent violations: suspension
- Seeded demo data (`grain_cleaning`, `fruit_sorting`, sample processors)

## Frontend Features

- Operations dashboard with:
  - Oracle standards table
  - Processor and token stats
  - Input token minting form
  - Swap execution form
  - Output passport feed
  - Alerts feed

## Run Fullstack App

```bash
npm install
npm run dev
```

Services:

- Backend GraphQL: `http://localhost:4000/graphql`
- Frontend UI: `http://localhost:5173`

## Live Working Output

- Final live frontend (runtime-hosted): `https://rawcdn.githack.com/panshul-07/blink-it/master/docs/index.html`
- GitHub Pages target link (enable in repo settings): `https://panshul-07.github.io/blink-it/`
- Primary deployment: GitHub Pages via `/Users/panshulaj/Documents/New project/.github/workflows/deploy-pages.yml`
- Fallback deployment (already committed): static build under `/Users/panshulaj/Documents/New project/docs`
- Note: live build uses frontend mock mode (`VITE_USE_MOCK=true`) so Architecture 1 flows work without a hosted backend.

### If URL shows 404, enable branch-based Pages in 30 seconds

1. Open repo settings: `Settings -> Pages`
2. Under `Build and deployment`, set `Source = Deploy from a branch`
3. Set `Branch = master` and `Folder = /docs`
4. Save and wait 1-2 minutes
5. Open: `https://panshul-07.github.io/blink-it/`

## Blockchain Contracts

Contracts:
- `/Users/panshulaj/Documents/New project/blockchain/contracts/YieldStandardsOracle.sol`
- `/Users/panshulaj/Documents/New project/blockchain/contracts/YieldAccountingSwap.sol`

Commands:

```bash
npm install
npm run compile:chain
npm run test:chain
```

## Legacy Python MVP

Still runnable:

```bash
python3 demo.py
python3 -m unittest discover -s tests -p "test_*.py" -v
```
