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
