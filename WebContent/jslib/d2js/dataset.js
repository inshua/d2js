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

/**
 * d2js 前端
 * @namespace
 */
function d2js(){}

/**
 * d2js 数据集
 * 数据集是 DataTable, relation 的容器，也支持嵌套子数据集，此外，它也是 d2js.render, d2js.collect 的默认目标。
 * @type d2js.Dataset
 */
d2js.Dataset = function(){
	/**
	 * 数据关系定义为
	 * ```js
	 * {parent : 'masterTable', parentColumn : 'id',  child : 'detailTable', childColumn : 'parent_id'}
	 * ```
	 * 这里有意用表名字符串，不用 DataTable 对象，也不使用 
	 * ```js
	 * {masterTable : [from : 'id', detailTable : '', with : 'parent_id']}
	 * ```
	 * 后面这种表达不适合找父表
	 * @memberof d2js.Dataset
	 */
	this.relations = [];

	this.dicts = {};
	
	/**
	 * 增加一个关系
	 * @param parent {string} 主表表名
	 * @param parantColumn {string} 主表列名，通常为主键字段
	 * @param child {string} 从表表名
	 * @param childColumn {string} 从表列名，通常为外键字段
	 */
	this.addRelation = function(parent, parentColumn, child, childColumn){
		 this.relations.push({parent : parent, parentColumn : parentColumn,  child : child, childColumn : childColumn});
		 return this;
	}
	
	/**
	 * 创建子数据集，用以切分命名空间
	 * 用法：
	 * ```js
	 * 		var dataset = d2js.dataset.create('namespace');
	 * 		var table = new DataTable('abcd', 'abcd.d2js', {dataset:dataset});
	 * 		var table2 = dataset.addTable('ddd', 'ddd.d2js');
	 * ```
	 */
	this.create = function(name){
		var ds = new d2js.Dataset();
		ds.name = name;
		this[name] = ds;
		return ds;
	}
	
	/**
	 * 创建数据表。new DataTable 的快捷方式。
	 */
	this.addTable = function(name, url, option){
		option = option || {};
		option.dataset = this;
		return new d2js.DataTable(name, url, option);
	}
	
	/**
	 * 获取table。提供这个函数是因为引入subset概念后，以往很多 d2js.dataset[tableName] 的代码无法工作，这里提供一个门面，处理收到的 subset,tablename 形式的数据路径。
	 */
	this.getTable = function(path){
		if(path.indexOf(',')!=-1){
			var arr = path.split(',');
			return d2js.dataset[arr[0].trim()][arr[1].trim()];
		} else {
			return d2js.dataset[path];
		}
	}
	
	/**
	 * 释放子集
	 */
	this.release = function(name){
		delete this[name];
	}
}

/**
 * 查看数据，可用来观察所有表的数据
 * 该函数需要打开一个新窗口，请允许浏览器对本站弹出窗口。
 */
d2js.Dataset.prototype.inspect = function(output){
	var a = output || [];
	for(var tname in this){
		var t = this[tname];
		if(t instanceof d2js.DataTable){							
			a.push(t.inspect(true))
		} else if (t instanceof d2js.Dataset){
			a.push('<h1>' + tname +'(subset)</h1>');
			t.inspect(a);
		}
	}
	
	if(output) return;
	
	var w = window.open("about:blank");
	if(w != null){
		w.document.write(a.join(""));
	} else{
		document.write(a.join(""));
	}	
}

/**
 * 主键字段，默认为 id，使用mongodb应调为 _id
 */
d2js.PK = 'id';
/**
 * dataset全局对象。
 * dataset 是 DataTable, relation 及词典的容器。
 * @object d2js.dataset
 */
d2js.dataset = new d2js.Dataset();

/**
 * 别名，对于renderer,collector来说是全局数据对象的根对象（可类比 DOM 树的 document）
 * @alias d2js.dataset
 */
d2js.root = d2js.dataset;

/**
 * 所有词典数据
 * 用法如：
 * ```js
 * 	Dicts.gender = {M : 'Male', F : 'Female'}
 * ```
 * @memberof d2js.dataset
 * @alias Dicts
 */
var Dicts = d2js.dataset.dicts;

