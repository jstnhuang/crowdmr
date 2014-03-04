function Task(id, type, path) {
  this.id = id;
  this.type = type;
  this.path = path;
}

Task.prototype.Id = function() {
  return this.id;
}

Task.prototype.IsMap = function() {
  return this.type === 'map';
}

Task.prototype.IsReduce = function() {
  return this.type === 'reduce';
}

Task.prototype.Path = function() {
  return this.path;
}
