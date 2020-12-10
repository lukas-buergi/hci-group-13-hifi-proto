'use strict';
/* Various ************************************************************/
function whereNot(where){
  if(where == "upper"){
    return("lower");
  } else if (where == "lower"){
    return("upper");
  } else {
    console.log("bad useage: whereNot()");
  }
}
/* Calibration screen *************************************************/
function calibrationScreenOn() {
  document.getElementById("start-stop").innerHTML = "Stop";
  document.getElementById("calibration-overlay").style.visibility = "visible";
}

function calibrationScreenOff() {
  isCalibrated = true;
  document.getElementById("calibration-overlay").style.visibility = "hidden";
}
/* Toggle visibility of the menu and status bars **********************/
function toggleMenu() {
	var menu = document.getElementById("menu");
	
	if(menu.style.visibility == "hidden"){
		menu.style.visibility = "visible";
		document.getElementById("overlay-1").innerHTML = "Hide Menu";
	} else {
		menu.style.visibility = "hidden";
		document.getElementById("overlay-1").innerHTML = "Show Menu";
	}
}

function toggleStatus() {
	var status = document.getElementById("status");

	if(status.style.visibility == "hidden"){
		status.style.visibility = "visible";
		document.getElementById("overlay-3").innerHTML = "Hide Status";
	} else {
		status.style.visibility = "hidden";
		document.getElementById("overlay-3").innerHTML = "Status: (o)";
	}
}

/* Toggle fullscreen (button in menu) *********************************/
function toggleFullscreen() {
	if(document.fullscreenElement){
		document.exitFullscreen();
	} else {
		document.documentElement.requestFullscreen();
	}
}

/* Load a sheet music PDF from the local computer *********************/
function loadSheetMusicDialog() {
	document.getElementById("loadSheetMusicInput").click();
}

function loadSheetMusicPDF() {
	var file = document.getElementById("loadSheetMusicInput").files[0];
	var fileReader = new FileReader();
	
	fileReader.onload = function () {
		var typedarray = new Uint8Array(this.result);
		var loadPDF = pdfjsLib.getDocument(typedarray);		
		
		loadPDF.promise.then(pdf => {
			pdfDoc = pdf;
			//document.getElementById("start-stop").innerHTML = "Stop";
			displayPage("upper", 1);
			displayPage("lower", 2);
		});
	}
		
	//var pageNumber = {"upper" : 1, "lower" : 2};
	//console.log(fileInput.value);
	//loadPDF = pdfjsLib.getDocument(fileInput.value);
	//var pdfDoc = null;
	//
	
	
	fileReader.readAsArrayBuffer(file);
	hasFile = true;
}


/* toggle auto turn ***************************************************/
function startStopAction() {
	var btn = document.getElementById("start-stop")
	
	if(hasFile && isCalibrated) {
		if(btn.innerHTML == "Stop"){
			btn.innerHTML = "Start";
			autoTurnToggle();
		} else {
			btn.innerHTML = "Stop";
			autoTurnToggle();
		}
	}
}
/* Data collection *********************************************/
var dataCollection = false;
var dataCollectionStartPage;
var gatheredData = [("Elapsed Time,Absolute x coordinate,Absolute y coordinate,eyeGazePdfUpperRect.x,eyeGazePdfUpperRect.y,"
  + "eyeGazePdfUpperRect.height,eyeGazePdfUpperRect.width,eyeGazePdfLowerRect.x,eyeGazePdfLowerRect.y,"
  + "eyeGazePdfLowerRect.height,eyeGazePdfLowerRect.width,upper page number,lower page number")];

function toggleDataCollection(){
  let btn = document.getElementById("toggleDataCollection");
  let where;
  if(getCurrentNormalizedGaze() == 1){
    where = "upper";
  } else {
    where = "lower";
  }
  if(dataCollection){
    console.log("Stopped collecting, offering for download");
    btn.innerHTML = "Collect data";
    dataCollection = false;
    let dataCollectionStopPage = pageNumber[where];
    let time = new Date().toLocaleTimeString('de-CH');
    save("gatheredDataPage" + dataCollectionStartPage + "-" + dataCollectionStopPage + "endedAt" + time + ".csv", gatheredData);
  } else {
    console.log("Stop collection");
    btn.innerHTML = "Stop collecting data";
    dataCollection = true
    dataCollectionStartPage = pageNumber[where];
  }
}

