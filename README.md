<div align="center">

[![Contributors](https://img.shields.io/github/contributors/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/graphs/contributors)
[![Forks](https://img.shields.io/github/forks/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/network/members)
[![Stargazers](https://img.shields.io/github/stars/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/stargazers)
[![License](https://img.shields.io/github/license/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/blob/master/LICENSE)

  <a href="https://github.com/popcorn-prophets/manobela">
    <img src="docs/images/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Manobela</h1>

  <p align="center">
    A driver monitoring system
    <br />
    <a href="https://github.com/popcorn-prophets/manobela">View Demo</a>
    &middot;
    <a href="https://github.com/popcorn-prophets/manobela/issues/new?labels=bug&template=bug_report.md">Report Bug</a>
    &middot;
    <a href="https://github.com/popcorn-prophets/manobela/issues/new?labels=enhancement&template=feature_request.md">Request Feature</a>
  </p>
</div>

## About The Project

Manobela is a real-time driver monitoring system that uses computer vision to detect unsafe driving behaviors with only a mobile phone.

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

### 3. Install [pre-commit](https://pre-commit.com/) hooks

```sh
pip install pre-commit
pre-commit install --install-hooks
```

### 4. Run the application

```bash
cd backend
uv run uvicorn app.main:app --reload
```

```bash
cd mobile
pnpm dev
```
