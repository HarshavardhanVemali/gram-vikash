#!/bin/bash

# Navigate to the API directory
cd gramvikash_api

# Activate virtual environment
source venv/bin/activate

# Start Django on 8000 (Background)
echo "Starting Django API on port 8000..."
python manage.py runserver 0.0.0.0:8000 &

# Start FastAPI Voicebot on 8001 (Background)
echo "Starting FastAPI Voicebot on port 8001..."
python voicebot_server.py &

# Wait for both
echo "Services are running. Press Ctrl+C to stop."
wait
