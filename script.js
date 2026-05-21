const mediaPaths = [
  "images/01.jpg",
  "images/02.jpg",
  "videos/06.mp4",
  "images/03.jpg",
  "videos/02.mp4",
  "images/04.jpg",
  "videos/03.mp4",
  "images/05.jpg",
  "videos/04.mp4",
  "videos/01.mp4",
  "videos/05.mp4"
];

const IMAGE_HOLD_TIME = 2000;
const TRANSITION_DURATION = 1000;

// kleiner = smoother, größer = schärfer
const TRANSITION_SCALE = 0.25;

const canvas = document.getElementById("slider");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = true;

let media = [];
let current = 0;
let next = 1;

let transitioning = false;
let progress = 0;

let accumulatedCanvas = null;

const workCanvas = document.createElement("canvas");
const workCtx = workCanvas.getContext("2d");

const nextWorkCanvas = document.createElement("canvas");
const nextWorkCtx = nextWorkCanvas.getContext("2d");

function resize() {
  canvas.width = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight;

  workCanvas.width = Math.max(1, Math.round(canvas.width * TRANSITION_SCALE));
  workCanvas.height = Math.max(1, Math.round(canvas.height * TRANSITION_SCALE));

  nextWorkCanvas.width = workCanvas.width;
  nextWorkCanvas.height = workCanvas.height;

  if (media.length) {
    drawCurrentMedia();
  }
}

window.addEventListener("resize", resize);
resize();

function isVideo(path) {
  return /\.(mp4|mov)$/i.test(path);
}

