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
  var lines = serverData.data;
  var results = new Array();
  // The mapper takes in a list of strings, which is what we get from the
  // server. It returns a list of key/value pairs, where the key and values are
  // strings.
  if ('mapper' in serverData) {
    console.log('[Client] processing server map request...');
    var mapper = new Function('lines', serverData.mapper);
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
    var reducer = new Function('key', 'values', serverData.reducer);
    var parsedLines = {};
    for (var i in lines) {
      var line = lines[i];
      var columns = line.split('\t');
      if (columns[0] === '') {
        continue;
      }
      // Mangle the key to avoid naming conflicts with members of Object.
      var key = '_' + columns[0];
      var value = columns.slice(1).join('\t');
      if (key in parsedLines) {
        parsedLines[key].push(value);
      } else {
        parsedLines[key] = [value];
      }
    }

    for (var key in parsedLines) {
      var unmangledKey = key.slice(1);
      var values = parsedLines[key];
      var reduceResults = reducer(unmangledKey, values);
      for (var i in reduceResults) {
        var reduceResult = reduceResults[i]
        console.log("reduceResult", unmangledKey, reduceResult);
        results.push({key: unmangledKey, value: reduceResult});
      }
    }
  }

  console.log('[Client] Sending results to server.');
  that.connection.send(results);
}
