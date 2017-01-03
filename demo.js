'use strict';

var debug = require('debug')('_test:');
var Task = require('./lib/task_model');
var Pool = require('./lib/task_pool');
var Excutor = require('./lib/excutor');
var codes = require('./lib/code_ref');
var Processor = require('./lib/processor');
var cheerio = require('cheerio');
var fs = require('fs');

//URL = BASE_URL + page + '.html'
var BASE_URI = 'http://www.ygdy8.net/html/gndy/dyzz/list_23_';
var DOMAIN = 'http://www.ygdy8.net';

var getPool = function(sp, ep) {
	var ta = [];

	for (var p = sp; p <= ep; p++) {
		var options = {
			url: BASE_URI + p + '.html',
			type: codes.OBJECT_LIST
		};
		ta.push(new Task(options));
	}

	var pool = new Pool(ta);
	return pool;
};

var parseList = function(html) {
	var list = [];
	var $ = cheerio.load(html, {
		decodeEntities: false
	});
	var movies = $('.co_content8').find('a');
	movies.each(function(i, e) {
		var link = $(this).attr('href');
		if (link.indexOf('/html') == 0) {
			var options = {
				name: $(this).text() || '',
				url: DOMAIN + link,
				type: codes.OBJECT_INFO
			};
			list.push(new Task(options));
		}
	});
	return list;
};

var parseObj = function(html) {
	var $ = cheerio.load(html, {
		decodeEntities: false
	});
	var title = $('title').text() || '';
	var lIndex = title.indexOf('《');
	var rIndex = title.indexOf('》');
	title = title.substr(lIndex + 1, rIndex - lIndex - 1) || '';
	var link = $('tbody').find('a').text();
	var movie = {
		name: title,
		link: link
	};
	return movie;
};

var storeList = function(tasks) {
	for (var i = 0; i < tasks.length; i++) {
		fs.appendFile(__dirname + '/data/tasks.txt', JSON.stringify(tasks[i]) + '\n\n', function(err) {
			if (err) {
				debug(err);
			}
		});
	}
};

var storeObj = function(obj) {
	var info = '';
	for (var k in obj) {
		info += ',' + obj[k];
	}
	info += '\n';
	info = info.substr(1,info.length);
	debug(obj.name);
	fs.appendFile(__dirname + '/data/result.csv', info, function(err) {
		if (err) {
			debug(err);
		}
	});
};

var getProcessor = function() {
	return new Processor({
		parseList: parseList,
		parseObj: parseObj,
		storeList: storeList,
		storeObj: storeObj
	});
};

var final = function(msg){
	debug('callback in demo');
	debug(msg);
};

var pool = getPool(1, 158);

debug(pool.taskCount());

var processor = getProcessor();
var excutor = new Excutor({
	pool: pool,
	processor: processor,
	curNum: 10,
	timeout: 20000,
	encoding: 'gbk',
	proxy:true
});

excutor.excute(100,final);