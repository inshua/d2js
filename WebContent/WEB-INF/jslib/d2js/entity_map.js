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
	if(this.entity_map == null)
		throw new Error('entity_map not defined');
	
	if(this.entity_map.table == null)
		throw new Error('entity_map.table not defined');
	
}

D2JS.prototype.fetch = function(params){
	this.mustBeEntity();
	
	var sql = 'select * from ' + this.entity_map.table;
	var defaultSort = {}
	defaultSort[this.entity_map.pk || 'id'] = 'asc';
	var r = this.query(this.orderBy(sql, params._sorts, defaultSort), params, params._page);
	return r.orm(this);
}

D2JS.prototype.fetchBy = function(by){
	this.mustBeEntity();
	
	if(by == null){
		throw new Error('condition cannot be null');
	}
	
	var cond = [];
	var sql = 'select * from ' + this.entity_map.table + ' where ';
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

D2JS.prototype.create = function(rcd, columns){
	this.mustBeEntity();
	
	this.validate && this.validate(rcd);
	
	return this.insertRow(this.entity_map.table, rcd, columns, this.entity_map.pk)
}

D2JS.prototype.modify = function(rcd, columns){
	this.mustBeEntity();
	
	this.validate && this.validate(rcd);
	
	return this.updateRow(this.entity_map.table, rcd, columns, this.entity_map.pk)
}

D2JS.prototype.destroy = function(rcd, columns){
	this.mustBeEntity();
	
	this.validate && this.validate(rcd);
	
	return this.deleteRow(this.entity_map.table, rcd, this.entity_map.pk)
}

D2JS.prototype.getD2jsMeta = function(params){
	if(params && params.d2jses){
		var d2jses = params.d2jses;
		var result = {};
		d2jses.forEach(function(src){
			var d2js = this.findD2js(src);
			result[src] = d2js.entity_map;
		}, this);
		return result;
	} else {
		return this.entity_map;
	}
}

application['d2js_entity_map'] = new java.util.concurrent.ConcurrentHashMap();

D2JS.prototype.initD2js = function(){
	if(! this.entity_map) return;
	
	if(this.entity_map.pk == null) this.entity_map.pk = 'id';
	var cond = {};
	cond[this.entity_map.pk] = null;
	this.entity_map.columns = this.fetchBy(cond).columns;
	
	var types = application['d2js_entity_map'];
	types.put(this.entity_map.type, this.entity_map);
	
	this.exports.acquireMeta = this.acquireMeta;
}

D2JS.prototype.releaseD2js = function(reason){
	if(! this.entity_map) return;
	
	var types = application['d2js_entity_map'];
	types.remove(this.entity_map.type);
}

/**
 * 实现ORM映射，可对外键、子表数据关联提取。
 * filter 为 {include : ['books', 'contact'], exclude: ['fav']}
 * 如需要套用到关联层次，可使用： {include : ['books', {include: ['publisher'], exclude: ['translator']}] }, 也即使用紧跟在 'alias' 后的 filter 对象, exclude 自然不支持这种跟随对象
 * include 中可使用 'all' 表示应含所有对象
 */
D2JS.DataTable.prototype.orm = function(d2js, filter, path){
	var et = d2js.entity_map;
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
	var mapper = createMapper(filter, et);
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
	
	function createMapper(filter, et){
		var mapper = {};
		for(var alias in et.map){
			if(et.map.hasOwnProperty(alias)){
				var deepFilter = null;
				if(filter){
					if(filter.include){
						var idx = filter.include.indexOf(alias);
						if(idx != -1) {
							deepFilter = filter.include[idx + 1];
							if(typeof deepFilter == 'string') deepFilter = null;
						} else {
							if(filter.include.indexOf('all') == -1) continue;
						}
					} else if(filter.exclude){
						var idx = filter.exclude.indexOf(alias);
						if(idx != -1) {
							continue;
						}
					}
				}
				
				var map = et.map[alias];
				if(path != null && path.some(function(exist){		// 防止递归引用
					return exist.type == et.name && exist.key == map.fk && exist.fk == map.key 
				}))  
					continue;
				
				var another = d2js.findD2js(map.d2js);
				var key = map.key || et.pk || 'id';
				var fk = map.fk;

				var m = mapper[alias] = {d2js: another, key: key, fk: fk, deepFilter: deepFilter, map: map, alias: alias};
				
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
							logger.info('fetch ' + JSON.stringify(cond) + ' for ' + JSON.stringify(this.map) + ' with d2js ' + this.d2js.srcFile);
							result = this.d2js.fetchBy(cond);
							if(result.isDataTable){
								result = result.orm(this.d2js, this.deepFilter, path.concat(this.map));
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
