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
//------------------------
// 提供一个简单易用的 ORM 框架
//------------------------
D2JS.prototype.mustBeEntity = function(){
	if(this.entityMap == null)
		throw new Error('entityMap not defined');
	
	if(this.entityMap.table == null)
		throw new Error('entityMap.table not defined');
	
}

D2JS.prototype.needValidate = function(){
	if(this.validate == null) throw new Error('validate required!')
}

/**
 * 默认的 fetch 函数,支持分页，按主键排序。使用 entityMap 提供的 table。
 */
D2JS.prototype.fetch = function(params){
	this.mustBeEntity();
	
	var sql = 'select * from ' + this.entityMap.table;
	var defaultSort = {}
	defaultSort[this.entityMap.pk || 'id'] = 'asc';
	var r = this.query(this.orderBy(sql, params._sorts, defaultSort), params, params._page);
	return r.orm(this);
}

/**
 * 按条件提取数据行，不做 orm.使用 entityMap 提供的 table。
 * @param by {object}  {col1: val, col2:val, ...} 的形式提供
 */
D2JS.prototype.fetchBy = function(by){
	this.mustBeEntity();
	
	if(by == null){
		throw new Error('condition cannot be null');
	}
	
	var cond = [];
	var sql = 'select * from ' + this.entityMap.table + ' where ';
	for(var k in by){
		if(by.hasOwnProperty(k)){
			sql += k + ' = ?';
			cond.push(by[k]);
			break;
		}
	}
	if(cond.length == 0){
		throw new Error('condition cannot be empty');
	} 
	return this.query(sql, cond);
}

/**
 * 根据entity的主键值提取实体。使用 entityMap 提供的 table。
 * @param params {object} 提供 {pk : value} 这样的结构
 */
D2JS.prototype.fetchEntityById = function(params){
	this.mustBeEntity();
	
	var pk = this.entityMap.pk;
	
	if(params == null || params[pk] == null){
		throw new Error(pk + ' cannot be null');
	}
	
	var cond = {};
	cond[this.entityMap.pk] = params[pk];
	
	return this.fetchBy(cond).orm(this, params.filter);
}

/**
 * 默认的创建新实体方法。使用 entityMap 提供的 table。
 */
D2JS.prototype.create = function(rcd){
	this.mustBeEntity();
	this.needValidate();
	
	var columns = this.entityMap.columns.slice();
	this.validate(rcd, 'create', columns);
	
	return this.insertRow(this.entityMap.table, rcd, columns, this.entityMap.pk)
}

/**
 * 默认的修改实体方法。使用 entityMap 提供的 table。
 */
D2JS.prototype.modify = function(rcd){
	this.mustBeEntity();
	this.needValidate();
	
	var columns = this.entityMap.columns.slice();
	this.validate(rcd, 'modify', columns);
	
	return this.updateRow(this.entityMap.table, rcd, columns, this.entityMap.pk)
}

/**
 * 默认的移除实体方法。使用 entityMap 提供的 table。
 */
D2JS.prototype.destroy = function(rcd, columns){
	this.mustBeEntity();
	this.needValidate();
	
	this.validate(rcd, 'delete');
	
	return this.deleteRow(this.entityMap.table, rcd, this.entityMap.pk)
}

D2JS.prototype.getD2jsMeta = function(params){
	if(params && params.d2jses){
		var d2jses = params.d2jses;
		var result = {};
		d2jses.forEach(function(src){
			var d2js = this.findD2js(src);
			if(params.refreshSchema){
				d2js.reinitColumns();
			}
			result[src] = d2js.entityMap;
		}, this);
		return result;
	} else {
		return this.entityMap;
	}
}

application['d2js_entityMap'] = new java.util.concurrent.ConcurrentHashMap();

D2JS.prototype.reinitColumns = function(){
	var cond = {};
	cond[this.entityMap.pk] = null;
	this.entityMap.columns = this.fetchBy(cond).columns;
}

