'use strict';

/* TOUCH INPUT ********************************************************/
const SWIPE_THRESHOLD = 30; /* in pixels */
const IDLE = 0;
const TENTATIVE = 1;
var touchState = IDLE;
var touchPos = {x:0, y:0};

function process_touchend(ev) {
  if(touchState == TENTATIVE){
    let y = touchPos.y - ev.changedTouches[0].clientY;
    let x = ev.changedTouches[0].clientX - touchPos.x;
    let distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    /* get angle between 0 and 2 [factor PI omitted],
     * counter-clockwise, 0 and 2 towards bottom (sorry) */
    if(x==0){
      x = 0.0001;
    }
    let angle = Math.atan(y/x) / Math.PI;
    if(x<0){
      angle = angle + 1;
    }
    angle = angle + 0.5;
    if(distance > SWIPE_THRESHOLD){
      console.log("swipe");
      console.log(x);
      console.log(y);
      console.log(angle);
    } else {
      autoTurnToggle();
    }
  }
  touchState = IDLE;
}

function process_touchstart(ev) {
  ev.preventDefault();
  if(touchState == IDLE && ev.touches.length == 1){
    touchState = TENTATIVE;
    touchPos = {x: ev.touches[0].clientX, y: ev.touches[0].clientY};
  }
}

const touchCapture = document.getElementById("touch-capture");
touchCapture.addEventListener('touchstart', process_touchstart, false);
touchCapture.addEventListener('touchcancel', process_touchend, false);
touchCapture.addEventListener('touchend', process_touchend, false);

/* pause/unpause eye gaze based auto page turn ************************/
const AUTOTURNON = 0;
const AUTOTURNOFF = 1;
var autoTurn = AUTOTURNON;

function autoTurnToggle() {
  if(autoTurn == AUTOTURNON){
    autoTurn = AUTOTURNOFF;
  } else {
    autoTurn = AUTOTURNON;
  }
}

/* eye gaze indicator *************************************************/
const EYEGAZENO = 0;
const EYEGAZETOP = 1;
const EYEGAZEBOT = -1;
const EYEGAZEACTIVE = "./eyeActive.svg.png";
const EYEGAZEINACTIVE = "./eyeInactive.svg.png";
var eyeGazeIndicator = EYEGAZENO;

function eyeGazeSetTop() {
  eyeGazeIndicator = EYEGAZETOP;
  document.querySelector("#overlay-2 > img").src = EYEGAZEACTIVE;
  document.querySelector("#overlay-4 > img").src = EYEGAZEINACTIVE;
}

function eyeGazeSetBottom() {
  eyeGazeIndicator = EYEGAZEBOT;
  document.querySelector("#overlay-4 > img").src = EYEGAZEACTIVE;
  document.querySelector("#overlay-2 > img").src = EYEGAZEINACTIVE;
}

function eyeGazeSetNone() {
  eyeGazeIndicator = EYEGAZEBOT;
  document.querySelector("#overlay-2 > img").src = EYEGAZEINACTIVE;
  document.querySelector("#overlay-4 > img").src = EYEGAZEINACTIVE;
}

/* process eye gaze position into upper/lower *************************/
const EYEGAZEBORDER = 0.02;
const EYEGAZEMIDDLEFRACTION = 0.2;
const EYEGAZEBOTTOMFRACTION = (1 - EYEGAZEMIDDLEFRACTION) / 2;
const EYEGAZETOPFRACTION = EYEGAZEBOTTOMFRACTION;
const EYEGAZEWIDTH = document.getElementById("app-container").getBoundingClientRect().width;
const EYEGAZEHEIGHT = document.getElementById("app-container").getBoundingClientRect().height;
const EYEGAZEACTIVEWIDTH = EYEGAZEWIDTH * (1 - 2 * EYEGAZEBORDER);
const EYEGAZEACTIVEHEIGHT = EYEGAZEHEIGHT * (1 - 2 * EYEGAZEBORDER);
const EYEGAZEXMIN = document.getElementById("app-container").getBoundingClientRect().x + EYEGAZEWIDTH * EYEGAZEBORDER;
const EYEGAZEYMIN = document.getElementById("app-container").getBoundingClientRect().y + EYEGAZEHEIGHT * EYEGAZEBORDER;
const EYEGAZEXMAX = EYEGAZEXMIN + EYEGAZEACTIVEWIDTH; 
const EYEGAZEYMAX = EYEGAZEYMIN + EYEGAZEACTIVEHEIGHT;

function setGazeIndicator(x, y) {
  console.log("x: " + x + " y: " + y);
  console.log(EYEGAZEXMIN + "-" + EYEGAZEXMAX + " " + EYEGAZEYMIN + "-" + EYEGAZEYMAX);
  if(EYEGAZEXMIN < x && x < EYEGAZEXMAX && EYEGAZEYMIN < y && y < EYEGAZEYMAX){
    if(y < EYEGAZEYMIN + EYEGAZEACTIVEHEIGHT * EYEGAZETOPFRACTION){
      eyeGazeSetTop();
    } else if(y < EYEGAZEYMIN + EYEGAZEACTIVEHEIGHT * (EYEGAZETOPFRACTION + EYEGAZEMIDDLEFRACTION)){
      eyeGazeSetNone();
    } else {
      eyeGazeSetBottom();
    }
  } else {
    eyeGazeSetNone();
  }
}

/* fake eye gaze with mouse *******************************************/
document.getElementById("app-container").addEventListener('mousemove', mousemoveHandler);
function mousemoveHandler(ev) {
  setGazeIndicator(ev.clientX, ev.clientY);
}
