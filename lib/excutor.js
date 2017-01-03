'use strict';

var debug = require('debug')('_excutor:');
var request = require('request');
var iconv = require('iconv-lite');
var Event = require('events').EventEmitter;
var event = new Event();
var codes = require('./code_ref');
var ipPool = require('./ip_pool');

//任务池，池中的每个任务(task)都包括url 和type
var pool = undefined;
//处理html文档、存储解析出来的信息
var processor = undefined;

//同时异步执行的任务数量，默认为10
var CUR_NUM = 10;

//超时时间，默认15s
var TIME_OUT = 0;

//目标网页编码格式，默认'utf-8'
var ENCODING = 'utf-8';

//期望抓取的目标数量，必须在excute方法中设置
var TARGET = 0;

//代理ip是否已经初始化
var IP_INITIALIZED = false;

//是否使用代理ip
var USE_PROXY_IP = false;

//成功抓取目标个数
var suCount = 0;
//成功抓取目标页数
var listCount = 0;


//使用代理ip
var ips = [];
var refreshIp_id = -1;
var refreshPeriod = 5 * 1000;

//自动抓取代理ip，保存在ips数组中，默认每15s更新一次
var refreshIp = function() {
	ipPool.refresh(function(result) {
		if (result.err) {
			debug(err);
		} else {
			//第一次任务前需要初始化代理ip数组，初始化完成后才正式开始执行任务
			if (!IP_INITIALIZED) {
				debug('Ip pool initialze finished.');

				//初始化完成
				IP_INITIALIZED = true;
				event.emit('INITIALIZED');
			} else {
				//刷新
				debug('Refresh ' + result.list.length + ' ip');
			}
			ips = result.list;
		}
	});
};

//从Ip池中随机获取一个ip
var proxyIp = function() {

};


//任务执行完毕后默认执行的回调，可在Excutor对象的excute函数中指定
var finalCallback = function(msg) {
	debug(msg);
};

//构造函数
var Excutor = function(options) {

	//necessary
	//解析和储存爬取对象的方法
	processor = options.processor;
	//任务池/队列
	pool = options.pool;

	//直接执行，不等待返回的任务数量,可以理解为用作获取网页的线程数量，经过测试，在pc机上，10M带宽
	//比较高效的数量为10 ~20，主要是受到了网络和内存的限制
	CUR_NUM = options.curNum || 10;
	//超时时间
	TIME_OUT = options.timeout || 15000;
	//爬取网页的编码
	ENCODING = options.encoding || ENCODING;
	//是否使用代理ip
	USE_PROXY_IP = options.proxy || USE_PROXY_IP;

	this.excute = excute;
};

/**
 * 开始执行任务，设置期望抓取的数量target,以及执行完毕后的回调fn
 * @param  {[int]}   target [description]
 * @param  {Function} fn     [description]
 */
var excute = function(target, fn) {
	finalCallback = fn;
	TARGET = target;

	if (USE_PROXY_IP) {
		refreshIp();
		refreshIp_id = setInterval(refreshIp, refreshPeriod);
	} else {
		event.emit('INITIALIZED');
	}

};

//正式开始执行任务
var start = function() {
	for (var i = 0; i < CUR_NUM; i++) {
		if (pool.hasNext()) {
			fetch(pool.next());
		}
	}
};

//完成一个任务
var fetch = function(task) {

	var options = {};
	if (!USE_PROXY_IP) {
		options = {
			url: task.url,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0'
			},
			timeout: TIME_OUT,
			encoding: null
		};
	}else{
		options = {

		};
	}

	//修改该任务的执行次数
	task.excuteCount++;

	var promise = new Promise(function(resolve, reject) {
		request(options, function(err, res, body) {

			//如果出现连接超时或其他错误，将这个任务放回任务池再重试2次，如果还是失败，就继续下一个任务
			if (err) {
				if (err.code === 'ETIMEDOUT') {
					if (task.excuteCount < 3) {
						pool.innerPool(task);
						debug('Retry count :' + task.excuteCount);
						debug('Retry :' + task.name + ' For ERROR ETIMEDOUT HAPPEND');
					}
				}

				callNextTask();

				reject(err);
			} else {
				if (task.type === codes.OBJECT_INFO) {

					suCount++; //记录成功个数

				}
				//按爬取网页的编码格式解码
				resolve(iconv.decode(res.body, ENCODING));
			}
		});
	});

	//如果任务是list型任务，即是为了获取更多任务而执行的任务，需要将网页中的任务
	//解析出来放入任务池/队列
	//再执行下一个任务
	if (task.type === codes.OBJECT_LIST) {
		if (task.excuteCount === 1) {
			listCount++;
		}
		debug('list :' + listCount);
		//parse list  -->  innerPool tasks  -->  call next task -->  store
		promise.then(processor.parseList)
			.then(pushList)
			.then(processor.storeList)
			.then(callNextTask)
			.catch(onError);
	} else if (task.type === codes.OBJECT_INFO) {
		//parse obj  -->  call next task -->  store
		promise.then(processor.parseObj)
			.then(processor.storeObj)
			.then(callNextTask)
			.catch(onError);
	}
};

//将新任务放入任务池pool
var pushList = function(list) {
	list.reverse();
	for (var i = 0; i < list.length; i++) {
		pool.innerPool(list[i]);
	}
	return list;
};

//执行下一个任务
var callNextTask = function() {
	event.emit('FETCHED');
};


var onError = function(err) {
	debug(err);
};


event.once('INITIALIZED', start);

event.on('FETCHED', function() {
	if (!pool.hasNext()) {
		event.emit('END', codes.POOL_FINISHED);
	} else if (suCount >= TARGET) {
		event.emit('END', codes.TARGET_FINISHED);
	} else {
		fetch(pool.next());
	}
});

event.once('END', function(flag) {
	var msg = '';
	if (flag === codes.POOL_FINISHED) {
		msg += 'Tasks in the pool have been finished excuting.';
	} else if (flag === codes.TARGET_FINISHED) {
		msg += 'Target arrived .';
	}
	msg += '\nSuccessful tasks : ' + suCount;

	if (USE_PROXY_IP) {
		//停止刷新IP
		clearInterval(refreshIp_id);
		debug('Stop refresh Ip');

	}
	//执行整个爬虫任务的回调
	finalCallback(msg);
});

module.exports = Excutor;