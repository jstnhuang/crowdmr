/**
 * A JobCreator contains the code for the job creation page.
 */
function JobCreator() {
  var that = this;
  that.filesystem = new FileSystem();
  window.onload = function() {
    that.handlePageLoad(that);
  }
}

/**
 * Attaches callbacks when the page loads.
 */
JobCreator.prototype.handlePageLoad = function(that) {
  that.datafile = document.querySelector('input[name=datafile]');
  that.datafile.onchange = function() {
    that.handleFileChange(that);
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
JobCreator.prototype.handleFileChange = function(that) {
 if (that.datafile.files.length > 0) {
   var size = that.datafile.files[0].size;
   that.filesystem.Init(10*size + 1000, function() {});
 } 
}

/**
 * When the form is submitted, write the data files to the HTML 5 filesystem.
 */
JobCreator.prototype.handleFormSubmit = function(that) {
  var files = that.datafile.files;
  for (i=0; i<files.length; i++) {
    that.filesystem.WriteBlob(files[i].name, files[i]);
  }
}
