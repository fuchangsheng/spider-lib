'use strict';

var debug = require('debug')('_pool:');
var Task = require('./task_model');

var tasks = [];

var TaskPool = function(ORIGINAL_TASKS) {
	
	ORIGINAL_TASKS.reverse();
	for (var i = 0; i < ORIGINAL_TASKS.length; i++) {
		innerPool(ORIGINAL_TASKS[i]);
	}

	this.hasNext = hasNext;
	this.next = next;
	this.innerPool = innerPool;
	this.taskCount = count;
};

var hasNext = function() {
	if (count()) {
		return true;
	}
	return false;
};

var next = function() {
	if (hasNext()) {
		return tasks.pop();
	}
	return null;
};

var innerPool = function(task) {
	if (Task.validate(task)) {
		tasks.push(task);
	}
};

var count = function() {
	return tasks.length;
};

module.exports = TaskPool;