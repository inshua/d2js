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
 * 所有渲染器
 * @namespace 
 */
d2js.Renderers = function(){}
d2js.KNOWN_RENDERERS = {};

d2js.Renderers.EmbedRenderers ={}
d2js.Renderers.EmbedRenderers.nextId = 1;

(function addcss(){
	   if(window.ActiveXObject)
	   {
		   $('<style id="custom_persona_css"></style>').appendTo('head'); 
		   $("#custom_persona_css").prop('styleSheet').cssText='render,div.d2js-render {display:none}';
		   $("#custom_persona_css")[0].id = '';
	   }
	   else
	   {
		   $('<style type="text/css">render,div.d2js-render {display:none}</style>').appendTo(document.head);
	   }
	
})();

/**
 * 发起渲染函数。渲染总入口。设置好数据路径(html attribute `data`)和渲染器(html attribute `renderer`)后，调用该函数，绘制所有相关元素。
 * 也可使用封装了该函数的 jQuery 函数:
 * ```js
 * $(htmlElement).render(pattern, customRenders)
 * ```
 * @param [htmlElement=document.body] {HTMLElement} html 元素，渲染该元素及其子元素。
 * @param [pattern] {object|object[]} 命中的数据，可提供数组。提供该参数后，只有展开数据中包含有 pattern 的对象时才发生渲染。
 * @param [customRenders] {object} 自定义渲染器（含管道）。如
 * ```js
 * {
 * 	myRender : function(el, value){el.innerHTML = value}
 * }
 * ```
 * 对 htmlElement 及其子元素有指定 renderer="myRender"，该函数会被应用。需要说明的是，在下次渲染时不再需要提供 myRender 函数。
 */
d2js.render = function(htmlElement, pattern, customRenders){
	d2js.travel(htmlElement, pattern, renderElement)
	
	function renderElement(e, crumb){
		var renderer = e.getAttribute('renderer');
		var embedRenderer = e.querySelector('renderer, .d2js-render');
		if(embedRenderer){
			var emb = prepareEmbedRenderer(embedRenderer, e);
			renderer = renderer ? renderer + '|' + emb : emb;
			e.setAttribute('renderer', renderer);
		}
		
		if(renderer){
			if(e.hasAttribute('trace-render')) debugger;
		
			var arr = [e].concat(crumb);
			var renderers = renderer.split('|');
			for(var i=0; i<renderers.length; i++){
				var fun = extractRenderer(renderers[i].trim(), e);
				if(fun != null) {
					arr[1] = fun.apply(null, arr);
				} else {
					console.error(renderers[i] + ' not found, when render', e);
				}
			}
			$(e).trigger('d2js.rendered', arr, renderer);
		}
	}
	
	function extractRenderer(rendererDesc, e){
		if($.hasData(e)){
			var d = $.data(e)['d2js.renderers'];
			var fun = d && d[rendererDesc];
			if(fun) return fun;
		}
		if(customRenders){
			var fun = customRenders[rendererDesc];
			d2js._store(e, 'd2js.renderers', rendererDesc, fun);
			if(fun) return fun;
		}
		return d2js.extractCachedFunction(rendererDesc, d2js.Renderers, 'd2js.Renderers.', d2js.KNOWN_RENDERERS);
	}
	
	function prepareEmbedRenderer(embedRenderer, e){
		var code = embedRenderer.innerHTML;
		embedRenderer.remove();
		
		var id = d2js.Renderers.EmbedRenderers.nextId ++;
		id = '__embed_renderer__' + id;
		var fun = new Function('element', 'value', 'columnName', 'row', 'index', 'rows', '_1', 'table', code);
		d2js._store(e, 'd2js.renderers', id, fun);
		
		return id;
	}
}
/**
 * 内部函数。对符合d2js规则的元素应用 processor 动作。
 */
