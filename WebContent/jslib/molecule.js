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
 * Molecule 类。 molecule 组件的共同基类。
 * 请按指导手册使用 molecule，不要自己使用构造函数创建。
 * @class 
 * @param container {HTMLElement} 所附着的 html 元素
 */
function Molecule(container){
	/**
	 *  molecule 所附着的 html 元素
	 * @type {HTMLElement}
	 */
	this.el = container;
	/**
	 * molecule 所附着的 html 元素的 jQuery 包装
	 * @type {jQueryElement} 
	 */
	this.$el = $(container);
	if(container == null) debugger;
	var me = this;
	
	this.onDOMNodeRemoved = function(){
		if(me.$el.closest('[molecule-auto-dispose=false]').length) return;	// 不自动删除
		
		me.dispose && me.dispose();
		if(Molecule.debug) console.info(this.id, ' removed')
		delete Molecule.instances[me.id];
	}
	/**
	 * molecule类型
	 * @type {String} 
	 */
	this.moleculeType = container.getAttribute('molecule-obj') || container.getAttribute('molecule-def');
	
	this.$el.on('focus', function(ele){
		me.focus && me.onfocus();
	});
	this.$el.on('blur', function(ele){
		me.blur && me.onblur();
	});
	
	/**
	 * 移除 molecule 及其容器
	 */
	this.release = function(){
		this.dispose && this.dispose();
		delete Molecule.instances[this.id];
		this.$el.remove();
	}
}

Molecule._nextId = 1;
/**
 * 获取下一个 id
 * @private
 * @returns {Number}
 */
Molecule.nextId = function(){return Molecule._nextId ++; }

Molecule.instances = {};

Molecule._locateContainer = function(currentScript){
	if(currentScript == null){
		throw new Error('cannot retreive current script');
	}
	var forSilbling = currentScript.hasAttribute('molecule-for');
	var container = null;
	if(forSilbling){
		var c = $('[molecule-script-container=' + currentScript.getAttribute('molecule-script-target') +']');
		container = c.length ? c : currentScript.previousElementSilbling;
	} else {
		container = $(currentScript).closest('[molecule-obj]');
	}
	
	if(!container.length){
		container = $(currentScript).closest('[molecule-def]');
		return container[0];
	} else {
		if(container.hasAttribute('molecule-def')) return;	// 不对molecule声明创建实例
	}
	if(container == null || (container.jquery && !container.length)){
		throw new Error('container must has molecule-def attribute');
	}
	return container.jquery ? container[0] : container;
}

/**
 * 使用 molecule 构造函数创建molecule
 * @param fun {function} molecule 构造函数。**function(){}**，已绑定 this 为创建中的 molecule
 * @returns {Molecule} 创建好的 molecule 实例
 */
Molecule.create = function(fun){
	if(!Molecule.processing) return;
	var currentScript = Molecule.currentScript;		// for ie
	var container = Molecule.currentContainer || Molecule._locateContainer(currentScript);
	if(container == null) return;
	if(Molecule.debug) console.info('create molecule ' + fun.name);
	var existed = container.getAttribute('molecule-id');
	var obj = null;
	if(!existed){
		var id = Molecule.nextId(); 
		obj = new Molecule(container);
		obj.id = id;
		Molecule.instances[id] = obj;		
		container.setAttribute('molecule-id', id); 
	} else {
		obj = Molecule.instances[existed * 1]
	}
	
	//fun.prototype = p;
	var args = [];
	for(var i=2; i<arguments.length; i++) args.push(arguments[i]);
	//var obj = new (Function.prototype.bind.apply(fun, args));
	fun.apply(obj, args);
	
	if(Molecule.debug) console.log('create molecule ' + fun.name + ' complete');
	
	$(currentScript).remove();
	
	return obj;
}

/**
 * 继承molecule
 * @param fun {function} molecule 子类构造函数。**function(){}**，可通过 this 访问已经创建好的原型 molecule。
 */
