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
/*
如果存在 Author 类，则按 Author 类创建对象
如果不存在Author类，使用 Entity 类,
 	author.name, author._set('name', ) 和以前一样，如能找到子类（或默认创建子类）也可定义为带有 get/set 的 attribute。
	author.books 是另外一个 List

List 是带有 offset, total 结构的类，派生自 Array，支持 load(append:true|false)，submit() 等动作

该类和 DataTable 相似，可以考虑作为 DataTable 的 Alias，但不再需要 DataSet 和 Relation —— relation 定义在 List/DataTable 里

author.books.remove(book)  如 map.own == 'full' 则 book 置为 remove, 如为 'use' 则 book.set('fk', null)，二者都应造成对 books 不可见，但不能真移除，不然无法提交
authorb.books.push(book) 则 book.set('fk', authorb.id)，同时 author.books 应在 js 级别移除该元素，在 authorb.books 真正加入该元素，但状态不为 new

提交时 author 对象应与它下面所有的 List 连带提交。

Entity 可以提交，List 也可以提交，Entity 提交时只影响一行（及相关的行）。

entity 提交时，同名map  如（author : {key:'author'} ） 在更新时应翻译并取 ID，该动作由服务器完成。

在 map 中，key/fk 是 pk 的，先执行更新。

*/
var contextPath = '/d2js';

d2js.meta = {};

d2js.meta.load = function(d2jses, namespace, callback){
	if(namespace == null){
		namespace = d2js.root;
	} else if(typeof namespace == 'string'){
		namespace = d2js.root[namespace] = new Object(); 	
	} else {
		// namespace is object,just put in this object
	}
	
	var q = {d2jses: d2jses};
	$.ajax({
		url : contextPath + '/meta.d2js',		// TODO contextPath
		data : {_m : 'getD2jsMeta', params : JSON.stringify(q)}, 
		type : 'post',
		dataType : 'text',
		success : onSuccess,
		error : function (error){onError(new Error(error.responseText || 'cannot establish connection to server'));}
	});
	
	function onSuccess(text){
		var metas = JSON.parse(text);
		
		for(var s in metas){ if(metas.hasOwnProperty(s)){
			var meta = metas[s];
			var code = 'd2js.Entity.apply(this, arguments)'
			var fun = namespace[meta.name] = new Function(code);
			fun.prototype = Object.create(d2js.Entity.prototype, {
				constructor : {
					value : fun
				}
			});
			fun.prototype.meta = meta;
			fun.prototype.namespace = namespace;
			meta.columnNames = meta.columns.map(function(column){return column.name});
			var names = [];
			for(var name in meta.map){if(meta.map.hasOwnProperty(name)){
				(function(name){
					var def = {get: function(){ return this.values[name]} };
					if(meta.map[name].relation == 'one'){		// many is readonly
						def.set = function(value){this._set(name, value); }
					}
					Object.defineProperty(fun.prototype, name, def);
				})(name);
			}}
			meta.columnNames.forEach(function(name){
				if(name in fun.prototype == false){
					var def = {
								get: function(){ return this.values[name]},
								set: function(value){this._set(name, value); }
							};
					Object.defineProperty(fun.prototype, name, def);
				}
			});
			fun.fetchById = d2js.Entity.fetchById;
		}}
		if(callback) callback();
	}
	
	function onError(error){
		if(callback) callback(error); else throw error;
	}
	
	
}



/**
 * 数据行。
 * @class d2js.Entity
 */
d2js.Entity = function(values){
	this.values = {};
	
	/**
	 * 行状态, new edit remove none
	 * @type {string}
	 */
	this._state = 'none';
	
	/**
	 * 行错误
	 * @type {string|Error|null}
	 */
	this._error = null;
	
	/**
	 * 字段错误，如 `row._error_at['name']` 可读取 name 字段的错误
	 * @type {object}
	 */
	this._error_at = null;
	
	// 初始化列表成员
	for(var k in this.meta.map){
		if(this.meta.map.hasOwnProperty(k)){
			var m = this.meta.map[k];
			if(m.relation == 'many'){
				this.values[k] = new d2js.List(m);
			}
		}
	}
}

/**
 * 设置字段的值，如果当前行状态为 none，则新的行状态为 edit
 * @param column {string} 字段名
 * @param value {object} 值
 */
d2js.Entity.prototype._set = function(column, value){
	var v = (value == null ? null : value);
	if(this.values[column] != v){			
		if(this._state == 'none') {
			this._state = 'edit';
			if(this._origin == null){
				this._origin = this._toJson();
			}
		}
		this.values[column] = value;
	}
	return this;
}

