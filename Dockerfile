# Dockerfile to run the Python Sunor Flask agent
FROM python:3.11-slim

# Create app dir
WORKDIR /app

# Install system deps for ffmpeg if users need to process audio (optional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . /app

# Install Python deps
RUN python -m pip install --no-cache-dir -r ./sunor_agent_requirements.txt

# Expose port used by Flask app
EXPOSE 5000

# Default env var placeholder (override at runtime)
ENV SUNOR_API_KEY=""

# Start the Flask app
CMD ["python", "sunor_agent_app.py"]
