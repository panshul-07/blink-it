# Yield Accounting - Architecture 1 MVP

This repository contains a working MVP of **Architecture 1: Centralized Efficiency Oracle with Smart Contract Enforcement** from `Yield_Accounting_Architecture.docx`.

## What is implemented

- Digital Decentralized Passport (DDP) models for:
  - Processor identity
  - Input materials
  - Output materials (with lineage)
- Yield Standards Oracle:
  - Process-specific minimum and maximum yield ranges
  - Immutable-style update log for governance actions
- Token swap enforcement engine:
  - Input tokens burned and output tokens minted atomically
  - Oracle-validated yield checks
  - Hard rejection for physically impossible claims (`claimed_yield > max`)
  - Graduated responses for low-efficiency deviations (`claimed_yield < min`)
- In-memory token ledger for traceable balances
- Demo scenario and automated tests

## Run the demo

```bash
python3 demo.py
```

## Run tests

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```
