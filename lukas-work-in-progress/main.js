'use strict';

/* TOUCH INPUT ********************************************************/
const SWIPE_THRESHOLD = 30; /* in pixels */
const SWIPE_DIR_MARGIN = 1/16; /* angle, factor PI omitted */

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
      if(0.25 + SWIPE_DIR_MARGIN < angle && angle + SWIPE_DIR_MARGIN < 0.75){
        console.log("swipe right");
      } else if(0.75 + SWIPE_DIR_MARGIN < angle && angle + SWIPE_DIR_MARGIN < 1.25){
	console.log("swipe up");
      } else if(1.25 + SWIPE_DIR_MARGIN < angle && angle + SWIPE_DIR_MARGIN < 1.75){
	console.log("swipe left");
      } else if(1.75 + SWIPE_DIR_MARGIN < angle || angle + SWIPE_DIR_MARGIN < 0.25){
	console.log("swipe down");
      } else {
        console.log("swipe with unclear direction, should warn user TODO.");
      }
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
    document.getElementById("overlay-2").hidden=true;
    document.getElementById("overlay-4").hidden=true;
  } else {
    autoTurn = AUTOTURNON;
    document.getElementById("overlay-2").hidden=false;
    document.getElementById("overlay-4").hidden=false;
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

/* sheet music highlight border upper/lower/transition ****************/
const TRANSITIONDURATION = 3; /* in seconds. HACK: Defined independently in css file */

const HIGHLIGHTUPPER = 0;
const HIGHLIGHTUPPEROUT = 1;
const HIGHLIGHTLOWERIN = 2;
const HIGHLICHTLOWER = 3;
const HIGHLIGHTLOWEROUT = 4;
const HIGHLIGHTUPPERIN = 5;
var highlightState = HIGHLIGHTUPPER;

var scheduledStateTransition;

function enableHighlight(which, transition){
  document.getElementById("sheet-music-border-" + which).style["transition-duration"] = transition + "s";
  document.getElementById("sheet-music-border-" + which).style.border = "2px solid green";
}

function disableHighlight(which, transition){
  document.getElementById("sheet-music-border-" + which).style["transition-duration"] = transition + "s";
  document.getElementById("sheet-music-border-" + which).style.border = "2px solid transparent";
}

function transitionUpDown1(){
  highlightState = HIGHLIGHTLOWERIN;
  enableHighlight("lower", TRANSITIONDURATION);
  scheduledStateTransition = window.setTimeout(transitionUpDown2, TRANSITIONDURATION*1000);
}

function transitionUpDown2(){
  hightlightState = HIGHTLIGHTLOWER;
}

function transitionDownUp1(){
  highlightState = HIGHLIGHTUPPERIN;
  enableHighlight("upper", TRANSITIONDURATION);
  scheduledStateTransition = window.setTimeout(transitionDownUp2, TRANSITIONDURATION*1000);
}

function transitionDownUp2(){
  hightlightState = HIGHTLIGHTUPPER;
}

function highlightToLower(){
  if(highlightState == HIGHTLIGHTLOWER){
    console.log("error: was already in lower state");
  } else if(highlightState == HIGHTLIGHTLOWERIN || highlightState == HIGHTLIGHTUPPEROUT){
    highlightState = HIGHLIGHTLOWER;
    enableHighlight("lower", 0);
    disableHighlight("upper", 0);
    window.clearTimeout(scheduledStateTransition);
  } else if(highlightState == HIGHTLIGHTUPPER){
    highlightState = HIGHLIGHTUPPEROUT;
    disableHighlight("upper", TRANSITIONDURATION);
    scheduledStateTransition = window.setTimeout(transitionUpDown1, TRANSITIONDURATION*1000);
  }
}

function highlightToUpper(){
  if(highlightState == HIGHTLIGHTUPPER){
    console.log("error: was already in upper state");
  } else if(highlightState == HIGHTLIGHTLOWEROUT || highlightState == HIGHTLIGHTUPPERIN){
    highlightState = HIGHLIGHTUPPER;
    disableHighlight("lower", 0);
    enableHighlight("upper", 0);
    window.clearTimeout(scheduledStateTransition);
  } else if(highlightState == HIGHTLIGHTLOWER){
    highlightState = HIGHLIGHTLOWEROUT;
    disableHighlight("lower", TRANSITIONDURATION);
    scheduledStateTransition = window.setTimeout(transitionDownUp1, TRANSITIONDURATION*1000);
  }
}

/* main control finite state machine **********************************/
const STANDARD_BORDERED = 0;
const STANDARD_TRANS_OUT = 1;
const STANDARD_UNBOARDERED = 2;
const STANDARD_TRANS_IN = 3;
const DANGLING = 4;

/* need two instances of this machine, so two states */
var stateUpper = STANDARD_BORDERED;
var stateLower = STANDARD_UNBORDERED;

/* functions invoked when some condition for a state change holds */
function swipeRight(){}
function swipeUp(){}
function swipeLeft(){}
function swipeDown(){}
function eyeUp(){}
function eyeDown(){}

/* fake eye gaze with mouse *******************************************/
document.getElementById("app-container").addEventListener('mousemove', mousemoveHandler);
function mousemoveHandler(ev) {
  setGazeIndicator(ev.clientX, ev.clientY);
}
