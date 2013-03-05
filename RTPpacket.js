//Just for reference
//what each field of header should be
// var RTPpacket = {
// 	"V" : 2,
// 	"P" : 0,
// 	"X" : 0,
// 	"CC" : 0,
// 	"M" : 0,
// 	"PT" : 26,
// 	"Sequence number" : getRand(),
// 	"timestamp" : getTimestamp(),
// 	"SSRC" : 17
// };

//makes video header
exports.makeHeader = function(seq, time, vidFrame){
	var header = new Buffer(12);
	header[0] = 128; //8 bit representation of fields v to CC, stays constant for every packet
	header[1] = 26; //8 bit representation of M and PT, stays constant for every packet

	//place sequence number over next two bytes
	header.writeUInt16BE(seq, 2);

	//place timestamp over next four bytes
	header.writeUInt32BE(time, 4);

	//ssrc in 8,9,10,11 I've chosen the number decimal 17
	header.writeUInt32BE(17, 8);
	
	return header;
}

//creates and returns a new buffer object that stores the concatenation
//of the header buffer and the video frame buffer
exports.buildPacket = function(header, vidFrame){
	//concatenate frame buffer onto header buffer
	var buf = new Buffer((header.length) + (vidFrame.length));
	header.copy(buf);
	vidFrame.copy(buf, header.length);
	return buf;
}