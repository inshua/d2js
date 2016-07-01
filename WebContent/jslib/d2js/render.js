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

/**
 * 渲染器管道
 * @namespace
 */
d2js.Renderers.Pipelines = function(){}	// 管道函数

d2js.KNOWN_RENDERERS = {};

d2js.KNOWN_RENDER_PIPELINES = {};

d2js.Renderers.EmbedRenderers = {};
d2js.Renderers.EmbedRenderers.nextId = 1;
d2js.Renderers.EmbedRenderers.codeMap = {};

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
 * $(htmlElement).render(baseData, direct, customRenderers)
 * ```
 * @param [htmlElement=document.body] {HTMLElement} html 元素，渲染该元素及其子元素。
 * @param [baseData=d2js.dataset} {object} 数据，要渲染的数据
 * @param [direct=false] {bool} true - 直接渲染  false - 使用绝对数据路径渲染
 * @param [customRenders] {object} 自定义渲染器（含管道）。如
 * ```js
 * {
 * 	myRender : function(el, value){el.innerHTML = value}
 * }
 * ```
 * 对 htmlElement 及其子元素有指定 renderer="myRender"，该函数会被套用。
 */
d2js.render = function(htmlElement, baseData, direct, customRenders){
	baseData = baseData || d2js.dataset;

	var stk = [];
	if(htmlElement) {
		if(htmlElement.jquery){
			stk = htmlElement.toArray();
			if(stk.length == 0){
				stk = [document.body];
			}
		} else {
			stk = [htmlElement]
		}
	} else {
		stk = [document.body];
	}
	
	while(stk.length){
		var e = stk.pop();
		var dataPath = e.getAttribute('data');
		var renderer = e.getAttribute('renderer');
		var embedRenderer = $(e).children('renderer, .d2js-render');
		if(embedRenderer.length){
			var emb = prepareEmbedRenderer(embedRenderer.html());
			renderer = renderer ? renderer + '|' + emb : emb;
		}
		if(dataPath && renderer){
			var data = [e]; 
			var match = d2js.extractData(baseData, dataPath, data, direct);
			if(match){
				if(e.hasAttribute('trace-render')) debugger;
				
				data.splice(1, 0, data[data.length - 1]);		// value 始终作为第二个参数
				
				var pipelined = (renderer.indexOf('|') != -1);
				if(pipelined){		// pipeline 函数仅翻译值，其有可能会加 html 效果
					var parr = renderer.split('|');
					for(var i=0; i<parr.length - 1; i++){
						var fun = extractPipeline(parr[i].trim());
						if(fun != null) {
							var piped = fun.apply(null, data);
							data[1] = piped;
						}
					}
					renderer = parr[parr.length -1];
				} 
				var fun = extractRenderer(renderer.trim());
				if(fun){
					var r = fun.apply(null, data);				
					$(e).trigger('d2js.rendered', data);
					if(direct && r == 'break') continue;
				} else {
					console.error(renderer + ' not found');
				}
			}
		}
		
		if(e.children.length){
			for(var i=e.children.length -1; i>=0; i--){
				stk.push(e.children[i]);
			}
		}
	}
	
	function extractRenderer(rendererDesc){
		if(customRenders){
			var fun = customRenders[rendererDesc];
			if(fun) return fun;
		}
		return d2js.extractCachedFunction(rendererDesc, d2js.Renderers, 'd2js.Renderers.', d2js.KNOWN_RENDERERS);
	}
	
	function extractPipeline(pipelineDesc){
		if(customRenders){
			var fun = customRenders[pipelineDesc];
			if(fun) return fun;
		}
		return d2js.extractCachedFunction(pipelineDesc, d2js.Renderers.Pipelines, 'd2js.Renderers.Pipelines.', d2js.KNOWN_RENDER_PIPELINES);
	}
	
	function prepareEmbedRenderer(code){
		var id = d2js.Renderers.EmbedRenderers.codeMap[code];
		if(id){
			return id;
		} else {
			id = d2js.Renderers.EmbedRenderers.nextId ++;
			id = '__embed_renderer__' + id;
			// code = 'function ' + id + '(element, value, table, _1, rows, index, row, columnName){ \r\n' + code + '\r\n}';
			var fun = new Function('element', 'value', 'table', '_1', 'rows', 'index', 'row', 'columnName', code);
			d2js.Renderers.EmbedRenderers.codeMap[code] = id;
			d2js.Renderers[id] = fun;
			return id;
		}
	}
}


d2js.render = function(htmlElement, selector, customRenders){
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
	
	var e = htmlElement, $e = $(htmlElement);
	
	var r = d2js._findRoot($e);
	if(r.root == null) return;
	renderElement(htmlElement, r.root, r.crumb, r.ele);
	
	function renderElement(e, root, crumb, rootEle){
		var fullPath = e.getAttribute('d2js.fullpath');
		
		if(fullPath == null && e.hasAttribute('data')){
			var dataPath = e.getAttribute('data');
			if(dataPath.charAt(0) == ','){
				dataPath = parseShortPath(dataPath, e, rootEle);
				e.setAttribute('d2js.fullpath', fullPath = dataPath);
			} else if(dataPath.startsWith('..')){	// change d2js.root to upper
				var $re = $(rootEle);
				do{
					dataPath = dataPath.substr(2);
					var r = d2js._findRoot($re.parent());
					$re = $(r.rootEle);
				} while(dataPath.startsWith('..'));
				root = r.root; crumb = r.crumb; rootEle = r.rootEle;
				fullPath = dataPath;
			} else {
				e.setAttribute('d2js.fullpath', fullPath = dataPath);
			}
		}
		
		if(fullPath && (selector == null || selector.test(fullPath))){
			crumb = crumb.slice();
			var match = d2js.extractData(root, fullPath, crumb);
			
			if(match){
				var renderer = e.getAttribute('renderer');
				var embedRenderer = $(e).children('renderer, .d2js-render');
				if(embedRenderer.length){
					var emb = prepareEmbedRenderer(embedRenderer.html());
					renderer = renderer ? renderer + '|' + emb : emb;
				}
			}
		}
		
		if(renderer){
			if(e.hasAttribute('trace-render')) debugger;
			
			var pipelined = (renderer.indexOf('|') != -1);
			if(pipelined){		// pipeline 函数仅翻译值，其有可能会加 html 效果
				var parr = renderer.split('|');
				for(var i=0; i<parr.length - 1; i++){
					var fun = extractPipeline(parr[i].trim());
					if(fun != null) {
						var piped = fun.apply(null, [e].concat(crumb));
						crumb[0] = piped;
					}
				}
				renderer = parr[parr.length -1];
			} 
			var fun = extractRenderer(renderer.trim());
			if(fun){
				var r = fun.apply(null, [e].concat(crumb));				
				$(e).trigger('d2js.rendered', crumb, renderer);
				//if(direct && r == 'break') return;
			} else {
				console.error(renderer + ' not found');
			}
		}
		
		for(var i=0; i<e.children.length; i++){
			var child = e.children[i];
			if(child.hasAttribute('d2js.root')){ 	// 根数据另起炉灶
				var renderChild = true;
				var rootPath = child.getAttribute('d2js.root');
				if(rootPath.startsWith('..')){		// 相对路径
					if(!d2js.bindData($(child))){
						renderChild = false;
					}
				} 
				if(renderChild){
					var r = d2js._findRoot(child, $(child));
					renderElement(child, r.root, r.crumb, r.ele);
				}
			} else {
				renderElement(child, root, crumb, rootEle);
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
			} else if(s.charAt(0) == ','){
				shortPath = s + shortPath;
			} else if(s.startsWith('..')){
				dataPath = s.substr(2) + shortPath;
				found = true;
			} else {
				dataPath = s + shortPath;
				found = true;
			}
			
			if(p == rootEle){
				found = true;
				dataPath = shortPath.substr(1);
			}
			if(found) break;
		}
		if(!found) {
			console.error('cannot parse short path ' + shortPath, startEle, rootEle);
			throw new Error('cannot parse short path ' + shortPath);
		}
		return dataPath;
	}

	
	function extractRenderer(rendererDesc){
		if(customRenders){
			var fun = customRenders[rendererDesc];
			if(fun) return fun;
		}
		return d2js.extractCachedFunction(rendererDesc, d2js.Renderers, 'd2js.Renderers.', d2js.KNOWN_RENDERERS);
	}
	
	function extractPipeline(pipelineDesc){
		if(customRenders){
			var fun = customRenders[pipelineDesc];
			if(fun) return fun;
		}
		return d2js.extractCachedFunction(pipelineDesc, d2js.Renderers.Pipelines, 'd2js.Renderers.Pipelines.', d2js.KNOWN_RENDER_PIPELINES);
	}
	
	function prepareEmbedRenderer(code){
		var id = d2js.Renderers.EmbedRenderers.codeMap[code];
		if(id){
			return id;
		} else {
			id = d2js.Renderers.EmbedRenderers.nextId ++;
			id = '__embed_renderer__' + id;
			// code = 'function ' + id + '(element, value, table, _1, rows, index, row, columnName){ \r\n' + code + '\r\n}';
			var fun = new Function('element', 'value', 'columnName', 'row', 'index', 'rows', '_1', 'table', code);
			d2js.Renderers.EmbedRenderers.codeMap[code] = id;
			d2js.Renderers[id] = fun;
			return id;
		}
	}
}

//命中root，并存储 data('d2js.root') 及 crumb，返回命中的root数据、元素及root的面包屑
d2js._findRoot = function($el, $suggestRootEle){
	var $rootEle = $suggestRootEle || $el.closest('[d2js\\.root]');
	
	var crumb = null, root = null, ele = null;
	if($rootEle.length == 0) {
		root = d2js.root;
		crumb = [root];
		ele = document.body;
	} else {
		root = $rootEle.data('d2js.root');		
		if(root == null){
			d2js.bindData($rootEle);
		}
		root = $rootEle.data('d2js.root');
		crumb = $rootEle.data('d2js.crumb');
		ele = $rootEle[0];
	}
	return {root: root, crumb: crumb, ele: ele};
}


d2js.bindData = function($element, data){
	if(data == null){
		data = $element[0].getAttribute('d2js.root');
		if(data == null) return false;
	} 
	if(typeof data == 'string'){
		var root = d2js.root;
		if(data.startsWith('..')){
			var crumb = null;
			do{
				var $re = $element.parent('[d2js\\.root]').parent('[d2js\\.root]');
				if($re.data('d2js.root') == null){
					if(d2js.bindData($re) == false) return false;
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
			if(data.charAt(0) == ','){	// d2js.root 也可以使用短路径
				var r = d2js._findRoot($element.parent());
				if(r.root == null) return;
				crumb = r.crumb.slice(); root = crumb[0]; data = data.substr(1);
			}
			var crumb = [root];
			var match = d2js.extractData(root, data, crumb);
			if(!match || crumb[0] == null/* root cannot be null */) return false;
			$element.data('d2js.root', crumb[0]);
			$element.data('d2js.crumb', crumb);
		}
	} else {
		$element[0].setAttribute('d2js.root', '');
		$element.data('d2js.root', data);
		$element.data('d2js.crumb', [data]);
	}
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
		if(obj == null){		// cannot extract more
			return false;
		}
		
		var a = arr[i].trim();
		if(!isNaN(a)){
			currCrumb.push(a * 1);		// 数字，应该是个索引
		} else {
			currCrumb.push(a);
		}
		if(obj != null) obj = obj[a];
		if(typeof obj == 'function') obj = obj.call(currCrumb[currCrumb.length-2]);	// call zero-arguments function direct
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

/**
 * 按 element 指定的 data 路径定位数据
 * 可使用 jQuery 函数：
 * ```js
 * $(element).locateData(baseData, direct)
 * ```
 * @param [element=document.body] {HTMLElement} 包含数据路径的 html 元素
 * @param [baseData=d2js.dataset] {object} 出发数据
 * @param [direct=false] {bool} true - 不使用绝对路径  false - 使用绝对路径
 * @return {array} 数组，第一项为最终锚定的值，后面项为按数据路径展开的各项
 */
d2js.locateData = function(element, baseData, direct){
	if(element.jquery) element = element[0];
	baseData = baseData || d2js.dataset;
	var dataPath = element.getAttribute('data');
	var data = [];
	if(dataPath == null) return null;
	this.extractData(baseData, dataPath, data, direct);
	data.splice(0, 0, data[data.length - 1]);		// value 设为第一个值
	return data;
};


+(function ( $ ) {
    $.fn.locateData = function() {
    	return d2js.locateData(this);
    };
}( jQuery ));

+(function ( $ ) {
    $.fn.render = function(selector, customRenders) {
    	if(!(selector instanceof RegExp)){
	    	customRenders = selector;
	    	selector = null;
    	}
    	d2js.render(this, selector, customRenders);
    	return this;
    };
}( jQuery ));

+(function ( $ ) {
    $.fn.bindData = function(selectorOrData) {
    	d2js.bindData(this, selectorOrData);
    	return this;
    };
}( jQuery ));

/**
 * 从参数数组查找符合条件的参数
 * @param {Arguments} arguments。从 locateData, render 等得到的数据参数。
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