/**
 *数据表。与关系型数据库的表、视图、查询结果同构的一个内存镜像。主要包含 DataColumn, DataRow 集合。
 * @class d2js.DataTable
 * @mixes EventDispatcher
 * @param name {string} 表名
 * @param url {string} 数据提供者的网址，通常为 *.d2js
 * @param option {object} 参数
 *```js
 * {
 * 		silent : true|false 是否静默（不引发render）, 默认为为 true,
 * 		pageSize : 分页尺寸，默认为 d2js.DataTable.DEFAULT_PAGESIZE,
 * 		standalone : true|false 如果启用，则不加入到 dataset 中，默认为 false,
 * 		dataset : 默认为 d2js.dataset，也可指定为局部的 dataset(使用 d2js.dataset.create() 创建)
 * 		indexedColumns : [], 索引字段，默认为 ['id'] 可以加入自己的字段,
 * 		rowType : 数据行类型，默认为 d2js.DataRow，必须从 d2js.DataRow 派生，不然无法提交,
 * 		listeners : {
 * 			onload : function(error){},
 * 			onsubmit : function(error){},
 * 			onrowchange : function(error, row, event){},		// error == null, event maybe new, edit, remove, reject, accept
 * 			onany : function(error, row, event){},
 * 			onnewrow : function(row){},							// 新建行，此时可以做一些加工,主要是设置默认值
 * 			onstatechange : function(error, state){},
 * 			onschemachange : function(){}
 * 		}
 * }
 *```
 */
d2js.DataTable = function (name, url, option){
	option = option || {};
	
	this.isSilent = option.silent != null ? option.silent : true;
	this.name = name;
	this.isDataTable = true;
	
	/**
	 * 设置 d2js 的 URL
	 * @param url {string} 设置数据提供者的网址，通常为 .d2js
	 */
	this.setUrl = function(url){
		var link = document.createElement('a');
		link.href = url;
		this.url = this.src = link.pathname; 
		return this;
	}
	this.setUrl(url);
	
	if(!option.standalone){
		this.dataset = option.dataset || d2js.dataset;
		this.dataset[name] = this;
	}

	/**
	 * 状态，有 none, submiting, loading, error
	 * @type {string}
	 */	
	this.state = 'none';
	/**
	 * 各列。DataColumn 数组，可读，维护可使用 addColumn, fill, initSchema 等函数。
	 * @type DataColumn[] 
	 */
	this.columns = [];
	
	/**
	 * 表级错误
	 * @type {string|Error}
	 */
	this.error = null;
	
	/**
	 * 各行。DataRow 数组，可读，可修改，尽量通过 addRow 等维护。
	 * @type DataRow[]
	 */
	this.rows = [];	
	
	/**
	 * 数据行类型，默认为 d2js.DataRow，必须从 d2js.DataRow 派生，不然无法提交。
	 * 自定义方法如：
	 * ```js
	 * function MyRow(){
	 * 		d2js.DataRow.apply(this, arguments);
	 * }
	 * MyRow.prototype = Object.create(d2js.DataRow.prototype);
	 * MyRow.prototype.myFunc = function(){...}
	 * ```
	 * @type {function} 构造函数
	 */
	this.rowType = option.rowType || d2js.DataRow;
	
	/**
	 * 查询参数。目前实际用到的直接成员有用于分页的 _page : {start:N, limit:N}, 用于排序的  _sorts : {column : 'asc'|'desc'}, 用于查询的 params : {参数}。
	 * @type {object}
	 */
	this.search = {params : {}};
	
	/**
	 * 当前页
	 * @type {int}
	 */
	this.page = 0;
	/**
	 * 每页数据条数
	 * @type {int}
	 */
	this.pageSize = option.pageSize || d2js.DataTable.DEFAULT_PAGESIZE;
	/**
	 * 总页数，由服务器返回
	 * @type {int}
	 */
	this.pageCount = null;
	/**
	 * 总条数，由服务器返回
	 * @type {int}
	 */
	this.total = 0;
	
	EventDispatcher.call(this);
	this.regEvent(['willload', 'load', 'willsubmit', 'submit', 'rowchange', 'newrow', 'statechange', 'schemachange']);
	var listeners = option && option.listeners;
	if(listeners){
		for(var k in listeners){ if(listeners.hasOwnProperty(k)){
			this.on(k.substr(2), listeners[k]);
		}}
	}
	
	if(!this.isSilent){
		this.on('*', function(){ 
			d2js.render(null, this);
		});
	}
	
	/**
	 * 索引化字段列表,可人工设置的数组，如 `table.indexedColumns = ['id']`; 之后调用 `table.rebuildIndexes()` 重建索引，以后使用 `table.find('id', 2)` 就会使用索引
	 * 用于索引的字段，值必须唯一，默认为 ['id']
	 * @type {string[]}
	 */
	this.indexedColumns = option.indexedColumns || [d2js.PK];
}

