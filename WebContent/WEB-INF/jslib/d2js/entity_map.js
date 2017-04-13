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

D2JS.prototype.acquireMeta = function(params){
	var types = params.types;
	
}

D2JS.prototype.initD2js = function(){
	if(! this.entity_map) return;
	
	if(this.entity_map.pk == null) this.entity_map.pk = 'id';
	var cond = {};
	cond[this.entity_map.pk] = null;
	this.entity_map.columns = this.fetchBy(cond).columns;
	
	var types = application['d2js_enity_map'];
	types.put(this.entity_map.type, this.entity_map);
}

D2JS.prototype.releaseD2js = function(){
	if(! this.entity_map) return;
	
	var types = application['d2js_enity_map'];
	types.remove(this.entity_map.type);
}