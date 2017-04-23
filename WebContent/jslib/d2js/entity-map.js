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
"use strict"
var contextPath = '/d2js';

d2js.meta = {};

d2js.processResponse = function(response){
	return new Promise(async function(resolve, reject){
		var s = await response.text();
		try{
			var result = JSON.parse(s);
			if(result.error){
				reject(new Error(result.error));
			} else {
				resolve(result);
			}
		} catch (e){
			reject(new Error(s));
		}
	});
}

/**
 * 所给字段是否为某项映射的 key
 */
d2js.isMapKey = function(meta, columnName){
	for(var k in meta.map){if(meta.map.hasOwnProperty(k)){
		var map = meta.map[k];
		if(map.key == columnName){
			return true;
		}
	}}
}

d2js.findInverseMap = function(map, metaMaps){
	for(var k in metaMaps){ if(metaMaps.hasOwnProperty(k)){
		var m = metaMaps[k];
		if(map.fk == m.key && map.key == m.fk){
			return m;
		}
	}}
}

d2js.meta.load = function(d2jses, namespace, callback){
	if(namespace == null){
		namespace = d2js.root;
	} else if(typeof namespace == 'string'){
		namespace = d2js.root[namespace] = new Object(); 	
	} else {
		// namespace is object,just put in this object
	}
	
	return new Promise(async function(resolve, reject){
		try{
			var q = {d2jses: d2jses};
			var s = jQuery.param({_m : 'getD2jsMeta', params : JSON.stringify(q)});
			var response = await fetch(contextPath + '/meta.d2js?' + s);
			d2js.processMetas(namespace, await response.json());
			resolve();
		} catch(e){
			reject(e)
		}	
	});
	
}

d2js.processMetas = function(namespace, metas){			
	for(var s in metas){ if(metas.hasOwnProperty(s)){
		var meta = metas[s];
		meta.namespace = namespace;
		if(meta.map == null) meta.map = {};
		meta.columnNames = meta.columns.map(function(column){return column.name});

		var code = 'd2js.Entity.apply(this, arguments)'
		var fun  = new Function(code);
		fun.prototype = Object.create(d2js.Entity.prototype, { constructor : { value : fun } });
		fun.prototype._meta = meta;
		fun.prototype._namespace = namespace;
		namespace[meta.name] = fun;
		meta.Constructor = fun;
		
		var maps = [];
		var names = [];
		for(var name in meta.map){if(meta.map.hasOwnProperty(name)){
			(function(name){
				var map = meta.map[name];
				map.name = name;
				maps.push(map);
				var def = { get: function(){ return this._values[name]} };
				if(map.relation == 'one') {		// many is readonly
					def.set = function(value){this._set(name, value); }
				} 
				Object.defineProperty(fun.prototype, name, def);
			})(name);
		}}
		meta.maps = maps;

		meta.columnNames.forEach(function(name){
			if(name in meta.map == false){
				var def = { get: function(){ return this._values[name]} };
				if(!d2js.isMapKey(name)){	// 外键如 publisher_id 不能直接设置值
					def.set = function(value){this._set(name, value); };
				}
				Object.defineProperty(fun.prototype, name, def);
			}
		});
		fun.fetchById = d2js.Entity.fetchById;
	}}

	for(var k in namespace){if(namespace.hasOwnProperty(k)){
		var fun = namespace[k];
		if(fun && fun.prototype && fun.prototype._meta){
			for(const map of fun.prototype._meta.maps){
				if(map.inverse != null) continue;
				var rmeta = namespace[map.type];
				if(rmeta) rmeta = rmeta.prototype._meta;
				var rmap = d2js.findInverseMap(map, rmeta.map);
				map.inverse = rmap;
				rmap.inverse = map;
			}
		}
	}}
}



/**
 * 数据行。
 * @class d2js.Entity
 */
