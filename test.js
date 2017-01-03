'use strict';

var debug = require('debug')('_test:');
var fs = require('fs');
var cheerio = require('cheerio');
var Ip = require('./lib/ip_model');
var IpPool = require('./lib/ip_pool');


var ipPool = new IpPool();
ipPool.refresh(function(result){
	if(result.err){
		debug(result.err);
	}else{
		debug(result.list);
	}
});