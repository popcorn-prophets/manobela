# Manobela

A driver monitoring system

## Project Structure

```txt
.
├── backend/  # FastAPI backend
└── mobile/   # Expo React Native mobile app
```

## Getting Started

### Prerequisites

- Python 3.11+, [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 18+, [pnpm](https://pnpm.io/installation)
- [Android Studio](https://developer.android.com/studio) with an emulator or an Android device
- [Pre-commit](https://pre-commit.com/) hooks:

```sh
pip install pre-commit
pre-commit install --install-hooks
```

### Installation

### 1. Clone the repo

```bash
git clone git@github.com:popcorn-prophets/manobela.git
cd manobela
```

### 2. Install dependencies

```bash
cd backend
uv sync
```

```bash
cd mobile
pnpm install
```

### 3. Run the Application

```bash
cd backend
uvicorn run main:app --reload
```

```bash
cd mobile
pnpm dev
```