/**
 * 默认每页数据条数
 * @type {int}
 */
d2js.DataTable.DEFAULT_PAGESIZE = 10;

/**
 * 为JSON解析时提供日期解析。
 * usage: 
 * ```js
 * JSON.parse(string, parseDate)
 * ```
 * @param key 
 * @param value
 * @returns {Date}
 */
function parseDate(key, value) {
    if (typeof value === 'string') {
        var a = parseDate.reg.exec(value);
        if (a) {
            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[5] || 0, a[6] || 0, +a[7] || 0));
        }
    }
    return value;
}
parseDate.reg = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z?)?$/;


/**
 * 设置状态
 * @param newState
 * @private
 */
d2js.DataTable.prototype.setState = function(newState){
	if(this.state != newState){
		this.state = newState;
		this.fireEvent('statechange', newState);
	}
}

/**
 * 按JSON创建新行，不加入 rows，如需要加入 rows 可调用 table.addRow(rowData)
 * 如不提供 rowData，则仅按列规格创建一个对象
 * @param [rowData] {array} {col:val, col:val, ...}
 * @return {DataRow} 新建的行 
 */
d2js.DataTable.prototype.newRow = function(rowData){
	var row = new this.rowType(this, rowData);
	row._state = "new";
	this.fireEvent('newrow', row);
	return row;		
}

/**
 * 按JSON 创建新行，并加入 rows，或将创建好的新行加入 rows
 * @param rowData {DataRow|object} 新行
 * @param [raiseEvent=false]{bool} 是否触发事件，如为 true 触发 rowchange 事件，默认为 false
 * @return {DataRow} 
 */
d2js.DataTable.prototype.addRow = function(rowData, raiseEvent){
	if(rowData instanceof d2js.DataRow){
		var row = rowData;
	} else {
		var row = new this.rowType(this, rowData);
	}
	row._state = "new";
	this.rows.push(row);
	if(raiseEvent) this.fireEvent('rowchange', row, 'new');
	return row;
}

/**
 * 接受修改。rows 中所有行都接受修改。行状态为 new,edit 的变为 none，行状态为 remove 的删除。
 */
d2js.DataTable.prototype.accept = function(){
	var me = this;
	this.rows.forEach(function(row){
		if(row._accept()){
			me.fireEvent('rowchange', row, 'accept')
		}
	});
}

/**
 * 撤销修改。rows 中所有行都恢复上一版本。行状态为 remove 的变为 none，行状态为 edit 的恢复之前的版本，状态变为 none，行状态为 new 的删除。
 */
d2js.DataTable.prototype.reject = function(){
	var me = this;
	this.rows.slice().forEach(function(row){
		if(row._reject()){
			me.fireEvent('rowchange', row, 'reject')
		}
	});
}


/**
 * 初始化数据列
 * @param columns {array} 由 [{name : '', type : ''}] 或 ['name', 'name', ] 构成的数组
 * @param [raiseEvent=false] {bool}
 */
d2js.DataTable.prototype.initSchema = function(columns, raiseEvent){
	this.columns = [];
	this.columnNames = [];
	for(var i=0; i<columns.length; i++){
		var col = columns[i];
		if(typeof col == 'string'){
			this.columns.push(new d2js.DataColumn(col));
			this.columnNames.push(col);
		} else {
			this.columns.push(new d2js.DataColumn(col.name, col.type));
			this.columnNames.push(col.name);
		}
	}
	if(raiseEvent) this.fireEvent('schemachange');
}

/**
 * 增加一列
 * @param colName {string} 列名
 * @param [colType] {string} 列的数据类型
 */
d2js.DataTable.prototype.addColumn = function(colName, colType){
	this.columns.push(new d2js.DataColumn(colName, colType));
	this.columnNames.push(colName);
}

/**
 * 从 url 加载数据。加载成功后，本地的 columns, rows 将重建，并从服务器获得页码信息。
 * @param [method='fetch'] {string} d2js 方法，放在 params 中作为 params._m 也可 
 * @param [params] {object} 查询参数，如 *{[_m : method], param1 : value1, param2 : value2, ...}*
 * @param option {object|function} 可提供 **function(exception){}** 或 **{ callback : function(ex){}, timeout : 30000, async : true, method : 'GET'}**
 */
