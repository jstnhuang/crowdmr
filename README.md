# Crowd MapReduce

Crowd MapReduce is a client-side, peer-to-peer MapReduce application. It uses WebRTC to establish peer-to-peer connections, and the HTML 5 Filesystem API for data storage.

## Developer notes

This is being developed and tested on Google Chrome. Many of these technologies work with other browsers, but with certain vendor prefixes and other possible incompatibilities.

### Web server
We have a small webserver which handles basic application logic written in Go. To use it, follow the instructions in [Getting Started](http://golang.org/doc/install) and [How to Write Go Code](http://golang.org/doc/code.html) to install Go and set up a workspace.

In your Go workspace, clone the repository to `src/github.com/jstnhuang/crowdmr`. From the `crowdmr` directory, run:

```
go get
go install
crowdmr
```

This assumes the `bin/` folder of your Go workspace is in your `PATH`. This will launch the webserver on localhost:5500.

### HTML 5 Filesystem
To debug the Filesystem API, go to chrome://flags/ and enable Developer Tools Experiments. When you restart the browser, the HTML 5 filesystem will now appear in the Resources tab of the Developer Tools.

To clear the quota on the filesystem, go to chrome://settings/cookies, search for the app, and delete its entry.
