function HTMLActuator() {
  this.gridContainer    = document.querySelector(".grid-container");
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
  var clearUselessTile = this.clearUselessTile.bind(this);
  ['webkitTransitionEnd', 'oTransitionEnd', 'transitionend'].forEach(function(eventName) {
    document.addEventListener(eventName, clearUselessTile);
  })
}

HTMLActuator.prototype.rotate = function (rotated) {
  if (rotated) {
    this.gridContainer.classList.add('rotated');
  } else {
    this.gridContainer.classList.remove('rotated');
  }
};

HTMLActuator.prototype.hidden = function (layer, size) {
  if (layer === false || layer === undefined) {
    var dom = document.querySelectorAll('.cube.hidden');
    [].slice.call(dom).forEach(function(d) {
      d.classList.remove('hidden');
    });
  } else {
    for (var x = 0; x < size; x++) {
      for (var y = 0; y < size; y++) {
        for (var z = 0; z < size; z++) {
          if (z + 1 == layer) {
            continue;
          }
          [].slice.call(document.querySelectorAll('.' + this.positionClass({
            x: x,
            y: y,
            z: z
          }).replace(/ .+/g, ''))).forEach(function(d) {
            d.classList.add('hidden');
          });
        }
      }
    }
  }
};

HTMLActuator.prototype.clearUselessTile = function() {
  var self = this;
  [].slice.call(document.querySelectorAll('.tile-useless')).forEach(function(d) {
    self.tileContainer.removeChild(d.parentNode);
  });
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);
    grid.cells.forEach(function (face) {
      face.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) {
            self.addTile(cell);
          }
        });
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continue = function (restart) {
  if (typeof ga !== "undefined") {
    ga("send", "event", window.gameName || "game", restart ? "restart" : "keep playing");
  }
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y, z: tile.z };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, 'cube', positionClass, "tile-" + tile.type];
  var value = tile.value;
  if (value > 8192) {
    (function() {
      var i = 1, n = value;
      while (n > 2) {
        i++;
        n /= 2;
      }
      value = '2^' + i;
    })();
  }

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  ['u', 'd', 'l', 'r', 'f', 'b'].forEach(function(f) {
    var face = document.createElement("div");
    self.applyClasses(face, ['cube-face', 'cube-face-' + f]);
    face.textContent = value;
    inner.appendChild(face);
  });

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[3] = self.positionClass({ x: tile.x, y: tile.y, z: tile.z });
      self.applyClasses(wrapper, classes); // Update the position
    });
    if (tile.merged) {
      inner.classList.add("tile-useless");
    }
  } else if (tile.mergedFrom) {
    inner.classList.add("tile-merged");

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    inner.classList.add("tile-new");
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1, z: position.z + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "cube-" + position.x + "-" + position.y + "-" + position.z + ' x-' + position.x + ' y-' + position.y + ' z-' + position.z;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";
  if (typeof ga !== "undefined") {
    ga("send", "event", window.gameName || "game", "end", type, this.score);
  }

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
