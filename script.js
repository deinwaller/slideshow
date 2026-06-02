const mediaPaths = [
  "images/galerie_00.jpg",
  "images/thoman-booklets.jpg",
  "images/thoman-booklets01.jpg",
  "videos/01.mp4",
  "images/Albertina01.jpg",
  "images/Albertina02.jpg",
  "images/Albertina03.jpg",
  "images/Albertina04.jpg",
  "videos/03.mp4",
  "images/AI-Dignity_00.jpg",
  "images/AI-Dignity_01.jpg",
  "videos/toulouse.mp4",
  "images/toulouse.jpg",
  "videos/morion.mp4",
  "images/space-anatomy01.jpg",
  "images/space-anatomy02.jpg",
  "images/space-anatomy03.jpg",
  "images/space-anatomy04.jpg",
  "images/theater-am-werk.jpg",
  "images/vdh.jpg",
  "videos/06.mp4",
  "images/tdf-clock.jpg",
  "videos/05.mp4",
  "videos/04.mp4",
  "images/julia-booklet_00.jpg",
  "images/julia-booklet_01.jpg"
];

const IMAGE_HOLD_TIME = 2500;
const GIF_HOLD_TIME = 4000;
const TRANSITION_DURATION = 1000;
const TRANSITION_SCALE = 0.8;

const canvas = document.getElementById("slider");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

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

// versteckte DOM-Schicht für GIFs
const gifLayer = document.createElement("div");
gifLayer.style.position = "fixed";
gifLayer.style.left = "-9999px";
gifLayer.style.top = "-9999px";
gifLayer.style.width = "1px";
gifLayer.style.height = "1px";
gifLayer.style.overflow = "hidden";
document.body.appendChild(gifLayer);

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

function isGif(path) {
  return /\.gif$/i.test(path);
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
              element: video,
              src: path
            });
          });
        } else {
          const img = new Image();

          img.onload = () => {
            if (isGif(path)) {
              gifLayer.appendChild(img);
            }

            resolve({
              type: isGif(path) ? "gif" : "image",
              element: img,
              src: path
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

function drawMedia(
  item,
  targetCtx = ctx,
  targetWidth = canvas.width,
  targetHeight = canvas.height
) {
  const p = getPlacement(item, targetWidth, targetHeight);

  targetCtx.drawImage(
    item.element,
    p.x,
    p.y,
    p.w,
    p.h
  );
}

function prepareMediaFrame(item, baseCanvas = null) {
  const off = document.createElement("canvas");

  off.width = canvas.width;
  off.height = canvas.height;

  const offCtx = off.getContext("2d");
  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = "high";

  if (!baseCanvas) {
    offCtx.fillStyle = "black";
    offCtx.fillRect(0, 0, off.width, off.height);
  }

  if (baseCanvas) {
    offCtx.drawImage(baseCanvas, 0, 0);
  }

  drawMedia(
    item,
    offCtx,
    canvas.width,
    canvas.height
  );

  return off;
}

function prepareSmallFrame(item, baseCanvas = null, targetCtx) {
  targetCtx.clearRect(0, 0, workCanvas.width, workCanvas.height);

  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = "high";

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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(accumulatedCanvas, 0, 0);
}

function drawThresholdDissolveSmall(nextItem) {
  workCtx.imageSmoothingEnabled = true;
  workCtx.imageSmoothingQuality = "high";

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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const luminance =
        (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const threshold = luminance;

      if (progress > threshold) {
        pixels[i] = nextPixels[i];
        pixels[i + 1] = nextPixels[i + 1];
        pixels[i + 2] = nextPixels[i + 2];
        pixels[i + 3] = 255;
      }
    }
  }

  workCtx.putImageData(currentData, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

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

    progress = elapsed / TRANSITION_DURATION;

    drawThresholdDissolveSmall(nextItem);

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

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

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

    video.currentTime = 0;
    video.play();

    let transitionStarted = false;

    function drawVideoFrame() {
      if (
        !transitioning &&
        media[current] === item
      ) {
        accumulatedCanvas = prepareMediaFrame(
          item,
          accumulatedCanvas
        );

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(accumulatedCanvas, 0, 0);

        const timeLeft = video.duration - video.currentTime;

        if (
          !transitionStarted &&
          Number.isFinite(timeLeft) &&
          timeLeft <= TRANSITION_DURATION / 1000
        ) {
          transitionStarted = true;
          animateTransition(playCurrent);
          return;
        }

        requestAnimationFrame(drawVideoFrame);
      }
    }

    drawVideoFrame();

    video.onended = () => {
      if (!transitionStarted && !transitioning) {
        transitionStarted = true;
        animateTransition(playCurrent);
      }
    };
  } else if (item.type === "gif") {
    const img = item.element;

    img.src = "";
    img.src = item.src;

    const startTime = performance.now();

    function drawGifFrame(now) {
      if (
        !transitioning &&
        media[current] === item
      ) {
        accumulatedCanvas = prepareMediaFrame(
          item,
          accumulatedCanvas
        );

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(accumulatedCanvas, 0, 0);

        if (now - startTime >= GIF_HOLD_TIME) {
          animateTransition(playCurrent);
          return;
        }

        requestAnimationFrame(drawGifFrame);
      }
    }

    requestAnimationFrame(drawGifFrame);
  } else {
    accumulatedCanvas = prepareMediaFrame(
      item,
      accumulatedCanvas
    );

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(accumulatedCanvas, 0, 0);

  playCurrent();
});
