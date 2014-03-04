/**
 * ClientInfo encapsulates a client ID, a PeerJS connection object, and the
 * client's current task, if any.
 */
function ClientInfo(id, connection) {
  this.id = id;
  this.connection = connection;
  this.task = null;
}

ClientInfo.prototype.Id = function() {
  return this.id;
}

ClientInfo.prototype.Connection = function() {
  return this.connection;
}

ClientInfo.prototype.Task = function() {
  return this.task;
}

ClientInfo.prototype.SetTask = function(task) {
  this.task = task;
}