Molecule.extend = function(fun){
	if(!Molecule.processing) return;
	
	var currentScript = Molecule.currentScript;

	var container = Molecule.currentContainer || Molecule._locateContainer(currentScript);
	
    if(container){
    	var m = Molecule.of(container);
    	if(m) fun.call(m);
    }
}

/**
 * 根据 html 元素查找它所附着的 molecule 实例
 * 可使用 jQuery 版本：$(element).molecule()
 * @param element {HTMLElement|jQueryElement} 
 * @returns {Molecule}
 */
Molecule.of = function(element){
	var ids = $(element).attr('molecule-id');
	if(!ids) return null;
	if(ids.indexOf(',') != -1){
		return ids.split(',').map(function(id){return Molecule.instances[id]});;
	} 
	return Molecule.instances[ids];
};

+(function ( $ ) {
    $.fn.molecule = function() {
    	var m = Molecule.of(this);
    	if(m) return m;
    	if(this.attr('molecule')){
    		Molecule.init(this, true);
    		return Molecule.of(this);
    	}
    };
}( jQuery ));

/**
 * 设定 molecule 的存放路径，也即 `extract.jssp` 的存放路径，**需要更改为自己的网站名！**
 * 如：
 * ```js
 * Molecule.ModulesPath = website + '/molecues/'
 * ```
 */
Molecule.ModulesPath = '/d2js/molecules/';

Molecule.defines = {};
Molecule.definesByFullname = {};		// defines by fullname

/**
 * 搜索页面上存在的 molecule 定义（具有 molecule-def 的元素），并将它抽取出去。
 */
Molecule.scanDefines = function(){
	$('[molecule-def]').each(function(idx, ele){
		var e = $(ele);
		var fullname = e.attr('molecule-def');
		var depends = e.attr('molecule-depends');
		ele.removeAttribute('molecule-def');
		var escapeTag = e.attr('escape-tag');
		if(escapeTag) ele.removeAttribute('escape-tag');
		
		var r = Molecule.getModuleName(fullname);

		var m = Molecule.defines[r.module];
		if(m == null){
			m = Molecule.defines[r.module] = {};
		}
		console.log('define molecule ' + fullname);
		
		var attributes = {};
		for(var i=0; i< ele.attributes.length; i++){
			attributes[ele.attributes[i].name] = ele.getAttribute(ele.attributes[i].name); 
		}
		var def = {name : r.name, depends : depends && depends.split(','), appeared : true, 
		           html : ele.innerHTML, attributes : attributes, escapeTag : escapeTag};
		
		var script = $(ele.nextElementSibling);
		if(script.length && (script.attr('molecule-for') == fullname || script.attr('molecule-for') == r.name)){
			def.script = script[0].innerHTML;
			script.remove();
		}
		
		Molecule.definesByFullname[fullname] = m[r.name] = def;
		
		$(ele).remove();
	});
}

Molecule.loadedModules = {};
Molecule.loadModule = function(module){
	var result = false;
	$.ajax({
		url : Molecule.ModulesPath + '/' + module + '.json',
		async : false, type : 'get', cache : false,
		complete : function(resp, status){
			if(status == 'success'){
				resp = resp.responseJSON;
				var m = Molecule.defines[module];
				if(m == null){
					m = Molecule.defines[module] = {};
				}
				for(var k in resp){ if(resp.hasOwnProperty(k)){
					Molecule.definesByFullname[module + '.' + k] = m[k] = resp[k];
				}};
				Molecule.loadedModules[module] = true;
				result = true;
			}
		}
	});
	return result;
}

/**
 * 加载指定 html 文件中的所有 molecule，将使用 extract.jssp。
 * @param html {string} 包含有 molecule 的 html 文件的文件路径。不用包含webapp路径。
 * @returns {Boolean} 是否加载成功
 */
