/**
 * A resolver class that will run the function
 * passed as `startWaiting`, with a concurrent
 * timeout running that will trigger the
 * `timeoutFunction` function after a specific
 * number of milliseconds.
 *
 * This timeout can be paused using `.pause()`,
 * which will return a promise that can be
 * `await`ed to effect a non-blocking "pause".
 */
class TaskTimer {
  static id = 0;
  static timers = {};

  /**
   * Create a timed task monitor.
   *
   * @param {function} startWaiting the function that gets called when the task timer starts, with the timer itself as function argument.
   * @param {function} timeoutFunction the function that will get called if the allocated task time runs out.
   * @param {milliseconds} timeoutInterval the timeout interval in milliseconds.
   * @param {function} signalHandler (optional) function that can be called at regular intervals over the course of the timeout.
   * @param {int} signalCount (optional) the number of signals to send over the course of the timeout, INCLUDING signal "0" at the start.
   */
  constructor(startWaiting, timeoutFunction, timeoutInterval, signalHandler=false, signalCount=0) {
    this.id = TaskTimer.id++;
    this.paused = false;
    this.created = Date.now();
    this.overrideKickedIn = false;
    this.timeoutInterval = timeoutInterval;

    this.timeoutFunction = () => {
      TaskTimer.__forget__(this);
      timeoutFunction();
    };

    if (signalHandler && signalCount > 0) {
      this.signalHandler = signalHandler;
      this.totalSignalCount = signalCount + 1;
      if (this.totalSignalCount < 1) this.totalSignalCount = 1;
      this.signalCount = this.totalSignalCount;
      this.sendSignal();
    }

    setTimeout(() => startWaiting(this), 0);
    this.startTimeout();
    TaskTimer.__record__(this);
  }

  /**
   * Class function: record this timer in the list of active timers.
   */
  static __record__(timer) {
    TaskTimer.timers[timer.id] = timer;
  }

  /**
   * Class function: remove this timer from the list of active timers.
   */
  static __forget__(timer) {
    delete TaskTimer.timers[timer.id];
  }

  /**
   * activate the override function
   */
  startTimeout() {
    this.overrideTrigger = setTimeout(() => {
      this.overrideKickedIn = true;
      this.timeoutFunction();
    }, this.timeoutInterval);
  }

  /**
   * send a regular(ish) signal while the timeout is active.
   */
  sendSignal() {
    let handler = this.signalHandler;
    if(!handler) return;

    // send a signal
    let signalNumber = this.totalSignalCount - (this.signalCount--);
    // console.debug('sendSignal in TaskTimer', this.totalSignalCount, this.signalCount);
    handler(signalNumber);

    // calculate how long the wait interval should now be
    // based on how much time is left until the timeout.
    if (!this.isPaused() && this.signalCount>0) {
      let elapsed = Date.now() - this.created;
      let remaining = this.timeoutInterval - elapsed;
      let timeoutValue = remaining / this.signalCount;
      // console.debug('nextSignal in TaskTimer =', timeoutValue, 'from', this.signalCount,"over", remaining);
      this.nextSignal = setTimeout(() => this.sendSignal(), timeoutValue);
    }
  }

  /**
   * has this timer timed out?
   */
  hasTimedOut() {
    return this.overrideKickedIn;
  }

  /**
   * cancel the timeout part of this timer, and
   * remove it from the list of active timers,
   * as the "timer" part no longer applies.
   *
   * If `__preserveTimer` is true, this timer
   * is not removed from the list of known
   * timers, which is important, because the
   * `pause()` function relies on  `cancel()`!
   */
  cancel(__preserveTimer) {
    if (this.nextSignal) clearTimeout(this.nextSignal);

    if (!this.overrideKickedIn) {
      clearTimeout(this.overrideTrigger);
      if (!__preserveTimer) {
        if (this.signalHandler) this.signalHandler(this.totalSignalCount-1);
        TaskTimer.__forget__(this);
      }
    }
  }

  /**
   * Is this timer currently paused? If so,
   * return the promise for await'ing purposes.
   */
  isPaused() {
    return this.paused;
  }

  /**
   * Temporarily suspend this timer's timeout.
   */
  pause() {
    this.cancel(true);
    let elapsed = Date.now() - this.created;
    this.timeoutInterval =  this.timeoutInterval - elapsed;

    // set up the main task pause
    let resolver = resolve => (this._resolve_pause_lock = resolve);
    this.paused = new Promise(resolver);

    return this.paused;
  }

  /**
   * Resume this timer's timeout.
   */
  resume() {
    if (this._resolve_pause_lock) {
      this.paused = false;
      this.created = Date.now();
      this._resolve_pause_lock();
      this.startTimeout();
      this.sendSignal();
    }
  }

  /**
   * Class function: pause all known timers.
   */
  static pause() {
    for (timer of TaskTimer.timers) timer.pause();
    if (!TaskTimer.paused) {
      let resolver = resolve => (TaskTimer._resolve_pause_lock = resolve);
      TaskTimer.paused = new Promise(resolver);
    }
    return TaskTimer.paused;
  }

  /**
   * Class function: resume all known timers.
   */
  static resume() {
    TaskTimer._resolve_pause_lock();
    TaskTimer.paused = false;
    for (timer of TaskTimer.timers) timer.resume();
  }
}

// static properties
TaskTimer.id = 0;
TaskTimer.timers = {};

export { TaskTimer };
