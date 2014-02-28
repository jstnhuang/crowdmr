# Crowd MapReduce design document

The goal of Crowd MapReduce is to build a peer-to-peer MapReduce system in the browser. It is meant to be a prototype that gives us an understanding of the challenges and design tradeoffs in building such a system.

## Overview
A job creator specifies mapper and reducer code in Javascript, as well as the location of some data to process. They are then taken to the job tracker page.

The job creator is given a URL to share, containing the unique ID of the job. When a client visits the URL, they establish a connection to the job tracker using WebRTC. When the connection is set up, the server sends the mapper and reducer code to the client, as well as the data (or the location of the data) to process. The client executes the code on the data, and returns the result to the job tracker. The job tracker can then send more tasks to the client.

The job tracker maintains a list of connected clients and keep track of what computation each client is doing. If a client disconnects, that part of the computation is lost, and the job tracker must assign it back to someone else.

## Data storage
The HTML 5 Filesystem API should allow the job tracker to store as much data as needed. The job tracker must give mappers the input data directly. In the original MapReduce implementation, the mappers store the intermediate outputs on their local disk, and notify the job tracker of the location of the data. However, this is not feasible in our case, since our assumption is that clients are unlikely to stay connected through to the completion of the job. Instead, the mappers will return the intermediate output directly to the job tracker, who will write it to the job creator's disk.

Similarly, the job tracker will need to send the intermediate data to the reducers, and receive the final output back from the reducers. We will need to see how passing around so much data affects performance.

## MapReduce implementation
We will follow the basic implementation as described in [MapReduce: Simplified Data Processing on Large Clusters] (http://static.googleusercontent.com/media/research.google.com/en/us/archive/mapreduce-osdi04.pdf), with some small modifications.

The programming model will have the following types:
```
map(v1) -> list({k2: v2})
reduce(k2, list(v2)) -> list(v2)
```

The mappers will send the intermediate output to the job tracker to write to the creator's disk, rather than the mapper's disk. Likewise, the reducers will receive the intermediate output from the job creator instead of from the local storage of the mappers. The reducers will send the final output to the job tracker.

## Peer to peer connection
The peer-to-peer connections will be established between the job tracker and the clients using WebRTC. WebRTC requires some server support for a "signalling" process, in which browsers establish a peer-to-peer connection. We will use the PeerJS library, which vastly simplifies the setup and usage of WebRTC.

## Security and trustworthiness
Our system allows job creators to pass arbitrary Javascript to clients to execute. Additionally, clients may send back arbitrary data to the job tracker to write on the job creator's disk. It is interesting to think about how this system could be made secure. However, security is not an explicit goal for this project.

There are several possible mitigations of the security risks of our system. It may be possible, for example, to sanitize the Javascript run by the clients using some library like Google Caja. We would also need to sanitize data, to ensure that evaluating the data doesn't lead to some kind of exploit. We could also prompt the client to review the mapper and reducer code sent by the job tracker, and only run the code if the client accepts.

The client could overwhelm the server with bogus results. The Filesystem API will enforce a limit on storage. However, the client can still ruin the job by sending back lots of fake results, or taking up so much storage that other clients can't proceed. One possible mitigation is to enforce a limit on the amount of data a client can send for a write. This assumes the job creator knows an upper bound on the size of the results. Another possible mitigation is for the job creator to randomly insert test cases into the data. The job tracker can ignore any client that gets any test case wrong.
