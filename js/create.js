/**
 * A JobCreator contains the code for the job creation page.
 */
function JobCreator(id) {
  var that = this;
  that.id = id;
  that.filesystem = new FileSystem();
  window.onload = function() {
    that.handlePageLoad(that);
  }
}

/**
 * Attaches callbacks when the page loads.
 */
JobCreator.prototype.handlePageLoad = function(that) {
  that.datafiles = document.querySelector('input[name=datafiles]');
  that.datafiles.onchange = function() {
    that.handleDataChange(that);
  };
  that.form = document.querySelector('form[name=jobform]');
  that.form.onsubmit = function() {
    that.handleFormSubmit(that);
  };
}

/**
 * When the input for the data files changes, request the quota for the files
 * and enable the submit button.
 */
JobCreator.prototype.handleDataChange = function(that) {
  var files = that.datafiles.files;
  var OVERHEAD_PER_FILE = 200;
  var NUM_DIRECTORIES = 4;
  if (files.length > 0) {
    var size = OVERHEAD_PER_FILE * NUM_DIRECTORIES;
    for (i=0; i<files.length; i++) {
      size += files[i].size + OVERHEAD_PER_FILE;
    }
    that.filesystem.Init(5*size, function() {});
  } 
}

/**
 * When the form is submitted, write the data files to the HTML 5 filesystem.
 */
JobCreator.prototype.handleFormSubmit = function(that) {
  function copyFiles() {
    var files = that.datafiles.files;
    for (i=0; i<files.length; i++) {
      var path = [inputDir, files[i].name].join('/');
      that.filesystem.WriteBlob(path, files[i]);
    }
    that.form.action = '/server/' + that.id;
    that.form.submit();
  };
  var inputDir = [that.id, 'input'].join('/');
  that.filesystem.Mkdir(inputDir, copyFiles);
}
