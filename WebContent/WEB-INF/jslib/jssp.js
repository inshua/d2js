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

imports("../config/website.js");

include('d2js.js');

function processJsspRequest(d2js, params, request, response, session, out){
	var d = allD2js[d2js];
	
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
	clone.jssp(params);
}


/**
 * 包含另一个 jssp 文件。文件路径搜索按当前文件路径、WebContent 路径搜索确定。
 * 该页面将包含入宿主页面，浏览器并未对其发出请求，故其 reqeust 对象即宿主页面的 reqeust 对象, 因此不支持查询字符串如 includeJssp('a.jssp?arg1=v1')，
 * 但只要页面保证使用 params 获取参数(而不是 request.par )，也可由 params 获得参数，故可使用 includeJssp('login.jssp', {name : xxx})
 * @function 
 * @param jsspFile {string} jssp 文件名，可使用相对路径
 * @param params {object} 传入参数
 */
D2JS.prototype.includeJssp = function(jsspFile, params){
	this.callD2js(jsspFile, 'jssp', params);
}

/**
 * 选择分支，当条件满足时，执行后面的代码。
 * 	
 * 		cond(cond1, then1, cond2, then2, defaultDo);
 * 用法如：
 * ```js
 * 	cond(type=='string', function(){}, type=='int', function(){}, function(){})
 * ```
 * 在 JSSP 编写中，经常需要判断满足条件执行语句，如果都分开写非常不紧凑，用这条语句能紧凑不少。如
 * 
 * 		[% cond(type=='string', function(){%] abcd [%})%]
 */
function cond(){	
	for(var i=0; i<arguments.length; i+=2){
		if(arguments[i+1] != null){ 
			if(arguments[i]) return arguments[i+1]();
		} else {
			return arguments[i]();
		}
	}
}