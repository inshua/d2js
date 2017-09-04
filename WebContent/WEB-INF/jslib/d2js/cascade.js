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
 * @param d2js {D2JS} D2JS 对象
 * @param table {string} 表命名
 * @param src {string} d2js 文件路径
 * @param method {string} 为本主表提供的方法，接收主表 id 数组
 * @param [id='id'] {string}
 */
D2JS.DataTable.prototype.nest = function(d2js, table, src, method, id){
	id = id || 'id';
	var ids = this.rows.map(function(row){return row[id]});
	if(!this.nested) this.nested = {};
	var r = d2js.callD2js(src, method, [ids]);
	this.nested[table] = r;
	return this;
}

/**
 * 得到另一个 d2js 文件相应的对象 
 * @param src {string} d2js文件名
 */
D2JS.prototype.findD2js = function(src){
	var path = this.findResource(src);
	var another = allD2js[path];
	if(another == null){
		if(d2jsRunner.ensureD2jsLoaded(path, src) == false){
			throw new Error(src + ' maybe not exist');
		} else {
			another = allD2js[path]
		}
	}
	return another;
}

/**
 * 混入另一个 d2js 对象的成员：
 * 用法如：
 * -----
 * b.d2js
 * -----
 * ```js
 * d2js.exports.multi = d2js.multi = function(params){
 * 	return params.a * params.b
 * }
 * ```
 * ----
 * a.d2js
 * ----
 * ```js
 * d2js.mixin("b.d2js")
 * ```
 * 现在 a.d2js 即从 b.d2js 获得 multi 接口。
 * 
 * 目前不支持 b.d2js 有变动时混入的成员随之变动，b.d2js 变动后，应手工将 a.d2js 调整时间。 
 * @param path {string} d2js文件名
 * @param override {boolean} 是否覆盖同名成员，默认false
 */
D2JS.prototype.mixin = function(path, override){
	var another = this.findD2js(path);
	for(var k in another){
		if(another[k] != null && k != 'exports'){
			if(k in this == false || override){
				this[k] = another[k]
			} 
		}
	}
	for(var k in another.exports){
		this.exports[k] = another.exports[k]
	}
	return this;
} 

/**
 * 调用另一个 d2js 文件的函数
 * @param src {string} d2js文件名
 * @param method {string} 函数名
 * @param args {*|array} 数组 - 参数列表，单值 - 单个参数
 */
D2JS.prototype.callD2js = function(src, method, args){
	var another = this.findD2js(src);
	try{
		another = another.clone();
		if(this.transactConnection){
			another.transactConnection = this.transactConnection;
		}
		another.request = this.request;
		another.response = this.response;
		another.out = this.out;
		another.session = this.session;
		
		if(!Array.isArray(args)) args = [args];
		var res = another[method].apply(another, args);
		if(another.task) d2jsRunner.completeTask(another.task, null);
		return res;
	} catch(e){
		if(another.task) {
			d2jsRunner.completeTask(another.task, new ECMAException(e, null));
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
D2JS.prototype.update = function(params){
	this.updateTable(params.table, null, []);
}

D2JS.prototype.updateTable = function(table, parentRow, errors){
	if(table == null) return;
	var path = this.request.getServletContext().getContextPath();
	var src = table.src.replace(path, '');
	src = this.request.getServletContext().getRealPath(src);
	var isSelf = parentRow == null;
	
	this.doTransaction(function(){
		for(var i=0;i<table.rows.length; i++){
			var row = table.rows[i];
			try{
				switch(row._state){
				case 'new' : 
					if(isSelf){
						this.create(row, table.columns);
					} else {
						this.callD2js(src, 'create', [row, table.columns, parentRow]);
					}
					row._children && updateChildren.call(this, row);
					break;
				case 'edit' :
					row._children && updateChildren.call(this, row);
					if(isSelf){
						this.modify(row, table.columns);
					} else {
						this.callD2js(src, 'modify', [row, table.columns, parentRow]);
					}
					break;
				case 'remove' : 
					row._children && updateChildren.call(this, row);
					if(isSelf){
						this.destroy(row, table.columns);
					} else {
						this.callD2js(src, 'destroy', [row, table.columns, parentRow]);
					}
					break;
				case 'none' :
					row._children && updateChildren.call(this, row);
					break;
				}
			} catch(e){
				if(e.name == 'MultiError'){
					for(var i=0; i<e.errors.length; i++){
						var e2 = e.errors[i];
						e2._object_id = row._object_id;
						errors.push(e2) ;
					}
				} else {
					var err = e;
					if(e instanceof Throwable){
						err = org.siphon.common.js.JsEngineUtil.parseJsException(e);
					} else if(typeof e == 'string'){
						err = new Error(e);
					}
					err.table = table.name;
					err.idx = row._idx;
					err._object_id = row._object_id;
					err.table_id = table._object_id;
					errors.push(err);
					if(e.name != 'ValidationError'){
						logger.error('error occurs when process row ' + JSON.stringify(row), Error.toJava(err));
					}
				}
			}
		}
		
		if(isSelf && errors.length){
			if(errors.length == 1){ 
				throw errors[0];
			} else { 
				throw new MultiError(errors);
			}
		}
	});
	
	
	function updateChildren(row){
		for(var i=0;i<row._children.length; i++){
			this.updateTable(row._children[i], row, errors);
		}
	}
}