d2js.DataTable.prototype.load = function(method, params, option){
	if(method instanceof Object){
		option = params;
		params = method;
		method = params._m;
	}
	
	if(params instanceof Function){
		option = params;
		params = null;
	}
	if(option == null) option = {};
	if(option instanceof Function){
		option = {callback : option};
	}

	var q = {};
	if(params){
		for(var k in params){
			q[k] = params[k];
		}
	} else if(this.search.params){
		for(var k in this.search.params){
			q[k] = this.search.params[k];
		}
	}
	if(params && params._sorts){
		this.search._sorts = q._sorts;
	} else {
		q._sorts = this.search._sorts;
	}
	q._page = {start : this.page * this.pageSize, limit : this.pageSize};
	
	method = method || q._m || 'fetch';
	
	this.clearError();
	this.setState('loading');
	this.rows = [];
	this.fireEvent('willload');
	var me = this;
	for(var k in this.search.params){	// params 被绑定了，不能设为新对象
		delete this.search.params[k];
	}
	for(var k in q){		
		this.search.params[k] = q[k];
	}
	this.search.params._m = method;
	this.search.option = option;
	
	$.ajax({
		url : this.url,
		data : {_m : method, params : JSON.stringify(q)}, 
		type : option.method || 'get',
		timeout : option.timeout || 30000,
		async : option.async != null ? option.async : true,
		dataType : 'text',
		success : onSuccess,
		error : function (error){onError(new Error(error.responseText || 'cannot establish connection to server'));}
	});
	return this;
	
	function onSuccess(text, status){
		var isJson = false;
		try{
			var result = JSON.parse(text, parseDate);
			isJson = true;
		} catch(e){}
		
		me.rows = [];
		if(isJson){
			if(!result.error){
				fillTable(result, me);
				if(option && option.callback){
					option.callback.call(me);
				}
				me.setState('none');
				me.fireEvent('load');
			} else {
				onError(new Error(result.error));
			}
		} else {
			onError(new Error(text));
		}
	}
	
	function onError(error){
		me.error = error;
		me.setState('error');
		me.error = error;
		me.fireEvent('load', error);
		if(option && option.callback){
			option.callback.call(me, error);
		}
	}
	
	function fillTable(result, table){
		if(result.total != null){
			table.total = result.total;
			table.pageIndex = result.start / table.pageSize;
			table.pageCount = Math.ceil(result.total / table.pageSize);
		}
		
		if(result.columns) {
			table.initSchema(result.columns);
		
			var rows = result.rows;
			for(var i=0; i<rows.length; i++){
				var row = new table.rowType(table, rows[i]);
				table.rows.push(row);
			}
		} else {
			table.fill(result.rows, {raiseEvent : false, reinit: true});
		}
		if(table.indexedColumns) table.rebuildIndexes();
		if(result.nested){
			for(var tname in result.nested){if(result.nested.hasOwnProperty(tname)){
				var data = result.nested[tname];
				var childTable = me.dataset[tname];
				if(childTable == null){
					throw new Error('table ' + tname + ' not defined, but received in nested tables');
				}
				childTable.rows = [];
				fillTable(data, childTable);
				table.rows.forEach(function(row){
					row[tname] = table.findChildRows(row, tname);
				});
			}}
		}		
	}
}

/**
 * 一次性填入多行。
 * 当需要构建原型页面时可使用该函数插入样本数据。可以达到模拟 load 的效果。
 * @param rows {array} 形如 [{fld1: v1, fld2, v2, ...}, ... ]
 * @param option {object} 
 * ```js
 * {raiseEvent : true | false, 是否引发 load 事件，修改 load 状态，默认为 true; 
 * 	callback : function(ex){}; 
 * 	append : false|true，是否为追加模式，默认为false，将清空原来的所有数据, 
 * 	reinit : true|false 是否重建 schema，当为false时，如有字段列表保留原字段列表，默认为 false
 * }
 * ```
 */
d2js.DataTable.prototype.fill = function(rows, option){
	if(option == null) option = {};
	if(option instanceof Function){
		option = {callback : option};
	}
	var raiseEvent = (option.raiseEvent != null ? option.raiseEvent : true);
	var append = (option.append != null ? option.append : false);
	var reinit = (option.reinit != null ? option.reinit : false);

	this.clearError();
	if(raiseEvent) this.setState('loading');
	var me = this;
	
	if(this.columns.length == 0 || reinit) {
		var r = {};
		for(var i=0; i<rows.length; i++){
			var row = rows[i];
			for(var k in row){
				if(!r[k]) r[k] = 1;
			}
		}
		var columns = [];
		for(var k in r){if(r.hasOwnProperty(k)){
			columns.push(new d2js.DataColumn(k));
		}}
		
		me.initSchema(columns);
	}
	
	me.rows = [];
	for(var i=0; i<rows.length; i++){
		var row = new me.rowType(me, rows[i]);
		me.rows.push(row);
	}
	if(me.indexedColumns) me.rebuildIndexes();
	
	if(option && option.callback){
		option.callback.call(me);
	}
	if(raiseEvent) me.setState('none');
	if(raiseEvent) me.fireEvent('load');
}

