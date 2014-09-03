function Tile(position, value, type) {
  this.x                = position.x;
  this.y                = position.y;
  this.z                = position.z;
  this.value            = value || 2;
  this.type             = type || 'number';

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
  this.merged           = false;
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y, z:this.z };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
  this.z = position.z;
};
