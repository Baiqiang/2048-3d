function GameManager(size, InputManager, Actuator, ScoreManager) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;
  this.rotated      = false;
  this.startTiles   = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("rotate", this.rotate.bind(this));
  this.inputManager.on("hidden", this.hidden.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Rotate the container
GameManager.prototype.rotate = function () {
  this.rotated = !this.rotated;
  this.actuator.rotate(this.rotated);
};

// Hide some layers
GameManager.prototype.hidden = function (layer) {
  this.actuator.hidden(layer, this.size);
};

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.continue(true);
  this.setup();
};

// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continue();
};

GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won && !this.keepPlaying)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid        = new Grid(this.size);

  this.score       = 0;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;
  this.bonus       = {};
  this.max         = 2;

  // Add the initial tiles
  this.addStartTiles();

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Add bonus tile
GameManager.prototype.addBonus = function () {
  if (Math.random() > 0.2 * this.grid.availableCells().length / Math.pow(this.size, 3)) {
    return;
  }
  var maxBonus = 4;
  var values = [4, 64, 256];
  var value = values[Math.floor(Math.random() * values.length)];
  if (this.bonus[value] === undefined) {
    this.bonus[value] = 0;
  }
  if (this.bonus[value] == 2) {
    return;
  }
  for (var num in this.bonus) {
    maxBonus -= this.bonus[num];
  }
  if (maxBonus <= 0) {
    return;
  }
  if (this.grid.cellsAvailable()) {
    this.bonus[value]++;
    var tile = new Tile(this.grid.randomAvailableCell(), value, 'bonus');
    this.grid.insertTile(tile);
  }
};

// remove bonus tile
GameManager.prototype.removeBonus = function (value) {
  if (this.bonus[value] !== undefined) {
    delete this.bonus[value];
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.scoreManager.get(),
    terminated: this.isGameTerminated()
  });

};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  var self = this;
  this.grid.eachCell(function (x, y, z, tile) {
    if (tile) {
      if (tile.type === 'bonused') {
        self.grid.removeTile({ x: x, y: y, z:z });
      } else {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y][tile.z] = null;
  this.grid.cells[cell.x][cell.y][cell.z] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  // Save the current tile positions and remove merger information
  this.prepareTiles();
  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      traversals.z.forEach(function (z) {
        cell = { x: x, y: y, z:z };
        tile = self.grid.cellContent(cell);

        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next      = self.grid.cellContent(positions.next);

          // Only one merger per row traversal?
          if (next && next.value === tile.value && next.type === tile.type && !next.mergedFrom) {
            var type = next.type === 'number' ? 'number' : 'bonused';
            var merged = new Tile(positions.next, tile.value * 2, type);
            merged.mergedFrom = [tile, next];
            tile.merged = next.merged = true;

            self.grid.insertTile(merged);
            self.grid.removeTile(tile);
            if (tile.type === 'bonus') {
              self.removeBonus(tile.value);
            }

            // Converge the two tiles' positions
            tile.updatePosition(positions.next);

            // Update the score
            self.score += merged.value;
            if (merged.value > self.max) {
              self.max = merged.value;
            }
            // The mighty 2048 tile
            if (merged.value === 2048 && merged.type === 'number') self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }

          if (!self.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });
  });

  if (moved) {
    this.addRandomTile();
    this.addBonus();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = !this.rotated ? {
    0: { x: 0,  y: -1, z: 0 }, // up
    1: { x: 1,  y: 0, z: 0 },  // right
    2: { x: 0,  y: 1, z: 0 },  // down
    3: { x: -1, y: 0, z: 0 },  // left
    4: { x: 0,  y: 0, z: 1 },  // front
    5: { x: 0, y: 0, z: -1 }   // back
  } : {
    0: { x: 0,  y: -1, z: 0 }, // up
    1: { x: 0,  y: 0, z: 1 },  // right should be front
    2: { x: 0,  y: 1, z: 0 },  // down
    3: { x: 0, y: 0, z: -1 },  // left should be back
    4: { x: -1,  y: 0, z: 0 },  // front should be left
    5: { x: 1, y: 0, z: 0 }   // back should be right
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [], z: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
    traversals.z.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
  if (vector.z === 1) traversals.z = traversals.z.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y, z: previous.z + vector.z };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      for (var z= 0; z < this.size; z++) {
        tile = this.grid.cellContent({ x: x, y: y, z: z });

        if (tile) {
          for (var direction = 0; direction < 6; direction++) {
            var vector = self.getVector(direction);
            var cell   = { x: x + vector.x, y: y + vector.y, z: z + vector.z };

            var other  = self.grid.cellContent(cell);

            if (other && other.value === tile.value && other.type === tile.type) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y && first.z === second.z;
};
