
codeTest = {
	config: {
		server: '127.0.0.1:8080'
	},
	nickName: 'person1',
	channel: 'defaultChannel',
	client: null	
};

jQuery(document).ready(init);

var messages = [];

function init() {
	jQuery('#sendMsg').on(
		'click',
		function() {
			sendMsg(jQuery('#message').val());
		}
	);
	jQuery('#setNick').on(
		'click',
		setNick
	);
	jQuery('#joinChannel').on(
		'click',
		joinChannel
	);
	jQuery('#connect').on(
		'click',
		function(e) {
			if (typeof codeTest.client !== null) {
				delete codeTest.client;
			}
			codeTest.config.server = jQuery('#serverUrl').val();
			codeTest.client = setupSocket();
		}
	);
	drawMessage({ author:'system', channel: codeTest.channel, text: 'welcome to the test', timestamp: new Date().toLocaleTimeString() });
};


function joinChannel() {
	var channel = jQuery('#channel').val();
	jQuery('#messages').empty();codeTest.channel = channel;
	drawMessage({ author:'system', channel: codeTest.channel, text: 'welcome to a new channel (' + channel + '), ' + codeTest.nickName, timestamp: new Date().toLocaleTimeString() });
	if(codeTest.client != null){
		//send new 'hello' message to server if channel is changed
		sayHelloToServer();
	}	
	return codeTest.channel;
};


function setNick() {
	var nick = jQuery('#nickname').val();
	codeTest.nickName = nick;
	drawMessage({ author:'system', channel: codeTest.channel, text: 'greetings, ' + nick + '!', timestamp: new Date().toLocaleTimeString() });
	return codeTest.nickName;
};


function sendMsg(text) {
	var data = {
		author: codeTest.nickName,
		channel: codeTest.channel,
		text: text,
		timeStamp: new Date().toLocaleTimeString(),
		server: codeTest.config.server
	};
	drawMessage({ author:'YOU', channel: data.channel, text: data.text, timeStamp: data.timeStamp });
	return send2server('msg', data);
};


function send2server(command, data) {
	if(command === 'msg'){
		return codeTest.client.send(
		{
			command:command,
			data: [
				{
					author: codeTest.nickName,
					channel: codeTest.channel,
					text: data.text,
					timeStamp : new Date().toLocaleTimeString(),
					server: codeTest.config.server
				}
			]
		}
		);
	}else if(command === 'hello'){
		return codeTest.client.send(
		{
			command:command,
			data: [
				{
					channel: codeTest.channel,
					timeStamp : new Date().toLocaleTimeString(),
					server: codeTest.config.server
				}
			]
		}
		);
	}

};

function handleMessageFromServer(msg) {
	if (typeof msg.action.command !== 'undefined' && typeof msg.action.data !== 'undefined') {
		if (msg.action.command === 'msg') {
			for (var n=0; n<msg.action.data.length; n+=1) {
				//make sure each message gets only printed once!
				var stored = false;
				for(var index in messages){
					if(messages[index].id === msg.id && messages[index].time === msg.action.data[n].timeStamp){
						stored = true;
					}
				}				
				if(!stored){
					drawMessage(msg.action.data[n]);
					messages.push({id:msg.id, time:msg.action.data[n].timeStamp});
				}
			}
		}
	}
};


function drawMessage(data) {
	var msgString = '<span>{' + data.channel + '@' + data.timeStamp + '} [' + data.author + '] ' + data.text + '</span><br/>';
	jQuery('#messages').append(msgString);
};


function setupSocket() {
	try {
		var testSocket = new Socket(codeTest.config.server, { autoReconnect: true });
		testSocket.on('reconnect', function(msg, e) {
			console.log('reconnected');
		});
		testSocket.on('close', function(e) {
			console.log('[close]');
			jQuery('#wsstatus').text(Date.now() + ' connection closed');
		});
		testSocket.on('error', function(e) {
			console.log('[error]');
			jQuery('#wsstatus').text(Date.now() + ' connection error');
		});
		testSocket.on('open', function(e) {
			jQuery('#wsstatus').text(Date.now() + ' connection open');
			console.log('[open]');
			//receive old messages for current channel
			sayHelloToServer();
		});
		testSocket.on('message', function(msg, e) {
			console.log('[messages]');
			console.log(msg);
			handleMessageFromServer(msg);
		});
		jQuery('#wsstatus').text(Date.now() + ' connecting to [' + codeTest.config.server + ']');
	} catch(err) {
		jQuery('#wsstatus').text(Date.now() + ' connection failed: ' + err);
	}
	return testSocket;
};

/**
 *  Send request to server to provide old messages for current channel
 */
function sayHelloToServer(){
	messages = [];
	var data = {
		channel: codeTest.channel,
		timeStamp: new Date().toLocaleTimeString(),
		server: codeTest.config.server
		};
	send2server('hello', data);
}