d2js.Entity = function(values){
	this._values = {};
	
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
	for(var k in this._meta.map){
		if(this._meta.map.hasOwnProperty(k)){
			var map = this._meta.map[k];
			if(map.relation == 'many'){
				map.meta = this._namespace[map.type].prototype._meta;
				var ls = new d2js.List(map.meta, map);
				ls.owner = this;
				this._values[k] = ls;
			}
		}
	}

	// 初始化数据
	if(values){
		var makeOrigin = false;
		for(var k in values){if(values.hasOwnProperty(k)){
			var value = values[k];
			if(k in this._meta.map){
				var map = this._meta.map[k];
				if(map.relation == 'many'){
					this._values[k].setArray(value);	// _setInverse auto called in setArray
				} else if(map.relation == 'one'){
					if(typeof value == 'object'){
						if(value._isEntity){
							this._values[k] = value;
						} else {
							if(map.inverse != null){
								value[map.inverse.name] = this;
							}
							var Constructor = this._namespace[map.type];
							this._values[k] = new Constructor(value);		// if column name == map name, just keep map name, when collect data, will collect fk id.
						}
					} else {
						this._values[k] = null;	
						makeOrigin = true;	// author.books[0].author 收到是 author.id
					}
				} else {
					this._values[k] = value;
				}
			} else {
				this._values[k] = value;
			}
		}}
		if(makeOrigin){	// 将此类成员记录到 origin，后面如调用 _set (如在 push 中)可避免误认为有变化
			this._origin = this._toRow();
			this._meta.columnNames.forEach(function(cname){
				if(this._origin[cname] == null && values[cname] != null){
					this._origin[cname] = values[cname];
				}
			}, this);
		}
	}
}

d2js.Entity.prototype._setInverse = function(map, value){
	if(map.inverse == null || value == null) return;
	value._set(map.inverse.name, this);
	return value;
}

d2js.Entity.prototype._isEntity = true;

/**
 * 将 map.relation = 'one' 的外来对象，映射回本类的属性值
 */
d2js.Entity.prototype._reverseMapToValue = function(map, mappedObject){
	if(map.relation != 'one'){
		throw new Error('only relation=one can map back');
	}
	if(mappedObject == null){
		return null;
	} else {
		return mappedObject._getValueBeforeMap(map.fk);
	}
}

d2js.Entity.prototype._getValueBeforeMap = function(columnName){
	if(columnName in this._meta.map){
		return this._reverseMapToValue(this._meta.map[columnName], this._values[columnName]);
	} else {
		return this._values[columnName];
	}
}

/**
 * 设置字段的值，如果当前行状态为 none，则新的行状态为 edit
 * @param column {string} 字段名
 * @param value {object} 值
 */
d2js.Entity.prototype._set = function(attr, value){
	let isMappedOject = attr in this._meta.map;
	value = (value == null ? null : value);
	if(isMappedOject){
		var map = this._meta.map[attr];
		if(map.relation == 'many') throw new Error('cannot modify List');
		if(value != null){
			if(!value._isEntity) 
				throw new Error('cannot set foreign key value directly, set an entity instead');	// 只能为另一个实体对象
			if(value._meta.name != map.type){
				throw new Error(`${map.type} required, ${value._meta.name} not allowed`);
			}
		}
		if(this._origin == null) this._origin = this._toRow();
		var fkValue = this._reverseMapToValue(map, value);		// 反查 v 的值, 此时 v 不属于 entity,不能使用 _getValueBeforeMap
		if(this._state == 'none') {
			var originFk = this._origin[map.key];
			if(originFk != fkValue){
				this._state = 'edit';		
			}
		}
		if(map.relation == 'one') {		
			var old = this._values[attr];
			var rmeta = null;
			if(old != null) rmeta = old._meta; else if(value != null) rmeta = value._meta;
			if(rmeta){ 
				let rmap = d2js.findInverseMap(map, rmeta.map);
				if(rmap != null && rmap.relation == 'many'){	// 如为 one-many 关系，则从相关联容器移除，并放入新的关联容器
					let rname = rmap.name;
					if(old){
						if(value) 
							old[rname].drop(this);
						else
							old[rname].remove(this);
					}
					if(value){
						value[rname].push(this);
					}
				} else if(rmap.relation == 'one'){		// 如为 one - one 关系，则对方也解除对我的引用
					// TODO one-one
				}
			}
		}
		this._values[attr] = value;
		if(this._meta.columnNames.indexOf(attr) != -1){	// 与 column 同名
			return this;
		} else {
			value = fkValue;
			attr = map.key;
			// goto _set(attr, fkValue);
		}
	} else {
		if(d2js.isMapKey(this._meta, attr)){
			throw new Error('cannot set foreign key value directly, set an entity instead');
		}
	}
	
	if(this._values[attr] != value){			
		if(this._state == 'none') {
			this._state = 'edit';
			if(this._origin == null){
				this._origin = this._toRow();
			}
		}
		this._values[attr] = value;
	}
	return this;
}

/**
 * 批次设置值，与 _set 相似，只是批次调用
 * @param rowData {object} {col1:val, col2:val, col3:val}
 */
d2js.Entity.prototype._setValues = function(rowData){
	for(var k in rowData){
		if(this._meta.columnNames.indexOf(k) != -1 ||  k in this._meta.map){
			this._set(k, rowData[k]);
		}
	}
	return this;
}

