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
 * 标准渲染器。支持常用元素 html, input, select 的渲染。
 * @param element
 * @param value
 * @return value
 */
d2js.Renderers.std = d2js.KNOWN_RENDERERS.std = function(e, v, columnName, row, index, rows, _1, table){
	
	if(e.tagName == "INPUT"){
		if(e.type == 'radio'){
			radioRender(e,v);
		} else if(e.type == 'checkbox'){
			checkboxRender(e,v);
		}else {
			inputRender(e,v);
		}
	} else if(e.tagName == "SELECT"){
		inputRender(e,v);
	} else if(e.tagName=='TEXTAREA'){
		inputRender(e,v);
	} else if(e.tagName == 'IMG'){
		if(v) e.src = v;
	} else{
		tagRender(e,v);
	}
	return v;
	
	function inputRender(e, v){
		if(v == null)
			e.value = "";
		else		
			e.value = v;
	}

	function radioRender(e, v){
		if(v == null)
			e.checked = false;
		else
			e.checked = (e.value == v);	
	}

	function checkboxRender(e, v){
		if(v == null)
			e.checked = false;
		else
			e.checked = v;	
	}

	function tagRender(e, v){
		if(v == null){
			e.innerHTML = "&nbsp;";
		} else {		
			e.innerHTML = v;		
		}	
	}
}

/**
 * 将元素的某项属性设为value。
 * 用法
 * <input type="date" renderer="prop('valueAsDate')">
 */
d2js.Renderers.prop = function(attr){
	return function(element, value, columnName, row, index, rows, _1, table){
		$.prop(element, attr, value);
		return value;
	}
}

/**
 * 将元素的某项data设为value。
 * 用法
 * <input type="date" renderer="data('value')">
 */
d2js.Renderers.data = function(name){
	return function(element, value, columnName, row, index, rows, _1, table){
		$.data(element, name, value);
		return value;
	}
}

/**
 * 将元素的某项data设为value。
 * 用法
 * <input type="date" renderer="attr('value')">
 */
d2js.Renderers.attr = function(name){
	return function(element, value, columnName, row, index, rows, _1, table){
		$.attr(element, name, value);
		return value;
	}
}

/**
 * 提取对象的属性
 */
d2js.Renderers.member = function(member){
	return function(element, value){
		if(typeof value == 'object'){
			var m = value[member];
			if(m instanceof Function){
				return m.call(value, Array.prototype.slice.call(arguments, 1));
			} else {
				return m;
			}
		}
	}
}


/**
 * 表达式渲染器。适用于正文或属性中含有 {{... }} 表达式的渲染器
 * 用法：
 *```html
  	<div data="rows,0" renderer="expr">
  		<h1>{{title.toUpperCase()}}<small>{{author}}</small></h1>
  		<p>{{content}}</p>
  	</div>
 ```
 */
d2js.Renderers.expr = d2js.KNOWN_RENDERERS['expr'] = function(e, data){
	// if(data instanceof d2js.DataTable) debugger;
	
	var dump = e['expr_dump']
	if(dump == null){
		e['expr_dump'] = dump = e.cloneNode(true);
	}
	e.innerHTML = '';

	for(var i=0; i<dump.childNodes.length; i++){
		e.appendChild(process(dump.childNodes[i].cloneNode(true)));
	}
	
	function process(node){
		var newExpr = ('getAttribute' in node && node.getAttribute('renderer') == 'expr')	// 另一个表达式
		switch(node.nodeType){
		case Node.TEXT_NODE:
			if(node.nodeValue.indexOf('{{') != -1){
				node.nodeValue = processExpr(node.nodeValue);
			}
			break;
		case Node.ELEMENT_NODE:
			if(!newExpr){
				for(var a=0; a<node.attributes.length; a++){
					var attr = node.attributes[a];
					if(attr.value.indexOf('{{') != -1){
						attr.value = processExpr(attr.value);
					}
				}
			}
			break;
		}
		if(!newExpr && node.childNodes){
			for(var i=0; i<node.childNodes.length; i++){
				process(node.childNodes[i]);
			}
		}
		return node;
	}
	
	function processExpr(expr){
		var s = expr;
		var res = '';
		var start = 0;
		var withExpr = withStmt(data, 'this');
		// eval(withExpr);		// 为防止与现有变量重名，只能每次都 eval 一次
		for(var offset = s.indexOf('{{', start); offset != -1; offset = s.indexOf('{{', start)){
			res += s.substring(start, offset);
			
			var end = s.indexOf('}}', offset + 2);
			if(end != -1){
				var expr = s.substring(offset + 2, end);
				try{
					res += (function(s){eval(withExpr); return eval(s)}).call(data, expr);
				}catch(e){
					res += e.message;
					console.error('eval error, expr : ', expr, e, data);
					console.log(data);
				}
				start = end + 2;
			} else {
				s += s.substring(offset);
				break;
			}
		}
		if(start < s.length -1) res += s.substr(start);
		return res;
	}
	
}


