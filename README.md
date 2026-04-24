# Cyber Bots

Prototipo PWA de plataformas 2D para celular, con robots transformables, guia por voz, iconos grandes y recompensas visuales.

## Ejecutar localmente

Usa un servidor estatico desde esta carpeta:

```powershell
python -m http.server 8000
```

Luego abre:

```text
http://localhost:8000/
```

## PWA

La app incluye `manifest.webmanifest` y `sw.js`. Para instalarla en celular, debe abrirse desde una URL `http` o `https`, por ejemplo GitHub Pages.

## Voz

La app busca audios grabados en `audio/voice/voice-map.json`. Si una linea no tiene `src`, usa la voz del navegador como fallback.

## Arte

Los lineamientos de personajes estan en `docs/character-design-guidelines.md`.
