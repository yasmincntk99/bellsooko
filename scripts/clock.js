// scripts/clock.js

const clock = {
  currentTime: new Date(),
  listeners: [],

  start() {
    setInterval(() => {
      this.currentTime = new Date();
      this.listeners.forEach(cb => cb(this.currentTime));
    }, 1000);
  },

  onTick(cb) {
    this.listeners.push(cb);
  }
};

export default clock;
