export function createInput(sendDirection) {
  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };

  const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };

  let currentDirection = 'right';
  let directionQueue = [];
  let touchMode = 'joystick'; // 'joystick' or 'swipe'

  function tryDirection(dir) {
    const lastDir = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1] : currentDirection;
    if (dir !== lastDir && dir !== opposites[lastDir]) {
      directionQueue.push(dir);
      sendDirection(dir);
    }
  }

  function handleKeydown(e) {
    const dir = keyMap[e.key];
    if (!dir) return;
    e.preventDefault();
    tryDirection(dir);
  }

  function updateCurrentDirection(dir) {
    currentDirection = dir;
    directionQueue = [];
  }

  function setTouchMode(mode) {
    touchMode = mode;
  }

  // --- Virtual joystick ---
  let joystickEl = null;
  let knobEl = null;

  function createJoystick() {
    joystickEl = document.createElement('div');
    joystickEl.id = 'joystick';
    joystickEl.innerHTML = `
      <div id="joystick-base">
        <div id="joystick-knob"></div>
      </div>
    `;
    document.body.appendChild(joystickEl);
    knobEl = document.getElementById('joystick-knob');

    const base = document.getElementById('joystick-base');
    const baseSize = 120;
    const knobSize = 50;
    const deadzone = 15;
    let active = false;
    let lastDir = null;

    function getDirection(dx, dy) {
      if (Math.abs(dx) < deadzone && Math.abs(dy) < deadzone) return null;
      return Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
    }

    function clamp(val, max) {
      return Math.max(-max, Math.min(max, val));
    }

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      active = true;
      knobEl.style.transition = 'none';
    }, { passive: false });

    base.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!active) return;
      const touch = e.touches[0];
      const rect = base.getBoundingClientRect();
      const centerX = rect.left + baseSize / 2;
      const centerY = rect.top + baseSize / 2;
      const maxDist = (baseSize - knobSize) / 2;
      const dx = clamp(touch.clientX - centerX, maxDist);
      const dy = clamp(touch.clientY - centerY, maxDist);
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      const dir = getDirection(dx, dy);
      if (dir && dir !== lastDir) {
        lastDir = dir;
        tryDirection(dir);
      }
    }, { passive: false });

    function endTouch(e) {
      e.preventDefault();
      active = false;
      lastDir = null;
      knobEl.style.transition = 'transform 0.15s ease-out';
      knobEl.style.transform = 'translate(0px, 0px)';
    }

    base.addEventListener('touchend', endTouch, { passive: false });
    base.addEventListener('touchcancel', endTouch, { passive: false });
  }

  function destroyJoystick() {
    if (joystickEl) {
      joystickEl.remove();
      joystickEl = null;
      knobEl = null;
    }
  }

  // --- Swipe controls ---
  let swipeStartX = 0;
  let swipeStartY = 0;
  const SWIPE_THRESHOLD = 30;

  function handleSwipeStart(e) {
    const touch = e.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
  }

  function handleSwipeEnd(e) {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeStartX;
    const dy = touch.clientY - swipeStartY;

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');

    tryDirection(dir);
  }

  function enableSwipe() {
    document.addEventListener('touchstart', handleSwipeStart, { passive: true });
    document.addEventListener('touchend', handleSwipeEnd, { passive: true });
  }

  function disableSwipe() {
    document.removeEventListener('touchstart', handleSwipeStart);
    document.removeEventListener('touchend', handleSwipeEnd);
  }

  // --- Lifecycle ---
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function start() {
    document.addEventListener('keydown', handleKeydown);
    if (isTouchDevice()) {
      if (touchMode === 'joystick') {
        createJoystick();
      } else {
        enableSwipe();
      }
    }
  }

  function stop() {
    document.removeEventListener('keydown', handleKeydown);
    destroyJoystick();
    disableSwipe();
  }

  return { start, stop, updateCurrentDirection, setTouchMode };
}
