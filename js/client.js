/**
 * Holds the client code.
 */
function Client(id) {
  var that = this;
  that.id = id;
  that.peer = new Peer({key: 'qqz19fffgabjfw29'});
  that.connection = that.peer.connect(id);
  that.connection.on('open', function() { that.handleConnectionOpen(that); });
}

/**
 * Attaches callbacks when the peer connection is open.
 */
Client.prototype.handleConnectionOpen = function(that) {
  that.connection.on('data', function(serverData) {
    that.handleServerData(that, serverData);
 });
}

/**
 * Processes the computation and sends the result back to the server.
 */
Client.prototype.handleServerData = function(that, serverData) {
  var data = JSON.parse(serverData.data);
  var mapper = new Function("data", serverData.mapper);
  var reducer = new Function("data", serverData.reducer);
  console.log("mapper:", mapper);
  console.log("reducer:", reducer);
  var result = reducer(mapper(data))
  console.log("Sending result", JSON.stringify(result));
  that.connection.send(JSON.stringify(result));
}
