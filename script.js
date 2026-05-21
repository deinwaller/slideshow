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

const canvas = document.getElementById("slider");
const ctx = canvas.getContext("2d");

let media = [];
let current = 0;
let next = 1;

let transitioning = false;
let progress = 0;

let accumulatedCanvas = null;

function resize() {

  canvas.width =
    document.documentElement.clientWidth;

  canvas.height =
    document.documentElement.clientHeight;

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

        // VIDEO
        if (isVideo(path)) {

          const video =
            document.createElement("video");

          video.src = path;

          video.muted = true;
          video.playsInline = true;
          video.preload = "auto";
          video.loop = false;

          video.addEventListener(
            "loadeddata",
            () => {

              resolve({
                type: "video",
                element: video
              });
            }
          );

        // IMAGE
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

// ✨ contain / maximale Breite oder Höhe
function getPlacement(item) {

  const cw = canvas.width;
  const ch = canvas.height;

  const size = getMediaSize(item);

  const iw = size.width;
  const ih = size.height;

  const mediaRatio = iw / ih;
  const canvasRatio = cw / ch;

  let w;
  let h;

  if (mediaRatio > canvasRatio) {

    // breiter → volle Breite
    w = cw;
    h = cw / mediaRatio;

  } else {

    // höher/schmaler → volle Höhe
    h = ch;
    w = ch * mediaRatio;
  }

  return {
    x: (cw - w) / 2,
    y: (ch - h) / 2,
    w,
    h
  };
}

function drawMedia(
  item,
  targetCtx = ctx,
  clearBackground = false
) {

  const p = getPlacement(item);

  if (clearBackground) {

    targetCtx.fillStyle = "black";

    targetCtx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

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

function prepareMediaFrame(
  item,
  baseCanvas = null
) {

  const off =
    document.createElement("canvas");

  off.width = canvas.width;
  off.height = canvas.height;

  const offCtx = off.getContext("2d");

  if (!baseCanvas) {

    offCtx.fillStyle = "black";

    offCtx.fillRect(
      0,
      0,
      off.width,
      off.height
    );
  }

  // vorheriges Bild behalten
  if (baseCanvas) {

    offCtx.drawImage(
      baseCanvas,
      0,
      0
    );
  }

  // neues Medium darüber
  drawMedia(item, offCtx, false);

  return off;
}

function drawCurrentMedia() {

  if (!accumulatedCanvas) {

    accumulatedCanvas =
      prepareMediaFrame(
        media[current]
      );
  }

  ctx.drawImage(
    accumulatedCanvas,
    0,
    0
  );
}

// organisches Noise
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
    Math.max(
      0,
      (x - edge0) /
      (edge1 - edge0)
    )
  );

  return t * t * (3 - 2 * t);
}

// ✨ extremer Dissolve
function drawTonalDissolve(nextCanvas) {

  ctx.drawImage(
    accumulatedCanvas,
    0,
    0
  );

  const currentData =
    ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const nextCtx =
    nextCanvas.getContext("2d");

  const nextData =
    nextCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const pixels = currentData.data;
  const nextPixels = nextData.data;

  const width = canvas.width;
  const height = canvas.height;

  const softness = 0.16;
  const grainStrength = 0.34;
  const edgeContrast = 0.08;

  for (let y = 0; y < height; y++) {

    for (let x = 0; x < width; x++) {

      const i =
        (y * width + x) * 4;

      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const luminance =
        (
          0.299 * r +
          0.587 * g +
          0.114 * b
        ) / 255;

      const tonalOrder =
        1 - luminance;

      const organicNoise =
        noise(
          x * 0.18,
          y * 0.18
        ) * grainStrength;

      const verticalWave =
        Math.sin(
          (y / height) *
          Math.PI *
          3 +
          progress * 8
        ) * 0.08;

      const threshold =
        tonalOrder +
        organicNoise +
        verticalWave;

      const fade = smoothstep(
        threshold - softness,
        threshold + softness,
        progress
      );

      const edge =
        1 -
        Math.abs(fade - 0.5) * 2;

      if (fade > 0) {

        pixels[i] =
          pixels[i] *
          (1 - fade) +
          nextPixels[i] *
          fade +
          edge *
          edgeContrast *
          255;

        pixels[i + 1] =
          pixels[i + 1] *
          (1 - fade) +
          nextPixels[i + 1] *
          fade +
          edge *
          edgeContrast *
          180;

        pixels[i + 2] =
          pixels[i + 2] *
          (1 - fade) +
          nextPixels[i + 2] *
          fade +
          edge *
          edgeContrast *
          90;

        pixels[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(
    currentData,
    0,
    0
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

  // ✨ Video startet schon VOR dem Übergang
  startVideoIfNeeded(nextItem);

  const startTime =
    performance.now();

  function step(now) {

    const elapsed =
      now - startTime;

    progress =
      (
        elapsed /
        TRANSITION_DURATION
      ) * 1.15;

    const nextFrame =
      prepareMediaFrame(
        nextItem,
        accumulatedCanvas
      );

    drawTonalDissolve(
      nextFrame
    );

    if (
      elapsed <
      TRANSITION_DURATION
    ) {

      requestAnimationFrame(step);

    } else {

      accumulatedCanvas =
        cloneCanvas(nextFrame);

      current = next;

      next =
        (
          current + 1
        ) % media.length;

      transitioning = false;

      ctx.drawImage(
        accumulatedCanvas,
        0,
        0
      );

      if (callback) {
        callback();
      }
    }
  }

  requestAnimationFrame(step);
}

function playCurrent() {

  const item = media[current];

  // VIDEO
  if (item.type === "video") {

    const video =
      item.element;

    if (video.paused) {

      video.currentTime = 0;

      video.play();
    }

    function drawVideoFrame() {

      if (
        !transitioning &&
        media[current] === item
      ) {

        accumulatedCanvas =
          prepareMediaFrame(
            item,
            accumulatedCanvas
          );

        ctx.drawImage(
          accumulatedCanvas,
          0,
          0
        );

        requestAnimationFrame(
          drawVideoFrame
        );
      }
    }

    drawVideoFrame();

    video.onended = () => {

      animateTransition(
        playCurrent
      );
    };

  // IMAGE
  } else {

    accumulatedCanvas =
      prepareMediaFrame(
        item,
        accumulatedCanvas
      );

    ctx.drawImage(
      accumulatedCanvas,
      0,
      0
    );

    setTimeout(() => {

      if (!transitioning) {

        animateTransition(
          playCurrent
        );
      }

    }, IMAGE_HOLD_TIME);
  }
}

loadMedia(mediaPaths).then(loaded => {

  media = loaded;

  accumulatedCanvas =
    prepareMediaFrame(
      media[current]
    );

  ctx.drawImage(
    accumulatedCanvas,
    0,
    0
  );

  playCurrent();
});