d2js.travel = function(htmlElement, pattern, processor){
	if(htmlElement) {
		if(htmlElement.jquery){
			if(htmlElement.length == 0){
				return;		// 选择器未命中任何元素，应退出
			}
			htmlElement = htmlElement[0]
		}
	} else {
		htmlElement = document.body;
	}
	
	var rootDesc = d2js.findRoot(htmlElement);
	if(rootDesc.root == null) return;
	
	travelElement(htmlElement, rootDesc);
	
	function travelElement(e, rootDesc){
		//console.log('render ', e.getAttribute('renderer'),e, rootDesc);
		
		var fullPath = e.getAttribute('d2js.fullpath');
		
		if(fullPath == null && e.hasAttribute('data')){
			var dataPath = e.getAttribute('data');
			if(dataPath.charAt(0) == ','){
				dataPath = parseShortPath(dataPath, e, rootDesc.ele);
				e.setAttribute('d2js.fullpath', fullPath = dataPath);
			} else if(dataPath.startsWith('..')){	// change d2js.root to upper
				var re = rootDesc.ele;
				do{
					dataPath = dataPath.substr(2);
					var r = d2js.findRoot(re.parentElement);
					re = r.ele;
				} while(dataPath.startsWith('..'));
				rootDesc = r;
				fullPath = dataPath;
			} else {
				e.setAttribute('d2js.fullpath', fullPath = dataPath);
			}
		}
		
		if(fullPath && rootDesc.root){	// 原设想每个元素都用 fullpath 匹配 selector（一个正则表达式）: (selector == null || selector.test(fullPath)), 实用性不高，现改为直接匹配root
			var crumb = rootDesc.crumb.slice();
			var match = d2js.extractData(rootDesc.root, fullPath, crumb);

			if(match && (pattern == null || testPattern(crumb))){
				var r = processor(e, crumb);
				if(r == 'stop') return;
			}
		}
		
		for(var i=0; i<e.children.length; i++){
			var child = e.children[i];
			if(child.hasAttribute('d2js.root')){ 	// 根数据另起炉灶
				var travelChild = true;
				var rootPath = child.getAttribute('d2js.root');
				if(rootPath.startsWith('..')){		// 相对路径
					if(!d2js.bindRoot(child)){
						travelChild = false;
					}
				} 
				if(travelChild){
					var r = d2js.findRoot(child, child);
					travelElement(child, r);
				}
			} else {
				travelElement(child, rootDesc);
			}
		}
	}
	
	
	// 分析短路径
	function parseShortPath(shortPath, startEle, rootEle){
		var dataPath = '';
		var found = false;
		for(var p = startEle.parentElement; p != document; p = p.parentElement){
			// if(shortPath == 'this') shortPath = '';
			var s = p.getAttribute('data');
			if(s == null){
				// nothing to do
			} else if(s == 'this'){
				dataPath = shortPath.substr(1);
				found = true;
			} else if(s.charAt(0) == ','){
				shortPath = s + shortPath;
			} else if(s.startsWith('..')){
				dataPath = s.substr(2) + shortPath;
				found = true;
			} else {
				dataPath = s + shortPath;
				found = true;
			}
			
			if(!found && p == rootEle){
				dataPath = shortPath.substr(1);
				found = true;
			}
			if(found) break;
		}
		if(!found) {
			console.error('cannot parse short path ' + shortPath, startEle, rootEle);
			throw new Error('cannot parse short path ' + shortPath);
		}
		return dataPath;
	}
	
	function testPattern(crumb){
		if(pattern.isArray){
			return pattern.some(function(p){return crumb.lastIndexOf(p) != -1})
		} else {
			return crumb.lastIndexOf(pattern) != -1
		}
	}
}

/**
 * 命中root，并存储 data('d2js.root') 及 crumb，返回命中的root数据、元素及root的面包屑
 * 可使用该函数的jQuery形式：
 * ```js
 * 	var desc = $el.findRoot();
 *  var data = desc.root;
 *  var rootEle = desc.ele;
 *  var crumb = desc.crumb;
 * ```
 * @param el {HTMLElement} 
 * @param [suggestRootEle] {HTMLElement} 建议的Root元素 
 * @return {object} {root: 所命中的根数据对象, crumb: 根数据的展开过程，数组, ele: 根数据所绑定的元素}
 */
