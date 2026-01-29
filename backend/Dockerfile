# Use official Python slim image
FROM python:3.12-slim-trixie

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.9.25 /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy only manifest files for dependency installation first
COPY pyproject.toml uv.lock /app/

# Disable development dependencies
ENV UV_NO_DEV=1
# Compile bytecode
# ENV UV_COMPILE_BYTECODE=1

# Install dependencies into the project .venv via uv
RUN uv sync --frozen --no-cache

# Copy the rest of the application source
COPY . /app

# Expose the port
EXPOSE 8000

# Run the app
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


