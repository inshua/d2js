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
 * 将子表相关行置入本次查询，构造为
 * {columns:[], rows:[], nested:{child_table: {columns:[], rows: [], ...}}}
 * @param table {string} 表命名
 * @param src {string} d2js 文件路径
 * @param method {string} 为本主表提供的方法，接收主表 id 数组
 * @param [id='id'] {string}
 */
D2JS.DataTable.prototype.nest = function(table, src, method, id){
	id = id || 'id';
	var ids = this.rows.map(function(row){return row[id]});
	if(!this.nested) this.nested = {};
	this.nested[table] = d2js.callD2js(src, method, [ids, http], http);
	return this;
}

/**
 * 调用另一个 d2js 文件的函数
 * @param src {string} 文件名
 * @param method {string} 函数名
 * @param args {*|array} 数组 - 参数列表，单值 - 单个参数
 */
HttpHandler.prototype.callD2js = function(src, method, args){
	var another = d2jsRunner.getD2js(findResource(src), this.request, this.response);		//ScriptObjectMirror
	if(another == null) throw new Error(src + ' maybe not exist');
	try{
		another = another.clone();
		if(this.d2js.transactConnection){
			another.transactConnection = this.d2js.transactConnection;
		}
		if(Array.isArray(args) == false){
			args = [args];
		}
		var h2 = new HttpHandler();
		h2.merge(http);
		h2.d2js = another;
		if(this.task) h2.task = new org.siphon.d2js.jshttp.Task(); 
		var res = another[method].apply(another, args);
		if(h2 && h2.task) d2jsRunner.completeTask(h2.task, null);
		return res;
	} catch(e){
		if(h2 && h2.task){
			d2jsRunner.completeTask(h2.task, new ECMAException(e, null));
		}
		throw e;
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
D2JS.prototype.update = function(params, http){
	http.updateTable(params.table, null, true);
}

HttpHandler.prototype.updateTable = function(table, parentRow, isSelf){
	var path = this.request.getServletContext().getContextPath();
	var src = table.src.replace(path, '');
	src = this.request.getServletContext().getRealPath(src);
	var http = this;
	this.d2js.doTransaction(function(){
		for(var i=0;i<table.rows.length; i++){
			var row = table.rows[i];
			try{
				switch(row._state){
				case 'new' : 
					if(isSelf){
						this.create(row, http, table.columns, parentRow);
					} else {
						http.callD2js(src, 'create', [row, http, table.columns, parentRow]);
					}
					row._children && updateChildren.call(this, row);
					break;
				case 'edit' :
					row._children && updateChildren.call(this, row);
					if(isSelf){
						this.modify(row, http, table.columns, parentRow);
					} else {
						http.callD2js(src, 'modify', [row, http, table.columns, parentRow], http);
					}
					break;
				case 'remove' : 
					row._children && updateChildren.call(this, row);
					if(isSelf){
						this.destroy(row, http, table.columns, parentRow);
					} else {
						http.callD2js(src, 'destroy', [row, http, table.columns, parentRow], http);
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
			http.updateTable(row._children[i], row, false);
		}
	}
}