/**
 * 使用上次的查询参数，读取指定页
 * @param pageIndex {int} 页码
 */
d2js.DataTable.prototype.navigatePage = function(pageIndex){
	this.page = pageIndex;
	this.search._page = JSON.stringify({start : this.page * this.pageSize, limit : this.pageSize});
	this.load(this.search.params, this.search.option);
}

/**
 * 使用上次的查询参数，重新读取数据
 */
d2js.DataTable.prototype.reload = function(){
	this.load(this.search.params, this.search.option);
}

/**
 * 覆盖本方法实现提交 multipart 表单
 * 例如:
 * ```js
 * table.ajaxSubmit = function(options){
        var formData = new FormData();
        formData.append('file', $('#file')[0].files[0]);
        for(var k in options.data){ if(options.data.hasOwnProperty(k)){
        	formData.append(k, options.data[k]);	
        }}
        options.data = formData;
        
        options.enctype = 'multipart/form-data';
        options.contentType = false;
        options.processData = false;
        options.timeout  = 5 * 60000;
        
        $.ajax(options);
    }
    ```
 * @param options {object} 要提交的 jQuery ajax options。
 */
d2js.DataTable.prototype.ajaxSubmit = function(options){
	$.ajax(options);
}

/**
 * 提交所有变动
 * @param option {object|function} 同 `load` 函数
 */
d2js.DataTable.prototype.submit = function(option){
	// 收集变化
	function collectAll(table, parentRow, relation){
		var v = null;
		if(parentRow) v = parentRow[relation.parentColumn];
		var relations = table.getChildTables();
		
		var result = {name : table.name, src : table.src, columns : table.columns};
		result.rows = table.rows.filter(function(row){
				if(parentRow) 
					return row[relation.childColumn] == v;
				else 
					return true;
			}).map(function(row){
				var jo = row._toJson();
				jo._state = row._state;
				jo._idx = table.rows.indexOf(row);
				if(row._origin) jo._origin = row._origin;
				jo._children = [];
				return jo;
			});
		
		if(result.rows.length){
			for(var tname in relations){ if(relations.hasOwnProperty(tname)){
				result.rows.forEach(function (row){
					relations[tname].forEach(function(relation){
						row._children.push(collectAll(me.dataset[tname], row, relation));
					});
				});
			}}
		}
		result.rows.slice().forEach(function(row){
			if(row._children.length == 0) {
				delete row._children;		
			}
		});
		return result;
	}
	
	function filterChanged(table){
		table.rows = table.rows.filter(function(row){
			return isDirty(row);
		});
		table.rows.forEach(function(row){
			if(row._children){
				row._children.slice().forEach(function(t){
					filterChanged(t);
					if(t.rows.length == 0){
						row._children.splice(row._children.indexOf(t));
					}
				});
				if(row._children.length == 0){
					delete row._children;
				}
			}
		});
		return table;
	}
	
	function isDirty(row){
		if(row._state != 'none') return true;
		if(row._children && row._children.length){
			return row._children.some(function(tb){return tb.rows.some(function(crow){return isDirty(crow)})});
		}
	}
		
	var me = this;
	var changes = filterChanged(collectAll(this));
	
	if(changes.rows.length == 0){
		var error = new Error('no data changed found')
		error.level = 'warning';
		onError(error)
		return;
	}
	
	// 开始提交
	if(!option) option = {};
	if(option instanceof Function){
		option = {callback : option};
	}
	
	this.clearError();
	this.fireEvent('willsubmit');
	this.setState('submiting');
	var params = {_m : 'update', table : changes};
	this.ajaxSubmit({
		url : this.url,
		data : {_m : 'update', params : JSON.stringify(params)},
		type : 'post',
		timeout : option.timeout || 30000,
		async : option.async != null ? option.async : true,
		dataType : 'text',
		success : onSuccess,
		error : function (error){onError(new Error(error.responseText));}
	});
	
	function onSuccess(text, status){
		var isJson = false;
		try{
			var result = JSON.parse(text, parseDate);
			isJson = true;
		} catch(e){}
		if(isJson){
			if(!result.error){
				me.accept();
				
				if(option && option.callback){
					option.callback.call(me);
				}
				me.setState('none');
				me.fireEvent('submit');
			} else {
				if(typeof result.error == 'string'){
					onError(new Error(result.error));
				} else {
					var err = new Error(result.error.message);
					for(var k in result.error){
						err[k] = result.error[k];
					}
					onError(err);
				}
			}
		} else {
			onError(new Error(text));
		}
	}
	
	function onError(error){
		var table = me;
		if(error.table){
			table = me.dataset[error.table];
		}
		table.error = error;
		if(error.table && error.idx != null){
			var row = table.rows[error.idx];
			table.error = null;
			if(error.field){	// 列错误
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
				row._error_at = err;
				row._error = null;
			} else {
				row._error = error;
				row._error_at = null;
			}
		}
		
		table.setState('error');
		table.fireEvent('submit', error);
		
		if(option && option.callback){
			option.callback.call(table, error);
		}
	}
	
}

