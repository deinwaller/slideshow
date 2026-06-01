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
  "images/toulouse.gif",
  "images/toulouse.jpg",
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
const TRANSITION_DURATION = 1000;
const TRANSITION_SCALE = 0.8;

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
          resolve({ type: "video", element: video });
        });
      } else {
        const img = new Image();
        img.onload = () => {
          resolve({ type: "image", element: img });
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

function getPlacement(item, targetWidth = canvas.width, targetHeight = canvas.height) {
  const size = getMediaSize(item);
  const mediaRatio = size.width / size.height;
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

  targetCtx.imageSmoothingEnabled = true;

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

  if (!baseCanvas) {
    offCtx.fillStyle = "black";
    offCtx.fill
