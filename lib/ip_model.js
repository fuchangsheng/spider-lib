'use strict';

var IP = function(options){
	this.ip = options.ip;
	this.port = options.port;
};

IP.validate = function(ip){
	if(ip.ip && ip.port){
		return true;
	}
	return false;
};

module.exports = IP;