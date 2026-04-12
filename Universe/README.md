# Universe

An immersive Three.js space scene with:

- A visible Sun and expanded solar-system-style layout
- A 360-degree draggable camera around Earth
- Mouse wheel / touchpad zoom
- A bottom-right random-view button
- Random viewpoints from nearby celestial bodies such as the Moon, Venus, and Mars
- Additional distant viewpoints inspired by `Project Hail Mary`, including `Adrian` in `Tau Ceti` and `Erid` near `40 Eridani A`
- Slow Earth rotation, drifting stars, and deep-space nebula layers
- Intergalactic background landmarks to push the scene beyond the Milky Way

## Files

- `index.html` - page shell and minimalist HUD
- `sketch.js` - Three.js scene, camera logic, controls, animation
- `assets/` - local Earth textures
- `vendor/` - local Three.js module files used by the page

## Run locally

Recommended:

```bash
cd /Users/lawliet/Documents/GitHub/Art
python3 -m http.server 8000
```

Then open:

- `http://127.0.0.1:8000/Universe/`

Direct-open note:

- Some browsers block ES module imports when you open `index.html` directly from `file://`
- If that happens, use the local server method above

The supported setup is therefore:

- Open through a local server
