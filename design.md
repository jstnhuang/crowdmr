# Crowd MapReduce design document

The goal of Crowd MapReduce is to build a peer-to-peer MapReduce system in the browser. It is meant to be a prototype that gives us an understanding of the challenges and design tradeoffs in building such a system.

## Overview
A job creator specifies mapper and reducer code in Javascript, as well as the location of some data to process. They are then taken to the job tracker page.

The job creator is given a URL to share, containing the unique ID of the job. When a client visits the URL, they establish a connection to the job tracker using WebRTC. When the connection is set up, the server sends the mapper and reducer code to the client, as well as the data (or the location of the data) to process. The client executes the code on the data, and returns the result to the job tracker. The job tracker can then send more tasks to the client.

The job tracker maintains a list of connected clients and keep track of what computation each client is doing. If a client disconnects, that part of the computation is lost, and the job tracker must assign it back to someone else.

## Challenges
### Data storage
We would like our system to operate purely on the client side as much as possible. However, MapReduce jobs typically process much more data than can be stored on any client. Instead, they typically use distributed filesystems that are optimized for sequential reads and writes. It's not possible for us to create a distributed filesystem on top of the clients, because our assumption is that clients will only be connected for a short period of time.

The problem boils down to this: our software allows us to distribute computation, but not storage. The job creator must be willing to provide the storage, including read and write APIs, for the data.
