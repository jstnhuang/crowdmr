// Depends on: ClientInfo, Task, Filesystem, and PeerJS.

/**
 * A Server provides the code for the job tracker page.
 */
function Server(id, mapperCode, reducerCode, numReducers) {
  // "that" stores the pointer to the Server object, so that we can reach it
  // inside of callbacks (which have different values for "this").
  var that = this;
  that.id = id;
  that.mapperCode = mapperCode;
  that.reducerCode = reducerCode;
  that.numReducers = parseInt(numReducers);
  that.clients = {};

  // Set up filesystem.
  that.filesystem = new FileSystem();
  that.filesystem.Init(0, function() {
    that.handleFileSystemInit(that);
  });

  // Set up peer.
  that.peer = new Peer(id, {key: 'qqz19fffgabjfw29'});
  that.peer.on(
    'connection',
    function(connection) {
      that.handlePeerConnection(that, connection);
    }
  );

  // Task data structures.
  that.mapIdle = {};
  that.mapRunning = {};
  that.mapComplete = {};
  that.reduceIdle = {};
  that.reduceRunning = {};
  that.reduceComplete = {};
}

/**
 * Handle initialization once the filesystem is ready.
 */
Server.prototype.handleFileSystemInit = function(that) {
  var inputDir = [that.id, 'input'].join('/');
  function callback(files) {
    for (var i=0; i<files.length; i++) {
      var task = new Task(i, 'map', files[i].fullPath);
      that.mapIdle[i] = task;
    }
    that.updateView(that);
  };
  that.filesystem.Ls(inputDir, callback);
}

/**
 * Attaches callbacks when a peer connects.
 */
Server.prototype.handlePeerConnection = function(that, connection) {
  connection.on('open', function() {
    that.handleClientConnection(that, connection);
  });
  connection.on('close', function() {
    that.handleClientDisconnection(that, connection.peer);
  });
  connection.on('data', function(data) {
    that.handleClientData(that, connection.peer, data);
  });
}

/**
 * When the client connection is open, update the list of clients and send the
 * client some work to do.
 */
Server.prototype.handleClientConnection = function(that, connection) {
  var clientId = connection.peer;
  var clientInfo = new ClientInfo(clientId, connection);
  that.clients[clientId] = clientInfo;
  var task = that.nextTask(that);
  // TODO: if there is no work, add this client to a free list.
  if (task !== null) {
    that.sendWork(that, clientId, task);
  }
}

/**
 * When a client disconnects, move the task they were working on to the idle
 * queue and update the list of clients.
 */
Server.prototype.handleClientDisconnection = function(that, clientId) {
  var task = that.clients[clientId].Task();
  if (task !== null) {
    var taskId = task.Id();
    if (task.IsMap()) {
      delete that.mapRunning[taskId];
      that.mapIdle[taskId] = task;
    } else {
      delete that.reduceRunning[taskId];
      that.reduceIdle[taskId] = task;
    }
  }
  delete that.clients[clientId];
  that.updateView(that);
}

/**
 * When the client completes a task, write the intermediate data, update the
 * task status, and assign a new task. When all the mappers are complete, this
 * adds the reduce tasks to the idle queue, and assigns all the clients a reduce
 * task.
 */
