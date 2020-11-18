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

  averageGaze(1);
}

function eyeGazeSetBottom() {
  eyeGazeIndicator = EYEGAZEBOT;
  document.querySelector("#overlay-4 > img").src = EYEGAZEACTIVE;
  document.querySelector("#overlay-2 > img").src = EYEGAZEINACTIVE;

  averageGaze(0);
}

function eyeGazeSetNone() {
  eyeGazeIndicator = EYEGAZENO;
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

var currentGaze;

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

/* evaluate automatic page turn condition *****************************/
const GAZE_AVERAGING_FACTOR = 0.2;
const GAZE_SWITCH_THRESHOLD = 0.8;
var recentAverageGaze = 1;
var currentNormalizedGaze = 1;

function averageGaze(current){
  if(eyeGazeIndicator != EYEGAZENO){
    recentAverageGaze = recentAverageGaze * (1 - GAZE_AVERAGING_FACTOR) + current * GAZE_AVERAGING_FACTOR;
    if(Math.abs(currentNormalizedGaze-recentAverageGaze) > GAZE_SWITCH_THRESHOLD){
      if(currentNormalizedGaze == 1){
        currentNormalizedGaze = 0;
        eyeDown();
      } else {
        currentNormalizedGaze = 1;
        eyeUp();
      }
    }
  }
}

/* sheet music highlight border upper/lower/transition ****************/
const TRANSITIONDURATION = 3; /* in seconds. HACK: Defined independently in css file */

const HIGHLIGHTUPPER = 0;
const HIGHLIGHTUPPEROUT = 1;
const HIGHLIGHTLOWERIN = 2;
const HIGHLIGHTLOWER = 3;
const HIGHLIGHTLOWEROUT = 4;
const HIGHLIGHTUPPERIN = 5;
var highlightState = HIGHLIGHTUPPER;

var scheduledStateTransition;

function enableHighlight(which, transition){
  document.getElementById("sheet-music-border-" + which).style["transition-duration"] = transition + "s";
  document.getElementById("sheet-music-border-" + which).style.border = "3px solid #9f9";
}

function disableHighlight(which, transition){
  document.getElementById("sheet-music-border-" + which).style["transition-duration"] = transition + "s";
  document.getElementById("sheet-music-border-" + which).style.border = "3px solid transparent";
}

function transitionUpDown1(){
  highlightState = HIGHLIGHTLOWERIN;
  enableHighlight("lower", TRANSITIONDURATION);
  scheduledStateTransition = window.setTimeout(transitionUpDown2, TRANSITIONDURATION*1000);
}

function transitionUpDown2(){
  highlightState = HIGHLIGHTLOWER;
  setPageUpper(pageNumberLower + 1)
}

function transitionDownUp1(){
  highlightState = HIGHLIGHTUPPERIN;
  enableHighlight("upper", TRANSITIONDURATION);
  scheduledStateTransition = window.setTimeout(transitionDownUp2, TRANSITIONDURATION*1000);
}

function transitionDownUp2(){
  highlightState = HIGHLIGHTUPPER;
  setPageLower(pageNumberUpper + 1)
}

function highlightToLower(){
  if(highlightState == HIGHLIGHTLOWER){
    console.log("error: was already in lower state");
  } else if(highlightState == HIGHLIGHTLOWERIN || highlightState == HIGHLIGHTUPPEROUT){
    highlightState = HIGHLIGHTLOWER;
    enableHighlight("lower", 0);
    disableHighlight("upper", 0);
    window.clearTimeout(scheduledStateTransition);
  } else if(highlightState == HIGHLIGHTUPPER){
    highlightState = HIGHLIGHTUPPEROUT;
    disableHighlight("upper", TRANSITIONDURATION);
    scheduledStateTransition = window.setTimeout(transitionUpDown1, TRANSITIONDURATION*1000);
  }
}

function highlightToUpper(){
  if(highlightState == HIGHLIGHTUPPER){
    console.log("error: was already in upper state");
  } else if(highlightState == HIGHLIGHTLOWEROUT || highlightState == HIGHLIGHTUPPERIN){
    highlightState = HIGHLIGHTUPPER;
    disableHighlight("lower", 0);
    enableHighlight("upper", 0);
    window.clearTimeout(scheduledStateTransition);
  } else if(highlightState == HIGHLIGHTLOWER){
    highlightState = HIGHLIGHTLOWEROUT;
    disableHighlight("lower", TRANSITIONDURATION);
    scheduledStateTransition = window.setTimeout(transitionDownUp1, TRANSITIONDURATION*1000);
  }
}
/* display pdf, set up ************************************************/
let loadPDF =   pdfjsLib.getDocument("./music.pdf"),
                pdfDoc = null;

loadPDF.promise.then(pdf => {
    pdfDoc = pdf;
    displayPage("upper", pageNumberUpper);
    displayPage("lower", pageNumberLower);
});

/* adjust pages displayed *********************************************/
function displayPage(where, number){
  pdfDoc.getPage(number).then(page => {
    let canvas = document.getElementById(where + "-pdf");
    canvas.height = canvas.clientHeight;
    canvas.width = canvas.clientWidth;
    let viewport = page.getViewport({scale: canvas.width / page.getViewport({scale: 1.0}).width});
    let renderContext = {
      canvasContext : canvas.getContext("2d"),
      viewport:  viewport
    }

    page.render(renderContext);
  })
}

function setPageUpper(number){
  displayPage("upper", number);
  pageNumberUpper = number;
  console.log("set page upper: " + number);
}
function setPageLower(number){
  displayPage("lower", number);
  pageNumberLower = number;
  console.log("set page lower: " + number);
}

/* main control finite state machine **********************************/
const STANDARD_BORDERED = 0;
const STANDARD_TRANS_OUT = 1;
const STANDARD_UNBORDERED = 2;
const STANDARD_TRANS_IN = 3;
const DANGLING = 4;

/* need two instances of this machine, so two states */
var stateUpper = STANDARD_BORDERED;
var stateLower = STANDARD_UNBORDERED;
var pageNumberUpper = 1;
var pageNumberLower = 2;


/* functions invoked when some condition for a state change holds */
function swipeRight(){}
function swipeUp(){}
function swipeLeft(){}
function swipeDown(){}
function eyeUp(){
  console.log("eye up");
  highlightToUpper();
}
function eyeDown(){
  console.log("eye down");
  highlightToLower();
}

/* fake eye gaze with mouse, defined sampling rate ********************/
const SAMPLINGRATE = 5 /* Hz */
var delayElapsed = true;
document.getElementById("app-container").addEventListener('mousemove', mousemoveSampler);
function mousemoveSampler(ev){
  if(delayElapsed){
    /* even though this would be broken parallelism in most languages,
     * I think in js's concurrency model it actually works, last I
     * checked. Doesn't matter much anyway, the sampling rate doesn't
     * need to be exact. */
    delayElapsed = false;
    setGazeIndicator(ev.clientX, ev.clientY);
    window.setTimeout(function(){delayElapsed=true;}, 1000/SAMPLINGRATE);
  }
}

/* fake eye gaze with mouse, arbitrary sampling ***********************/
/*
document.getElementById("app-container").addEventListener('mousemove', mousemoveHandler);
function mousemoveHandler(ev) {
  setGazeIndicator(ev.clientX, ev.clientY);
}
*/
