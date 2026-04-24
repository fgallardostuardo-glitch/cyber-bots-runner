# Voice recording guide

The app already supports recorded voice. Add final MP3 files in this folder and update `voice-map.json` with each file path.

Recommended delivery:

- Format: `mp3`, mono, 44.1 kHz or 48 kHz.
- Length: 0.5 to 1.4 seconds per phrase.
- Tone: warm Latin American Spanish, energetic, calm, never scolding.
- Performance: smile while speaking, clear consonants, no long explanations.

Suggested filenames:

- `intro.mp3`: "Vamos"
- `jump-now.mp3`: "Salta ahora"
- `transform-now.mp3`: "Transformate"
- `try-again.mp3`: "Prueba otra vez"
- `careful.mp3`: "Cuidado"
- `great.mp3`: "Muy bien"
- `rescue.mp3`: "Muy bien"
- `excellent.mp3`: "Excelente"
- `character-orion.mp3`: "Orion Pax"
- `character-bee.mp3`: "Bumblebee"
- `character-elita.mp3`: "Elita Uno"
- `character-d16.mp3`: "D dieciseis"

Example mapping:

```json
"intro": { "text": "Vamos", "src": "./audio/voice/intro.mp3" }
```
