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

// 处理 d2js 请求，发现比用 java 的方式处理快
function processRequest(d2js, method, params, request, response, session, out, taskDocker){
	var d = allD2js[d2js];
	if(d.exports[method] == null){
		if(d[method] == null)
			throw new Error(method + " not defined");
		else 
			throw new Error(method + " is invisible, you can export it in this way: d2js.exports." + method + " = d2js." + method + " = function()...");
	}

	var clone = new D2JS(d.executor);
	for(var k in d){
		if(d.hasOwnProperty(k)) {
			clone[k] = d[k];
		} else {
			break;
		}
	}
	clone.request = request;
	clone.response = response;
	clone.out = out;
	clone.session = session;
	clone.taskDocker = taskDocker;
	var r = clone[method].call(clone, params);
	
	if(!out.isDirty()){
		if(r == null){
			out.print('{"success":true}');
		} else {
			out.print(JSON.stringify(r));
		}
	}	
}
