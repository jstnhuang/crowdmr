/**
 * FileSystem provides an abstraction to handle common operations with the HTML
 * 5 filesystem API.
 */
function FileSystem() {
  var that = this;
  that.filesystem = null;
}

/**
 * Initialize the file system, requesting access to a certain amount of bytes.
 */
FileSystem.prototype.Init = function(desiredBytes, successCallback) {
  var that = this;
  navigator.webkitPersistentStorage.requestQuota(
    desiredBytes,
    function (grantedBytes) {
      that.handleGranted(desiredBytes, grantedBytes, successCallback);
    },
    that.handleError
  );
}

/**
 * Checks if the number of bytes granted is at least the amount requested. If
 * so, it requests access to the filesystem and calls the success callback.
 * Otherwise, it does nothing.
 */
FileSystem.prototype.handleGranted = function(desiredBytes, grantedBytes,
    successCallback) {
  var that = this;
  if (grantedBytes >= desiredBytes) {
    window.webkitRequestFileSystem(
      window.PERSISTENT,
      grantedBytes,
      function(filesystem) {
        that.filesystem = filesystem;
        console.log('[Filesystem] Opened file system', filesystem.name);
        successCallback();
      },
      that.handleError
    );
  }
}

/**
 * Creates the given file and calls the callback with the fileEntry. Prints an
 * error if the file already exists.
 */
FileSystem.prototype.Create = function(filename, callback) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    {create: true, exclusive: true},
    function (fileEntry) {
      console.log('[Filesystem] Created file', filename);
      callback(fileEntry);
    },
    that.handleError
  );
}

/**
 * Opens the given file if it exists, otherwise log an error. The callback is
 * called with the fileEntry in either case.
 */
FileSystem.prototype.Open = function(filename, callback) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    {},
    function (fileEntry) {
      callback(fileEntry);
    },
    that.handleError
  );
}

/**
 * Check if the given file exists. The successCallback is called if it exists
 * otherwise failureCallback is called.
 */
FileSystem.prototype.Exist = function(filename, successCallback,
    failureCallback) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    {create: false},
    function (fileEntry) {
      successCallback(fileEntry);
    },
    failureCallback
  );
}

FileSystem.prototype.OpenOrCreate = function(filename, callback) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    {},
    function (fileEntry) {
      callback(fileEntry);
    },
    function (error) {
      that.Create(filename, callback);
    }
  );
}

/**
 * Write an arbitrary blob to the given file. This is a private method that
 * takes in options, and a boolean append option.
 */
FileSystem.prototype.write = function(fileEntry, blob, isAppend,
    callback) {
  var that = this;
  fileEntry.createWriter(
    function(writer) {
      if (isAppend) {
        writer.seek(writer.length);
      }
      writer.onwriteend = callback;
      writer.onerror = that.handleError;
      writer.write(blob); 
    },
    that.handleError
  );
}

/**
 * Write an arbitrary blob to the given file.
 */
FileSystem.prototype.WriteBlob = function(fileEntry, blob, callback) {
  var that = this;
  var isAppend = false;
  that.write(fileEntry, blob, isAppend, callback);
}

/**
 * Append the given text to the given file.
 */
FileSystem.prototype.AppendText = function(fileEntry, text, callback) {
  var that = this;
  var isAppend = true;
  that.write(fileEntry, new Blob([text], {type: 'text/plain'}), isAppend);
}

/**
 * Loads the given file and passes the result to the callback.
 */
FileSystem.prototype.Read = function(fileEntry, callback) {
  var that = this;
  fileEntry.file(
    function(file) {
      var reader = new FileReader();
      reader.onloadend = function(e) {
        callback(this.result); // "this" is correct here.
      }
      reader.readAsText(file);
    },
    that.handleError
  );
}

/**
 * Loads the given file as a text file. It returns the data by calling the
 * callback with an array of strings, where each string is a line in the file.
 */
FileSystem.prototype.ReadLines = function(fileEntry, callback) {
  var that = this;
  that.Read(fileEntry, function(fileData) {
    var lines = fileData.split('\n');
    callback(lines);
  });
}

/**
 * Private method to recursively create a path from a given directory.
 */
FileSystem.prototype.mkdir = function(rootDirEntry, folders, callback) {
  var that = this;
  if (folders[0] == '.' || folders[0] == '') {
    folders = folders.slice(1);
  }
  rootDirEntry.getDirectory(
    folders[0],
    {create: true},
    function(dirEntry) {
      if (folders.length) {
        that.mkdir(dirEntry, folders.slice(1), callback);
      } else {
        console.log('[Filesystem] Created directory', dirEntry.fullPath);
        callback();
      }
    },
    that.handleError
  );
};

/**
 * Recursively creates the given path from the root. When the path is created,
 * the callback is called with no arguments.
 */
FileSystem.prototype.Mkdir = function(path, callback) {
  var that = this;
  that.mkdir(that.filesystem.root, path.split('/'), callback);
}

/**
 * Private method that repeatedly calls readEntries until no more results are
 * returned. It calls the callback with the array of files.
 */
FileSystem.prototype.ls = function(that, dirEntry, callback) {
  var dirReader = dirEntry.createReader();
  var entries = [];
  var readEntries = function() {
    dirReader.readEntries (
      function(results) {
        if (!results.length) {
          callback(entries.sort());
        } else {
          entries = entries.concat(results);
          readEntries();
        }
      },
      that.handleError
    );
  };
  readEntries();
}

/**
 * Gets an array of files in the given path. The array is returned by calling
 * the callback with the array as a parameter.
 */
FileSystem.prototype.Ls = function(path, callback) {
  var that = this;
  that.filesystem.root.getDirectory(
    path,
    {},
    function(dirEntry) {
      that.ls(that, dirEntry, callback);
    },
    that.handleError
  );
}

/**
 * Reports an error.
 */
FileSystem.prototype.handleError = function (error) {
  console.error('[Filesystem]', error.name + ':', error.message);
}
