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
  // This is a data message NOT TESTED
  else {
    that.handleServerData(that, serverData);
  }
}

/**
 * Processes the task. If the required data is on a local file, processes
 * the computation and sends the result back to the server.
 */
Client.prototype.handleServerTask = function(that, serverData) {
  that.clientId = serverData.clientId;
  that.numReducers = serverData.numReducers;
  var filename = serverData.path;
  that.filesystem.Exist(
    filename,
    function (fileEntry) {
      that.filesystem.ReadLines(
        filename,
        function(data) {
          that.local = true;
          var quasiServerData = {data: data};
          if ('mapper' in serverData) {
            that.mapper = serverData.mapper;
            quasiServerData.map = 'map';
          } else {
            that.reducer = serverData.reducer;
            quasiServerData.reduce = 'reduce';
          }
          that.handleServerData(that, quasiServerData);
        }
      )
    },
    function () { // NOT TESTED
      that.local = false;
      var result = {data: 'data'};
      that.connection.send(result);
      //console.log(filename, 'file doesn\'t exist');
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

  if (that.local) {
    var folder = '';
    var notice = {};
    if ('map' in serverData) {
      folder = [that.id, 'intermediate'].join('/');
      that.handleWriteData(that, folder, results);     
      notice.mapDone = 'mapDone';
    } else {
      folder = [that.id, 'output'].join('/');
      that.handleWriteData(that, folder, results);     
      notice.reduceDone = 'reduceDone';
    }
    that.connection.send(notice);
  } else {
    console.log('[Client] Sending results to server.');
    that.connection.send(results);
  }
}

Client.prototype.handleWriteData = function(that, folder, results) {
  // We expect an array of {key: string, value: string} pairs.
  console.log('[Jobtracker] Data writen to disk from', that.clientId);

  // Buffer the writes to each reduce partition.
  var N = that.numReducers;
  var partitionData = {};
  for (var i in results) {
    var cols = results[i].split('\t');
    var key = cols[0];
    var hash = that.hashString(key);
    var partitionNum = ((hash % N) + N) % N;
    var value = cols.slice(1).join('\t');
    if (partitionNum in partitionData) {
      partitionData[partitionNum].push([key, value].join('\t'));
    } else {
      partitionData[partitionNum] = [[key, value].join('\t')];
    }
  }
  for (var i=0; i<N; i++) {
    if (i in partitionData) {
      partitionData[i] = partitionData[i].join('\n') + '\n';
    }
  }

  // TODO: investigate parallel writes.
  function writePartitionsFrom(index) {
    if (index == N) {
      // do nothing
    } else if (index in partitionData) {
      var filename = [folder, 'data_' + index + '.txt'].join('/');
      that.filesystem.Open(filename, function(fileEntry) {
        that.filesystem.AppendText(
          fileEntry,
          partitionData[index],
          writePartitionsFrom(index+1)
        );
      });
    } else {
      writePartitionsFrom(index+1);
    }
  }

  writePartitionsFrom(0);
 
}

/**
 * Returns a hash for the given string as a 32-bit integer. Copied from Java's
 * String.hashCode().
 */
Client.prototype.hashString = function(str) {
  var hash = 0;
  if (str.length === 0) return hash;
  for (var i=0; i<str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash;
  }
  return hash;
}