/**
 *下拉列表框下拉项目渲染器。
 *用法：
 *```html
  	<div data="listTable,rows" renderer="options('name','id',true)">
  		<select data="bindTable,rows,N,type"></select>
   </div>
 ```
 */
d2js.Renderers.options = function(dispCol, valueCol, allowEmpty){
	var noBracket = false;
	if(dispCol && dispCol instanceof HTMLElement){
		noBracket = true;
		dispCol = 'name';
		valueCol = 'id';
		allowEmpty  = false;
	} else {
		if(arguments.length == 1) {
			allowEmpty = dispCol;
			dispCol = null;
		}
		dispCol = dispCol || 'name';
		valueCol = valueCol || 'id';
	}
	
	var fun = function(element, rows, table){
		var sel = $(element).find('select')[0];		// SELECT
		
		while(sel.options.length) sel.options.remove(0);
		
		if(allowEmpty){
			var option = document.createElement('option');
			option.text = "-";
			option.value = "";
			sel.options.add(option);
		}
		if(!rows) return;
		for(var i=0; i<rows.length; i++){
			var option = document.createElement('option');
			var row = rows[i]
			var dispCell = row[dispCol];
			var valueCell = row[valueCol];
			if(dispCell) option.text = dispCell;
			if(valueCell) option.value = valueCell;
			sel.options.add(option);
		}
	}
	
	if(noBracket) 
		fun.apply(this, arguments);
	else 
		return fun;
}

/**
 * 表格渲染器。
 * 用法：
 *```html
 * <table data="table or table,rows" renderer="table">
 * 		<thead>
 * 			<tr>
 * 				<td data-t="name" renderer="std"></td>  <!-- 注意应写作  data-t，是固定用法 -->
 * 				<td data-t="remarks" renderer="input('text')"></td>
 * 			</tr>
 * 		</thead>
 * </table>
 *```
 * data 也可直接使用 rows 数组
 * 渲染表格也可以使用 repeater 渲染器。
 */
d2js.Renderers.table = d2js.KNOWN_RENDERERS['table'] = function(hTable, table){
	var columnRenders = [];
	var headRow = hTable.tHead.rows[0];
	for(var i=0; i<headRow.cells.length; i++){
		var cell = headRow.cells[i];
		var attrs = {};
		for(var j=0; j<cell.attributes.length; j++){
			var attr = cell.attributes[j].name;
			var v = $(cell).attr(attr);
			switch(attr){
			case 'data-t' : attrs['data'] = v; break;
			default : attrs[attr] = v;
			} 
		}
		columnRenders.push(attrs);
	}

	var tBodyEmpty = hTable.querySelector('tbody.empty');
	var tBody = hTable.querySelector('tbody.data');
	if(tBody == null){
		var tBody = hTable.createTBody();
		tBody.className = 'data';
	} else {
		while(tBody.rows.length){
			tBody.rows[0].remove();
		}
	}
	
	var rows = null;
	if(table){
		if(table.rows){
			rows = table.rows;
		} else if('length' in table){
			rows = table;
		} else {
			throw new Error('must be table or array');
		}
	} else {
		rows = [];
	}
	
	if(rows.length == 0){
		if(tBodyEmpty) tBodyEmpty.style.display = '';
	} else {
		if(tBodyEmpty) tBodyEmpty.style.display = 'none';
		for(var i=0; i<rows.length; i++){
			var tr = tBody.insertRow();
			$(tr).bindRoot(rows[i], hTable)
			columnRenders.forEach(function(column){
				var cell = document.createElement('td');
				for(var attr in column){if(column.hasOwnProperty(attr)){
					if(attr == 'molecule-obj'){	
						
					} else {
						$(cell).attr(attr, column[attr]);
					}
				}}
				tr.appendChild(cell);
			});
		}
	}
}

/**
 *显示为一个输入控件
 *如：
 *```html
 * 	<div data="..." renderer="input('text')" renderer-t="std" collector-t="c|s">
 *```
 */
d2js.Renderers.input = function(inputType){
	return function(element,  value, columnName, row, index, rows, _1, table){
		element.innerHTML = '';
		var ele = document.createElement('input');
		ele.type = inputType;
		ele.setAttribute('data', ',this');
		var renderer = element.getAttribute('renderer-t');
		if(renderer){
			ele.setAttribute('renderer', renderer);
		}
		var collector = element.getAttribute('collector-t');
		if(collector){
			ele.setAttribute('collector', collector);
		}
		element.appendChild(ele);
	}
}

