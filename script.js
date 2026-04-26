const imagePaths = [
  "images/04.jpg",
  "images/02.jpg",
  "images/03.jpg",
  "images/01.jpg"
];

const canvas = document.getElementById("slider");
const ctx = canvas.getContext("2d");

let images = [];
let preparedImages = [];
let current = 0;
let next = 1;
let progress = 0;
let transitioning = false;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

function loadImages(paths) {
  return Promise.all(paths.map(src => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }));
}

function getImagePlacement(img) {
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.width;
  const ih = img.height;

  let w, h;

  if (ih > iw) {
    h = ch;
    w = (iw / ih) * h;
  } else {
    const scale = Math.max(cw / iw, ch / ih);
    w = iw * scale;
    h = ih * scale;
  }

  return {
    x: (cw - w) / 2,
    y: (ch - h) / 2,
    w,
    h
  };
}

function drawImageSmart(img, alpha = 1) {
  const p = getImagePlacement(img);

  ctx.globalAlpha = alpha;
  ctx.drawImage(img, p.x, p.y, p.w, p.h);
  ctx.globalAlpha = 1;
}

function prepareImage(img) {
  const off = document.createElement("canvas");
  off.width = canvas.width;
  off.height = canvas.height;

  const offCtx = off.getContext("2d");
  offCtx.fillStyle = "black";
  offCtx.fillRect(0, 0, off.width, off.height);

  const p = getImagePlacement(img);
  offCtx.drawImage(img, p.x, p.y, p.w, p.h);

  return off;
}

function prepareAllImages() {
  preparedImages = images.map(img => prepareImage(img));
}

window.addEventListener("resize", () => {
  if (images.length) {
    prepareAllImages();
    drawImageSmart(images[current], 1);
  }
});

function noise(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawTonalDissolve() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(preparedImages[current], 0, 0);

  const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const nextCanvas = preparedImages[next];

  const nextCtx = nextCanvas.getContext("2d");
  const nextData = nextCtx.getImageData(0, 0, canvas.width, canvas.height);

  const pixels = currentData.data;
  const nextPixels = nextData.data;

  const width = canvas.width;
  const height = canvas.height;

  const softness = 0.18;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;

      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Highlights zuerst, Shadows zuletzt
      const tonalOrder = 1 - luminance;

      const grain = noise(x, y) * 0.22;
      const threshold = tonalOrder + grain;

      if (progress > threshold - softness) {
        const fade = Math.min(
          1,
          Math.max(0, (progress - threshold + softness) / softness)
        );

        for (let yy = 0; yy < 2; yy++) {
          for (let xx = 0; xx < 2; xx++) {
            const pi = ((y + yy) * width + (x + xx)) * 4;

            pixels[pi] = pixels[pi] * (1 - fade) + nextPixels[pi] * fade;
            pixels[pi + 1] = pixels[pi + 1] * (1 - fade) + nextPixels[pi + 1] * fade;
            pixels[pi + 2] = pixels[pi + 2] * (1 - fade) + nextPixels[pi + 2] * fade;
            pixels[pi + 3] = 255;
          }
        }
      }
    }
  }

  ctx.putImageData(currentData, 0, 0);
}

function animateTransition() {
  transitioning = true;
  progress = 0;

  function step() {
    progress += 0.012;

    drawTonalDissolve();

    if (progress < 1.35) {
      requestAnimationFrame(step);
    } else {
      current = next;
      next = (current + 1) % images.length;
      transitioning = false;
      drawImageSmart(images[current], 1);
    }
  }

  step();
}

loadImages(imagePaths).then(loaded => {
  images = loaded;
  prepareAllImages();

  drawImageSmart(images[current], 1);

  setInterval(() => {
    if (!transitioning) animateTransition();
  }, 4500);
});
