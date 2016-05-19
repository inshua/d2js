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
// ================= mongodb 覆盖这些函数  ========================
function $INT(o){ return {_d2js_type: 'INT', value: Math.floor(o)};}
function $LONG(o){ return {_d2js_type: 'LONG', value: Math.floor(o)};}
function $DOUBLE(o){ return {_d2js_type: 'DOUBLE', value: o * 1};}
function $FLOAT(o){ return {_d2js_type: 'FLOAT', value: o * 1};}
function $DECIMAL(o){ return {_d2js_type: 'DECIMAL', value: o * 1};}
function $BINARY(o){ return {_d2js_type: 'BINARY', value: o};}
function $DATE(o){ return {_d2js_type: 'DATE', value: o};}
function $TIME(o){ return {_d2js_type: 'TIME', value: o};}
function $STRING(o){ return {_d2js_type: 'STRING', value: o + ''};}
function $BOOLEAN(o){ return {_d2js_type: 'BOOLEAN', value: o ? true : false};}
function $OUTCURSOR(o){return {_d2js_type: 'OUTCURSOR', value: o};}
function $ARRAY(type, o){ return o;}
function $JSONB(o){ return o }
function $JSON(o){ return o }

function $OBJECTID(s){return {_d2js_type:'OBJECTID', value: s}; }

function $REGEX(s){return {_d2js_type:'REGEX', value: s};}


function j2m(obj){
	return executor.jsObjectToDocument(obj);
}

function m2j(bsonDocument){
	return executor.documentToJsObject(bsonDocument);
}

function m2arr(iterable){
	iterable = iterable.iterator();
	var arr = [];
	while(iterable.hasNext()){
		arr.push(m2j(iterable.next()));
	}
	return arr;
}

// 将 js 对象转为 bson
Object.defineProperty(Object.prototype, 'asBson', {value: function(){
	return j2m(this);
}, enumerable: false})

function D2JS(executor){ this.executor = executor}

D2JS.prototype = new Object();

D2JS.DataTable = function(){}

D2JS.DataTable.prototype = new Object();

D2JS.prototype.insertRow = function(table, row, columns, pkColumn){
	pkColumn = pkColumn || '_id';
	
	return this.executor.insertRow(table, this.filterColumns(row, columns));
};


D2JS.prototype.query = function(table, params, paramsOp){
	var args = this.translateParams(params, paramsOp);
	args = j2m(args);
	
	var coll = this.executor.getCollection(table);
	var count = coll.count(args);
	var it = coll.find(args);
	
	var sorts = params._sorts;
	if(sorts){
		var msorts = {};
		for(var k in sorts){
			msorts[k] = (sorts[k] == 'asc' ? 1 : -1);
		}
		it.sort(j2m(msorts));
	}
	
	var page = params._page
	if(page){
		it.skip(page.start).limit(page.limit);
	}
	
	return {total: count, start: (page ? page.start : 0), rows: m2arr(it), setSchema: setSchema};
}

function setSchema(columns){
	this.columns = columns;
	//TODO filter columns
	delete this.setSchema;
	return this;
}

/**
 * this.translateParams({name: 'son'}, {name : '$regex'}) 得到 {name : {$regex : new RegExp(son)}};
 */
D2JS.prototype.translateParams = function(params, paramsOp){
	if(params){
		var args = {}
		for(var k in paramsOp){
			if(paramsOp.hasOwnProperty(k)){
				if(params[k] != null){
					var arg = {};
					arg[paramsOp[k]] = params[k];
					args[k] = arg;
				}
			}
		}
		return args;
	}	
}

D2JS.prototype.updateRow = function(table, row, columns){
	return this.executor.updateRow(table, {_id : row._id}, {$set: this.filterColumns(row, columns), $currentDate:{lastModified: true}});
}

D2JS.prototype.deleteRow = function(table, row){
	var r = executor.getCollection(table).findOneAndDelete(j2m({_id: row._id}));
	return m2j(r);
}

D2JS.prototype.doTransaction = function(fun){
	return fun.call(this);
}

D2JS.prototype.eval = function(fun, arguments){
	return executor.eval(fun, arguments || []);
}

D2JS.prototype.filterColumns = function(row, columns){
	if(columns){
		var result = {};
		columns.forEach(function(c){
			var cname = c.name || c;
			if(row[cname] != null){
				result[cname] = row[cname];
			}
		})
		return result;
	} else {
		return row;
	}
}

D2JS.prototype.mergeRow = function(table, row, uniqueFields, columns, pkColumns){
};


D2JS.prototype.clone = function(){
	var obj = new D2JS(this.executor);
	for(var k in this){
		if(this.hasOwnProperty(k)) obj[k] = this[k];
	}
	return obj;
};

// ================ entrance ===========================
var d2js = null;
var handler = null;

var executor = null;

function init(){
	
	var mongoClient = application.mongoClient || (application.mongoClient = (function(){
		var options = new com.mongodb.MongoClientOptions.Builder();
		for(var k in datasourceConfig){
			if(options[k]) options[k](datasourceConfig[k]);
		}
		options = options.build();
		mongoClient = new com.mongodb.MongoClient(datasourceConfig.url, options);
		return mongoClient;
	}()));
	
	executor = new org.siphon.jsmongo.MongoExecutor(mongoClient, datasourceConfig.database, engine);
	
	d2js = handler = new D2JS(executor);
	engine.put('handler', handler);
	engine.put('d2js', d2js);
	
}


