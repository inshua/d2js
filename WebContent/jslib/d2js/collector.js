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
 * 所有收集器
 * @namespace 
 */
d2js.Collectors = function(){}

d2js.KNOWN_COLLECTORS = {};


/**
 * 发起渲染函数。收集总入口。设置好数据路径(html attribute `data`)和渲染器(html attribute `renderer`)后，调用该函数，从所有相关元素收集录入信息到根数据。
 * 也可使用封装了该函数的 jQuery 函数:
 * ```js
 * $(htmlElement).collect(pattern, customCollectors)
 * ```
 * @param [htmlElement=document.body] {HTMLElement} html 元素，收集该元素及其子元素。
 * @param [pattern] {object|object[]} 命中的数据，可提供数组。提供该参数后，只有展开数据中包含有 pattern 的对象时才发生收集。
 * @param [customCollectors] {object} 自定义收集器（含管道）。如
 * ```js
 * {
 * 	myCollector : function(el, value){return el.innerHTML}
 * }
 * ```
 * 对 htmlElement 及其子元素有指定 collector="myCollector"，该函数会被应用。需要说明的是，在下次收集时不再需要提供 myCollector 函数。
 */
d2js.collect = function(htmlElement, pattern, customCollectors){
	
	d2js.travel(htmlElement, pattern, collectElement)
	
	function collectElement(e, crumb){
		if(e.hasAttribute('no-collect')) return 'stop';
		
		var collector = e.getAttribute('collector');
		if(collector){
			if(e.hasAttribute('trace-collect')) debugger;
			
			
			var arr = [e].concat(crumb);
			var collectors = collector.split('|');
			for(var i=0; i<collectors.length; i++){
				var fun = extractCollector(collectors[i].trim(), e);
				if(fun != null) {
					arr[1] = fun.apply(null, arr);
				} else {
					console.error(collectors[i] + ' not found, when collect', e);
				}
			}
			$(e).trigger('d2js.collected', arr, collector);
		}
	}
	
	function extractCollector(desc, e){
		if($.hasData(e)){
			var d = $.data(e)['d2js.collectors'];
			var fun = d && d[desc];
			if(fun) return fun;
		}
		if(customCollectors){
			var fun = customCollectors[desc];
			d2js._store(e, 'd2js.collectors', desc, fun);
			if(fun) return fun;
		}
		return d2js.extractCachedFunction(desc, d2js.Collectors, 'd2js.Collectors.', d2js.KNOWN_COLLECTORS);
	}
	
};

+(function ( $ ) {
    $.fn.collect = function(pattern, customCollectors) {
    	this.each(function(){
    		d2js.collect(this, pattern, customCollectors);
    	});
    	return this;
    };
}( jQuery ));

/**
 * 常用 html 元素收集器管道函数。收集 html element 的 value 属性或 innerHTML 属性。
 * 通常收集器写为 c|s 前者由控件获取内容，后者设置到对象，中间可插入其它管道，如 c|n|s
 */
d2js.Collectors.c = d2js.KNOWN_COLLECTORS['c'] = function(element, value, columnName, row, index, rows, _1, table){
	var newValue = null;
	if('value' in element){
		newValue = element.value;
	} else if('innerHTML' in element){
		newValue = element.innerHTML;
	} else {
		throw new Error('unsupported element type' + element.nodeName);
	}
	return newValue;
}

/**
 * 复选框勾中状态收集器。单独使用时，勾中为 true, 未勾中为 false
 */
d2js.Collectors.check = d2js.KNOWN_COLLECTORS['check'] = function(element, value, columnName, row, index, rows, _1, table){
	return element.checked;
}


/**
 * 设置对象属性收集器。
 * s 是 set 或 std 的首字母。
 * 该函数设置新值到数据对象。用法 collector="c|s"。遇到普通对象，则使用 obj[attr] = value, 遇到 d2js.DataRow，则调用 row._set('attr', value)。
 * @param newValue {object} 从前面的管道函数获得
 */
d2js.Collectors.s = d2js.KNOWN_COLLECTORS['s'] = function(element, newValue, attr, obj, index, rows, _1, table){
	if(newValue === '') newValue = null;
	if(obj != null){	// dont test attr in obj
		if(obj.set){
			obj.set(attr, newValue);
		} else if(obj._set){
			obj._set(attr, newValue);
		} else {
			obj[attr] = newValue;
		}
	}
}

/**
 * 数字转换管道。将值转为数字类型。用法 collector="c|n|s"
 * @returns {number} 数字
 */
d2js.Collectors.n = d2js.KNOWN_COLLECTORS['n'] = function(element, newValue, columnName, row, index, rows, _1, table){
	if(newValue instanceof String) newValue = newValue.trim();
	if(isNaN(newValue)){
		return null;
	} else {
		return newValue * 1;
	}
}

/**
 * 日期转换管道。将值转为 Date 类型。用法 collector="c|d|s"
 * @param element
 * @param newValue
 * @returns {Date}
 */
d2js.Collectors.d = d2js.KNOWN_COLLECTORS['d'] = function(element, newValue, columnName, row, index, rows, _1, table){
	if(newValue instanceof String) newValue = newValue.trim();
	if(!newValue){
		return null;
	} else if(newValue instanceof Date){
		return newValue;
	} else {
		return Date.parse(newValue, element.getAttribute('format'));
	}
}


/**
 * molecule收集器管道。
 * 对支持 getValue 的 molecule 收集。 
 * 用法: colector="m|s"
 */
d2js.Collectors.m = d2js.KNOWN_COLLECTORS['m'] = function(element, value, columnName, row, index, rows, _1, table){
	var m = Molecule.of(element);
	if(m == null || !m.getValue){
		return;
	} else {
		return m.getValue();
	}
}

/**
 * 从元素属性收集数据的收集器。
 * 用法
 * <input type="date" collector="prop('valueAsDate')|s">
 */
d2js.Collectors.prop = function(attr){
	return function(element, value, columnName, row, index, rows, _1, table){
		return $.prop(element, attr);
	}
}


/**
 * Object Column 值设置器
 * 当 DataRow['field'] 为对象时，如果 element 绑定的是对象的属性，应当使用该收集器。
 * 例如
 * ```html
 * <input data="contact,email">
 * ```
 * 该表的 contact 字段为一JSON字段，表现在前端为一个对象，其中 email 是一个属性，此时应使用如下收集方式 
 * ```html
 * <input data="contact,email" collector="c|oc">
 * ```
 * 如使用
 * ```html
 * <input data="contact,email" collector="c|s">
 * ```
 * 则编辑时虽然值变化了，行状态却不会变化，将导致数据不提交。
 * 
 * @param element
 * @param newValue
 */
d2js.Collectors.oc = d2js.KNOWN_COLLECTORS['oc'] = function(element, newValue){
	var row = null;
	for(var i = arguments.length-1; i>1; i--){
		var colname = arguments[i-1];
		if(arguments[i] instanceof d2js.DataRow){
			row = arguments[i];
			for(i-=2; i>1; i-=2){
				if(arguments[i] == null){
					var attr = arguments[i+1];
					arguments[i] = arguments[i+2][attr] = {};
				}
			}
			break;
		}
	}
	
	if(!row) return;
	
	if(row._state == 'none'){
		if(row._origin == null){
			row._origin = JSON.parse(JSON.stringify(row._toJson()));
		}
	}
	
	d2js.Collectors.s.apply(this, arguments);
	
	if(row._state == 'none'){
		if(JSON.stringify(row._toJson()) != JSON.stringify(row._origin)){
			row._state = 'edit';
		}
	}	
}