/**
 * 清除错误
 * @private
 */
d2js.DataTable.prototype.clearError = function(){
	this.error = null;
	for(var i=0; i< this.rows.length; i++){
		this.rows[i]._error = null;
		this.rows[i]._error_at = null;
	}
	this.setState('none');
}

/**
 * 查找行。
 * 会尽量使用索引。
 *```js
 * table.find('name', 'mary')
 * or
 * table.find(function(row){return row.name == 'mary'})
 *``` 
 * 仅查找一条，如果需要查找多条，可使用 rows.filter()
 * @param cname {string|function} 字段名，或判验函数。**function(row){return true|false}**
 * @param pattern {object} 需要查找的值
 * @return {DataRow|null} 命中的结果，未找到返回 null 
 */
d2js.DataTable.prototype.find = function(cname, pattern){
	if(typeof cname == 'function'){
		return this.rows[this.rows.find(cname)];
	} else {
		if(this.indexes && this.indexes[cname]) return this.indexes[cname][pattern];
		
		for(var i=0; i<this.rows.length; i++){
			if(this.rows[i][cname] == pattern) return this.rows[i];
		}
	}
}

/**
 * 重建索引。
 */
d2js.DataTable.prototype.rebuildIndexes = function(){
	if(this.indexedColumns){
		this.indexes = {};
		for(var i=0; i< this.indexedColumns.length; i++){
			this.indexes[this.indexedColumns[i]] = {};
		}
		
		for(var i=0; i< this.rows.length; i++){
			var row = this.rows[i];
			for(var j=0; j< this.indexedColumns.length; j++){
				var cname = this.indexedColumns[j];
				var v = row[cname];
				if(v != null && v !== ''){
					if(this.indexes[cname][v]) throw new Error('unable to create index since same value '  + v + ' existed');
					this.indexes[cname][v] = row;
				}
			}
		}
	}
}

/**
 * 增加子表，同 d2js.dataset.addRelation
 * @param column {string} 本表字段名，通常为主键
 * @param child {string} 子表表名
 * @param childColumn {string} 子表关联字段名，外键字段
 */
d2js.DataTable.prototype.addChild = function(column, child, childColumn){
	if(this.dataset == null) throw new Error('this table dont belong to any dataset');
	this.dataset.addRelation(this.name, column, child, childColumn);
}

/**
 * 提取所有直接下属表。关系在 dataset 中定义。
 * @return {object} 结构为 {table name : [relations]}
 */
d2js.DataTable.prototype.getChildTables = function(){
	if(this.dataset == null) return {};
	return this.dataset.relations.filter(function(relation){
				return relation.parent == this.name;
			}, this).reduce(function(res, relation){
				var arr = res[relation.child];
				if(!arr) arr = res[relation.child] = [];
				arr.push(relation);
				return res;
			}, {});
}

/**
 * 提取所有直接上级表。关系在 dataset 中定义。
 * @return {object} 结构为 {table name : [relations]}
 */
d2js.DataTable.prototype.getParentTables = function(){
	if(this.dataset == null) return {};
	return this.dataset.relations.filter(function(relation){
		return relation.child == this.name;
	}, this).reduce(function(res, relation){
		var arr = res[relation.parent];
		if(!arr) arr = res[relation.parent] = [];
		arr.push(relation);
	}, {});
}

/**
 * 提取所有下属数据行。大部分情况可使用 `row._children('detail table')`。
 * @param row {DataRow} 本表的行
 * @param childTable {string} 子表表名
 * @return {DataRow[]} 所有下属行
 */
