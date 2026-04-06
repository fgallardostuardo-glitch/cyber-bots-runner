# Cyber Bots Adventure X

Versión rehacida del prototipo con foco en:
- Layout realmente usable en celular horizontal.
- Botones de menú siempre visibles con dock fijo.
- Movimiento manual claro: izquierda, derecha, salto y transformar.
- Obstáculos más legibles con rótulos y colores consistentes.
- Transformación visible entre robot y vehículo.
- Checkpoints para no reiniciar desde el principio.
- Preferencias guardadas de personaje y audio.

## Cómo probar
Sirve la carpeta con un servidor estático:
- `python -m http.server 8000`
- o Live Server en VS Code

Luego abre:
- `http://localhost:8000/cyber-bots-ultra/`

## Controles
- A / Flecha izquierda = izquierda
- D / Flecha derecha = derecha
- Espacio / Flecha arriba = saltar
- S / Flecha abajo / T = transformar

## Nota honesta
Esto ya es una base bastante más seria para celular, pero sigue siendo arte procedural en canvas, no sprites ilustrados profesionales. Si el siguiente paso es “calidad visual alta”, hay que pasar a spritesheet y animaciones dibujadas.
