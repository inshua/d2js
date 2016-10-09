/*******************************************************************************
 * The MIT License (MIT)
 * Copyright © 2015 Inshua,inshua@gmail.com, All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the “Software”), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/
// 初始化脚本，装载一些常用代码库
// 入口配置于 web.xml <init-param><param-name>PRELOADJS</param-name></init-param>

imports("./lang.js");

imports("./Date.js");

imports("../config/website.js");

imports("../config/database.js");


if(datasourceConfig.isMongodb){
	imports("./d2js/mongodb.js");
} else {
	imports("./d2js/base.js");
}

imports("./d2js/cascade.js");

imports("./d2js/validation.js");

init();


var LinkedBlockingQueue = Java.type('java.util.concurrent.LinkedBlockingQueue');
var Executors = Java.type('java.util.concurrent.Executors');
var ConcurrentHashMap = Java.type('java.util.concurrent.ConcurrentHashMap');
var TimeUnit = Java.type('java.util.concurrent.TimeUnit');
var ThreadPoolExecutor = Java.type('org.apache.tomcat.util.threads.ThreadPoolExecutor');
var workQueue = new LinkedBlockingQueue();
//var es = Executors.newWorkStealingPool();
var es = new ThreadPoolExecutor(500, 1000, 10, TimeUnit.SECONDS, workQueue);
var allD2js = new ConcurrentHashMap();
function recvRequest(asyncContext, request, response, out, d2js, method){
	var args = Array.prototype.slice(arguments, 6);
	var d = allD2js[d2js];
	var r = d[method].apply(d, args);
	out.print(JSON.stringify(r));
	asyncContext.complete();
	//logger.info(java.lang.Thread.currentThread());
	return;
	
	es.execute(new java.lang.Runnable(){
		run: function(){
			logger.info('getPriority() ' + java.lang.Thread.currentThread().getPriority());
			var r = d[method].apply(d, args);
			out.print(JSON.stringify(r));
			asyncContext.complete();
		} 
	});
}

function processRequest(d2js, method, params){
	var d = allD2js[d2js];
	var r = d[method].call(d, params);
	out.print(JSON.stringify(r));
}
