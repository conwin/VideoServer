var dgram = require('dgram');
var fs = require('fs');
var RTPpacket = require('./RTPpacket');
var RTSP = require('./RTSP');
var clients = require('./clients');

//creates a udp socket on the port sent in the setup message
exports.createSocket = function(port, session){
	
	//create the udp socket
	udpSocket = dgram.createSocket("udp4");
	
	udpSocket.on("listening", function () {
  		var address = udpSocket.address();
  		console.log('UDP socket created on port: ' + address.port + ' for session: ' + session +'\n');
	});

	udpSocket.on("close", function (msg, address) {
		console.log('UDP socket closed on port: ' + address.port);
		udpSocket.close();
	});

	//binds the socket to the port
	udpSocket.bind(port);

	//return the socket to the client object
	return udpSocket; 
}

//gets random number between 100 and 1000
function getSequence(){
	return Math.floor((Math.random()*1000)+100);
}

//gets random number between 100 and 1000
function getTimestamp(){
	return Math.floor((Math.random()*10000)+1000);
}

//gets the size of the file name carried in the client object
//and sets it in the client object
function setFileSize(client){

	var file = fs.openSync(client.File, 'rs');
	fs.fstat(file, function(err, stats){
		if (err) throw err;
		client.FileSize = stats.size;
	});
}

exports.stream = function(client){
	//get the size of the file to play and store in the client object
	if (client.FileSize === null){
		setFileSize(client);

	}
	//get starting sequence and timestamp if not already obtained
	if (client.Sequence == null){
		client.Sequence = getSequence();
	}
	if (client.Timestamp == null){
		client.Timestamp = getTimestamp();

	}
	
	
	//ticks every 100ms
	var play = function(){
		
		//if not at the end of the file send next video frame
		if (client.Position < client.FileSize){

			//open file for reading
			var file = fs.openSync(client.File, 'rs');
			fs.fstat(file, function(err, stats){

				//new buffer object to store frame header
				var frameHeader = new Buffer(5);
				
				//read first 5 bytes of file position into the buffer
				fs.readSync(file, frameHeader, 0, 5, client.Position);
				//change file position
				client.Position += 5;

				//get the value of the next video frame length
				var headerString = frameHeader.toString();

				//make new buffer the size of the next video frame
				var frame = new Buffer(parseInt(headerString, 10));

				//read the video frame into the buffer
				fs.readSync(file, frame, 0, frame.length, client.Position);
				//change file postion
				client.Position += frame.length;
	
				//make RTPpacket header with sequence and timestamp
				var header = RTPpacket.makeHeader(client.Sequence, client.Timestamp);

				//get bufffer made of RTP header with video frame attached
				var videoframe = RTPpacket.buildPacket(header, frame);
						
				// send frame to client
				client.Socket.send(videoframe, 0, videoframe.length, client.commPort, client.Address);

				//increment sequence number by 1 and timestamp by 100
				client.Sequence++;
				client.Timestamp += 100;
				
			});//fstat ends
		}//if ends

		//check to ensure client has not reached end of file
		//if it hasn't then call the play function again on an
		//interval of 50ms
		if (client.Position != client.FileSize){
			var playInterval = setTimeout(play,50);
			client.setTimer(playInterval);
		}
	}//play ends

	//call the play function with an interval of 100ms
	var playInterval = setTimeout(play,50);

	//add the timers timeoutId to the client object so that it can be stopped
	client.setTimer(playInterval);
}//stream ends