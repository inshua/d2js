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

var ConcurrentHashMap = Java.type('java.util.concurrent.ConcurrentHashMap');
var allD2js = new ConcurrentHashMap();


function HttpHandler(){}

function processRequest(d2js, method, params, request, response, session, out, task){
	var d = allD2js[d2js];
	if(d.exports[method] == null){
		if(d[method] == null)
			throw new Error(method + " not defined");
		else 
			throw new Error(method + " is invisible, you can export it in this way: d2js.exports." + method + " = d2js." + method + " = function()...");
	}

	for(var k in d){
		logger.info("prop " + k + " " + d.hasOwnProperty(k));
	}
	
	var start = new Date();
	var times = 100000;
	for(var i=0; i<times; i++){
		var obj = new D2JS(d.executor);
		for(var k in d){
			if(d.hasOwnProperty(k)) {
				obj[k] = d[k];
			} else {
				break;
			}
		}
		obj.request = request;
		obj.response = response;
		obj.out = out;
		obj.session = session;
		obj.task = task;
		
		var r = obj[method].call(obj, params);
//		for(var k in obj){
//			if(obj.hasOwnProperty(k)) delete obj[k];
//		}
	}
	var l = new Date() - start;
	logger.info("clone d2js exhaust " + l / times);
	java.lang.Thread.sleep(10000);
	
//	
//	var r = d[method].call(d, params);
//	d.task = null;
//	d = null;

	var start = new Date();
	for(var i=0; i< times; i++){
		var h = new HttpHandler();
		h.request = request;
		h.response = response;
		h.out = out;
		h.session = session;
		h.task = task;
		h.d2js = d2js;
		var r = d[method].call(d, params, h);
		h.d2js = null;
		h = null;
	}
	var l = new Date() - start;
	logger.info("new HttpHandler exhaust " + l / times);
//	
//	2016-10-09 16:24:06  (/WEB-INF/jslib/d2js.js:86)  INFO - clone d2js exhaust 0.02916
//	2016-10-09 16:24:16  (/WEB-INF/jslib/d2js.js:108)  INFO - new HttpHandler exhaust 0.00245
	
	// 创建新的 D2JS 对象，要比创建 HttpHandler 开销大 10 倍
	
	if(r == null){
		out.print('{"success":true}');
	} else {
		out.print(JSON.stringify(r));
	}
}
