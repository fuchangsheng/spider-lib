'use strict';
var codes = require('./code_ref');

var Task = function(options) {
	this.state = options.state || codes.PREPARED;
	this.type = options.type;
	this.url = options.url;
	this.name = options.name || 'task';
};

var validate = function(task) {
	try {
		if (task.type === codes.OBJECT_LIST || task.type === codes.OBJECT_INFO) {
			if (task.url) {
				if (task.state === codes.PREPARED) {
					return true;
				}
			}
		}
	} catch (e) {
		return false;
	}
	return false;
};

Task.validate = validate;
module.exports = Task;