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
 * 管道函数。格式化时间。
 * 扩充了 html attribute `format`。
 * usage: 
 * ```html
 * <input format="yyy-MM-dd" renderer="date|std">
 * ```
 */
d2js.Renderers.date = function(element, value,  columnName, row, index, rows, _1, table){
	if(value == null) return '';
	return value.format(element.getAttribute('format') || 'yyyy-MM-dd hh:mm:ss');
}

/**
 * 管道函数。翻译词典值。
 * usage :
 * ```html 
 * 		<input data="xxx" renderer="dict({N:'正常', S:'停用'})|std">
 * ```
 * 或
 * ```html
 * 		<script>Dicts.gender = {M : 'Male', F : 'Female'};</script>
 * 		<input dict="gender" data="xxx" renderer="dict|std">
 * ```
 * 词典也可以使用数组
 * ```html
 * 		<input data="xxx" renderer="dict(['正常','停用'])|std">
 * ```
 * 或
 * ```html
 * 		<script>Dicts.gender = ['正常','停用'];</script>
 * 		<input dict="gender" data="xxx" renderer="dict|std">
 * ```
 */
d2js.Renderers.dict = function(element, value,  columnName, row, index, rows, _1, table){
	if(element && element.tagName){	// if it's html element
		if(value == null) return null;
		var lov = element.getAttribute('dict');
		if(!lov) return 'no dict attribute';
		var dict = Dicts[lov];
		if(dict instanceof Array){
			dict = dict.reduce(function(acc, item){acc[item] = item; return acc}, {});
		}
		if(dict == null) return lov + ' not exist';
		if(value instanceof Array){
			return value.map(function(v){return dict[v] || v}) 
		} else {
			return dict[value] || value;
		}
	} else {
		var dict = element;
		if(dict instanceof Array){
			dict = dict.reduce(function(acc, item){acc[item] = item; return acc}, {});
		}
		return function(element, value,  columnName, row, index, rows, _1, table){
			if(value == null) return '';
			return dict[value] || '';
		}
	}
}

/**
 * 管道函数。将词典翻译为列表。
 * usage : 
 * ```html
 *  <div data="#anything" renderer="dictToList({N:'正常', S:'停用'})|options('name','id')">
 * 		<select data="#bindTable,rows,N,status" render="std"></select>
 *  </div>
 * ```
 *  或
 * ```html
 *   <script>Dicts.status = {N:'正常', S:'停用'}</script>   
 *   <div data="#anything" dict="status" renderer="dictToList|options('name','id')">
 * 		<select data="#bindTable,rows,N,status" render="std"></select>
 *   </div>
 * ```
 * anything 可以随意提供一个可绑定数据,并不用于实际渲染，例如 #dicts
 *  
 * 词典也可以是一个数组，用法同 dict 管道
 */
d2js.Renderers.dictToList = function(element, value,  columnName, row, index, rows, _1, table){
	if(element && element.tagName){	// if it's html element
		if(value == null) return null;
		var lov = element.getAttribute('dict');
		if(!lov) return [];
		var dict = Dicts[lov];
		if(dict == null) return [];
		if(dict instanceof Array){
			dict = dict.reduce(function(acc, item){acc[item] = item; return acc}, {});
		}
		
		var arr = [];
		for(var k in dict){if(dict.hasOwnProperty(k)){
			arr.push({name : dict[k], id : k});
		}}
		return arr;
	} else {
		var dict = element;
		return function(element){
			if(dict == null) return [];
			if(dict instanceof Array){
				dict = dict.reduce(function(acc, item){acc[item] = item; return acc}, {});
			}
			var arr = [];
			for(var k in dict){if(dict.hasOwnProperty(k)){
				arr.push({name : dict[k], id : k});
			}}
			return arr;
		}
	}
}

/**
 * 管道函数。转为大写。
 * 测试用的，没有什么实际用途。
 */
d2js.Renderers.uppercase = function(element, value,  columnName, row, index, rows, _1, table){
	if(typeof value == 'string'){
		return value.toUpperCase();
	} else if(value == null){
		return '';
	} else {
		return (value + '').toUpperCase();
	}
}


/**
 * 将词典收集为词典值
 * 
 * 用法：
 * ```html
 * <tag dict="gender" data="xxx" collector="c|dict({M : 'Male', F : 'Female'})|s">
 * ```
 * 或
 * ```html
 * <script>Dicts.gender = {M : 'Male', F : 'Female'};</script>
 * <tag dict="gender" data="xxx" collector="c|dict|s">
 * ```
 */
d2js.Collectors.dict = d2js.KNOWN_COLLECTORS['dict'] = function(element, value,  columnName, row, index, rows, _1, table){
	var lov = element.getAttribute('lov');
	if(!lov) return 'no dict attribute';
	var dict = Dicts[lov];
	if(dict == null) return lov + ' not exist';
	if(value instanceof Array){
		var arr = [];
		for(var k in dict){if(dict.hasOwnProperty(k)){
			if(dict[k] == value) arr.push(k);
		}}
		return arr;
	} else {
		for(var k in dict){if(dict.hasOwnProperty(k)){
			if(dict[k] == value) return k;
		}}
		return value;
	}
}

/**
 * 将词典表映射为含义
 * 
 * 用法：
 * 设有表 gender, 字段为 id, desc, 有数据
 * 
 * |id    |   desc	|
 * |------|---------|
 * |M     |   Male	|
 * |F     |   Female|
 * ```html
 * <tag data="xxx" renderer="lov('gender', 'id', 'desc)">
 * ```
 * 如数据不会轻易变动，或不依赖索引，直接提供数组也可以
 * ```
 * <tag data="xxx" renderer="lov(gender.rows, 'id', 'desc)">
 * ```
 */
d2js.Renderers.lov = function(table, idColumn, nameColumn){
	return function(element, value){
		if(table instanceof Array){
			var rows = table;
			if(value instanceof Array){
				return value.map(f)
			} else {
				return f(value);
			}					
		} else {
			if(value instanceof Array){
				return value.map(f2)
			} else {
				return f2(value);
			}			
		}
		
		function f(value){
			var row = rows.filter(function(row){row[idColumn] == value})[0];
			return row && row[nameColumn];
		}
		
		function f2(value){
			var row = d2js.dataset[table].find(idColumn, value);
			return row && row[nameColumn];
		}
	}
}




