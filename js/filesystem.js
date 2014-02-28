function FileSystem() {
  this.filesystem = null;
}

/**
 * Initialize the file system, requesting access to a certain amount of bytes.
 */
FileSystem.prototype.Init = function (desiredBytes, successCallback) {
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
FileSystem.prototype.handleGranted = function (desiredBytes, grantedBytes,
    successCallback) {
  if (grantedBytes >= desiredBytes) {
    var that = this;
    window.webkitRequestFileSystem(
      window.PERSISTENT,
      grantedBytes,
      function(filesystem) {
        that.filesystem = filesystem;
        console.log('Opened file system:', filesystem.name);
        successCallback();
      },
      that.handleError
    );
  }
}

/**
 * Creates the given file.
 */
FileSystem.prototype.Create = function (filename) {
  this.filesystem.root.getFile(
    filename,
    {create: true, exclusive: true},
    function (fileEntry) {},
    this.handleError
  );
}

/**
 * Write an arbitrary blob to the given file. This is a private method that
 * takes in options, and a boolean append option.
 */
FileSystem.prototype.write = function (filename, blob, options, isAppend) {
  this.filesystem.root.getFile(
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
        this.handleError
      );
    },
    this.handleError
  );
}

/**
 * Write the given text to the given file.
 */
FileSystem.prototype.WriteText = function (filename, text) {
  var blob = new Blob([text], {type: 'text/plain'});
  var options = {create: true, exclusive: true};
  var isAppend = false;
  this.write(filename, blob, options, isAppend);

}

/**
 * Write an arbitrary blob to the given file.
 */
FileSystem.prototype.WriteBlob = function (filename, blob) {
  var options = {create: true, exclusive: true};
  var isAppend = false;
  this.write(filename, blob, options, isAppend);
}

/**
 * Append the given text to the given file.
 */
FileSystem.prototype.AppendText = function (filename, text) {
  var blob = new Blob([text], {type: 'text/plain'});
  var options = {create: false};
  var isAppend = true;
  this.write(filename, blob, options, isAppend);
}

/**
 * Append the given text to the given file.
 */
FileSystem.prototype.AppendBlob = function (filename, blob) {
  var options = {create: false};
  var isAppend = true;
  this.write(filename, blob, options, isAppend);
}

/**
 * Loads the given file and passes the result to the callback.
 */
FileSystem.prototype.Read = function(filename, callback) {
  this.filesystem.root.getFile(
    filename,
    {},
    function (fileEntry) {
      fileEntry.file(
        function(file) {
          var reader = new FileReader();
          reader.onloadend = function(e) {
            callback(this.result);
          }
          reader.readAsText(file);
        },
        this.handleError
      );
    },
    this.handleError
  );
}

/**
 * Deletes the given file.
 */
FileSystem.prototype.Delete = function(filename) {
  this.filesystem.root.getFile(
    filename,
    {create: false},
    function (fileEntry) {
      fileEntry.remove(function() {}, this.handleError);
    },
    this.handleError
  );
}

/**
 * Reports an error.
 */
FileSystem.prototype.handleError = function (error) {
  console.log("File system error:", error.name + '.', error.message);
}
