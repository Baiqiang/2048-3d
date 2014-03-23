function KeyboardInputManager() {
  this.events = {};

  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // vim keybindings
    76: 1,
    74: 2,
    72: 3,
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3, // A
    81: 4, // Q
    69: 5  // E
  };

  var holdingMap = {
    49: 1,
    50: 2,
    51: 3
  };

  var restartMap = [
    8, //backspace
    27, //esc
    48 //0
  ];

  var slice = [].slice;

  document.addEventListener("keydown", function (event) {
    console.log(event.which)
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];
    var holdingMapped = holdingMap[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", mapped);
      } else if (holdingMapped !== undefined) {
        event.preventDefault();
        self.emit("hidden", holdingMapped);
      } else if (event.which >= 65 && event.which <= 90) {
        event.preventDefault();
        self.emit("rotate");
      }

      if (restartMap.indexOf(event.which) > 0) {
        event.preventDefault();
        self.restart.bind(self)(event);
      }
    }
  });
  document.addEventListener('keyup', function (event) {
    var holdingMapped = holdingMap[event.which];
    if (holdingMapped !== undefined) {
      event.preventDefault();
      self.emit("hidden", false);
    }
  });
  var retry = document.querySelector(".retry-button");
  retry.addEventListener("click", this.restart.bind(this));
  retry.addEventListener("touchend", this.restart.bind(this));

  var keepPlaying = document.querySelector(".keep-playing-button");
  keepPlaying.addEventListener("click", this.keepPlaying.bind(this));
  keepPlaying.addEventListener("touchend", this.keepPlaying.bind(this));

  // Listen to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];

  gameContainer.addEventListener("touchstart", function (event) {
    if (event.touches.length > 1) return;

    touchStartClientX = event.touches[0].clientX;
    touchStartClientY = event.touches[0].clientY;
    event.preventDefault();
  });

  gameContainer.addEventListener("touchmove", function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener("touchend", function (event) {
    if (event.touches.length > 0) return;

    var dx = event.changedTouches[0].clientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = event.changedTouches[0].clientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
  });
  //touch buttons
  slice.call(document.querySelectorAll('.touch-hidden')).forEach(function(button) {
    var layer = button.textContent;
    button.addEventListener('touchstart', function (event) {
      event.preventDefault();
      self.emit("hidden", layer);
    });
    button.addEventListener('touchstart', function (event) {
      event.preventDefault();
    });
    button.addEventListener('touchend', function (event) {
      self.emit("hidden", false);
    });
  });
  var rotateButton = document.querySelector('.touch-rotate');
  var touchStartClientX2, touchStartClientY2;
  rotateButton.addEventListener("touchstart", function (event) {
    if (event.touches.length > 1) return;

    touchStartClientX2 = event.touches[0].clientX;
    touchStartClientY2 = event.touches[0].clientY;
    event.preventDefault();
  });

  rotateButton.addEventListener("touchmove", function (event) {
    event.preventDefault();
  });

  rotateButton.addEventListener("touchend", function (event) {
    if (event.touches.length > 0) return;

    var dx = event.changedTouches[0].clientX - touchStartClientX2;
    var absDx = Math.abs(dx);

    var dy = event.changedTouches[0].clientY - touchStartClientY2;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) {
      // (right : left) : (down : up)
      self.emit("rotate");
    }
  });
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