d2js.findRoot = function(el, suggestRootEle){
	var rootEle = suggestRootEle;
	if(!rootEle){
		for(rootEle = el; rootEle != null; rootEle = rootEle.parentElement){
			if(rootEle.hasAttribute('d2js.root')) break;
		}
	}
	
	var crumb = null, root = null, ele = null;
	if(rootEle == null) {
		return {root:d2js.root, crumb: [root], ele: document.body};
	} else {
		if($.hasData(rootEle) == false || $.data(rootEle, 'd2js.root') == null){
			d2js.bindRoot(rootEle);
		}
		var result = $.data(rootEle);
		return {root:result['d2js.root'], crumb: result['d2js.crumb'], ele: rootEle};
	}
}

/**
 * 绑定数据为根数据
 * @param element {HTMLElement} DOM元素，充当根数据附着元素
 * @param data {string|object} string 则为从 d2js.root 出发的属性路径，object 则为直接绑定的对象
 * @param [baseElement] {HTMLElement} 当使用 object 作为绑定对象时，从 baseElement 继承数据展开面包屑（crumb）
 */
d2js.bindRoot = function(element, data, baseElement){
	if(data == null){
		data = element.getAttribute('d2js.root');
		if(data == null) return false;
	}
	var $element = $(element);
	if(typeof data == 'string'){
		var root = d2js.root;
		if(data.startsWith('..')){
			var crumb = null;
			do{
				var $re = $element.parent('[d2js\\.root]').parent('[d2js\\.root]');
				if($re.length == 0) {
					console.error(data, 'cannot found root element for ', element);
					throw new Error('cannot found root element for ' + data)
				}
				if($re.data('d2js.root') == null){
					if(d2js.bindRoot(re[0]) == false) return false;
				}
				crumb = $re.data('d2js.crumb');
				data = data.substr(2);
			}while(data.startsWith('..'));
			root = crumb[0];
			if(root == null) return false;
			
			if(data.charAt(0) == ','){	// ..,name(just eq ..name) or ....,name 
				data = data.substr(1);
			}
			var match = d2js.extractData(root, data, crumb);
			if(!match || crumb[0] == null/* root cannot be null */) return false;
			$element.data('d2js.root', crumb[0]);
			$element.data('d2js.crumb', crumb);
		} else {
			var crumb = null;
			if(data.charAt(0) == ','){	// d2js.root 也可以使用短路径
				var r = d2js.findRoot(element.parentElement);
				if(r.root == null) return;
				crumb = r.crumb.slice(); root = crumb[0]; data = data.substr(1);
			} else {
				crumb = [root]
			}
			var match = d2js.extractData(root, data, crumb);
			if(!match || crumb[0] == null/* root cannot be null */) return false;
			$element.data('d2js.root', crumb[0]);
			$element.data('d2js.crumb', crumb);
		}
	} else {
		var root = data;
		$element[0].setAttribute('d2js.root', '#');
		$element.data('d2js.root', root);
		if(baseElement){
			var crumb = d2js.findRoot(baseElement).crumb;
			$element.data('d2js.crumb', [root].concat(crumb));
		} else {
			$element.data('d2js.crumb', [root]);
		}
	}
	// 子元素中带有与本次 bind root有关的 d2js.root 的全部取消
	$element.find('[d2js\\.root]').each(function(){
		var crumb = $(this).data('d2js.crumb');
		if(crumb && crumb.indexOf(root) != -1){
			// console.log('will remove ', this, ' when bindRoot ', element)
			$(this).removeData('d2js.root').removeData('d2js.crumb');			
		}
	});
	return true;
}

