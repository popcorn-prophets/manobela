# Self-Hosting

## Overview

You can self-host the Manobela backend on your own infrastructure – a personal computer, Raspberry Pi, VPS, or any machine that can run Python and FastAPI.

## Requirements

- Python 3.11+
- Network accessibility (local network or public IP with port forwarding)
- Storage space for video processing and models

## Initial Setup

Follow [backend setup](backend/setup.md) to install and configure the backend. Make sure to set `PORT` and credentials in `.env` for your deployment environment.

## Access

- **Local network**: Access via `http://<local-ip>:8000`
- **Public access**: Configure port forwarding on your router or use a reverse proxy like nginx
- **API docs**: Available at `http://<host>:8000/docs`

## Running as a Service

### systemd (Linux)

Create `/etc/systemd/system/manobela.service`:

```ini
[Unit]
Description=Manobela Backend
After=network.target

[Service]
Type=simple
User=<your-user>
WorkingDirectory=/path/to/manobela/backend
Environment="PATH=/path/to/manobela/backend/.venv/bin"
ExecStart=/path/to/manobela/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```sh
sudo systemctl enable manobela
sudo systemctl start manobela
```

### PM2 (Cross-platform)

```sh
pm2 start run.py --name manobela --interpreter python3
pm2 save
pm2 startup
```

## Docker Option

For containerized deployment:

```sh
cd backend
docker-compose up -d
```

The container exposes port 8000 and reads `.env` automatically.

## Hardware Recommendations

- **Raspberry Pi**: 4GB+ RAM recommended for inference workloads
- **PC/Server**: Any modern system works; more CPU/GPU improves processing speed
- **Storage**: At least 2GB for models and temporary video files

## Security Notes

- Use HTTPS in production (reverse proxy with Let's Encrypt)
- Restrict API access with authentication if exposing publicly
- Keep dependencies updated
- Monitor logs for unusual activity

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for common issues.