d2js.DataTable.prototype.findChildRows = function(row, childTable){
	var rows = [];
	if(this.dataset == null) return rows;
	for(var i=0; i<this.dataset.relations.length; i++){
		var relation = this.dataset.relations[i];
		if(relation.parent == this.name && relation.child == childTable){
			var ct = this.dataset[childTable];
			var v = row[relation.parentColumn];
			rows = rows.concat(ct.rows.filter(function(crow){return crow[relation.childColumn] == v}));
		}
	}
	return rows;
}

/**
 * 提取所有上级行。大部分情况可使用 `row._parents('master table')` 或 `row._parent('master table')`。
 * @param row {DataRow} 本表的行
 * @param parentTable {string} 主表表名
 * @return {DataRow[]} 所有父表行，通常只有一行
 */
d2js.DataTable.prototype.findParentRows = function(row, parentTable){
	var rows = [];
	if(this.dataset == null) return rows;
	for(var i=0; i<this.dataset.relations.length; i++){
		var relation = this.dataset.relations[i];
		if(relation.child == this.name && relation.parent == parentTable){
			var pt = this.dataset[parentTable];
			var v = row[relation.childColumn];
			rows = rows.concat(ct.rows.filter(function(prow){return prow[relation.parentColumn] == v}));
		}
	}
	return rows;
}

/**
 * 观察本表数据。
 * 该函数需要打开一个新窗口，请允许浏览器对本站弹出窗口。
 */
d2js.DataTable.prototype.inspect = function(returnHtml){
	var t = this; 
	var a = [];
	a.push("<table border=1>");
	a.push("<caption>" + t.name + "</caption>");				
	a.push("<tr>");
	a.push(t.columns.map(function(col){return "<td>" + col.name + "(" + col.dataType + ")" + "</td>";}).join(''))
	a.push("<td>row._state</td>");
	a.push("<td>row._error</td>");
	a.push("</tr>");

	for(var rid =0; rid< t.rows.length; rid++){
		var r = t.rows[rid];
		a.push("<tr>");
		a.push(t.columns.map(function(col){return "<td>" + JSON.stringify(r[col.name]) + "</td>";}).join(''))
		a.push("<td>" + r._state + "</td>");
		a.push("<td>" + (r._error? r._error.name : '') + "</td>");
		a.push("</tr>");
	}
	a.push("</table>");
	if(returnHtml) return a.join('');
	
	var w = window.open("about:blank");
	if(w != null){
		w.document.write(a.join(""));
	} else{
		document.write(a.join(""));
	}
}

/**
 * 没有删除的行，常置于渲染路径
 * @returns {DataRow[]} 没有删除的行数组
 */
d2js.DataTable.prototype.unremovedRows = function(){
	return this.rows.filter(function(row){return row._state != 'remove'});
}

/**
 * 事件分发器
 * @mixin
 * @class
 */
function EventDispatcher(){
	this.listeners = {};
	this.knownEvents = [];
	/**
	 * 登记事件
	 * @param eventName {string} 事件名
	 */
	this.regEvent = function(eventName){
		if(Array.isArray(eventName)){
			for(var i=0; i<eventName.length; i++){
				this.regEvent(eventName[i]);
			}
			return;
		}
		this.listeners[eventName] = [];
		this.knownEvents.push(eventName);
	}

	/**
	 * 登记事件处理程序。
	 * @param eventName {string} 事件名
	 * @param listener {function} **function(args){}** 已绑定到 this，参数列表由 fireEvent 提供。
	 */
	this.on = function(eventName, listener){
		if(eventName == 'any' || eventName == '*'){
			eventName = this.knownEvents;
		}
		if(Array.isArray(eventName)){
			for(var i=0; i<eventName.length; i++){
				this.on(eventName[i], listener);
			}
			return;
		}
		this.listeners[eventName].push(listener);
		return this;
	}
	
	/**
	 * 引发事件，如
	 * ```js
	 * this.fire('click', 100, 200)
	 * //对应
	 * this.on('click', function(x, y){console.log(x, y)});
	 * //输出 100, 200
	 * ```
	 * @param eventName {string} 事件名
	 * @param args {...object} 要提供的参数
	 */
	this.fireEvent = this.fire = this.trigger = function(eventName){
		var ls = this.listeners[eventName];
		var args = [];
		for(var i=1; i<arguments.length; i++){
			args.push(arguments[i]);
		}
		for(var i=0; i<ls.length; i++){
			ls[i].apply(this, args);
		}
	}
}


///**
// * 一次性读入多个表，需要服务器支持该接口, TODO
// * @param loadTableOptions [{table : table, params : params, option : option}, ...]
// */
//dataset.loadBatch = function(loadTableOptions){
//	
//}