d2js.extractData = function(baseData, dataPath, crumb){
	if(dataPath.charAt(0) == ',') throw new Error('short path not allowed when extract data');

	var currCrumb = [];
	
	if(dataPath === '' || dataPath == 'this') {
		return true;
	}
	
	var arr = dataPath.split(',');
	var obj = baseData;
	for(var i=0; i<arr.length; i++){
		var a = arr[i].trim();
		if(a == 'this') continue;
		if(!isNaN(a)){
			currCrumb.push(a * 1);		// 数字，应该是个索引
		} else {
			currCrumb.push(a);
		}
		if(obj != null) obj = obj[a];
		if(typeof obj == 'function') {	// call zero-arguments function direct
			var thiz = baseData
			if(currCrumb.length >= 2){
				thiz = currCrumb[currCrumb.length-2]
			}
			obj = obj.call(thiz);	
		}
		currCrumb.push(obj);
	}
	
	// put currCrumb into crumb, at the head, and reverse order
	for(var i = currCrumb.length + crumb.length - 1; i >= 0; i--){
		if(i>=currCrumb.length){
			crumb[i] = crumb[i - currCrumb.length];
		} else {
			crumb[i] = currCrumb[currCrumb.length - 1 - i]
		}
	}
	
	return true;
};

d2js._store = function(e, bundle, key, fun){
	var $e = $(e); 
	var data = $e.data(bundle);
	if(data == null) $e.data(bundle, data = {});
	data[key] = fun;
};

/**
 * 按 element 指定的 data 路径定位数据
 * 可使用 jQuery 函数：
 * ```js
 * var crumb = $(element).locateData()
 * var data = crumb[0]
 * ```
 * @param [element=document.body] {HTMLElement} 包含数据路径的 html 元素
 * @return {array} 数组，第一项为最终锚定的值，后面项为按数据路径展开的各项
 */
d2js.locateData = function(element){
	var result = null
	d2js.travel(element, null, function renderElement(e, crumb){
		result = crumb;
		return 'stop'
	})
	return result;
};


+(function ( $ ) {
    $.fn.locateData = function() {
    	return d2js.locateData(this[0]);
    };
}( jQuery ));

+(function ( $ ) {
    $.fn.render = function(pattern, customRenders) {
    	this.each(function(){
    		d2js.render(this, pattern, customRenders);
    	});
    	return this;
    };
}( jQuery ));

+(function ( $ ) {
    $.fn.bindRoot = function(selectorOrData, baseElement) {
    	this.each(function(){
    		d2js.bindRoot(this, selectorOrData, baseElement);
    	});
    	return this;
    };
}( jQuery ));

+(function ( $ ) {
    $.fn.findRoot = function() {
    	return d2js.findRoot(this[0]);
    };
}( jQuery ));

/**
 * 从参数数组查找符合条件的参数
 * @param args {Arguments} arguments。从 locateData, render 等得到的数据参数。
 * @param pattern {object} 类型字符串，允许的有（table, dataset, row, column），predicate函数，返回 true|false
 */
d2js.findArg = function(args, pattern){
	var types = {table: d2js.DataTable, dataset: d2js.Dataset, row: d2js.DataRow, column: d2js.DataColumn};
	if(typeof pattern == 'object'){
		return Array.prototype.find(args, pattern);
	} else {
		pattern = types[pattern];
		for(var i=0;i<args.length; i++){
			var arg = args[i];
			if(arg instanceof pattern){
				return arg;
			}
		}
	}
}

d2js.extractCachedFunction = (function(){
	var JsSymbols = '~!@#%^&*()-+=[]{}\|;:\'",.<>/? \r\n\t';
	return function(desc, functions, functionsStr, cache){
	
		if(cache && cache[desc]) return cache[desc];
		
		var r = functions[desc];
		if(!r){
			if(desc.indexOf(functionsStr) == -1){
				desc = functionsStr + desc; 
			}
			r = window.eval(desc);
		} 
		if(cache) cache[desc] = r;
		return r;
	}
})();
