# Crowd MapReduce design document

The goal of Crowd MapReduce is to build a peer-to-peer MapReduce system in the browser. It is meant to be a prototype that gives us an understanding of the challenges and design tradeoffs in building such a system.

## Overview
A job creator specifies mapper and reducer code in Javascript, as well as the location of some data to process. They are then taken to the job tracker page.

The job creator is given a URL to share, containing the unique ID of the job. When a client visits the URL, they establish a connection to the job tracker using WebRTC. When the connection is set up, the server sends the mapper and reducer code to the client, as well as the data (or the location of the data) to process. The client executes the code on the data, and returns the result to the job tracker. The job tracker can then send more tasks to the client.

The job tracker maintains a list of connected clients and keep track of what computation each client is doing. If a client disconnects, that part of the computation is lost, and the job tracker must assign it back to someone else.

## Data storage
We would like our system to operate on the client side as much as possible. However, MapReduce jobs typically process much more data than can be stored on any client. Instead, they typically use distributed filesystems that are optimized for sequential reads and writes. It's not possible for us to create a distributed filesystem on top of the clients, because our assumption is that clients will only be connected for a short period of time.

The problem boils down to this: our software allows us to distribute computation, but not storage. The job creator must be willing to provide the storage, including read and write APIs, for the data. This also raises a question of how the data should be transferred. Ideally, the clients would fetch the data and write the outputs themselves, which minimizes communication with the job tracker. However, this implies that the clients will have free reign to read and write data to the cloud storage. The alternative would be to have the job tracker send the client the data to process directly, and likewise have the clients send the results back to the job tracker. Then, the job tracker could perform the read and write operations. However, this would result in significantly more network traffic.

For now, it seems like the best solution is the former option: cloud storage which the clients have read/write access to.

One possible option that would be good to investigate is the HTML5 filesystem API.

## MapReduce implementation
We will follow the basic implementation as described in [MapReduce: Simplified Data Processing on Large Clusters] (http://static.googleusercontent.com/media/research.google.com/en/us/archive/mapreduce-osdi04.pdf), with some small modifications.

The programming model will have the following types:
```
map(v1) -> list({k2: v2})
reduce(k2, list(v2)) -> list(v2)
```

The mappers will write their intermediate outputs into cloud storage, rather than local storage. Likewise, the reducers will write the intermediate outputs from cloud storage instead of from the local storage of the mappers.

## WebRTC
WebRTC is a relatively new technology. However, we use the PeerJS library, which vastly simplifies the setup and usage. PeerJS uses a publicly available STUN server from Google.

## Security and trustworthiness
Our system allows job creators to pass arbitrary Javascript to clients to execute. Additionally, clients may send back arbitrary data to the job tracker. It is interesting to think about how this system could be made secure. However, security is not an explicit goal for this project.
