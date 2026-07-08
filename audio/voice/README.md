# Voice assets

This folder contains generated WAV voices for each playable character. The voices are original synthetic performances made from `Microsoft Helena Desktop` and then processed with per-character robotic effects. They are not voice clones.

Current event set per character:

- `selected`
- `mission-start`
- `mission-complete`
- `jump`
- `transform`
- `attack`
- `charge`
- `hit`
- `checkpoint`
- `pickup`
- `rescue`
- `danger`

The playable map is `voice-map.json`. If a WAV file fails to load, the app falls back to browser speech synthesis.

To regenerate the WAV files after editing phrases, run:

```powershell
python tools\generate_voice_assets.py
```