function loadMedia(paths) {
  return Promise.all(
    paths.map(path => {
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
    })
  );
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

function getPlacement(item, targetWidth = canvas.width, targetHeight = canvas.height) {
  const size = getMediaSize(item);

  const iw = size.width;
  const ih = size.height;

  const mediaRatio = iw / ih;
  const canvasRatio = targetWidth / targetHeight;

  let w;
  let h;

  if (mediaRatio > canvasRatio) {
    w = targetWidth;
    h = targetWidth / mediaRatio;
  } else {
    h = targetHeight;
    w = targetHeight * mediaRatio;
  }

  return {
    x: (targetWidth - w) / 2,
    y: (targetHeight - h) / 2,
    w,
    h
  };
}

function drawMedia(item, targetCtx = ctx, targetWidth = canvas.width, targetHeight = canvas.height) {
  const p = getPlacement(item, targetWidth, targetHeight);

  targetCtx.drawImage(
    item.element,
    p.x,
    p.y,
    p.w,
    p.h
  );
}

function cloneCanvas(source) {
  const c = document.createElement("canvas");

  c.width = canvas.width;
  c.height = canvas.height;

  const cctx = c.getContext("2d");
  cctx.drawImage(source, 0, 0);

  return c;
}

function prepareMediaFrame(item, baseCanvas = null) {
  const off = document.createElement("canvas");

  off.width = canvas.width;
  off.height = canvas.height;

  const offCtx = off.getContext("2d");

  if (!baseCanvas) {
    offCtx.fillStyle = "black";
    offCtx.fillRect(0, 0, off.width, off.height);
  }

  if (baseCanvas) {
    offCtx.drawImage(baseCanvas, 0, 0);
  }

  drawMedia(item, offCtx, canvas.width, canvas.height);

  return off;
}

function prepareSmallFrame(item, baseCanvas = null, targetCtx) {
  targetCtx.clearRect(0, 0, workCanvas.width, workCanvas.height);

  if (!baseCanvas) {
    targetCtx.fillStyle = "black";
    targetCtx.fillRect(0, 0, workCanvas.width, workCanvas.height);
  }

  if (baseCanvas) {
    targetCtx.drawImage(
      baseCanvas,
      0,
      0,
      workCanvas.width,
      workCanvas.height
    );
  }

  drawMedia(
    item,
    targetCtx,
    workCanvas.width,
    workCanvas.height
  );
}

function drawCurrentMedia() {
  if (!accumulatedCanvas) {
    accumulatedCanvas = prepareMediaFrame(media[current]);
  }

  ctx.drawImage(accumulatedCanvas, 0, 0);
}

function noise(x, y) {
  return (
    Math.sin(x * 0.031 + y * 0.021) +
    Math.sin(x * 0.017 - y * 0.029) +
    Math.sin(x * 0.009 + y * 0.013) +
    Math.sin(x * 0.047 - y * 0.041)
  ) * 0.35 + 0.5;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(
    1,
    Math.max(0, (x - edge0) / (edge1 - edge0))
  );

  return t * t * (3 - 2 * t);
}

function drawTonalDissolveSmall(nextItem) {
  workCtx.drawImage(
    accumulatedCanvas,
    0,
    0,
    workCanvas.width,
    workCanvas.height
  );

  prepareSmallFrame(
    nextItem,
    accumulatedCanvas,
    nextWorkCtx
  );

  const currentData = workCtx.getImageData(
    0,
    0,
    workCanvas.width,
    workCanvas.height
  );

  const nextData = nextWorkCtx.getImageData(
    0,
    0,
    nextWorkCanvas.width,
    nextWorkCanvas.height
  );

  const pixels = currentData.data;
  const nextPixels = nextData.data;

  const width = workCanvas.width;
  const height = workCanvas.height;

  const softness = 0.18;
  const grainStrength = 0.30;
  const edgeContrast = 0.06;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const luminance =
        (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const tonalOrder = 1 - luminance;

      const organicNoise =
        noise(x * 0.42, y * 0.42) * grainStrength;

      const verticalWave =
        Math.sin((y / height) * Math.PI * 3 + progress * 8) * 0.06;

      const threshold =
        tonalOrder + organicNoise + verticalWave;

      const fade = smoothstep(
        threshold - softness,
        threshold + softness,
        progress
      );

      const edge =
        1 - Math.abs(fade - 0.5) * 2;

      if (fade > 0) {
        pixels[i] =
          pixels[i] * (1 - fade) +
          nextPixels[i] * fade +
          edge * edgeContrast * 255;

        pixels[i + 1] =
          pixels[i + 1] * (1 - fade) +
          nextPixels[i + 1] * fade +
          edge * edgeContrast * 180;

        pixels[i + 2] =
          pixels[i + 2] * (1 - fade) +
          nextPixels[i + 2] * fade +
          edge * edgeContrast * 90;

        pixels[i + 3] = 255;
      }
    }
  }

  workCtx.putImageData(currentData, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = true;

  ctx.drawImage(
    workCanvas,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function startVideoIfNeeded(item) {
  if (item.type === "video") {
    const video = item.element;

    video.currentTime = 0;
    video.play();
  }
}

function animateTransition(callback) {
  transitioning = true;
  progress = 0;

  const nextItem = media[next];

  startVideoIfNeeded(nextItem);

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;

    progress = (elapsed / TRANSITION_DURATION) * 1.15;

    drawTonalDissolveSmall(nextItem);

    if (elapsed < TRANSITION_DURATION) {
      requestAnimationFrame(step);
    } else {
      accumulatedCanvas = prepareMediaFrame(
        nextItem,
        accumulatedCanvas
      );

      current = next;
      next = (current + 1) % media.length;

      transitioning = false;

      ctx.drawImage(accumulatedCanvas, 0, 0);

      if (callback) {
        callback();
      }
    }
  }

  requestAnimationFrame(step);
}

function playCurrent() {
  const item = media[current];

  if (item.type === "video") {
    const video = item.element;

    if (video.paused) {
      video.currentTime = 0;
      video.play();
    }

    function drawVideoFrame() {
      if (
        !transitioning &&
        media[current] === item
      ) {
        accumulatedCanvas = prepareMediaFrame(
          item,
          accumulatedCanvas
        );

        ctx.drawImage(accumulatedCanvas, 0, 0);

        requestAnimationFrame(drawVideoFrame);
      }
    }

    drawVideoFrame();

    video.onended = () => {
      animateTransition(playCurrent);
    };
  } else {
    accumulatedCanvas = prepareMediaFrame(
      item,
      accumulatedCanvas
    );

    ctx.drawImage(accumulatedCanvas, 0, 0);

    setTimeout(() => {
      if (!transitioning) {
        animateTransition(playCurrent);
      }
    }, IMAGE_HOLD_TIME);
  }
}

loadMedia(mediaPaths).then(loaded => {
  media = loaded;

  accumulatedCanvas = prepareMediaFrame(
    media[current]
  );

  ctx.drawImage(accumulatedCanvas, 0, 0);

  playCurrent();
});
