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
 * Creates the given file.
 */
FileSystem.prototype.Create = function(filename) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    {create: true, exclusive: true},
    function (fileEntry) {
      console.log('[Filesystem] Created file', filename);
    },
    that.handleError
  );
}

/**
 * Write an arbitrary blob to the given file. This is a private method that
 * takes in options, and a boolean append option.
 */
FileSystem.prototype.write = function(filename, blob, options, isAppend) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    options,
    function (fileEntry) {
      fileEntry.createWriter(
        function(writer) {
          if (isAppend) {
            writer.seek(writer.length);
          }
          writer.write(blob); 
        },
        that.handleError
      );
    },
    that.handleError
  );
}

/**
 * Write the given text to the given file.
 */
FileSystem.prototype.WriteText = function(filename, text) {
  var that = this;
  var blob = new Blob([text], {type: 'text/plain'});
  var options = {create: true, exclusive: true};
  var isAppend = false;
  that.write(filename, blob, options, isAppend);
}

/**
 * Write an arbitrary blob to the given file.
 */
FileSystem.prototype.WriteBlob = function(filename, blob) {
  var that = this;
  var options = {create: true, exclusive: true};
  var isAppend = false;
  that.write(filename, blob, options, isAppend);
}

/**
 * Append the given text to the given file.
 */
FileSystem.prototype.AppendText = function(filename, text) {
  var that = this;
  var blob = new Blob([text], {type: 'text/plain'});
  var options = {create: false};
  var isAppend = true;
  that.write(filename, blob, options, isAppend);
}

/**
 * Append the given text to the given file.
 */
FileSystem.prototype.AppendBlob = function(filename, blob) {
  var that = this;
  var options = {create: false};
  var isAppend = true;
  that.write(filename, blob, options, isAppend);
}

/**
 * Loads the given file and passes the result to the callback.
 */
FileSystem.prototype.Read = function(filename, callback) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    {},
    function (fileEntry) {
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
    },
    that.handleError
  );
}

/**
 * Deletes the given file.
 */
FileSystem.prototype.Delete = function(filename) {
  var that = this;
  that.filesystem.root.getFile(
    filename,
    {create: false},
    function (fileEntry) {
      fileEntry.remove(function() {}, that.handleError);
      console.log("[Filesystem]: Deleted", filename)
    },
    that.handleError
  );
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
  console.log('[Filesystem]', error.name + ':', error.message);
}
