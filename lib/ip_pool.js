'use strict';

var Ip = require('./ip_model');
var cheerio = require('cheerio');
var debug = require('debug')('_ip_pool');
var fs = require('fs');
var request = require('request');
var iconv = require('iconv-lite');

//url:URL + P;
var URL = 'http://www.xicidaili.com/nt/1'

var refresh = function(fn) {
	var promise = new Promise(function(resolve, reject) {
		request({
			url: URL,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0'
			},
			timeout: 30000,
			encoding: null
		}, function(err, res, body) {
			if (err) {
				reject({
					err: err
				});
			} else {
				resolve(iconv.decode(res.body, 'utf-8'));
			}
		});
	});
	promise.then(parseObj).then(storeObj).then(fn).catch(fn);
};

var parseObj = function(html) {
	var ipList = [];
	try {
		var $ = cheerio.load(html, {
			decodeEntities: false
		});
		var list = $('#ip_list').find('tr');
		list.each(function(i, e) {
			try {
				var tds = $(this).find('td');
				var options = {};
				tds.each(function(i, e) {
					if (i === 1) {
						options.ip = $(this).text().trim();
					}
					if (i === 2) {
						options.port = $(this).text().trim();
					}
				});
				var ip = new Ip(options);
				ipList.push(ip);
			} catch (err) {
				debug(err);
			}
		});
	} catch (err) {
		debug(err);
	}
	return ipList;
};

var storeObj = function(ipList) {
	var list = [];
	for (var i = 0; i < ipList.length; i++) {
		if (Ip.validate(ipList[i])) {
			list.push(ipList[i]);
		}
	}
	if (list.length) {
		return {
			list: list
		};
	}
	return {err:'No ip fetched'};
};


exports.refresh = refresh;