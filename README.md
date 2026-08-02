# Flowdan Floaters

A p5.js simulation inspired by vitreous eye floaters.

## Repository files

Upload these files to the root of the GitHub repository:

- `index.html`
- `sketch.js`
- `styles.css`
- `flowdan.png`
- `README.md`

The project uses one transparent image named exactly `flowdan.png`. The JavaScript creates visual variants at runtime using different scale, opacity, blur, rotation, mirroring, depth and motion.

## GitHub Pages

In the repository:

1. Open **Settings**.
2. Open **Pages**.
3. Select **Deploy from a branch**.
4. Select branch **main**.
5. Select folder **/(root)**.
6. Save.

Expected site:

`https://shnnn22.github.io/flowdan-floaters/`

After replacing files, test with a cache-busting query:

`https://shnnn22.github.io/flowdan-floaters/?v=8`

## Image preparation

For the best result:

- transparent PNG;
- tight crop around the subject;
- longest edge approximately 800–1200 px;
- preferably below 2 MB;
- sRGB;
- filename exactly `flowdan.png`.

## Interaction

- Mouse movement disturbs the virtual vitreous.
- On mobile, drag in any direction.
- The floaters react with inertia, overshoot, spring-back, wobble and depth-dependent drag.
- The **Reset floaters** button randomizes the composition.