// 由于 strict 模式不能使用 with 语句，现在每次都eval一遍定义变量
function withStmt(obj, varName){
	var s = '';
	for(var k in obj){if(obj.hasOwnProperty(k)){
		var v = obj[k];
		if(v instanceof Function == false){
			s += 'var ' + k + '= ' + varName + '["' + k + '"];';
		}
	}}
	return s;
}

/**
 * repeater 渲染器
 * usage:
 *```html
 *<div data="authors,rows" renderer="repeater">
		<h2 repeater="true"><span data="name" renderer="std"></span></h2>
		<h2 repeater-empty="true">no data found</h2>
  </div>
```
repeater 渲染器产生的每个复制项都具有 repeater-copy=true 属性，并已绑定为 d2js.root。
 */
d2js.Renderers.repeater = function(element, rows){
	var repeater = element['repeater-tpl'];
	if(element['repeater-tpl'] == null){
		var arr = $(element).find('[repeater]').toArray().filter(function(r){
			return $(r).closest('[renderer*=repeater]').is(element);
		});
		if(arr.length == 0) return console.error('repeater child not found');
		element['repeater-prev'] = arr[0].previousSibling; 		
		
		element['repeater-tpl'] = repeater = arr.map(function(n){return n.cloneNode(true)});
		arr.forEach(function(n){
			n.parentNode.removeChild(n);
		});
		
		var $empty = $(element).find('[repeater-empty]');
		element['repeater-empty'] = $empty.clone(true);
		$empty.remove();
	}
	
	$(element).find('[repeater-copy]').each(function(){this.parentElement.removeChild(this)});

	if(rows == null || rows.length == 0){
		element['repeater-empty'].clone(true).appendTo(element);
	} else {
		var prev = element['repeater-prev'];
		for(var rowIndex=0; rowIndex<rows.length; rowIndex++){
			var row = rows[rowIndex];
			var tpl = repeater.filter(function(item, idx){
				if(item.hasAttribute('when')){
					return eval(withStmt(row, 'row') + item.getAttribute('when'));
				} else {
					return true;
				}
			})[0];
			if(!tpl) continue;
			
			var r = $(tpl).clone();
			r.find('[molecule-r]').each(function(idx, e){
				$(e).attr('molecule', $(e).attr('molecule-r')); 
			});
			r.attr('repeater-copy', true);
			
			r.bindRoot(row, element).insertAfter(prev).show(); 
			prev = r;
		}
	}
}

/**
 *molecule 渲染器。对支持 setValue/getValue 的 molecule 渲染。
 *usage:
 *```html
  <div data="..." molecule="Select" renderer="molecule"></div>
 ```
 */
d2js.Renderers.molecule = d2js.KNOWN_RENDERERS['molecule'] = function(element, value, columnName, row, index, rows, _1, table){
	var m = Molecule.of(element);
	if(m != null){
		if(m.setValue){
			m.setValue(value);
		}
	} else if(element.hasAttribute('molecule')){	// 还不是 molecule-obj
		$(element).on('molecule-init', function a(){
			$(element).off('molecule-init', a);
			var m = Molecule.of(element);
			m.setValue && m.setValue(value);
		})
	}
	return value;
}

/**
 *hideIfNull 渲染器，当值为 null 时隐藏元素。
 *usage:
 *```html
  <div data="..." renderer="hideIfNull|std"></div>
 ```
 */
d2js.Renderers.hideIfNull = d2js.KNOWN_RENDERERS['hideIfNull'] = function(element, value, columnName, row, index, rows, _1, table){
	if(value == null){
		element._d2js_hideIfNull_prevDisplay = element.style.display;
		element.style.display = 'none';
	} else {
		element.style.display = element._d2js_hideIfNull_prevDisplay || 'block';
	}
	return value;
}

/**
 *hideIfEmpty 渲染器，当值为 [] 时隐藏元素（包含 null)。
 *usage:
 *```html
  <div data="..." renderer="hideIfEmpty|std"></div>
 ```
 */
d2js.Renderers.hideIfEmpty = d2js.KNOWN_RENDERERS['hideIfEmpty'] = function(element, value, columnName, row, index, rows, _1, table){
	if(value == null || value.length == 0){
		element._d2js_hideIfEmpty_prevDisplay = element.style.display;
		element.style.display = 'none';
	} else {
		element.style.display = element._d2js_hideIfEmpty_prevDisplay || 'block';
	}
	return value;
}



