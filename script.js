const imagePaths = [
  "images/04.jpg",
  "images/02.jpg",
  "images/03.jpg"
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

// weich-organisches Noise
function noise(x, y) {
  return (
    Math.sin(x * 0.021 + y * 0.017) +
    Math.sin(x * 0.013 - y * 0.019) +
    Math.sin(x * 0.008 + y * 0.011)
  ) * 0.5 + 0.5;
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

  const softness = 0.30;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const tonalOrder = 1 - luminance;

      const grain = noise(x * 0.15, y * 0.15) * 0.18;
      const threshold = tonalOrder + grain;

      if (progress > threshold - softness) {
        const fade = Math.min(
          1,
          Math.max(0, (progress - threshold + softness) / softness)
        );

        pixels[i] = pixels[i] * (1 - fade) + nextPixels[i] * fade;
        pixels[i + 1] = pixels[i + 1] * (1 - fade) + nextPixels[i + 1] * fade;
        pixels[i + 2] = pixels[i + 2] * (1 - fade) + nextPixels[i + 2] * fade;
        pixels[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(currentData, 0, 0);
}

function animateTransition() {
  transitioning = true;
  progress = 0;

  function step() {
    progress += 0.015; // 🔥 schneller

    drawTonalDissolve();

    if (progress < 1.1) { // 🔥 kürzere Strecke
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
  }, 4000); // etwas schnellerer Wechsel
});
