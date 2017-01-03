# spider-lib

主要作用，爬取信息网站的信息(爬虫)

设计思路：一般而言，对于信息采集工作来说，信息采集的过程一般是如下两步：
	1.网站的信息以列表的形式展现，比如人才招聘网，并且有多页列表。
	2.每一页列表上有许多条目，点击条目可以进入该条目对应的详情页。
	3.先去抓取列表页，获得该列表页的每一个条目的详情页地址
	4.抓取详情页html，从中解析出需要的信息(parse)并且存储起来(store)
	5.抓取下一个列表页
	...

不管是列表页(OBJECT_LIST)还是详情页(OBJECT_INFO),都是先通过网络获取html文档，然后
从文档中解析出信息，因此我们把网页的获取和解析抽象成一个任务(task);

```
###task_model

var Task = function(options) {
	this.state = options.state || codes.PREPARED;
	this.type = options.type;
	this.url = options.url;
	this.name = options.name || 'task';
	this.excuteCount = 0;
};

```

如果type是OBJECT_LIST则说明该任务是要获取并解析列表页，如果type等于OBJECT_INFO则说明是获取并解析
详情页。

###task_pool

task_pool 维护着一个任务队列，提供增删查改接口

###excutor
excutor 负责执行task_pool中的任务，一次可以执行多个任务，也可以只执行一个任务，当一个task出现err
时，会重试两次，如果还是失败，则放弃这个任务。

在构造Excutor时，只需指定要执行的任务队列task_pool和处理html的函数集合processor（其中包括parse类型函数和store类型函数并且需要按照指定格式return）.

###ip_pool
在new Excutor是可以指定proxy = true以使用代理ip，当使用代理ip时，excutor会定时从网上抓取可以使用的代理ip地址，每次100个，由request进行代理

详见demo.js