Server.prototype.handleClientData = function(that, clientId, data) {
  // We expect an array of {key: string, value: string} pairs.
  console.log('[Jobtracker] Data received from', clientId);

  // Buffer the writes to each reduce partition.
  var N = that.numReducers;
  var partitionData = {};
  for (var i in data) {
    var key = data[i].key;
    var hash = that.hashString(key);
    var partitionNum = ((hash % N) + N) % N;
    var value = data[i].value;
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

  var task = that.clients[clientId].Task();
  var folder = ''
  var callback = function() {};
  if (task.IsMap()) {
    folder = [that.id, 'intermediate'].join('/');
    callback = function() {
      that.handleMapTaskDone(that, clientId, task);
    }
  } else {
    folder = [that.id, 'output'].join('/');
    callback = function() {
      that.handleReduceTaskDone(that, clientId, task);
    }
  }

  // TODO: investigate parallel writes.
  function writePartitionsFrom(index) {
    if (index == N) {
      callback();
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
 * Check if there are idle map tasks. If so, send them to the client. If all the
 * map tasks are done, call handleMapPhaseDone. Otherwise, do nothing.
 */
Server.prototype.handleMapTaskDone = function(that, clientId, task) {
  var taskId = task.Id();
  that.clients[clientId].SetTask(null);

  delete that.mapRunning[taskId];
  that.mapComplete[taskId] = task;
  that.updateView(that);

  if (that.mapSize(that.mapIdle) > 0) {
    var nextTask = that.nextTask(that);
    if (nextTask !== null) {
      that.sendWork(that, clientId, nextTask);
    } else {
      console.error('[Jobtracker]',
        'Map idle queue was nonempty, but nextTask was null.');
    }
  } else if (that.mapSize(that.mapRunning) == 0) {
    that.handleMapPhaseDone(that);
  }
}

// Check if there are idle reduce tasks. If so, send them to the client. If all
// the reduce tasks are done, call handleJobDone. Otherwise, do nothing.
Server.prototype.handleReduceTaskDone = function(that, clientId, task) {
  var taskId = task.Id();
  that.clients[clientId].SetTask(null);

  delete that.reduceRunning[taskId];
  that.reduceComplete[taskId] = task;
  that.updateView(that);

  if (that.mapSize(that.reduceIdle) > 0) {
    var nextTask = that.nextTask(that);
    if (nextTask !== null) {
      that.sendWork(that, clientId, nextTask);
    } else {
      console.error('[Jobtracker]',
        'Reduce idle queue was nonempty, but nextTask was null.');
    }
  } else if (that.mapSize(that.reduceRunning) == 0) {
    that.handleJobDone();
  }
}

/**
 * If all map tasks are complete, add reduce tasks to the idle queue and start
 * all the clients on a reduce task.
 */
Server.prototype.handleMapPhaseDone = function(that) {
  console.log('[Jobtracker] Map phase complete.');
  var intermediateDir = [that.id, 'intermediate'].join('/');
  function callback(files) {
    for (var i=0; i<files.length; i++) {
      var task = new Task(i, 'reduce', files[i].fullPath);
      that.reduceIdle[i] = task;
    }
    for (var clientId in that.clients) {
      var client = that.clients[clientId]; 
      if (client.Task() === null) {
        var task = that.nextTask(that);
        that.sendWork(that, clientId, task);
      } else {
        console.error(
          '[Jobtracker] Map phase is done, but client had a non-null task.',
          client
        );
      }
    }
  };
  that.filesystem.Ls(intermediateDir, callback);
}

/**
 * Returns a task for a client to perform. The task is an idle map task, if
 * there are any. If there aren't, then it will return an idle reduce task. If
 * there are none, then it returns null.
 * 
 * Note that we do not start the reduce phase until all the map tasks are
 * complete, so there are two periods of time when there are no tasks: when we
 * are waiting for the last mappers to finish, and when the job is actually
 * done.
 */
Server.prototype.nextTask = function(that) {
  if (that.mapSize(that.mapIdle) > 0) {
    for (var taskId in that.mapIdle) {
      return that.mapIdle[taskId];  
    }
  } else if (that.mapSize(that.reduceIdle) > 0) {
    for (var taskId in that.reduceIdle) {
      return that.reduceIdle[taskId];  
    }
  } else {
    return null;
  }
}

/**
 * Loads data for a given task and sends it to a client to process.
 */
Server.prototype.sendWork = function(that, clientId, task) {
  var taskId = task.Id();
  that.filesystem.ReadLines(
    task.path,
    function(data) {
      var clientMsg = {data: data};

      if (task.IsMap()) {
        delete that.mapIdle[taskId];
        that.mapRunning[taskId] = task;
        clientMsg.mapper = that.mapperCode;
      } else {
        delete that.reduceIdle[taskId];
        that.reduceRunning[taskId] = task;
        clientMsg.reducer = that.reducerCode;
      }
      that.updateView(that);
      that.clients[clientId].SetTask(task);
      console.log('[Jobtracker] Sending task to client', clientId + ':', task);
      var connection = that.clients[clientId].Connection();
      connection.send(clientMsg);
    }
  );
}

/**
 * Returns a hash for the given string as a 32-bit integer. Copied from Java's
 * String.hashCode().
 */
Server.prototype.hashString = function(str) {
  var hash = 0;
  if (str.length === 0) return hash;
  for (var i=0; i<str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Returns the number of properties in the given map.
 */
Server.prototype.mapSize = function(map) {
  var result = 0;
  for (var key in map) {
    result++;
  }
  return result;
}

/**
 * Update the page status when the job is done.
 */
Server.prototype.handleJobDone = function() {
  document.querySelector('#status').innerText = 'Done!';
}

/**
 * Update the job tracker view. If the map phase is not done, then we display te
 * number of idle reducers as that.numReducers.
 */
Server.prototype.updateView = function(that) {
  var numClients = that.mapSize(that.clients);
  document.querySelector('#numclients').innerText = numClients;

  var numMapIdle = that.mapSize(that.mapIdle);
  var numMapRunning = that.mapSize(that.mapRunning);
  var numMapComplete = that.mapSize(that.mapComplete);
  var numReduceIdle = that.mapSize(that.reduceIdle);
  var numReduceRunning = that.mapSize(that.reduceRunning);
  var numReduceComplete = that.mapSize(that.reduceComplete);
  var reduceTotal = numReduceIdle + numReduceRunning + numReduceComplete;
  document.querySelector('#mapidle').innerText = numMapIdle;
  document.querySelector('#maprunning').innerText = numMapRunning;
  document.querySelector('#mapcomplete').innerText = numMapComplete;
  if (reduceTotal === 0) {
    document.querySelector('#reduceidle').innerText = that.numReducers;
  } else {
    document.querySelector('#reduceidle').innerText = numReduceIdle;
  }
  document.querySelector('#reducerunning').innerText = numReduceRunning;
  document.querySelector('#reducecomplete').innerText = numReduceComplete;

  var mapProgress = 100 * numMapComplete /
    (numMapIdle + numMapRunning + numMapComplete);
  var reduceProgress = 0;
  if (reduceTotal !== 0) {
    reduceProgress = 100 * numReduceComplete / reduceTotal;
  }
  var mapProgressBar = document.querySelector('#mapProgress');
  mapProgressBar.innerText = 'Map: ' + mapProgress + '%';
  mapProgressBar.setAttribute('style', 'width: ' + mapProgress/2 + '%');
  var reduceProgressBar = document.querySelector('#reduceProgress');
  reduceProgressBar.innerText = 'Reduce: ' + reduceProgress + '%';
  reduceProgressBar.setAttribute('style', 'width: ' + reduceProgress/2 + '%');

  var statusText = document.querySelector('#status');
  if (reduceProgress < 100 && numClients == 0) {
    statusText.innerText = 'Waiting for clients.';
  } else if (reduceProgress < 100 && numClients > 0) {
    statusText.innerText =
      'In progress (' + ((mapProgress/2) + (reduceProgress/2)) + '%)';
  }
  if (reduceProgress == 100) {
    statusText.innerText = 'Done.';
  }
}