function save(filename, data) {
  let csv = "";
  data.forEach(el => {
    csv += el + "\n";
  });
  var blob = new Blob([csv], {type: 'text/csv'});
  if(window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
  }
  else{
      var elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;        
      document.body.appendChild(elem);
      elem.click();        
      document.body.removeChild(elem);
  }
}

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
        turn("back");
      } else if(0.75 + SWIPE_DIR_MARGIN < angle && angle + SWIPE_DIR_MARGIN < 1.25){
        console.log("swipe up");
      } else if(1.25 + SWIPE_DIR_MARGIN < angle && angle + SWIPE_DIR_MARGIN < 1.75){
        console.log("swipe left");
        turn("forward");
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
var hasFile = false;
var isCalibrated = false;

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
const EYEGAZEACTIVE = "./assets/images/eyeActive.svg.png";
const EYEGAZEINACTIVE = "./assets/images/eyeInactive.svg.png";

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
const EYE_GAZE_BORDER = 0.05; // config parameter
/* const SCREEN_HEIGHT = screen.height; */
/* const SCREEN_WIDTH = screen.width; */

var currentGaze;

function setGazeIndicator(x, y, elapsedTime) {
  // need to do those calculations every time to react to resizing
  let eyeGazeAppRect = document.getElementById("app-container").getBoundingClientRect();
  let eyeGazePdfUpperRect = document.getElementById("upper-pdf").getBoundingClientRect();
  let eyeGazePdfLowerRect = document.getElementById("lower-pdf").getBoundingClientRect();
  let eyeGazeBorderPixels = EYE_GAZE_BORDER * eyeGazePdfUpperRect.height;
  let eyeGazeXMin = eyeGazeAppRect.x + eyeGazeBorderPixels;
  let eyeGazeXMax = eyeGazeAppRect.x + eyeGazeAppRect.width - eyeGazeBorderPixels;
  let eyeGazeY1Min = eyeGazePdfUpperRect.y + eyeGazeBorderPixels;
  let eyeGazeY1Max = eyeGazePdfUpperRect.y + eyeGazePdfUpperRect.height - eyeGazeBorderPixels;
  let eyeGazeY2Min = eyeGazePdfLowerRect.y + eyeGazeBorderPixels;
  let eyeGazeY2Max = eyeGazePdfLowerRect.y + eyeGazePdfUpperRect.height - eyeGazeBorderPixels;
  
  if(eyeGazeXMin < x && x < eyeGazeXMax){
    if(eyeGazeY1Min < y && y < eyeGazeY1Max){
      eyeGazeSetTop();
    } else if(eyeGazeY2Min < y && y < eyeGazeY2Max){
      eyeGazeSetBottom();
    } else {
      eyeGazeSetNone();
    }
  } else {
    eyeGazeSetNone();
  }

  if(dataCollection){
    let newEntry = elapsedTime + "," + x + "," + y + "," + eyeGazePdfUpperRect.x + "," 
      + eyeGazePdfUpperRect.y + "," + eyeGazePdfUpperRect.height + "," + eyeGazePdfUpperRect.width + "," 
      + eyeGazePdfLowerRect.x + "," + eyeGazePdfLowerRect.y + "," + eyeGazePdfLowerRect.height + "," 
      + eyeGazePdfLowerRect.width + "," + pageNumber["upper"] + "," + pageNumber["lower"];
    gatheredData.push(newEntry);
  }
}

/* evaluate automatic page turn condition *****************************/
const GAZE_AVERAGING_FACTOR = 0.2; // config parameter
const GAZE_SWITCH_THRESHOLD = 0.8; // config parameter
const GAZE_REFERENCE_FREQUENCY = 6; // Hz, not meant to be changed

var recentAverageGaze = 1;
var lastGazeTime = new Date().getTime();

function averageGaze(current){
  if(autoTurn == AUTOTURNON){
    let newGazeTime = new Date().getTime();
    let tdiff = newGazeTime - lastGazeTime; // ms
    lastGazeTime = newGazeTime;
    tdiff = tdiff / 1000.0; // s
    let trel = tdiff / (1.0 / GAZE_REFERENCE_FREQUENCY); // fraction of reference period that passed since last time
    let oldDataWeight = Math.pow(1-GAZE_AVERAGING_FACTOR, trel);
    recentAverageGaze = recentAverageGaze * oldDataWeight + current * (1-oldDataWeight);
    if(Math.abs(getCurrentNormalizedGaze()-recentAverageGaze) > GAZE_SWITCH_THRESHOLD){
      if(getCurrentNormalizedGaze() == 1){
        eyeDown();
      } else {
        eyeUp();
      }
    }
  }
}
function getCurrentNormalizedGaze(){
  if(highlightState == HIGHLIGHT_UPPER){
    return(1);
  } else if(highlightState == HIGHLIGHT_LOWER){
    return(0);
  }
}

/* display pdf, set up ************************************************/
var pageNumber = {"upper" : 1, "lower" : 2};
var loadPDF = pdfjsLib.getDocument("./assets/images/music.pdf");
var pdfDoc = null;
//enableEyeGaze();
//
loadPDF.promise.then(pdf => {
	hasFile = true;
    pdfDoc = pdf;
    displayPage("upper", 1);
    displayPage("lower", 2);
    enableEyeGaze();
    //enableMouseFakeEye();
});

/* adjust pages displayed *********************************************/
function displayPage(where, number){
	if(hasFile) {
		  $("#" + where + "-pdf").fadeOut(1000, function() {
			pdfDoc.getPage(number).then(page => {
			  console.log("set " + where + " page to " + number);
			  pageNumber[where] = number;
			  let canvas = document.getElementById(where + "-pdf");
			  canvas.height = canvas.clientHeight;
			  canvas.width = canvas.clientWidth;
			  let viewport = page.getViewport({scale: canvas.width / page.getViewport({scale: 1.0}).width});
			  let renderContext = {
				canvasContext : canvas.getContext("2d"),
				viewport:  viewport
			  }
			  page.render(renderContext)
			})
		  })
		  $("#" + where + "-pdf").fadeIn(1000);
	}
}

/* sheet music highlight border upper/lower/transition ****************/
const TRANSITION_DURATION = 2; /* in seconds. */
const HIGHLIGHT_UPPER = 0;
const HIGHLIGHT_UPPER_OUT = 1;
const HIGHLIGHT_LOWER_IN = 2;
const HIGHLIGHT_LOWER = 3;
const HIGHLIGHT_LOWER_OUT = 4;
const HIGHLIGHT_UPPER_IN = 5;

var highlightState = HIGHLIGHT_UPPER;
var scheduledStateTransition;

function enableHighlight(which, transition){
  document.getElementById("sheet-music-border-" + which).style["transition-duration"] = transition + "s";
  document.getElementById("sheet-music-border-" + which).style.border = "3px solid #9f9";
}

function disableHighlight(which, transition){
  document.getElementById("sheet-music-border-" + which).style["transition-duration"] = transition + "s";
  document.getElementById("sheet-music-border-" + which).style.border = "3px solid transparent";
}

function highlightTo(where, step=0){
  if(where == "upper"){
    var target = HIGHLIGHT_UPPER;
    var targetTrans1 = HIGHLIGHT_LOWER_OUT;
    var targetTrans2 = HIGHLIGHT_UPPER_IN;
    var start = HIGHLIGHT_LOWER;
    var inProgress = [HIGHLIGHT_LOWER_IN, HIGHLIGHT_UPPER_OUT];
    var otherDir = [HIGHLIGHT_LOWER_OUT, HIGHLIGHT_UPPER_IN];
  } else if(where == "lower"){
    var target = HIGHLIGHT_LOWER;
    var targetTrans1 = HIGHLIGHT_UPPER_OUT;
    var targetTrans2 = HIGHLIGHT_LOWER_IN;
    var start = HIGHLIGHT_UPPER;
    var inProgress = [HIGHLIGHT_LOWER_OUT, HIGHLIGHT_UPPER_IN];
    var otherDir = [HIGHLIGHT_LOWER_IN, HIGHLIGHT_UPPER_OUT];
  } else {
    console.log("Wrong argument to highlightTo");
  }

  if(step == 0){
    /* first call */
    if(highlightState == target){
      console.log("error: was already in " + where + " state");
    } else if(inProgress.includes(highlightState)){
      /* finish animation prematurely */
      highlightState = target;
      enableHighlight(where, 0);
      disableHighlight(whereNot(where), 0);
      window.clearTimeout(scheduledStateTransition);
      transitionFinished(where);
    } else if(highlightState == start){
      /* initiate animated change */
      highlightState = targetTrans1;
      disableHighlight(whereNot(where), TRANSITION_DURATION);
      scheduledStateTransition = window.setTimeout(highlightTo(where, 1), TRANSITION_DURATION*1000);
      transitionStarted(where);
    } else {
      /* we are animating out of target, abort */
      window.clearTimeout(scheduledStateTransition);
      enableHighlight(where, 0);
      disableHighlight(whereNot(where), 0);
      transitionAbortedStayed(where);
    }
  } else if(step == 1){
    /* step 1 of animation */
    highlightState = targetTrans2;
    enableHighlight(where, TRANSITION_DURATION);
    scheduledStateTransition = window.setTimeout(highlightTo(where, 2), TRANSITION_DURATION*1000);
  } else if(step == 2){
    /* step 2 of animation */
    highlightState = target;
    transitionFinished(where);
  } else {
    console.log("usage error highlightTo");
  }
}

/* main control finite state machine **********************************/
var nextPageNumber;
var nextPagePosition;

function turn(direction){
  if(direction == "back"){
    var steadyDown = HIGHLIGHT_UPPER;
    var abortToUpper = [HIGHLIGHT_UPPER_OUT, HIGHLIGHT_LOWER_IN];
    var steadyUp = HIGHLIGHT_LOWER;
    var pageDiff = -1;
    var pageUpdatedIfDown = "lower";
  } else if(direction == "forward"){
    var steadyDown = HIGHLIGHT_UPPER;
    var abortToUpper = [HIGHLIGHT_UPPER_OUT, HIGHLIGHT_LOWER_IN];
    var steadyUp = HIGHLIGHT_LOWER;
    var pageDiff = 1;
    var pageUpdatedIfDown = "upper";
  } else {
    console.log("usage error: turn()");
  }
  
  if(highlightState == steadyDown){
    console.log("steadyDown");
    nextPageNumber = pageNumber[whereNot(pageUpdatedIfDown)] + pageDiff;
    nextPagePosition = pageUpdatedIfDown;
    highlightTo("lower");
    highlightTo("lower");
  } else if(abortToUpper.includes[highlightState]){
    highlightTo("upper");
  } else if(highlightState == steadyUp){
    nextPageNumber = pageNumber[pageUpdatedIfDown] + pageDiff;
    nextPagePosition = whereNot(pageUpdatedIfDown);
    highlightTo("upper");
    highlightTo("upper");
  } else {
    highlightTo("lower");
  }
}

function swipeUp(){}

function swipeLeft(){}

function swipeDown(){}

function eyeUp(){
  nextPageNumber = pageNumber["upper"] + 1;
  nextPagePosition = "lower";
  highlightTo("upper");
}

function eyeDown(){
  nextPageNumber = pageNumber["lower"] + 1;
  nextPagePosition = "upper";
  highlightTo("lower");
}

function transitionFinished(where){
  displayPage(nextPagePosition, nextPageNumber);
}

function transitionStarted(where){}

function transitionAbortedStayed(where){}

/* eye gaze input *****************************************************/
function enableEyeGaze(){
  webgazer.params.showVideoPreview = true;
  webgazer.setGazeListener(eyeGazeHandler).begin();
  /* might only work a bit later, so wait random amount */
  window.setTimeout(movePreview, 5000);
}

function movePreview(){
  const destination = document.getElementById("video-1");
  destination.innerHTML = "";
  const previewElemIDs = ["webgazerVideoFeed", "webgazerVideoCanvas", "webgazerFaceOverlay", "webgazerFaceFeedbackBox"];
  let previewElems = [];
  previewElemIDs.forEach(el => previewElems.push(document.getElementById(el)));
  previewElems.forEach(el => {
    el.remove();
    destination.append(el); 
    el.style.position = "absolute"; 
    if(el.id == "webgazerFaceFeedbackBox"){
      el.style.top = destination.clientHeight / 4;
      el.style.left = destination.clientWidth / 4;
      el.style.height = destination.clientHeight / 2;
      el.style.width = destination.clientWidth / 2;
    } else {
      el.style.height = destination.clientHeight; 
      el.height = destination.clientHeight;
      el.style.width = destination.clientWidth; 
      el.width = destination.clientWidth;
    }
  });
}

function eyeGazeHandler(data, elapsedTime){
  if (data == null) {
    /* console.log("no prediction, maybe needs calibration?"); */
  } else {
    /* console.log(data.x + "," + data.y); */
    setGazeIndicator(data.x, data.y, elapsedTime);
  }
}

/* fake eye gaze with mouse, defined sampling rate ********************/
const SAMPLINGRATE = 5 /* Hz */

var delayElapsed = true;

function enableMouseFakeEye(){
  console.log("Enabled faking eye gaze with mouse");
  document.getElementById("app-container").addEventListener('mousemove', mousemoveSampler);
}

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
