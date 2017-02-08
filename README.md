# KLAB_websocket_test

## How to run
I got started on fixing a docker-based run, but unfortunately due to time constraints, the app has still to be run by hand.
I did not add any extra libraries besides the websocket module and the redis_node module.

Start clients by opening the client.html in /client
Start servers by running \n
```node server/app <port_number of your choice>``` \n
Example:\n
```node server/app 8080```

The client frontend has not changed.

## Task#1 - multiple severs
I solved the task to make the application horizontally scalable by using the redis-subscription option.
This way severs can listen to a channel (or multiple channels) and react appropriately if a new message arrives.
In this application the servers only react if a channel, that does not represent their own, posts a new message.
they then check if they have any clients which are supposed to receive the message.

## Task#2 - Expire old messages
At first I considered saving each message under a distinct key and using the SCAN option of redis to iterate over them. 
This way I would eb able to attach and EXPIRE option to each entry and would not have to worry about updating them.
However this seemed to excessive, since it can't be predicted in which order the SCAN iterates over the keys and this would cause a lot of extra work, when looking for the last 10 messages.
Instead I opted for using lists, which collect messages and use the channel-name as a key. 
Since they are sorted retrieving the last ten entries seemed very easy. 
I am yet to find the most fitting storage of data, that allows easy clean up AND easy retrieval.

## Task#3 - Retrieving older messages for new clients
As mentioned above I used lists to store messages for each channel.
For some reason messages got stored multiple times, which led to only 2 to 5 messages being printed instead of 10.
I solved this by not just looking up the last 10 messages and sending them to the clients, but by recursively retrieving entries until 10 distinc messages were found or the list of entries ended.

## Task#4 - Receiving messages only once
This issue was solved by simply storing the last few received messages and by comparison making sure, that no message gets printed twice.