Molecule.loadHtml = function(res){
	var result = false;
	var link = document.createElement('a');
	link.href = res;
	$.ajax({
		url : Molecule.ModulesPath + '/extract.jssp',		
		data : {html : res}, processData: true,
		method : 'post',
		async : false, cache : false,
		complete : function(resp, status){
			if(status == 'success'){
				resp = resp.responseJSON;
				for(var module in resp){ if(resp.hasOwnProperty(module)){
					var m = Molecule.defines[module];
					if(m == null){
						m = Molecule.defines[module] = {};
					}
					var defs = resp[module];
					for(var name in defs){ if(defs.hasOwnProperty(name)){						
						Molecule.definesByFullname[module + '.' + name] = m[name] = defs[name];	
					}}
					Molecule.loadedModules[module] = true;					
				}};				
				result = true;
			}
		}
	});
	return result;
}

Molecule.getModuleName = function(fullname){
	var module = 'noname', name=fullname;
	if(fullname.lastIndexOf('.') != -1){
		var p = fullname.lastIndexOf('.');
		module = fullname.substring(0, p);
		name = fullname.substr(p + 1);
	}
	return {module : module, name : name};
}

/**
 * 以 starter 为出发元素，初始化该元素及其子元素中的所有 molecule，如果有 molecule-init=manual 的，也将强行创建。
 * @param starter {HTMLElement} html 元素
 */
Molecule.init = function(starter){
	Molecule.scanMolecules(starter, true);	
}

/**
 * 以 starter 为出发元素，初始化该元素及其子元素中的所有 molecule。
 * @param starter {HTMLElement} html 元素
 * @param manual {bool} 是否初始化声明为 molecule-init=manual 的元素
 */
