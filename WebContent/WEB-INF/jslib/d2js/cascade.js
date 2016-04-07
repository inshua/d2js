/*******************************************************************************
 * The MIT License (MIT)
 *
 * Copyright © 2015 Inshua(inshua@gmail.com). All rights reserved.
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


var ObjectArray = Java.type('java.lang.Object[]'), 
	ScriptObjectMirror = Java.type('jdk.nashorn.api.scripting.ScriptObjectMirror'),
	JsTypeUtil = Java.type('org.siphon.common.js.JsTypeUtil'),
	EngineUtil = Java.type('org.siphon.common.js.JsEngineUtil');

/**
 * 调用另一个 d2js 文件的函数
 * @param src {string} 文件名
 * @param method {string} 函数名
 * @param params {*|array} 数组 - 参数列表，单值 - 单个参数
 */
D2JS.prototype.callD2js = function(src, method, params){
	var engineContext = d2jsRunner.getEngineContext(findResource(src), request, response);
	if(engineContext == null) throw new Error(src + ' maybe not exist');
	try{
		var another = engineContext.getHandler();	// ScriptObjectMirror
		if(this.transactConnection){
			another = engineContext.getEngineAsInvocable().invokeMethod(another, 'clone');	// ScriptObjectMirror
			another.transactConnection = this.transactConnection;
		}
		var engine2 = engineContext.getScriptEngine();
		var bindings = engine2.getBindings(100);
		bindings['__s'] = JSON.stringify(params instanceof Array ? params : [params]);		// 欲在两个引擎间传递对象，只能使用这种方法
		var res = engine2.eval("d2js." + method + '.apply(d2js, JSON.parse(__s, parseDate))', bindings);
		if(res != null && res instanceof ScriptObjectMirror) res = org.siphon.common.js.JsTypeUtil.getSealed(res);
		d2jsRunner.completeTask(engineContext.getScriptEngine(), null);
		return res;
	} catch(e){
		d2jsRunner.completeTask(engineContext.getScriptEngine(), new ECMAException(e, null));
		throw e;
	} finally {
		if (engineContext != null)
			engineContext.free();
	}
}

/**
 * 更新数据总入口
 * @param params {string} {table : *待更新数据*} *待更新数据*定义为： 
 * ```js
 * {name : 'xxx', src : "xxx.d2js", 
 *  columns : [...], 
 *  rows : [{fld: v, fld: v,..., _origin : {}, _state : 'none|edit|remove|new', 
 *  _children : [嵌套子表,同本结构]
 *  }]
 *  }
 *  ```
 */
D2JS.prototype.update = function(params){
	this.updateTable(params.table, null, true);
}

D2JS.prototype.updateTable = function(table, parentRow, isSelf){
	var path = request.getServletContext().getContextPath();
	var src = table.src.replace(path, '');
	src = request.getServletContext().getRealPath(src);
	this.doTransaction(function(){
		for(var i=0;i<table.rows.length; i++){
			var row = table.rows[i];
			try{
				switch(row._state){
				case 'new' : 
					if(isSelf){
						this.create(row, table.columns);
					} else {
						this.callD2js(src, 'create', [row, table.columns]);
					}
					row._children && updateChildren.call(this, row);
					break;
				case 'edit' :
					row._children && updateChildren.call(this, row);
					if(isSelf){
						this.modify(row, table.columns);
					} else {
						this.callD2js(src, 'modify', [row, table.columns]);
					}
					break;
				case 'remove' : 
					row._children && updateChildren.call(this, row);
					if(isSelf){
						this.destroy(row, table.columns);
					} else {
						this.callD2js(src, 'destroy', [row, table.columns]);
					}
					break;
				case 'none' :
					row._children && updateChildren.call(this, row);
					break;
				}
			} catch(e){
				var err = e;
				if(e instanceof Throwable){
					var err = org.siphon.common.js.JsEngineUtil.parseJsException(e);
				}
				err.table = table.name;
				err.idx = row._idx;
				throw e;
			}
		}
	});
	
	function updateChildren(row){
		for(var i=0;i<row._children.length; i++){
			this.updateTable(row._children[i], row);
		}
	}
}