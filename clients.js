var clients = new Array();
var numClients = 0;

//create new object to store client attributes
exports.addClient = function(address, port){
	
	var client = new Object();

	client.File = null;			//file client wishes to play
	client.Address = address;	//return address for packets
	client.Port = port;			//initial connection port
	client.commPort = null;		//return port for packets
	client.SessionID = null;	//session id for the client
	client.Socket = null;		//socket to send send over binded to commPort
	client.Position = 0;		//current position in the video file
	client.Timer = null;		//setTimeout objects timeoutId, the timer that sends the video packets
	client.FileSize = null;		//size of the file to be played
	client.Sequence = null;		//initial sequence number for packets
	client.Timestamp = null;	//initial timestamp for packets

	//reset all values to initial conditions
	client.reset = function(){
		this.File = null;
		this.commPort = null;
		this.SessionID = null;
		client.Socket = null;
		client.Position = 0;
		client.Timer = null;
		client.FileSize = null;
		client.Sequence = null;
		client.Timestamp = null;
	}

	//function to add the timer object
	client.setTimer = function(timer){
		this.Timer = timer;
	}

	//function to send the clearTimeout command to stop the timer object
	client.stopTimer = function(){
		clearTimeout(this.Timer);
	}

	clients[numClients] = client;
	numClients++;
}


//remove client with the specified session id
//moves clients stored after this index one to left so there
//is no gaps in the client array
exports.removeClient = function(id){
	for (var i = 0; i < numClients; i++){
		if (clients[i].SessionID == id){
			var j = i;
			while (j < numClients-1){
				clients[j] = clients[j+1];
				j++;
			}
			clients[j] = null;
			numClients--;
		}
	}
}


//return client object with the specified session id
exports.getClient = function(id){
	var index = findClient(id);
	return clients[index];
}

//finds and returns the client matching the initial address and port 
//it connected to the server with
exports.returnInitClient = function(address, port){
	for (var i = 0; i < numClients; i++){
		if ((clients[i].Address == address) && (clients[i].Port == port)){
			return clients[i];
		}
	}
}

//finds index for the client in the array
function findClient(id){
	for (var i = 0; i < numClients; i++){
		if (clients[i].SessionID == id){
			return i;
		}
	}
}