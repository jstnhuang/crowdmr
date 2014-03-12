/**
 * Holds the client code.
 */
function Client(id) {
  var that = this;
  that.id = id;
  that.filesystem = new FileSystem();
  that.filesystem.Init(0, function(){});
  that.peer = new Peer({key: 'qqz19fffgabjfw29'});
  that.connection = that.peer.connect(id);
  that.connection.on('open', function() { that.handleConnectionOpen(that); });
}

/**
 * Attaches callbacks when the peer connection is open.
 */
Client.prototype.handleConnectionOpen = function(that) {
  that.connection.on('data', function(serverData) {
    that.handleServerConnection(that, serverData);
 });
}

/**
 * Process messages received from server
 */
Client.prototype.handleServerConnection = function(that, serverData) {
  // This is a task message
  if ('path' in serverData) {
    that.handleServerTask(that, serverData);
  }
  // This is a data message
  else {
    that.handleServerData(that, serverData);
  }
}

/**
 * Processes the task. If the required data is on a local file, processes
 * the computation and sends the result back to the server.
 */
Client.prototype.handleServerTask = function(that, serverData) {
  var filename = serverData.path;
  that.filesystem.Exist(
    filename,
    function (fileEntry) {
      that.filesystem.ReadLines(
        filename,
        function(data) {
          var quasiServerData = {data: data};
          if ('mapper' in serverData) {
            that.mapper = serverData.mapper;
            quasiServerData.map = 'map';
          } else {
            console.log(filename, 'exists');
            that.reducer = serverData.reducer;
            quasiServerData.reduce = 'reduce';
          }
          that.handleServerData(that, quasiServerData);
        }
      )
    },
    function () {
      // TODO: 
      var result = {data: 'data'};
      that.connection.send(result);
      console.log(filename, 'file doesn\'t exist');
    }
  );
}
/**
 * Processes the computation and sends the result back to the server.
 */
Client.prototype.handleServerData = function(that, serverData) {
  var lines = serverData.data;
  var results = new Array();
  // The mapper takes in an array of strings, which is what we get from the
  // server. It returns a array of strings representing key/value pairs, where
  // the key and value are separated by a tab.
  if ('map' in serverData) {
    console.log('[Client] processing server map request...');
    var mapper = new Function('lines', that.mapper);
    results = mapper(lines);
  }

  // The reducer takes in a key and a list of values associated with that key.
  // However, the server gives us an unparsed list of key/value pairs. We must
  // parse it first, and associated the values with the keys. Then, we need to
  // run the reducer for each key, and combine the results back into a list of
  // key/list(value) pairs. The results are sent back to the server as a list of
  // strings, where the key is separated from the value with a tab.
  else {
    console.log('[Client] processing server reduce request...');
    var reducer = new Function('key', 'values', that.reducer);
    lines.sort();
    var prevKey = null;
    var values = [];
    for (var i=0; i<lines.length; i++) {
      var line = lines[i];
      var columns = line.split('\t');
      var key = columns[0];
      if (key === '') {
        continue;
      }
      var value = columns.slice(1).join('\t');
      if (key !== prevKey && i !== 0) {
        var reduceResults = reducer(prevKey, values);
        for (var j=0; j<reduceResults.length; j++) {
          results.push([prevKey, reduceResults[j]].join('\t'));
        }
        prevKey = key;
        values = [value];
      } else {
        values.push(value);
      }
    }
  }

  console.log('[Client] Sending results to server.');
  that.connection.send(results);
}
