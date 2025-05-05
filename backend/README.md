
# Voice AI Assistant Backend

This folder contains the backend code for the Voice AI Assistant. The backend is built with FastAPI and LiveKit.

## Setting Up the Backend

1. Create a Python virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install the required dependencies:
   ```
   pip install fastapi uvicorn livekit-server-sdk python-dotenv
   ```

3. Create a `.env` file in this directory with your LiveKit credentials:
   ```
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   ```

4. Copy the Python files from the provided code into this folder (see below).

## Running the Backend

1. Start the token server:
   ```
   python token_server.py
   ```

2. Start the voice agent in a separate terminal:
   ```
   python agent.py
   ```

The FastAPI server will run on http://localhost:8000 by default.

## Backend Files

### token_server.py
```python
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from livekit import api
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:8000", "http://localhost:5001", ""],  # Allow all for testing
    allow_methods=["*"],
    allow_headers=["*"],
)

class TokenRequest(BaseModel):
    room_name: str
    participant_identity: str

@app.post("/get-token")
async def get_token(request: TokenRequest):
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured")

    try:
        token = api.AccessToken(api_key, api_secret) \
            .with_identity(request.participant_identity) \
            .with_name(f"User {request.participant_identity}") \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=request.room_name,
                can_publish=True,
                can_subscribe=True,
            )).to_jwt()
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### agent.py
```python
import os
import logging
import asyncio
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions, WorkerOptions, WorkerPermissions, AutoSubscribe
from livekit.plugins import (
    noise_cancellation,
    silero,
    groq,
    elevenlabs
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logging.basicConfig(level=logging.DEBUG)

load_dotenv()

ROOM_NAME = "voice-assistant-room"
IDENTITY = "python-agent"

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="You are a helpful voice AI assistant.")

    async def on_llm_response(self, response: str, **kwargs) -> None:
        logging.info(f"LLM Response: {response}")
        await self.room.local_participant.publish_data(
            data={"event": "response", "data": {"text": response}},
            reliable=True
        )

    async def on_transcription(self, text: str, **kwargs) -> None:
        logging.info(f"Transcription: {text}")
        await self.room.local_participant.publish_data(
            data={"event": "transcribed_text", "data": {"text": text}},
            reliable=True
        )

async def entrypoint(ctx: agents.JobContext):
    logging.info("Starting entrypoint...")
    logging.info(f"Connecting to room: {ROOM_NAME} with identity: {IDENTITY}")
    logging.info(f"Connecting to room: {ROOM_NAME}")
    try:
        await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
        logging.info(f"Connected to room: {ctx.room.name}")
        logging.info(f"Local participant identity: {ctx.room.local_participant.identity}")
    except Exception as e:
        logging.error(f"Failed to connect: {e}")
        return

    try:
        logging.info("Initializing AgentSession...")
        session = AgentSession(
            stt=groq.STT(model="whisper-large-v3-turbo", language="ur"),
            llm=groq.LLM(model="llama-3.3-70b-versatile"),
            tts=elevenlabs.TTS(voice_id="Sxk6njaoa7XLsAFT7WcN", model="eleven_multilingual_v2"),
            vad=silero.VAD.load(),
            turn_detection=MultilingualModel(),
        )
        logging.info("AgentSession initialized.")

        logging.info("Starting AgentSession...")
        await session.start(
            room=ctx.room,
            agent=Assistant(),
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
        logging.info("AgentSession started successfully.")

        await session.generate_reply(
            instructions="Greet the user and offer your assistance."
        )
        logging.info("Initial greeting sent.")

        logging.info("Agent is now listening for user input...")
        # Keep the entrypoint alive indefinitely to allow listening
        while True:
            await asyncio.sleep(60)  # Check logs every minute, adjust as needed
    except Exception as e:
        logging.error(f"Session error: {e}")

if __name__ == "__main__":
    opts = WorkerOptions(
        entrypoint_fnc=entrypoint,
        permissions=WorkerPermissions(
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ),
    )
    agents.cli.run_app(opts)
```

## Note
To run the agent effectively, you need LiveKit credentials and possibly Groq and ElevenLabs API keys for the AI capabilities. Make sure to configure these in your .env file.
