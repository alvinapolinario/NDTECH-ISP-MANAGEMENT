"""Generate earthquake warning alert audio from text."""

import asyncio
from pathlib import Path

import edge_tts

TEXT = """
This is a Level 1 Earthquake Alert.

An earthquake has been detected in the area.

All students, teachers, and staff are advised to remain calm.

Immediately perform DROP, COVER, AND HOLD ON.

Stay away from windows, glass panels, shelves, and objects that may fall.

Await further instructions from school authorities.

This is a Level 1 Earthquake Alert.

Repeat.

This is a Level 1 Earthquake Alert.
""".strip()

# Clear, authoritative US English voice suited for public announcements.
VOICE = "en-US-GuyNeural"
RATE = "-8%"
OUTPUT = Path(__file__).resolve().parent.parent / "audio" / "earthquake-level1-alert.mp3"


async def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(TEXT, VOICE, rate=RATE)
    await communicate.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