D2JS.prototype.initD2js = function(){
	if(! this.entityMap) return;
	
	if(this.entityMap.pk == null) this.entityMap.pk = 'id';
	this.reinitColumns();
	
	var types = application['d2js_entityMap'];
	types.put(this.entityMap.type, this.entityMap);
	
	this.entityMap.path = this.path;
	this.exports.getD2jsMeta = this.getD2jsMeta;
	
	this.exports.fetchEntityById = this.fetchEntityById;
}

D2JS.prototype.releaseD2js = function(reason){
	if(! this.entityMap) return;
	
	var types = application['d2js_entityMap'];
	types.remove(this.entityMap.type);
}

/**
 * 实现ORM映射，可对外键、子表数据关联提取。
 * filter 为 {includes : ['Book'], excludes: ['Publisher']}
 * usage:
 * ```js
 * 	this.query(sql, [args]).orm(this)
 * ```
 * @param d2js {D2JS} d2js 对象，通常传 this
 * @param [filter] {Object} 形如 {includes : ['Book'], excludes: ['Publisher']}，指定在 orm 过程中，相应的 d2js 是否需要执行
 */
D2JS.DataTable.prototype.orm = function(d2js, filter, path){
	var et = d2js.entityMap;
	if(et == null) return this;
	if(path == null) path = [];
	
	var r = {};
	for(var k in this){
		if(k == 'columns' && path.length > 0){
			// 对于具有搜索深度的 meta，其 columns 来自 fetchBy，由 getD2jsMeta 获取，不必每次结果都附带
			// 只有第一层 columns 必须输出
		} else {
			r[k] = this[k];
		}
	}
	var rows = r.rows;
	var colIndex = this.columns.indexBy('name');
	var mapper = createMapper(et);
	// logger.info(JSON.stringify(mapper, null, '\t'));
	for(var alias in mapper){if(mapper.hasOwnProperty(alias)){
		var m = mapper[alias];
		var result = m.apply(rows, path);
		if(result != null){
			switch(m.map.relation){
			case 'table' :
				col.type = 'TABLE';
				break;
			case 'value' :
				col.type = result.columns[0].type; 
				break;
			}
		}
	}}
	
	return r;
	
	function createMapper(et){
		var mapper = {};
		for(var alias in et.map){
			if(et.map.hasOwnProperty(alias)){
				var map = et.map[alias];
				
				if(filter){
					if(filter.includes && filter.includes.indexOf(map.type) == -1){
							continue;
					}
					if(filter.excludes && filter.excludes.indexOf(map.type) != -1){
						continue;
					}
				}
				
				if(path != null && path.some(function(exist){		// 防止递归引用
					return exist.type == et.name && exist.key == map.fk && exist.fk == map.key 
				}))  
					continue;
				
				var another = d2js.findD2js(map.path || map.d2js);
				var key = map.key || et.pk || 'id';
				var fk = map.fk;

				var m = mapper[alias] = {d2js: another, key: key, fk: fk, map: map, alias: alias};
				
				m.apply = function(rows, path){
					var found = {};
					var output = null;
					rows.forEach(function(row){
						var result = null;
						var value = row[this.key];
						if(found[value]){
							result = found[value];
						} else {
							var cond = {};
							cond[this.fk] = value;
							// logger.info('fetch ' + JSON.stringify(cond) + ' for ' + JSON.stringify(this.map) + ' with d2js ' + this.d2js.srcFile);
							result = this.d2js.fetchBy(cond);
							if(result.isDataTable){
								result = result.orm(this.d2js, filter, path.concat(this.map));
								if(output == null) output = result;
							}
							found[value] = result;
						}
						if(result.isDataTable){
							switch(map.relation){
							case 'one': row[this.alias] = result.rows[0]; break;
							case 'value' : row[this.alias] = result.rows[0] && result.rows[0][result.columns[0].name]; break;
							case 'page' : row[this.alias] = result;
							default: row[this.alias] = result.rows;
							}
						} else {
							row[this.alias] = result;
						}
					}, this);
					
					return output;
				}
				
			}
		}
		return mapper;
	}
}
