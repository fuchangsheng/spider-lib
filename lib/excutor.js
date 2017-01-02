'use strict';

var debug = require('debug')('_excutor:');
var request = require('request');
var iconv = require('iconv-lite');
var Event = require('events').EventEmitter;
var event = new Event();
var codes = require('./code_ref');

var pool = undefined;
var processor = undefined;
var CUR_NUM = 0;
var TIME_OUT = 0;
var ENCODING = 'utf-8';
var TARGET = 0;


var suCount = 0;


var Excutor = function(options) {

	//necessary
	processor = options.processor;
	pool = options.pool;

	CUR_NUM = options.curNum || 10;
	TIME_OUT = options.timeout || 15000;
	ENCODING = options.encoding || ENCODING;


	this.excute = excute;
};

var excute = function(target) {
	TARGET = target;
	for (var i = 0; i < CUR_NUM; i++) {
		if (pool.hasNext()) {
			fetch(pool.next());
		}
	}
};

var fetch = function(task) {

	var options = {
		url: task.url,
		headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0'},
		timeout: TIME_OUT,
		encoding: null
	};

	var promise = new Promise(function(resolve, reject) {
		request(options, function(err, res, body) {

			event.emit('FETCHED');
			
			if (err) {
				reject(err);
			} else {
				if(task.type === codes.OBJECT_INFO){
					suCount++;
				}
				resolve(iconv.decode(res.body, ENCODING));
			}
		});
	});

	if (task.type === codes.OBJECT_LIST) {
		//parse list  -->  innerPool tasks  -->  store
		promise.then(processor.parseList).then(pushList).then(processor.storeList).catch(onError);
	}else if(task.type === codes.OBJECT_INFO){
		//parse obj  -->  store
		promise.then(processor.parseObj).then(processor.storeObj).catch(onError);
	}
};

var pushList = function(list) {
	list.reverse();
	for (var i = 0; i < list.length; i++) {
		pool.innerPool(list[i]);
	}
	return list;
};

var onError = function(err){
	debug(err);
};

event.on('FETCHED',function(){
	if(!pool.hasNext()){
		debug('Tasks in the pool have been finished excuting.');
		debug('Successful tasks : ' + suCount);
	}else if(suCount >= TARGET){
		debug('Target arrived !');
		debug('Successful tasks : ' + suCount);
	}else{
		fetch(pool.next());
	}
});

module.exports = Excutor;