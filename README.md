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

#### 1. Clone the repo

```sh
git clone git@github.com:popcorn-prophets/manobela.git
cd manobela
```

#### 2. Install dependencies

```sh
cd backend
uv sync
```

```sh
cd mobile
pnpm install
```

#### 3. Create `.env` files

Copy the `.env.example` file to `.env` in both the backend and mobile directories.

```sh
cp .env.example .env
```

Make sure to update variables in the `.env` file with your own values.

#### 4. Install [pre-commit](https://pre-commit.com/) hooks

```sh
pipx install pre-commit
pre-commit install --install-hooks
```

#### 5. Run the application

Run simultaneously the backend and the mobile app in separate terminals:

```sh
cd backend
source .venv/bin/activate
python run.py
# or uv run run.py
```

```sh
cd mobile
pnpm android  # or `pnpm ios`
```
If you get: 
```bash
could not connect to TCP port 5554: cannot connect to 127.0.0.1:5554: No connection could be made because the target machine actively refused it.
```
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" kill-server
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" start-server
```

Then try starting again.
