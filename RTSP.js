var net = require('net');
var dgram = require('dgram');
var fs = require('fs');
var util = require('util');
var RTP = require('./RTP');
var RTPpacket = require('./RTPpacket');
var clients = require('./clients');

//host and port for the server
var HOST = '127.0.0.1';
var PORT = 3000;

//regex that matches the first word of the data sent from the client to the server
//SETUP, PLAY, PAUSE, or TEARDOWN
var parseCommand = /(^\w+)/

//array object for holding information on clients
//creating the server for the client to connect to
net.createServer(function(sock) {
	
	console.log('Client: ' + sock.remoteAddress +':'+ sock.remotePort + ' is connected\n');
	
	//add new client from the address and port
	clients.addClient(sock.remoteAddress, sock.remotePort);

	sock.on('data', function(message) {
		console.log('Message from client at ' + sock.remoteAddress + ':' + sock.remotePort + ' says:\n\n' + message);
		
		//change input data into a format that can be easily parsed
		var input = util.format('%s', message);

		//grab the keyword of the data; SETUP PLAY PAUSE or TEARDOWN
		var command = input.match(parseCommand);

		//call parseClientData to make a JSON object from the 
		var data = parseClientData(command[0], input, sock.remoteAddress);

		
		//switch statement to determine which command was given and execute commands
		switch(command[0])
		{
			case 'SETUP':
				
				//check if the current client communicating has been added to the client database before
				var client = clients.returnInitClient(sock.remoteAddress, sock.remotePort);
				if (client === undefined){
					//if not found add new client to the database
					clients.addClient(sock.remoteAddress, sock.remotePort);
				}			
				//get the client object
				var client = clients.returnInitClient(sock.remoteAddress, sock.remotePort);

				//reset the client object to initial values
				client.reset();
				
				//attempt to file the file the client specified in its message
				//if its not found an error is thrown by findFile
				findFile(data.File);

				//add attributes to the client object defined by the setup message from the client
				client.File = './resources/' + data.File; //store the name of the file to play
				client.Address = sock.remoteAddress; //store return address
				client.commPort = data.ClientPort; //store return port
				client.SessionID = getRand(); //store generate random number to be used as session id
				client.Socket = RTP.createSocket(client.commPort, client.SessionID); //create and store udp socket

				//communicate back with client after client object is initialized
				sock.write('RTSP/1.0 200 OK\n'+'CSeq: '+data.CSeq+'\n'+'Session: '+client.SessionID+'\n');
	
				break;

			case 'PLAY':
	
				//grab client object based on the session id sent from the client
				var client = clients.getClient(data.SessionID);

				//communitcate back with client
				sock.write('RTSP/1.0 200 OK\n'+'CSeq: '+data.CSeq+'\n'+'Session: '+client.SessionID+'\n');

				//call streaming function
				//note: the client object stores its place in the file
				//so the stream function will resume from the correct spot after
				//if the client chooses to hit play again after pause
				RTP.stream(client);

				break;

			case 'PAUSE':
				
				//grab client object based on the session id sent from the client
				var client = clients.getClient(data.SessionID);
				
				//communicate back with client
				sock.write('RTSP/1.0 200 OK\n'+'CSeq: '+data.CSeq+'\n'+'Session: '+client.SessionID+'\n');

				//if the client presses pause, stop the timer to stop sending the video packets
				client.stopTimer();

				break;

			case 'TEARDOWN':
				
				//grab the client object based on the session id sent from the client
				var client = clients.getClient(data.SessionID);
		
				//communicate back with client
				sock.write('RTSP/1.0 200 OK\n'+'CSeq: '+data.CSeq+'\n'+'Session: '+client.SessionID+'\n');

				client.stopTimer();

				//remove the client from list of known clients
				clients.removeClient(client.SessionID);

				break;
		}
	});

}).listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);

//function to parse out data sent from client and sort it into a JSON object
function parseClientData(keyword, input, remoteAddress) {
	//information packet for play pause and teardown
	var packet = {
		"File" : 'null',
		"StreamingMethod" : 'null',
		"CSeq" : 'null',
		"SessionID" : 'null',
		"ClientAddress" : remoteAddress,
		"Transport" : 'null',
		"ClientPort" : 'null'
	};

	//data packet is different for setup as there is more on the last line
	if (keyword == 'SETUP'){
	
		//Regexs for matching the three lines of data sent
		var setupRegex1 = /SETUP\srtsp:\/\/\d+.\d+.\d+.\d+.\d+\/(\w+.\w+)\s(\w+\/\d+.\d+)/
		var setupRegex2 = /CSeq:\s(\d+)/
		var setupRegex3 = /Transport:\s(\w+\/\w+);\s\w+=\s(\d+)/
		
		//Parse data from client into variables
		var setup1 = input.match(setupRegex1);
		var setup2 = input.match(setupRegex2);
		var setup3 = input.match(setupRegex3);
		
		//update JSON object with the parsed data
		packet.File = setup1[1];
		packet.StreamingMethod = setup1[2];
		packet.CSeq = setup2[1];
		packet.Transport = setup3[1];
		packet.ClientPort = setup3[2];

		return packet;
	}
	else {
		//any command but setup gets the same packet made and returned
		var Regex1 = /\w+\srtsp:\/\/\d+.\d+.\d+.\d+:\d+\/(\w+.\w+)\s(\w+\/\d+.\d+)/
		var Regex2 = /CSeq:\s(\d+)/
		var Regex3 = /Session:\s+(\d+)/

		var match1 = input.match(Regex1);
		var match2 = input.match(Regex2);
		var match3 = input.match(Regex3);

		packet.File = match1[1];
		packet.StreamingMethod = match1[2];
		packet.CSeq = match2[1];
		packet.SessionID = match3[1];

		return packet;
	}
}

//attempt to find the file on the filesystem
function findFile(filename){
	filepath = './resources/' + filename;

	fs.exists(filepath, function(exists){
		if (!exists){
			throw new Error('Video files are supposed to be stored in ./resources/\nPlease check the location of your video files');
		}
	});
}

//gets random number between 100000 and 1000000
function getRand(){
	return Math.floor((Math.random()*999999)+100000);
}



