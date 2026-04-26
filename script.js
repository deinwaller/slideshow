const imagePaths = [
  "images/01.jpg",
  "images/02.jpg",
  "images/03.jpg"
];

const canvas = document.getElementById("slider");
const ctx = canvas.getContext("2d");

let images = [];
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

// ✨ NEU: intelligente Skalierung
function drawImageSmart(img, alpha = 1) {
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.width;
  const ih = img.height;

  let w, h, x, y;

  const isPortrait = ih > iw;

  if (isPortrait) {
    // Hochformat → volle Höhe
    h = ch;
    w = (iw / ih) * h;
  } else {
    // Querformat → cover
    const scale = Math.max(cw / iw, ch / ih);
    w = iw * scale;
    h = ih * scale;
  }

  x = (cw - w) / 2;
  y = (ch - h) / 2;

  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, w, h);
  ctx.globalAlpha = 1;
}

// Dissolve-Effekt
function drawDissolve() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawImageSmart(images[current], 1);

  const blockSize = 12;
  const cols = Math.ceil(canvas.width / blockSize);
  const rows = Math.ceil(canvas.height / blockSize);

  ctx.save();
  ctx.beginPath();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const noise = Math.random();
      if (noise < progress) {
        ctx.rect(
          x * blockSize,
          y * blockSize,
          blockSize,
          blockSize
        );
      }
    }
  }

  ctx.clip();
  drawImageSmart(images[next], 1);
  ctx.restore();
}

// Animation
function animateTransition() {
  transitioning = true;
  progress = 0;

  function step() {
    progress += 0.015;

    drawDissolve();

    if (progress < 1) {
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

// Start
loadImages(imagePaths).then(loaded => {
  images = loaded;
  drawImageSmart(images[current], 1);

  setInterval(() => {
    if (!transitioning) animateTransition();
  }, 3500);
});
