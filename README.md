# Flowdan Floaters

An interactive p5.js canvas inspired by eye floaters. Semi-transparent cutouts of Flowdan drift, lag and respond to mouse or touch movement.

## Live site

After enabling GitHub Pages, the project will be available at:

**https://shnnn22.github.io/flowdan-floaters/**

## Required image

Add an authorized transparent PNG of Flowdan to the repository root and name it exactly:

```text
flowdan.png
```

Recommended preparation:

- Transparent background
- Tight crop around the subject
- PNG in sRGB
- Approximately 800–1600 px on the longest side
- Soft or feathered edges work well with the floater effect

## Files

```text
flowdan-floaters/
├── index.html
├── sketch.js
├── styles.css
├── flowdan.png
└── README.md
```

## Publish with GitHub Pages

1. Create a public repository named `flowdan-floaters` under the GitHub account `SHNNN22`.
2. Upload all project files, including `flowdan.png`.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**.
6. Save.

The GitHub repository URL will be:

**https://github.com/SHNNN22/flowdan-floaters**

## Local preview

Run a local server from the project folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Controls

- Move the mouse or drag a finger to disturb the floaters.
- Press `R` to reset their positions.
- Press `H` to hide or show the instruction panel.

## Main settings

Edit the `SETTINGS` object at the top of `sketch.js`:

- `count`: number of floaters
- `minSize` / `maxSize`: sprite size range
- `movementStrength`: response to pointer movement
- `dampingNear` / `dampingFar`: viscosity and settling speed
- `opacityNear` / `opacityFar`: transparency by depth
