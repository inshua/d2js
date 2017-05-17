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

if(Object.equals == null){
	Object.equals = function(obj1, obj2){
		if(obj1 == obj2) return true;
		if(obj1 == null || obj2 == null) return false;
		if(obj1.equals && obj2.equals){
			return obj1.equals(obj2);
		} else {
			return false;
		}
	}
}

d2js.meta = {};

d2js.processResponse = function(response, items){
	return new Promise(async function(resolve, reject){
		var s = await response.text();
		try{
			var result = JSON.parse(s);
		} catch(e){
			throw new Error(s);
		}
		try{
			if(result.error){
				var error = Object.assign(new Error(), result.error);
				if(error._object_id != null){
					var item = items[error._object_id];
					if(item){
						if(item.isList){
							item.error = error;
						} else if(item._isEntity){
							if(error.field){
								var err;
								if(error.field.indexOf(',') == -1){
									err = {};
									err[error.field] = error;					
								} else {
									var arr = error.field.split(',');	// json 类型的字段，错误是一串路径
									arr.reverse();
									err = arr.reduce(function(err, fld){
										var e = {}; e[fld] = err; return e;
									}, error);
								}
								item._error_at = err;
								item._error = null;
							} else {
								item._error = error;
								item._error_at = null;
							}
						}
						return resolve(error);
					}
				} 
				reject(error);
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
				if(rmap){
					map.inverse = rmap;
					rmap.inverse = map;
				}
			}
		}
	}}
}



/**
 * 数据行。
 * @class d2js.Entity
 */
d2js.Entity = function(values, state = 'new'){
	this._values = {};
	
	/**
	 * 行状态, new edit remove none
	 * @type {string}
	 */
	this._state = state;
	
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
	if(values == null) {
		this._origin = {};
		return;
	}
	for(let k in values){if(values.hasOwnProperty(k)){
		var value = values[k];
		if(k in this._meta.map == false){
			this._values[k] = value;
			continue;
		}
		var map = this._meta.map[k];
		if(map.relation == 'many'){
			if(value != null){
				let ls = this._values[k];
				let C = ls.meta.Constructor;
				value.forEach(function(item){
					let obj = new C(item, state);
					ls.append(obj);
					if(map.inverse) obj._values[map.inverse.name] = obj._origin[map.inverse.name] = this;
					ls.origin.push(obj);
				}, this);
			}
		} else if(map.relation == 'one'){
			if(typeof value != 'object'){
				this._values[k] = null;
			} else {
				if(value._isEntity){
					this._values[k] = value;
				} else {
					if(map.inverse && map.inverse.relation == 'one'){
						value[map.inverse.name] = this;
					}
					let Constructor = this._namespace[map.type];
					let obj = this._values[k] = new Constructor(value, state);		// if column name == map name, just keep map name, when collect data, will collect fk id.
					if(map.inverse && map.inverse.relation == 'many'){
						let ls = obj[map.inverse.name];
						this._values[k] = obj;
						ls.append(this);
						ls.origin.push(this);
					} 
				}
			} 
		} else {
			this._values[k] = value;
		}
	}}
	this._origin = Object.assign({}, this._values);
}

d2js.Entity.prototype._setInverse = function(map, value){
	if(map.inverse == null || value == null) return;
	value._set(map.inverse.name, this);
	return value;
}

d2js.Entity.prototype.equals = function(another){
	if(this == another) return true;
	return another != null && another._isEntity 
			&& this._meta == another._meta 
			&& this._values[this._meta.pk] == another._values[this._meta.pk];
}

