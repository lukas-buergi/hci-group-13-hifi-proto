'use strict';

window.onload = function() {
  /* TOUCH INPUT *****************************************************/
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

  const touchCapture = document.getElementById("touch-capture");
  touchCapture.addEventListener('touchstart', process_touchstart, false);
  touchCapture.addEventListener('touchcancel', process_touchend, false);
  touchCapture.addEventListener('touchend', process_touchend, false);
  function process_touchstart(ev) {
    ev.preventDefault();
    if(touchState == IDLE && ev.touches.length == 1){
      touchState = TENTATIVE;
      touchPos = {x: ev.touches[0].clientX, y: ev.touches[0].clientY};
    }
  }

  /* pause/unpause eye gaze based auto page turn *********************/
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

  /* eye gaze indicator **********************************************/
  const EYEGAZENO = 0;
  const EYEGAZETOP = 1;
  const EYEGAZEBOT = -1;
  var eyeGazeIndicator = EYEGAZENO;

  function eyeGazeSetTop() {
    eyeGazeIndicator = EYEGAZETOP;
    /* TODO: Change page */
  }

  function eyeGazeSetBottom() {
    eyeGazeIndicator = EYEGAZEBOT;
	  /* TODO: Change page */
  }
}
