function Tile(position, value) {
  this.x                = position.x;
  this.y                = position.y;
  this.z                = position.z;
  this.value            = value || 2;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y, z:this.z };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
  this.z = position.z;
};