/**
 * 转换为只包含 column 信息的纯数据对象
 */
d2js.Entity.prototype._toRow = function(){
	var obj = {};
	this._meta.columnNames.forEach(function(k){
		var value = this._values[k];
		if(k in this._meta.map && value != null){
			obj[k] = value._getValueBeforeMap(this._meta.map[k].fk);
		} else {
			obj[k] = value;
		} 
	}, this);
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

d2js.Entity.fetchById = function(id, filter){
	var Fun = this;
	
	var url = contextPath + Fun.prototype._meta.path;
	var q = {id: id};
	if(filter){
		q.filter = filter;
	}
	
	return new Promise(async function(resolve, reject){
		try{
			var resposne = await fetch(url + '?' + jQuery.param({_m : 'fetchEntityById', params : JSON.stringify(q)}));
			var table = await d2js.processResponse(resposne);
			var row = table.rows[0];
			var obj = null;
			if(row){
				obj = new Fun(row);
			}
			resolve(obj);
		} catch(e){
			reject(e);
		} 	
	});
}

d2js.Entity.prototype.submit = function(){
	var Fun = this;
	
	var url = contextPath + Fun.prototype._meta.path;
	var q = {id: id};
	if(filter){
		q.filter = filter;
	}

	var ls = new d2js.List(this._meta);
	ls.append(this);
	return ls.submit();
	
	// return new Promise(async function(resolve, reject){
	// 	try{
	// 		var resposne = await fetch(url + '?_m=updateEntity', {
	// 						method:'post', 
	// 						headers: {  
	// 							"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"  
	// 						},  
	// 						body : jQuery.param(submition)
	// 					});
	// 		var result = await d2js.processResponse(resposne);
	// 		if(row){
	// 			obj = new Fun(row);
	// 		}
	// 		resolve(obj);
	// 	} catch(e){
	// 		reject(e);
	// 	} 	
	// });
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

d2js.List = function(meta, map){
	var array = [];
	var proto = Object.getPrototypeOf(this);
	var result = Object.setPrototypeOf(array, proto);
	result.map = map;
	result.meta = meta || (map && map.meta);
	result.owner = null;
	result.removed = [];
	return result;
}


d2js.List.prototype = Object.create(Array.prototype, {
	constructor : {
		value : d2js.List
	}
});

d2js.List.prototype.append = function(ele) {
	if(ele == null) throw new Error('element cannot be null')
	if(ele._isEntity == false || ele._meta.name != this.meta.name)
		 throw new Error('element must be ' + this.meta.name);

	if(this.indexOf(ele) != -1) return;
	Array.prototype.push.call(this, ele);
};

d2js.List.prototype.push = function(ele){
	if(ele == null) throw new Error('element cannot be null')
	if(ele._isEntity == false || ele._meta.name != this.meta.name)
		 throw new Error('element must be ' + this.meta.name);
	
	if(this.indexOf(ele) != -1) return; 

	Array.prototype.push.call(this, ele);
	if(this.map != null){
		var inverseMap = this.map.inverse;	
		if(inverseMap != null){
			if(inverseMap.relation != 'one') throw new Error(`relation of ${inverseName} should be 'one'`);
			ele._set(inverseMap.name, this.owner);
		}
	}
}

d2js.List.prototype.remove = function(ele){
	var idx = this.indexOf(ele);
	if(idx == -1) return;
	this.splice(idx,1);
	ele._remove();
	this.removed.push(ele);		// TODO 在 _remove 中实现
}

d2js.List.prototype.drop = function(ele){
	var idx = this.indexOf(ele);
	if(idx == -1) return;
	this.splice(idx,1);
}

d2js.List.prototype.setArray = function(arr){
	this.length = 0;
	if(arr == null) return;
	for(var i=0; i<arr.length; i++){
		var Constructor = this.meta.Constructor;
		if(Constructor){
			this.push(new Constructor(arr[i]));
		} else {
			// TODO 这里考虑是直接调用meta里的path动态按需加载meta还是报错。如果动态加载会产生一堆 await，不可收拾。
			throw new Error("meta not loaded for " + this.map.type);
		}
	}
	return this;
}

// [ "concat", "reverse", "slice", "splice", "sort", "filter", "map" ]
// 		.forEach(function(name) {
// 			var _Array_func = this[name];
// 			d2js.List.prototype[name] = function() {
// 				var result = _Array_func.apply(this, arguments);
// 				return setPrototypeOf(result, getPrototypeOf(this));
// 			}
// 		}, Array.prototype);
