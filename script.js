const mediaPaths = [
  "images/01.jpg",
  "images/02.jpg",
  "videos/typopassage.mp4",
  "images/02.jpg"
];

const IMAGE_HOLD_TIME = 2000; // Bilder stehen ca. 2 Sekunden
const TRANSITION_DURATION = 900; // Übergang maximal ca. 1 Sekunde

const canvas = document.getElementById("slider");
const ctx = canvas.getContext("2d");

let media = [];
let preparedMedia = [];
let current = 0;
let next = 1;
let transitioning = false;
let progress = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (media.length) {
    prepareAllMedia();
    drawCurrentMedia();
  }
}

window.addEventListener("resize", resize);
resize();

function isVideo(path) {
  return path.toLowerCase().endsWith(".mp4");
}

function loadMedia(paths) {
  return Promise.all(paths.map(path => {
    return new Promise(resolve => {
      if (isVideo(path)) {
        const video = document.createElement("video");
        video.src = path;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.loop = false;

        video.addEventListener("loadeddata", () => {
          resolve({
            type: "video",
            element: video
          });
        });
      } else {
        const img = new Image();
        img.onload = () => {
          resolve({
            type: "image",
            element: img
          });
        };
        img.src = path;
      }
    });
  }));
}

function getMediaSize(item) {
  if (item.type === "video") {
    return {
      width: item.element.videoWidth,
      height: item.element.videoHeight
    };
  }

  return {
    width: item.element.width,
    height: item.element.height
  };
}

function getPlacement(item) {
  const cw = canvas.width;
  const ch = canvas.height;

  const size = getMediaSize(item);
  const iw = size.width;
  const ih = size.height;

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

function drawMedia(item, targetCtx = ctx) {
  const p = getPlacement(item);

  targetCtx.fillStyle = "black";
  targetCtx.fillRect(0, 0, canvas.width, canvas.height);

  targetCtx.drawImage(
    item.element,
    p.x,
    p.y,
    p.w,
    p.h
  );
}

function prepareMediaFrame(item) {
  const off = document.createElement("canvas");
  off.width = canvas.width;
  off.height = canvas.height;

  const offCtx = off.getContext("2d");
  drawMedia(item, offCtx);

  return off;
}

function prepareAllMedia() {
  preparedMedia = media.map(item => prepareMediaFrame(item));
}

function drawCurrentMedia() {
  drawMedia(media[current]);
}

function noise(x, y) {
  return (
    Math.sin(x * 0.021 + y * 0.017) +
    Math.sin(x * 0.013 - y * 0.019) +
    Math.sin(x * 0.008 + y * 0.011)
  ) * 0.5 + 0.5;
}

function drawTonalDissolve() {
  const currentFrame = prepareMediaFrame(media[current]);
  const nextFrame = prepareMediaFrame(media[next]);

  ctx.drawImage(currentFrame, 0, 0);

  const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const nextCtx = nextFrame.getContext("2d");
  const nextData = nextCtx.getImageData(0, 0, canvas.width, canvas.height);

  const pixels = currentData.data;
  const nextPixels = nextData.data;

  const width = canvas.width;
  const height = canvas.height;

  const softness = 0.26;

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

function animateTransition(callback) {
  transitioning = true;
  progress = 0;

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    progress = elapsed / TRANSITION_DURATION * 1.05;

    drawTonalDissolve();

    if (elapsed < TRANSITION_DURATION) {
      requestAnimationFrame(step);
    } else {
      current = next;
      next = (current + 1) % media.length;
      transitioning = false;
      drawCurrentMedia();

      if (callback) callback();
    }
  }

  requestAnimationFrame(step);
}

function playCurrent() {
  const item = media[current];

  if (item.type === "video") {
    const video = item.element;

    video.currentTime = 0;
    video.play();

    function drawVideoFrame() {
      if (!transitioning && current < media.length && media[current] === item) {
        drawCurrentMedia();
        requestAnimationFrame(drawVideoFrame);
      }
    }

    drawVideoFrame();

    video.onended = () => {
      animateTransition(playCurrent);
    };
  } else {
    drawCurrentMedia();

    setTimeout(() => {
      if (!transitioning) {
        animateTransition(playCurrent);
      }
    }, IMAGE_HOLD_TIME);
  }
}

loadMedia(mediaPaths).then(loaded => {
  media = loaded;
  prepareAllMedia();

  drawCurrentMedia();
  playCurrent();
});