Molecule.scanMolecules = function(starter, manual){
	if(starter && starter.jquery){
		starter = starter[0];
	}
	starter = starter || document.body;
	Molecule._scanningEle = starter;
	if(Molecule.debug) console.info('molecule scan', starter);
	var stk = [starter];
	while(stk.length){
		var ele = stk.pop();
		if(ele.hasAttribute('molecule')){
			if(ele.getAttribute('molecule-init') == 'manual' && !manual) continue;		// 跳过声明为手工创建的元素
			createMolecule(ele);
		} 
		if(!ele.hasAttribute('init-children-first')){
			for(var i=ele.children.length-1; i>=0; i--){
				stk.push(ele.children[i]);
			}
		}
	}
	
	Molecule._scanningEle = null;
	if(Molecule.debug) console.info('molecule scan', starter, 'over');
	
	function findMoleculeDef(moleculeName){
		var def = Molecule.definesByFullname[moleculeName];
		var moduleDesc = Molecule.getModuleName(moleculeName);
		var name = moduleDesc.name;
		var module = moduleDesc.module;
		if(def == null){
			if(Molecule.loadedModules[module] == null){
				if(!Molecule.loadModule(module)){
					throw new Error(module + ' load failed, ' + name + ' cannot create');
				}
			}
			def = Molecule.defines[module][name];
		} 
		if(!def){
			throw new Error(name + ' not found in ' + module + ', please check whether this molecule exists');
		}
		if(!def.appeared){
			ensureDepends(def);
			def.appeared = true;
		}
		def.fullname = moleculeName;
		return def;
	}
	
	function createMolecule(ele){
		if(Molecule.debug) console.log('------------------------------'); 
		var def = findMoleculeDef(ele.getAttribute('molecule'));
		
		var eleAttributes = {};
		for(var i=0; i<ele.attributes.length; i++) {
			eleAttributes[ele.attributes[i].name] = ele.getAttribute(ele.attributes[i].name); 
		}
		
		var inner = ele.innerHTML;
		if(Molecule.debug) console.info(def.name + ' outerHTML', ele.outerHTML);
		
		if(ele.hasAttribute('molecule-trace')) debugger;

		var defs = [def];
		while(def.attributes['molecule']){
			def = findMoleculeDef(def.attributes['molecule']);
			defs.push(def);
		}
		if(Molecule.debug) {
			console.info('process ' + def.name + ',hierachy path ' + defs.map(function(def){return def.fullname}).join());
		}
		
		for(var d = defs.length -1; d >=0; d--){	// 逐代设置属性
			var def = defs[d];
			
			for(var attr in def.attributes){if(def.attributes.hasOwnProperty(attr)){
				if(attr.indexOf('molecule') == 0) continue;
				
				var v = ele.getAttribute(attr);
				if(v){		// 应该覆盖的定义
					if(eleAttributes[attr] == null){		// 是父类所赋予的属性而不是用户指定的，应当被子类覆盖
						ele.setAttribute(attr, combineValue(attr, v, def.attributes[attr]));
					} else {
						ele.setAttribute(attr, combineValue(attr, def.attributes[attr], v));
					}
				} else {
					ele.setAttribute(attr, def.attributes[attr]);
				}
			}}				
		}
				
		var superDef = null;
		for(var d = defs.length -1; d >=0; d--){	// 逐代设置 innerHTML
			var def = defs[d];
			var isBottom = (d == defs.length - 1), isTop = 0;
			
			if(isBottom){
				if(Molecule.debug) console.info(def.name + ' replace with ', def.html);
				ele.innerHTML = def.html;
			} else {
				if(Molecule.debug) console.info(def.name + ' replace with ', def.html);
				replaceHtml(ele, superDef && superDef.escapeTag ? unescapeTag(def.html, superDef.escapeTag) : def.html);
			}
			markScriptGen(ele, d);
			superDef = def;
		}		
		replaceHtml(ele, def && superDef.escapeTag ? unescapeTag(inner, def.escapeTag) : inner);
		if(Molecule.debug) console.info(def.name + ' become',ele.outerHTML);
		markScriptGen(ele, -1);
		
		
		ele.removeAttribute('molecule');
		
		// molecule 声明先创建子molecule的先创建子 molecule
		if(ele.hasAttribute('init-children-first')){
			ele.removeAttribute('init-children-first');
			Molecule.scanMolecules(ele, manual);
			ele.setAttribute('init-children-first', '');
		}
		
		Molecule.processing = true;					// 检查此变量确定是否在 molecule 过程中，如不在过程中可以跳过部分代码
		for(var d = defs.length -1; d >=0; d--){	// 逐代执行脚本
			var def = defs[d];
			Molecule.currentContainer = ele;
			evalDefScript(def);
			executeScriptsOfGen(ele, d);
		}
		executeScriptsOfGen(ele, -1);
		Molecule.currentContainer = null;
		Molecule.processing = false;
		
		if(ele.hasAttribute('molecule-obj') == false){
			ele.setAttribute('molecule-obj', defs[defs.length -1].fullname);	// 只用基类 molecule 作为 molecule-obj 的名称
		}
		
		if(!def.defined){
			def.html = removeDefineScript(def.html);
			def.defined = true;
		}
		
		$(ele).trigger('molecule-inited', [ele, def.fullname]);
		
		function replaceHtml(ele, innerHtml){
			var replaceInnerHtml = (ele.innerHTML.indexOf('<!-- {INNER_HTML} -->') != -1);		// Inner Html 替换点，实例自身的 html 默认放在最末尾，如果指定了替换点，则放置于替换点
			if(replaceInnerHtml){
				var insertPoint = null;
				for(var stk = [ele]; stk.length;){
					var c = stk.pop();
					if(c.nodeType == 8 && c.nodeValue.trim() == '{INNER_HTML}'){
						insertPoint = c;
						break;
					}
					for(var i=0; i<c.childNodes.length; i++){
						stk.push(c.childNodes[i]);
					}
				}
				var scripts = [];
				var p = insertPoint.previousSibling;				
				var r = insertPoint.parentNode.insertBefore(document.createElement("something"), insertPoint);
				r.outerHTML = innerHtml;
				insertPoint.remove();
			} else {
				ele.insertAdjacentHTML('beforeEnd', innerHtml);
			}			
		}
		
		function markScriptGen(ele, gen){
			$(ele).find('script').each(function(idx, script){
				if(!script.hasAttribute('gen')) script.setAttribute('gen', gen);
			});
		}
		
		function executeScriptsOfGen(ele, gen){
			$(ele).find('script[gen=' + gen + ']').each(function(idx, script){
				if(script.hasAttribute('done')) return;
				
				Molecule.currentContainer = ele;
				var copy = resetScript(script);
				copy.removeAttribute('gen');
				copy.setAttribute('done', true);
				Molecule.currentContainer = null;
			});
		}
		
		function evalDefScript(def){
			if(def.script){
				var script = document.createElement('script');
				script.setAttribute('molecule-for', def.fullname);
				var t = 'temp';
				ele.setAttribute('molecule-script-container', t);
				script.setAttribute('molecule-script-target', t);
				script.id = 'molecule';
				script.innerHTML = def.script;
				// if($(script).attr('molecule-for') == 'SearchButton') debugger;
				if(ele.nextElementSilbling){
					ele.parentElement.insertBefore(script, ele.nextElementSilbling);
				} else {
					ele.parentElement.appendChild(script);
				}
				ele.removeAttribute('molecule-script-container');
			}
		}
		
		return ele;
	}
	
	function combineValue(attr, baseValue, inheritedValue){
		if(attr == 'class' && inheritedValue && inheritedValue.charAt(0) == '+'){		// molecule="block" class="+ myclass"
			return (baseValue || '') + ' ' + inheritedValue.substr(1);
		} else if(attr == 'style' && inheritedValue && inheritedValue.charAt(0) == '+'){
			return (baseValue || '') + ' ' + inheritedValue.substr(1);
		} else {
			return inheritedValue;
		}
	}
	
	function unescapeTag(html, tags){	// 遇到 <m:th> 之类替换为 <th>
		var tags = tags.split(',');
		for(var i=0; i<tags.length; i++){
			var tag = tags[i];
			html = html
				.replace(new RegExp('<m\:' + tag + '([^>]*)>', 'gi'), '<' + tag + '$1>')
				.replace(new RegExp('</m\:' + tag + '>', 'gi'), '</' + tag + '>');
		}
		return html;
	}
	
	function ensureDepends(def){
		if(def.depends && def.depends.length){
			def.depends.forEach(function(depend){
				if(Molecule.defines[depend] == null){
					if(Molecule.loadModule(depend)){// 不需要显示写递归，如果引用进的分子需要辗转引用其它包，在初始化元素该分子时即会发生
						throw new Error('depend module ' + module + ' load failed, ' + def.name + ' cannot create');
					}
				}
			});
		}
	}
	
	function resetScripts(ele){		// 通过 insertAdjacentHTML 加入的 html中的script不会执行，通过该函数使之运行
		$(ele).find('script').each(function(idx, script){
				if(!script.hasAttribute('done')) {
					resetScript(script).setAttribute('done', true);
				}
			});
	}
	function resetScript(script){
		var p = script.parentElement;
		var copy = document.createElement('script');
		copy.innerHTML = script.innerHTML;
		for(var i=0; i<script.attributes.length; i++){
			var attr = script.attributes[i].name;
			copy.setAttribute(attr, script.getAttribute(attr));
		}
		var sibling = script.nextElementSilbling;
		script.remove();
		
		Molecule.currentScript = copy; 
		if(sibling) {
			p.insertBefore(copy, sibling);
		} else {
			p.appendChild(copy);
		}
		Molecule.currentScript = null;
		return copy;
	}
	
	function removeDefineScript(html){		// 移除以 // MOLECULE_DEF ... // MOLECULE_DEF_END 括号包围的部分
		if(html.indexOf('MOLECULE_DEF') == -1) return html;
		
		//return html.replace(/\/\/(\s*)MOLECULE_DEF(\s*)[\r\n|\r|\n](.|\s)*[\r\n|\r|\n]\s*\/\/\s*MOLECULE_DEF_END/g, '');
		
		//var reg = /\/\/\s*MOLECULE_DEF(.|\s)*\/\/\s*MOLECULE_DEF_END/m;
		//return html.replace(reg, '');		// js 不支持这么复杂的表达式，会死不会报错
		
		var reg1 = /\/\/\s*MOLECULE_DEF/, reg2 = /\/\/\s*MOLECULE_DEF_END/;
		var arr = html.split(/\r\n|\n|\r/g), arr2 = [];
		for(var i=0; i<arr.length; i++){
			if(reg1.test(arr[i])){
				for(i= i+1;i<arr.length; i++){
					if(reg2.test(arr[i])){
						i++;
						break;
					}
				}
			}
			arr2.push(arr[i]);
		}
		return arr2.join('\r\n');
	}
	
	function getIndexInParent(ele, parent){
		for(var pos = 0; pos < parent.children.length; pos ++){
			if(parent.children[pos] == ele) return pos;
		}
		return -1;
	}
}



