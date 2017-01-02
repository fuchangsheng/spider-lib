'use strict';

var Processor = function(funcs) {
	this.parseList = funcs.parseList;
	this.parseObj = funcs.parseObj;
	this.storeList = funcs.storeList || defaultFunc;
	this.storeObj = funcs.storeObj || defaultFunc;
};

var defaultFunc = function() {};

module.exports = Processor;