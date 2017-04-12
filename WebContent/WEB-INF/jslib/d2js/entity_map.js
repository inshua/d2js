D2JS.prototype.mustBeEntity = function(){
	if(this.entity_map == null)
		throw new Error('entity_map not defined');
	
	if(this.entity_map.table == null)
		throw new Error('entity_map.table not defined');
	
}

D2JS.prototype.fetch = function(params){
	this.mustBeEntity();
	
	var sql = 'select * from ' + table;
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


