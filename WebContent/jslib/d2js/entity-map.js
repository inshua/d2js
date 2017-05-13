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
		} catch(e){
			throw new Erorr(s);
		}
		try{
			if(result.error){
				reject(Object.assign(new Error(), result.error));
			} else {
				resolve(result);
			}
		} catch (e){
			reject(e);
		}
	});
}

/**
 * 所给字段是否为某项映射的 key
 */
d2js.isMapKey = function(meta, columnName){
	for(let k in meta.map){if(meta.map.hasOwnProperty(k)){
		var map = meta.map[k];
		if(map.key == columnName){
			return true;
		}
	}}
}

d2js.findInverseMap = function(map, metaMaps){
	for(let k in metaMaps){ if(metaMaps.hasOwnProperty(k)){
		var m = metaMaps[k];
		if(map.fk == m.key && map.key == m.fk){
			return m;
		}
	}}
}

d2js.meta.load = function(d2jses, namespace){
	return new Promise(async function(resolve, reject){
		try{
			var q = {d2jses: d2jses};
			var s = jQuery.param({_m : 'getD2jsMeta', params : JSON.stringify(q)});
			var response = await fetch(contextPath + '/meta.d2js?' + s);
			var metas = await d2js.processResponse(response);
			metas = Object.getOwnPropertyNames(metas).map(k => metas[k])
			d2js.meta.loadMetas(metas, namespace);
			resolve();
		} catch(e){
			reject(e)
		}	
	});
	
}