/**
 * 批次设置值，与 _set 相似，只是批次调用
 * @param rowData {object} {col1:val, col2:val, col3:val}
 */
d2js.Entity.prototype._setValues = function(rowData){
	for(var k in rowData){
		if(this.meta.columns.some(function(col){return col.name == k})){
			this._set(k, rowData[k]);
		}
	}
	return this;
}

/**
 * 转换为JSON数据对象
 */
d2js.Entity.prototype._toJson = function(){
	var obj = {};
	for(var k in this.values){
		if(this.values.hasOwnProperty(k)){
			obj[k] = this.values[k]; 
		}
	}
	return obj;
}

/**
 * 行状态是否为脏状态，所谓脏状态是指 edit, remove, new 三种状态
 * @returns {Boolean}
 */
d2js.Entity.prototype._isDirty = function(){
	return this._state != 'none';
}

/**
 * 接受变更
 * @returns {Boolean} 确实有变动返回 true，否则返回 false
 */
d2js.Entity.prototype._accept = function(){
	switch(this._state){
	case 'edit' :
		this._origin = null;
		this._state = 'none';
		return true;
	case 'new':
		this._state = 'none';
		return true;
	case 'remove' :
		this._table.rows.splice(this._table.rows.indexOf(this), 1);
		return true;
	}
}

/**
 * 回滚变更，退回上一版本
 * @returns {Boolean} 如果确实有回滚，返回 true，否则返回 false
 */
d2js.Entity.prototype._reject = function(){
	switch(this._state){
	case 'edit' :
		table.columnNames.forEach(function(cname){
			this[cname] = this._origin[cname];
		}, this);
		this._state = 'none';
		this._origin = null;
		return true;
	case 'new' :
		table.rows.splice(table.rows.indexOf(this), 1);
		return true;
	} 
}

/**
 * 将本数据行状态设为 remove
 */
d2js.Entity.prototype._remove = function(){
	this._state = 'remove';
}

d2js.Entity.fetchById = function(id, filter, callback){
	var Fun = this;
	
	var url = contextPath + Fun.prototype.meta.path;
	var q = {id: id};
	if(filter){
		q.filter = filter;
	}
	$.ajax({
		url : url,
		data : {_m : 'fetchEntityById', params : JSON.stringify(q)}, 
		type : 'get',
		dataType : 'text',
		success : onSuccess,
		error : function (error){onError(new Error(error.responseText || 'cannot establish connection to server'));}
	});
	
	function onSuccess(data){
		var obj = null;
		var table = JSON.parse(data);
		var row = table.rows[0];
		if(row){
			obj = new Fun(row);
		} 
		callback(obj)
	}
	
	function onError(error){
		callback(error)
	}
}

if(Object.getPrototypeOf == null){
	Object.getPrototypeOf = function(o) {
		return o.__proto__;
	}
}

if(Object.setPrototypeOf == null){
	Object.setPrototypeOf = function(o) {
		o.__proto__ = p;
		return o;
	}
}

d2js.List = function (meta){
	var d2jsList = arguments.callee;
	var array = [];
	var isNew = this instanceof d2jsList;
	var proto = isNew ? Object.getPrototypeOf(this) : d2jsList.prototype;
//	switch (arguments.length) {
//	case 0:
//		array = [];
//		break;
//	case 1:
//		array = isNew ? new Array(arguments[0]) : Array(arguments[0]);
//		break;
//	case 2:
//		array = [ arguments[0], arguments[1] ];
//		break;
//	case 3:
//		array = [ arguments[0], arguments[1], arguments[2] ];
//		break;
//	default:
//		array = new (Array.bind.apply(Array, [ null ].concat([].slice
//				.call(arguments))));
//	}
	this.meta = meta;
	return Object.setPrototypeOf(array, proto);
}


d2js.List.prototype = Object.create(Array.prototype, {
	constructor : {
		value : d2js.List
	}
});
d2js.List.prototype.append = function(var_args) {
	var_args = this.concat.apply([], arguments);
	this.push.apply(this, var_args);
	return this;
};

d2js.List.prototype.prepend = function(var_args) {
	var_args = this.concat.apply([], arguments);
	this.unshift.apply(this, var_args);

	return this;
};

[ "concat", "reverse", "slice", "splice", "sort", "filter", "map" ]
		.forEach(function(name) {
			var _Array_func = this[name];
			d2js.List.prototype[name] = function() {
				var result = _Array_func.apply(this, arguments);
				return setPrototypeOf(result, getPrototypeOf(this));
			}
		}, Array.prototype);
