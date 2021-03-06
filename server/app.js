var config        = require('./config.js'),
    socketServer  = require('./vws.socket.js').server,
	 port = process.argv[2];

var messages = [];

var listeners = [];

//setting up the redis clients, 1 for posting and adding things to the storage
//2 for listening for new messages from other servers
var redis = require("redis"),
    redisClient = redis.createClient(), //1
    subClient = redis.createClient(); //2

//subscribe to all server* channels
subClient.psubscribe('server*');

subClient.on('pmessage', function (pattern, channel, message) {
	//ignore message if posted by same server
    if(channel != ('server'+port)){
    	var parsedMsg = JSON.parse(message);
    	if(parsedMsg.action.command === 'msg'){
			interpretRegularMessage(message, null);
		}
    }
});

//server setup
socketServer( 'NodeJS-Chat', function ( connection, server ) {
	
  connection.on('open', function ( id ) {
  	//add connection to list of connected entities
  	listeners.push(connection);
   console.log('[open]: ' + listeners.length);
  });

  connection.on('message', function ( msg ) {
  	var parsedMsg = JSON.parse(msg.utf8Data);
  	//check if message is regular message or first 'hello' request
	if(parsedMsg.action.command === 'hello'){
		interpretHelloMessage(msg.utf8Data, connection);
	}else{
		interpretRegularMessage(msg.utf8Data, connection);
		//let other servers know about the new message
  		redisClient.publish('server'+port, msg.utf8Data);
	}
  });

  connection.on('error', function ( err ) {
    console.log(err);
  });

  connection.on('close', function(){
  	//remove listener
    if( listeners.indexOf(connection) != -1 )
			listeners.splice(listeners.indexOf(connection), 1);
    console.log('[close]: ' + listeners.length);
  });
}).config( port );

/**
 *  This method starts the process of sending back the last 10 messages on 
 *	 the channel to a new client.
 *  @param {msg}   msg  Data send by the connection
 *  @param {object} connection The connection that send the 'hello' message
 */
function interpretHelloMessage(msg, connection){
	var parsedMsg = JSON.parse(msg);
	var channel = parsedMsg.action.data[0].channel;
	console.log('SET CHANNEL FOR ' + connection.id + ' TO ' + channel);
	redisClient.set(connection.id, channel);
	
	getOldMessage(0, channel, 0, connection, null);
}

/**
 *  This method retrieves the last distinc messages from the saved messages in redis.
 *  @param index  		index of messages retrieved
 *  @param channel 		the recipient's channel
 *  @param msgCounter 	index of messages that will be send to client
 *  @param connection	the recipient's connection
 *  @param previousMsg	to prevent duplicate messages from being printed
 */
function getOldMessage(index, channel, msgCounter, connection, previousMsg){
	redisClient.lindex(channel, index, function(err, oldMessage){
		if(err){
			console.log(err);
		}else{
			if(oldMessage != null){ //terminates if less than 10 messages have been posted to the channel
				if(previousMsg != oldMessage){ //avoid duplicates
					connection.send(oldMessage);
				if(msgCounter < 10){
					getOldMessage(index+1,channel, msgCounter+1, connection, oldMessage);
				}
				}else{
					if(msgCounter < 10){
						getOldMessage(index+1,channel, msgCounter, connection, previousMsg);
					}
				}
			}
		}
	});
	return true;
}

/**
 *  This method handles messages between and to clients on the same server.
 *  @param {msg}   	msg  			Data send by the connection
 *  @param {object} 	connection 	The connection that send the 'hello' message
 */
function interpretRegularMessage(msg, connection){
	var parsedMsg = JSON.parse(msg);
	for(var n in parsedMsg.action.data){
		
  		var messageData = parsedMsg.action.data[n];
  		
  		var key = messageData.channel;
  		var timerKey = messageData.channel + '-timer'; 
  		
  		redisClient.lpush(key, msg);
  		//I intended to use this List to remove older messages after a while (not implemented)
  		redisClient.lpush(timerKey, messageData.timeStamp);
  		
  		var targetChannel = messageData.channel;
  		
  		for (var index in listeners) {  			
  			if(listeners[index] && listeners[index].send && listeners[index] != connection){
  				sendMessage(listeners[index], msg, targetChannel);
  			}
  		}
  	}
}

/**
 *  This method checks if the current listener (conenction) is an intended recipient for msg
 *  @param  connection 		The connection that send the 'hello' message
 *  @param 	msg  				Data send by the connection
 *  @param targetChannel	tagretChannel
 */
function sendMessage(connection, msg, targetChannel){
	//check if listener is listening to the channel, for which msg is intended
	redisClient.get(connection.id, function(err, res){
		console.log('MESSAGE FOR ' + targetChannel + ' TO ' + res);
  		if(err){
			console.log(err);
  		}else{	
  			if(res === targetChannel){
  				connection.send(msg);
  			}
  		}
  	});
}

process.on('uncaughtException', function(err) {
	//catch error if user does not provide a port to start the server
    if(err.errno === 'EADDRINUSE')
         console.log("The port " + port + " is already in use, please chose another.");
    else
         console.log(err);
    process.exit(1);
}); 