d2js.Entity.prototype.eachMappedAttribute = function(callback){
	for(var k in this._meta.map){if(this._meta.map.hasOwnProperty(k)){
		var map = this._meta.map[k]
		callback.call(this, map, this._values[k]); 
	}}
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
	if(this._state == 'phantom') throw new Error('cant set value at phantom entity');

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
				this._origin = Object.create({}, this._values);
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

	var currValue = this._values[attr];
	let changed = !Object.equals(currValue, newValue);
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

	if(rmap && rmap.relation == 'one'){	// 如为 one - one 关系，则对方也解除对我的引用
		if(old){
			old._set(rmap.name, null);
		}
		if(newValue){
			newValue._set(rmap.name, this);
		}
	}

	this._state = 'edit'
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
d2js.Entity.prototype._toRow = function(values){
	values = values || this._values;
	var obj = {};
	this._meta.columnNames.forEach(function(k){
		var value = values[k];
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
 * 将本数据行状态设为 remove, 并从各关联对象移除。
 */
d2js.Entity.prototype._remove = function(){
	if(this._state == 'phantom') throw new Error('cannot remove phantom object')
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
			resolve(d2js.tableToList(table, Fun.meta));
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
	if(meta instanceof Function){
		result.meta = meta.meta;	// meta is constructor
		result._map = map;
	} else {
		result._map = map;
		result.meta = meta || (map && map.meta);
	}
	result.owner = null;
	result.origin = [];
	result.page = 0;
	result.pageSize = d2js.DataTable.DEFAULT_PAGESIZE;
	/**
	 * 查询参数。目前实际用到的直接成员有用于分页的 _page : {start:N, limit:N}, 用于排序的  _sorts : {column : 'asc'|'desc'}, 用于查询的 params : {参数}。
	 * @type {object}
	 */
	result.search = {params : {}};
	EventDispatcher.call(result);
	result.regEvent(['willload', 'load', 'willsubmit', 'submit', 'rowchange', 'newrow', 'statechange', 'schemachange']);
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

d2js.List.prototype.setArray = function(arr, state='new'){
	this.length = 0;
	if(arr == null) return;
	for(var i=0; i<arr.length; i++){
		var Constructor = this.meta.Constructor;
		if(Constructor){
			var ele = new Constructor(arr[i], state);
			this.push(ele);
			this.origin.push(ele);
		} else {
			// TODO 这里考虑是直接调用meta里的path动态按需加载meta还是报错。如果动态加载会产生一堆 await，不可收拾。
			throw new Error("meta not loaded for " + this._map.type);
		}
	}
	return this;
}

d2js.List.prototype.toString = function(){
	return "[" + this.join(',') + "]";
}

/**
 * 接受变更
 * @returns {Boolean} 确实有变动返回 true，否则返回 false
 */
d2js.Entity.prototype._accept = function(path = []){
	if(this._state == 'phantom') return;
	// console.log(this + ' accept');
	path = path.concat([this])
	this.eachMappedAttribute(function(map, curr){
		if(map.relation == 'many' && map.inverse && map.inverse.relation == 'one'){
			curr._accept(path);

		} else if(map.relation == 'one' && map.inverse && map.inverse.relation == 'one'){
			var old =  this._origin[map.name];
			if(Object.equals(old, curr) == false || map.isOwner){
				if(old && path.indexOf(old) == -1) {
					old._accept(path);
				}
				if(curr && Object.equals(old,curr) == false && path.indexOf(curr) == -1){
					curr._accept(path);
				}
			}
		} else if(map.relation == 'one' && map.inverse && map.inverse.relation == 'many'){
			var old =  this._origin[map.name];
			if(old){
				old[map.inverse.name]._accept(path, this);
			}
			if(curr != null && Object.equals(old,curr) == false){
				curr[map.inverse.name]._accept(path, this);
			}
		}
	})
	if(this._state == 'edit' || this._state == 'new'){
		this._origin = Object.assign({}, this._values);
	}
	if(this._state == 'remove'){
		this._state = 'phantom';
	} else { 
		this._state = 'none';
	}
}

d2js.List.prototype._accept = function(path = [], element){
	// console.log(this + ' accept');
	if(path.length == 0 && this.owner) path.push(this.owner);

	if(element){
		var pos = this.indexOf(element), originPos = this.origin.indexOf(element);
		if(element._state == 'remove' || element._state == 'phantom'){
			if(pos != -1){
				this.splice(pos, 1);
			}
			if(originPos != -1){
				this.origin.splice(originPos, 1);
			}
		} else if(pos != -1 && originPos == -1){
			this.origin.push(element);
		} else if(pos == -1 && originPos != -1){
			this.origin.splice(originPos, 1);
		}
		if(path.indexOf(element) == -1){
			element._accept(path);
		}
		return;
	}

	for(var i=0; i<this.length; ){
		let child = this[i];
		if(child._state == 'remove' || child._state == 'phantom'){
			this.splice(i, 1);
		} else {
			if(this.origin.indexOf(child) == -1){
				this.origin.push(child);
			}
			i++;
		}
	}
	for(var i=0; i<this.origin.length; ){
		let child = this.origin[i];
		if(child._state == 'remove'  || child._state == 'phantom' || this.indexOf(child) == -1){
			this.origin.splice(i, 1);
		} else {
			i++;
		}
	}

	var items = this;
	if(this._map && this._map.isOwner){
		items = this.slice();
		this.origin.forEach(function(e){
			if(this.indexOf(e) == -1 && e._isAlone(this._map.inverse)){
				items.push(e);
			}
		}, this)
	}
	items.forEach(function(child){
		if(path.indexOf(child) == -1){
			child._accept(path);
		}
	}, this);
} 

/**
 * 回滚变更，退回上一版本
 * @returns {Boolean} 如果确实有回滚，返回 true，否则返回 false
 */
d2js.Entity.prototype._reject = function(path = []){
	path = path.concat([this])
	this.eachMappedAttribute(function(map, curr){
		if(map.relation == 'many' && map.inverse && map.inverse.relation == 'one'){
			curr._reject(path);

		} else if(map.relation == 'one' && map.inverse && map.inverse.relation == 'one'){
			var old =  this._origin[map.name];
			if(Object.equals(old, curr) == false || map.isOwner){
				if(old && path.indexOf(old) == -1) {
					old._reject(path);
				}
				if(curr && Object.equals(old,curr) == false && path.indexOf(curr) == -1){
					curr._reject(path);
				}
			}
		} else if(map.relation == 'one' && map.inverse && map.inverse.relation == 'many'){
			var old =  this._origin[map.name];
			if(old){
				old[map.inverse.name]._reject(path, this);
			}
			if(curr != null && Object.equals(old, curr) == false){
				curr[map.inverse.name]._reject(path, this);
			}
		}
	})
	if(this._state == 'edit' || this._state == 'remove'){
		this._values = Object.assign({}, this._origin);
	} 
	if(this._state == 'new'){
		this._state = 'phantom';
	} else {
		this._state = 'none';
	}
}

d2js.List.prototype._reject = function(path = [], element){
	if(path.length == 0 && this.owner) path.push(this.owner);

	if(element){
		var pos = this.indexOf(element), originPos = this.origin.indexOf(element);
		if(element._state == 'new' || element._state == 'phantom'){
			if(pos != -1){
				this.splice(pos, 1);
			}
			if(originPos != -1){
				this.origin.splice(originPos, 1);
			}
		} else if(pos != -1 && originPos == -1){
			this.splice(pos, 1);
		} else if(pos == -1 && originPos != -1){
			Array.prototype.push.call(this, element);
		}
		if(path.indexOf(element) == -1){
			element._reject(path);
		}
		return;
	}

	for(var i=0; i<this.length; ){
		let child = this[i];
		if(child._state == 'new' || child._state == 'phantom' || this.origin.indexOf(child) == -1){
			this.splice(i, 1);
		} else {
			i++;
		}
	}

	var items = this.origin;
	if(this._map && this._map.isOwner){
		items = this.origin.slice();
		this.forEach(function(e){
			if(this.origin.indexOf(e) == -1 && e._isAlone(this._map.inverse)){
				items.push(e);
			}
		}, this)
	}
	items.forEach(function(child){
		if(path.indexOf(child) == -1){
			child._reject(path);
		}
	}, this);
} 

d2js.Entity.prototype._isAlone = function(map){
	if(map == null || this[map.name] == null){  // TODO N-N 关系另外考虑
		return true;
	}
}

d2js.Entity.prototype._initCollectData = function(){
	if(this._lastData) return;
	//console.log('initCollectData ' + this);
	this._lastData = this._toRow();
	this._affected = [];
	this._lastState = this._state;
}

d2js.Entity.prototype._cleanCollectData = function(){
	//console.log('_cleanCollectData ' + this);
	delete this._lastData;
	delete this._lastState;
	delete this._affected;
}

d2js.Entity.prototype._isChanged = function(){
	return this._lastState != 'none' || this._affected.some(e => e._isChanged());
}

d2js.List.prototype._isChanged = function(){
	return this._affected.some(e => e._isChanged());
}

d2js.List.prototype._markChange = function(path = []){
	//console.log('markChange ' + this);
	var state = this.owner ? (this.owner._lastState || this.owner._state) : undefined;
	this._affected = [];
	this.forEach(function(entity){
		if(path.indexOf(entity) != -1) return;
		entity._initCollectData();
		if(state == 'remove'){
			pushRemovedEntity.call(this, entity);
		} else {
			this._affected.push(entity);
		}
	}, this);

	this.origin.forEach(function(entity){
		if(path.indexOf(entity) == -1 && this.indexOf(entity) == -1 && entity._isAlone(this._map.inverse)){
			entity._initCollectData();
			pushRemovedEntity.call(this, entity);
		}
	}, this);

	this._affected = this._affected.filter(function(entity){
		entity._markChange(path);
		if(entity._isChanged() == false) {	// 最终没有需要提交的
			entity._cleanCollectData();
		} else {
			return true;
		}
	});

	function pushRemovedEntity(entity){
		if(entity._state == 'new'){
			return entity._cleanCollectData()
		}
		if(this._map && this._map.isOwner){
			entity._lastState = 'remove';
		} else {
			if(this._map.inverse) entity._lastData[this._map.inverse.name] == null;	// 通常已经是 null
			if(entity._state == 'none') entity._lastState = 'edit';
		}
		this._affected.push(entity);
	}
}

d2js.Entity.prototype._markChange = function(path){
	// console.log('markChange ' + this);
	//debugger;

	this._initCollectData();
	path = path ? path.concat([this]) : [this];
	
	this.eachMappedAttribute(function(map, value){
		let relatedObject = value;
		if(relatedObject && path.indexOf(relatedObject) != -1) return;

		if(map.inverse && map.inverse.isOwner){ // belong to relatedObject, and owner not in path
			return;		// 不收集 owner 对象
		}

		var removed = false;
		if(relatedObject && relatedObject._isEntity && this._lastState == 'remove'){
			removed = true;
		} else if(relatedObject == null) {
			var prevObject = this._origin[map.name]
			if(prevObject && prevObject._isAlone(map.inverse)){
				relatedObject = prevObject;
				removed = true;
			}
		}
		if(relatedObject == null) return;

		if(removed){
			if(relatedObject._state == 'new'){
				return;
			}
			relatedObject._initCollectData();
			if(map.isOwner){
				relatedObject._lastState = 'remove';
			} else {
				if(map.inverse && map.inverse.relation == 'one'){
					relatedObject[map.inverse.name] = null;
					if(relatedObject._lastState == 'none'){
						relatedObject._lastState = 'edit';
					}
				}
			}
		} else {
			if(relatedObject._isEntity) relatedObject._initCollectData();
		}
		relatedObject._markChange(path);

		if(relatedObject._isEntity){
			if(relatedObject._isChanged() == false){
				relatedObject._cleanCollectData();
				return;
			}
		}

		this._affected.push(relatedObject);
	})
}

d2js.List.prototype._removeMarkData = function(){
	this._affected.forEach(e => e._removeMarkData());
	delete this._affected;
}

d2js.Entity.prototype._removeMarkData = function(){
	this._affected.forEach(e => e._removeMarkData());
	this._cleanCollectData();
}

d2js.List.prototype._collectChange = function(path){
	let isStart = this._affected == null;
	if(isStart) this._markChange(path);
	var table = null;
	if(this._affected.length){
		table = {
			src : contextPath + this.meta.path,
			columns : this.meta.columns,
			rows : this._affected.map(entity => entity._collectChange(path)),
			_object : this
		};
	}
	if(isStart) {
		this._removeMarkData();
	}
	return table;
}

d2js.Entity.prototype._collectChange = function(path){
	let isStart = this._lastData == null;
	if(isStart) this._markChange(path);
	var r = this._lastData;
	if(this._lastState == 'edit'){
		r._origin = this._toRow(this._origin);
	} else if(this._lastState == 'none'){
		if(this._isChanged()){
			r = {_state: 'none'};
		} else {
			r = null;
		}
	}
	if(r){
		r._state = this._lastState;
		r._object = this;
		if(this._affected.length){
			r._children = this._affected.map(function(c){
				if(c._isEntity){
					return c._collectChangeAsTable();
				} else {
					return c._collectChange();
				}
			});
			if(r._children.length == 0){
				delete r._children;
			}
		}
	}
	if(isStart) this._removeMarkData();
	return r;
}

d2js.Entity.prototype._collectChangeAsTable = function(path){
	var change = this._collectChange(path);
	if(change == null) return null;
	var table = {
		src : contextPath + this._meta.path,
		columns : this._meta.columns,
		rows : [change],
		_object : this
	};
	return table;
}

d2js.Entity.prototype._submit = 
d2js.List.prototype.submit = function(){
	if(this.isList){
		var url = contextPath + this.meta.path + "?_m=update";
		var change = this._collectChange();
	} else if(this._isEntity){
		var url = contextPath + this._meta.path + "?_m=update";
		var change = this._collectChangeAsTable();
	}
	if(change == null) return;
	var items = [], itemId = 0;
	function collectItems(change){
		if(change == null) return;
		items.push(change._object);
		items._object_id = itemId ++;
		delete change._object;
		change.rows.forEach(function(row){
			items.push(row._object);
			row._object_id = itemId ++;
			delete row._object;
			if(row._children){
				row._children.forEach(ch => collectItems(ch));
			}
		})
	}
	collectItems(change);

	let params = {params : JSON.stringify({table: change})};

	return new Promise(async function(resolve, reject){
		try{
			var response = await fetch(url, {
							method:'post', 
							headers: {  
								"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"  
							},  
							body : jQuery.param(params)
						});
			var result = await d2js.processResponse(response, items);
			resolve(result);
		} catch(e){
			resolve(e);
		} 	
	});
}

d2js.List.prototype.load = 
d2js.List.prototype.fetch = function(method = 'fetch', params, option){
	var me = this;
	
	var url = contextPath + this.meta.path;
	var q = {};
	if(this.search.params){
		Object.assign(q, this.search.params);
	} else if(params){
		Object.assign(q, params);
	} 
	if(params && params._sorts){
		this.search._sorts = q._sorts;
	} else {
		q._sorts = this.search._sorts;
	}
	q._page = {start : this.page * this.pageSize, limit : this.pageSize};

	params = {_m : method || q._m || 'fetch', params : JSON.stringify(q)};
	
	return new Promise(async function(resolve, reject){
		try{
			me._clearError();
			me.fireEvent('willload', me);
			var response = await fetch(url + '?' + jQuery.param(params));
			var table = await d2js.processResponse(response);
			d2js.tableToList(table, me);
			me.fireEvent('load', me);
			resolve(me);
		} catch(error){	//TODO 
			me.fireEvent('load', me);
			resolve(error);
		} 	
	});
}

d2js.List.prototype.navigatePage = function(pageIndex){
	this.page = pageIndex;
	this.search._page = {start : this.page * this.pageSize, limit : this.pageSize};
	this.load(this.search.params, this.search.option);
}

d2js.List.prototype.reload = function(){
	this.load(this.search.params, this.search.option);
}

d2js.tableToList = function(table, listOrMeta, mergeOrReplace = false){
	if(listOrMeta == null){throw new Error("list or meta must specified")}
	var ls = listOrMeta.isList ? listOrMeta : new d2js.List(listOrMeta);
	if(listOrMeta.isList && mergeOrReplace == false){
		ls.length = 0;
		ls.origin.length = 0;
	}
	for(let k in table){
		if(table.hasOwnProperty(k) && k != 'columns' && k != 'rows'){
			ls[k] = table[k];
		}
	}
	if(ls.total != null){
		ls.pageIndex = ls.start / ls.pageSize;
		ls.pageCount = Math.ceil(ls.total / ls.pageSize);
	}
	ls.setArray(table.rows, 'none');  // TODO 覆盖重复数据
	return ls;
}

d2js.List.prototype._clearError = function(path = []){
	this.error = null;
	this.forEach(e => path.indexOf(e) == -1 && e._clearError(path));
}

d2js.Entity.prototype._clearError = function(path){
	path = path ? [this] : path.concat([this]);
	this.error = null;
	this._error_at = null;
	this.eachMappedAttribute(function(map, object){
		if(object && (object.isList || map.isOwner) && path.indexOf(object) == -1){
			object._clearError(path);
		}
	});
};


(function(){
	[d2js.Entity.prototype, d2js.List.prototype].forEach(function(prototype){
		for(let k in prototype){if(prototype.hasOwnProperty(k)){
			let member = prototype[k];
			if(k.startsWith('_') && member instanceof Function){
				let s = k.substr(1);
				if(s in prototype == false){
					prototype[s] = member;
				}
			}
		}}
	});

})();