d2js.meta.loadMetas = function(metas, namespace = d2js.root){
	if(namespace == null){
		namespace = d2js.root;
	} else if(typeof namespace == 'string'){
		if(d2js.root[namespace] == null) d2js.root[namespace] = new Object();
		namespace = d2js.root[namespace];
	} else {
		// namespace is object,just put in this object
	}

	metas.forEach(function(meta){
		meta.namespace = namespace;
		if(meta.map == null) meta.map = {};
		meta.columnNames = meta.columns.map(function(column){return column.name});

		var code = 'd2js.Entity.apply(this, arguments)'
		var fun  = new Function(code);
		fun.prototype = Object.create(d2js.Entity.prototype, { constructor : { value : fun } });
		fun.meta = fun.prototype._meta = meta;
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
		fun.fetch = d2js.Entity.fetch;
	}, this);

	for(let k in namespace){if(namespace.hasOwnProperty(k)){
		var fun = namespace[k];
		if(fun && fun.meta){
			for(const map of fun.meta.maps){
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

	/**
	 * 关联对象，主要是指 one - one 关系定义的引用对象。存储{map: map, object: object}。
	 */
	this._associatedObjects = [];
	
	// 初始化列表成员
	for(let k in this._meta.map){
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
		for(let k in values){if(values.hasOwnProperty(k)){
			var value = values[k];
			if(k in this._meta.map){
				var map = this._meta.map[k];
				if(map.relation == 'many'){
					if(value != null){
						let ls = this._values[k];
						let C = ls.meta.Constructor;
						value.forEach(function(item){
							let obj = new C(item);
							ls.append(obj);
							obj._values[map.inverse.name] = this;
							ls.origin.push(obj);
						}, this);
					}
				} else if(map.relation == 'one'){
					if(typeof value == 'object'){
						if(value._isEntity){
							this._values[k] = value;
							this._associatedObjects.push({map: map, object: value});
						} else {
							if(map.inverse && map.inverse.relation == 'one'){
								value[map.inverse.name] = this;
							}
							let Constructor = this._namespace[map.type];
							let obj = this._values[k] = new Constructor(value);		// if column name == map name, just keep map name, when collect data, will collect fk id.
							if(map.inverse && map.inverse.relation == 'many'){
								let ls = obj[map.inverse.name];
								this._values[k] = obj;
								ls.append(this);
								ls.origin.push(this);
							} 
							this._associatedObjects.push({map: map, object: obj});
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
		if(makeOrigin){
			this._origin = this._toRow();
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
d2js.Entity.prototype._reverseMappedObjToRaw = function(map, mappedObject){
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
		return this._reverseMappedObjToRaw(this._meta.map[columnName], this._values[columnName]);
	} else {
		return this._values[columnName];
	}
}

/**
 * 设置字段的值，如果当前行状态为 none，则新的行状态为 edit
 * @param column {string} 字段名
 * @param value {object} 值
 */
d2js.Entity.prototype._set = function(attr, newValue){
	let isMappedOject = attr in this._meta.map;
	newValue = (newValue == null ? null : newValue);
	if(isMappedOject){
		return this._setMappedAttribute(attr, newValue);
	} else {
		if(d2js.isMapKey(this._meta, attr)){
			throw new Error('cannot set foreign key value directly, set an entity instead');
		}
	}
	
	if(this._values[attr] != newValue){			
		if(this._state == 'none') {
			this._state = 'edit';
			if(this._origin == null){
				this._origin = this._toRow();
			}
		}
		this._values[attr] = newValue;
	}
	return this;
}

d2js.Entity.prototype._setMappedAttribute = function(attr, newValue){
	var map = this._meta.map[attr];
	if(map.relation == 'many') throw new Error(`cannot set List attribute ${attr}`);
	
	if(newValue != null){
		if(!newValue._isEntity) 
			throw new Error('cannot set foreign key value directly, set an entity instead');	// 只能为另一个实体对象
		if(newValue._meta.name != map.type){
			throw new Error(`${map.type} required, ${newValue._meta.name} not allowed`);
		}
	}

	var currValue = this._getValueBeforeMap(map.name);
	var fkValue = this._reverseMappedObjToRaw(map, newValue);		// 反查 v 的值, 此时 v 不属于 entity,不能使用 _getValueBeforeMap
	let changed = (currValue != fkValue);
	if(!changed) return this;

	var old = this._values[attr];
	let rmap = map.inverse;
	if(rmap && rmap.relation == 'many'){ 	// 如为 one-many 关系，则从相关联容器移除，并放入新的关联容器
		let rname = rmap.name;
		if(old){
			old[rname].drop(this);	// 不直接移除本元素，等提交时根据是否为owner决定是否体现为移除态
		}
		if(newValue){
			let ls = newValue[rname];
			ls.append(this);
		}
	}
	
	this._values[attr] = newValue;
	if(this._meta.columnNames.indexOf(attr) != -1){	// 与 column 同名
		if(this._state == 'none') {
			this._state = 'edit';
		}
	} else {
		if(map.key != this._meta.pk){
			this._set(map.key, fkValue);
		} else if(map.inverse && map.inverse.key == this._namespace[map.type].meta.key){
			throw new Error('cannot set PK-PK relation');
		}
	}

	if(rmap && rmap.relation == 'one'){	// 如为 one - one 关系，则对方也解除对我的引用
			if(old){
				old._set(rmap.name, null);
			}
			if(newValue){
				newValue._set(rmap.name, this);
			}
	}
	return this;
}

/**
 * 批次设置值，与 _set 相似，只是批次调用
 * @param rowData {object} {col1:val, col2:val, col3:val}
 */
d2js.Entity.prototype._setValues = function(rowData){
	for(let k in rowData){
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


d2js.Entity.prototype.toString = function(){
	return `(${this._meta.name} ${JSON.stringify(this._toRow())})`
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
 * 将本数据行状态设为 remove, 并从各关联对象移除。
 */
d2js.Entity.prototype._remove = function(){
	this._state = 'remove';
	for(let k in this._values){
		if(this._values.hasOwnProperty(k) && k in this._meta.map){
			// var map = this._meta.map[k];
			let relatedObject = this._values[k];
			if(relatedObject != null){
				if(relatedObject._isEntity){
					this._set(k, null);
				}
			}
		}
	}
}

d2js.Entity.fetchById = function(id, filter){
	var Fun = this;
	
	var url = contextPath + Fun.meta.path;
	var q = {id: id};
	if(filter){
		q.filter = filter;
	}
	
	return new Promise(async function(resolve, reject){
		try{
			var response = await fetch(url + '?' + jQuery.param({_m : 'fetchEntityById', params : JSON.stringify(q)}));
			var table = await d2js.processResponse(response);
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

d2js.Entity.fetch = function(method = 'fetch', params, option){
	var Fun = this;
	
	var url = contextPath + Fun.meta.path;
	var q = params;
	params = {_m : method};
	if(q) params.params = JSON.stringify(q);
	
	return new Promise(async function(resolve, reject){
		try{
			var response = await fetch(url + '?' + jQuery.param(params));
			var table = await d2js.processResponse(response);
			var ls = new d2js.List(Fun.meta);
			for(let k in table){
				if(table.hasOwnProperty(k) && k != 'columns' && k != 'rows'){
					ls[k] = table[k];
				}
			}
			if(ls.total != null){
				ls.pageIndex = ls.start / ls.pageSize;
				ls.pageCount = Math.ceil(ls.total / ls.pageSize);
			}

			ls.setArray(table.rows);
			resolve(ls);
		} catch(e){
			reject(e);
		} 	
	});
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
	result._map = map;
	result.meta = meta || (map && map.meta);
	result.owner = null;
	result.origin = [];
	return result;
}


d2js.List.prototype = Object.create(Array.prototype, {
	constructor : {
		value : d2js.List
	}
});

d2js.List.prototype.isList = true;

d2js.List.prototype.append = function(ele) {
	if(ele == null) throw new Error('element cannot be null')
	if(ele._isEntity == false || ele._meta.name != this.meta.name)
		 throw new Error('element must be ' + this.meta.name);

	if(this.indexOf(ele) != -1) return;
	Array.prototype.push.call(this, ele);
};

d2js.List.prototype.push = function(ele){
	if(this._map != null){
		var inverseMap = this._map.inverse;	
		if(inverseMap != null){
			if(inverseMap.relation != 'one') throw new Error(`relation of ${inverseName} should be 'one'`);
			ele._set(inverseMap.name, this.owner);
		}
	} else {
		this.append(ele);
	}
}

d2js.List.prototype.remove = function(ele){
	if(this._map && this._map.inverse){
		ele._set(this._map.inverse.name, null);
	} else {
		return this.drop(ele);
	}
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
			var ele = new Constructor(arr[i]);
			this.push(ele);
			this.origin.push(ele);
		} else {
			// TODO 这里考虑是直接调用meta里的path动态按需加载meta还是报错。如果动态加载会产生一堆 await，不可收拾。
			throw new Error("meta not loaded for " + this._map.type);
		}
	}
	return this;
}

d2js.Entity.prototype._isAlone = function(map){
	if(this[map.name] == null){  // TODO N-N 关系另外考虑
		return true;
	}
}

d2js.Entity.prototype._collectChange = function(path, state){
	if(state == 'remove' && this._state == 'new') return null;

	path = path ? path.concat([this]) : [this];
	state = state || this._state;
	
	var children = [];
	for(let k in this._values){if(this._values.hasOwnProperty(k)){
		if(k in this._meta.map){
			let map = this._meta.map[k];
			let relatedObject = this._values[k];
			if(relatedObject && path.indexOf(relatedObject) != -1) continue;

			if(map.inverse && map.inverse.isOwner){ // belong to relatedObject, and owner not in path
				continue;		// 不收集 owner 对象
			}
			if(relatedObject != null){
				if(relatedObject._collectChange){	// d2js.List or d2js.Entity
					var relatedState = undefined;
					if(state == 'remove' && map.isOwner){
						relatedState = 'remove';
					}
					let c = relatedObject._collectChange(path, relatedState);
					if(c != null){
						children.push(c);
					}
				} 
			} else {
				if(map.isOwner){	// one -one 关系中的 owner
					relatedObject = this._associatedObjects.find(v => v.map == map);
					if(relatedObject && relatedObject._isAlone(map.inverse)){
						var c = relatedObject._collectChangeAsTable(path, 'remove');
						children.push(c);
					}
				}
			}
		}
	}}

	var r = null;
	switch(state){
	case 'remove':
	case 'new' :
		r = this._toRow();
		break;
	case 'edit':
		r = this._toRow();
		if(this._origin){
			r._origin = this._origin;
		}
		break;
	case 'none':
		if(children.length) r = {src: contextPath + this._meta.path};
	}
	if(r == null) return null;
	r._state = state;
	if(children.length) r._children = children;
	return r;
}

d2js.Entity.prototype._collectChangeAsTable = function(path, state){
	var change = this._collectChange(path, state);
	if(change == null) return null;
	var table = {
		src : contextPath + this._meta.path,
		columns : this._meta.columns,
		rows : [change]
	};
	return table;
}

d2js.Entity.prototype.submit = function(){
	var Fun = this;
	
	var url = contextPath + Fun.meta.path + "?_m=update";
	var change = this._collectChangeAsTable();
	var params = {table: change};
	return new Promise(async function(resolve, reject){
		try{
			var resposne = await fetch(url + '?_m=update', {
							method:'post', 
							headers: {  
								"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"  
							},  
							body : jQuery.param(params)
						});
			var result = await d2js.processResponse(resposne);
			resolve(result);
		} catch(e){
			reject(e);
		} 	
	});
}

d2js.List.prototype._collectChange = function(path = [], state){
	if(state == null && this.owner && this.map.isOwner && this.owner._state == 'remove'){
		state = 'remove';
	}
	var table = {
		src : contextPath + this.meta.path,
		columns : this.meta.columns,
		rows : this.map(row => row._collectChange(path, state))
			.concat(this.origin.filter(isRemoved, this).map(row => row._collectChange(path, map.isOwner ? 'remove': undefined)))
			.filter(r => r != null),
	};
	if(table.rows.length == 0) return null;
	return table;

	function isRemoved(entity){
		return this.indexOf(entity) == -1 && entity._isAlone(this._map.inverse);
	}
}

d2js.List.prototype.submit = function(){
	var Fun = this;
	
	var url = contextPath + Fun.meta.path + "?_m=update";
	var change = this._collectChange();
	var params = {table: change};
	return new Promise(async function(resolve, reject){
		try{
			var resposne = await fetch(url + '?_m=update', {
							method:'post', 
							headers: {  
								"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"  
							},  
							body : jQuery.param(params)
						});
			var result = await d2js.processResponse(resposne);
			resolve(result);
		} catch(e){
			reject(e);
		} 	
	});
}