/**
 * 数据列
 * @class d2js.DataColumn
 * @param columnName {string} 列名
 * @param [dataType='STRING'] {string} 字段类型，与服务器字段类型匹配
 */
d2js.DataColumn = function(columnName, dataType){
	/**
	 * 字段名
	 * @type {string}
	 */
	this.name = columnName;
	/**
	 * 数据类型
	 * @type {string}
	 */
	this.type = dataType || 'STRING';	
	/**
	 * 校验器，未使用
	 * @type {array}
	 */
	this.validators = [];
}

/**
 * 数据行。
 * @class d2js.DataRow
 */
d2js.DataRow = function(table, rowData){
	/**
	 * 行状态, new edit remove none
	 * @type {string}
	 */
	this._state = 'none';
	
	/**
	 * 所属表
	 * @type {DataTable}
	 */
	this._table = table;
	
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
	
	function processValue(v){
		if(v == null || v == '') return null;
		return v;
	}
	
	/**
	 * 设置字段的值，如果当前行状态为 none，则新的行状态为 edit
	 * @param column {string} 字段名
	 * @param value {object} 值
	 */
	this._set = function(column, value){
		var v = processValue(value);
		if(this[column] != v){			
			if(this._state == 'none') {
				this._state = 'edit';
				if(this._origin == null){
					this._origin = this._toJson();
				}
			}
			this[column] = value;
		}
		return this;
	}

	/**
	 * 批次设置值，与 _set 相似，只是批次调用
	 * @param rowData {object} {col1:val, col2:val, col3:val}
	 */
	this._setValues = function(rowData){
		for(var k in rowData){
			if(this._table.columns.some(function(col){return col.name == k})){
				this._set(k, rowData[k]);
			}
		}
		return this;
	}
	
	/**
	 * 转换为JSON数据对象
	 */
	this._toJson = function(){
		var obj = {};
		for(var i=0; i<table.columnNames.length; i++){
			var cname = table.columnNames[i];
			obj[cname] = this[cname]; 
		}
		return obj;
	}
	
	/**
	 * 行状态是否为脏状态，所谓脏状态是指 edit, remove, new 三种状态
	 * @returns {Boolean}
	 */
	this._isDirty = function(){
		return this._state != 'none';
	}
	
	/**
	 * 返回所有没有删除的行(行状态不为 remove)
	 * @returns {DataRow[]}
	 */
	this.getRows = function(){
		return this.rows.filter(function(row){return row._state != 'remove'});
	}
	
	/**
	 * 接受变更
	 * @returns {Boolean} 确实有变动返回 true，否则返回 false
	 */
	this._accept = function(){
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
	this._reject = function(){
		switch(this._state){
		case 'edit' :
			table.columnNames.forEach(function(cname){
				this[cname] = this._origin[cname];
			}, this);
			this._state = 'none';
			this._origin = null;
			return true;
			break;
		case 'new' :
			table.rows.splice(table.rows.indexOf(this), 1);
			return true;
			break;
		} 
	}
	
	/**
	 * 获取子表的行（定义在 d2js.dataset.relations)
	 * 用法如：
	 *```js
	 * 	 order.rows[0]._children('order_detail').forEach(...)
	 *```
	 * @param childTable {string} 子表表名
	 * @returns {DataRow[]}
	 */
	this._children = function(childTable){
		return table.findChildRows(this, childTable);
	}
	
	/**
	 * 获取父表的所有父行（定义在 d2js.dataset.relations)
	 * 用法如：
	 * ```js
	 * 	 orderDetail.rows[0]._parents('order')[0]
	 * ```
	 * @param parentTable {string} 父表表名
	 * @returns {DataRow[]}
	 */
	this._parents = function(parentTable){
		return table.findParentRows(this, parentTable);
	}
	
	/**
	 * 获取父行（定义在 d2js.dataset.relations)
	 * 用法如：
	 * ```js
	 * 	 orderDetail.rows[0]._parent('order')
	 * ```
	 * @param parentTable {string} 父表表名
	 * @returns {DataRow}
	 */
	this._parent = function(parentTable){
		return table.findParentRows(this, parentTable)[0];
	}
	
	/**
	 * 将本数据行状态设为 remove
	 */
	this._remove = function(){
		this._state = 'remove';
	}
	
	// 初始化
	for(var i=0; i<table.columnNames.length; i++){
		var cname = table.columnNames[i];
		this[cname] = rowData && rowData[cname]; 	// JSON传来的数据已经去除了 '', undefined 之类似 null, 故不调用 processValue
	}
}