while(Array.prototype.defCss == null){		// i dont known why plug this function always faild, so...
	/**
	 * 使用 js 定义 css
	* [{$ : 'p', color : 'red', 'font-size' : 'large'}, {$ : 'h1', color : 'blue'}];
	*/
	Array.prototype.defCss = function(container){
		container = container || document.head;
		var styleElement = document.createElement("style");
        styleElement.type = "text/css";
        container.appendChild(styleElement);
        
        var styleSheet = styleElement.sheet;
		for(var i=0; i<this.length; i++){
			var rule = this[i];
			var selector = rule.$;
			var rules = '';
			for(var attr in rule){ if(rule.hasOwnProperty(attr) && attr != '$'){
				rules += attr.replace(/_/g, '-') + ':' + rule[attr] + ';';
			}}
			if (styleSheet.insertRule)
	            styleSheet.insertRule(selector + ' {' + rules + '}', styleSheet.cssRules.length);
	        else if (styleSheet.addRule)
	            styleSheet.addRule(selector, rules);
	        			
		}
        return styleElement;
	}
}


$(document).ready(function(){
	Molecule.scanDefines();
	Molecule.scanMolecules();
	
	$(document).on('DOMNodeInserted', function(e){
		var target = (e.originalEvent.target || e.target);
		if(target.tagName){		// 可能嵌套于未声明为 molecule的元素中，<div><div molecule=...></div></div>, 仅能收到外层 div 的事件
			if(Molecule._scanningEle && $.contains(Molecule._scanningEle, target)) return;		// 正在扫描父元素，早晚会扫到它
			if(Molecule.debug) console.info('DOMNodeInserted ', e.target);
			setTimeout(function(){ // 还不太确定为什么 DOMNodeInserted 时，节点不能访问它的子节点(通过 innerHTML = 'xxx'插入的子节点),该问题还有待研究，先使用 setTimeout 化解
				if(Molecule._scanningEle && $.contains(Molecule._scanningEle, target)) return;
				Molecule.scanMolecules(target);
			}, 10);	
		}
	});
	
	
	$(document).on('DOMNodeRemoved', function(e){
		var target = (e.originalEvent.target || e.target);
		if(target.tagName){		// 可能嵌套于未声明为 molecule的元素中，<div><div molecule=...></div></div>, 仅能收到外层 div 的事件
			if($(target).is('[molecule-obj]')){
				var m = $(target).molecule();
				if(m) m.onDOMNodeRemoved();
			}
			$(target).find('[molecule-obj]').toArray().forEach(function(ele){
				var m = $(ele).molecule();
				if(m) m.onDOMNodeRemoved();
			});
		}
	});
});	
