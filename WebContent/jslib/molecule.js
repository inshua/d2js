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

	this.isMolecule = true;
	/**
	 * molecule 所附着的 html 元素的 jQuery 包装
	 * @type {jQueryElement} 
	 */
	this.$el = $(container);
	if(container == null) debugger;
	var me = this;
	
	this.onDOMNodeRemoved = function(){
		if(m.dispose){		// 对于不需要关注 dispose 活动的 molecule，无需自动 dispose
			if(me.$el.closest('[molecule-auto-dispose=false]').length) return;	// 不自动删除
			
			me.dispose();
			if(Molecule.debug) console.info(this.id, ' removed')
			Molecule.removeInstance(this);
		}
	}
	/**
	 * molecule原型
	 * @type {DOMElement} 
	 */
	this.moleculePrototype = null;
	
	this.$el.on('focus', function(ele){
		me.focus && me.onfocus();
	});
	this.$el.on('blur', function(ele){
		me.blur && me.onblur();
	});
	
	/**
	 * 移除 molecule
	 */
	this.release = function(){
		if(this.dispose) this.dispose();
		Molecule.removeInstance(this);
	}
}

Molecule.removeInstance = function(instance){
	var container = instance.el;
	if(container[instance.moleculePrototype.fullname] == instance){
		delete container[instane.moleculePrototype.fullname];
	}
	if(container[instance.moleculePrototype.name] == instance){
		delete container[instance.moleculePrototype.name];
	}
	if(container['moleculeInstance'] == instance){
		delete container['moleculeInstance'];
	}
};

+(function ( $ ) {
    $.fn.molecule = function() {
    	return this['moleculeInstance'];
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
 * @param parseOnServer {Boolean} 是否由服务器解析后提供定义，取 false 时在浏览器通过 DOMParser 解析
 * @returns {Boolean} 是否加载成功
 */
Molecule.loadHtml = function(res, parseOnServer){
	if(!parseOnServer) return Molecule.loadHtmlInBrowser(res);

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

/**
 * 加载指定 html 文件中的所有 molecule，将使用 extract.jssp。
 * @param html {string} 包含有 molecule 的 html 文件的文件路径。不用包含webapp路径。
 * @returns {Boolean} 是否加载成功
 */
Molecule.loadHtmlInBrowser = function(res){
	var result = false;
	var link = document.createElement('a');
	link.href = res;
	$.ajax({
		url : link.href,		
		method : 'post',
		async : false, cache : false,
		complete : function(resp, status){
			if(status == 'success'){
				var dom = new DOMParser().parseFromString(resp.responseText, 'text/html');
				Molecule.scanDefines(dom);				
				result = true;
			}
		}
	});
	return result;
}

Molecule.ready = function(element, handler){
	if(element.hasAttribute('molecule')) return;
	$(element).on('molecule-inited', handler);
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

Molecule.scanDefines = function(starter){
	Array.prototype.slice.call((starter || document).querySelectorAll('template')).forEach(
		function(template){
			var found = false;
			Array.prototype.slice.call(template.content.querySelectorAll('[molecule-def]')).forEach(function(el){
				Molecule.registerPrototype(el);
				el.remove();
				found = true;
			});

			if(found && template.content.childElementCount == 0){
				template.remove();
			}
		});
}

Molecule.registerPrototype = function(el){
	var fullname = el.getAttribute('molecule-def');
	var depends = el.getAttribute('molecule-depends');
	var escapeTag = el.getAttribute('escape-tag');
	if(escapeTag) el.removeAttribute('escape-tag');
	var styles = Array.prototype.slice.call(el.querySelectorAll('style')).map(function(style){
		style.remove();
		return style.innerHTML;
	}).join('\r\n');
	if(styles) {
		styles = "/*from molecule " + fullname + "*/\r\n" + styles;
		var style = document.createElement('style');
		style.innerHTML = styles;
		document.head.appendChild(style);
	}
	
	var r = Molecule.getModuleName(fullname);
	var m = Molecule.defines[r.module];
	if(m == null){
		m = Molecule.defines[r.module] = {};
	}
	console.log('define molecule ' + fullname);
	
	var script = el.querySelector('script[constructor]');
	if(script == null){
		var next = el.nextElementSibling;
		if(next && next.hasAttribute('molecule-for')){
			var moleculeFor =  next.getAttribute('molecule-for');
			if(moleculeFor == fullname || moleculeFor == r.name){
				script = next;
			}
		}
	}
	if(script){
		var fun = new Function(script.innerHTML);
		el.moleculeConstructor = fun;
		fun.extends = script.getAttribute('extends');
		script.remove();
	}
	Array.prototype.slice.call(el.querySelectorAll('script')).forEach(script => {
		document.head.appendChild(script);
		script.remove();
	});

	Molecule.definesByFullname[fullname] = m[r.name] = el;
	el.moleculeName = r.name;
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
			ensureDepends(def);
		} 
		if(!def){
			throw new Error(name + ' not found in ' + module + ', please check whether this molecule exists');
		}
		return def;
	}
	
	function createMolecule(target){
		if(Molecule.debug) console.log('------------------------------'); 
		var node = findMoleculeDef(target.getAttribute('molecule'));
		
		var mirror = target.cloneNode(false);
		
		var inner = target.innerHTML;
		if(Molecule.debug) console.info(node.name + ' outerHTML', target.outerHTML);
		
		if(target.hasAttribute('molecule-trace')) debugger;

		var defs = [node];
		while(node.hasAttribute('molecule')){
			node = findMoleculeDef(node.getAttribute('molecule'));
			defs.unshift(node);
		}
		if(Molecule.debug) {
			console.info('process ' + node.getAttribute('molecule') + ',hierachy path ' + defs.map(function(def){return def.getAttribute('molecule-def')}).join());
		}
		
		for(var d = 0; d <defs.length; d++){	// 逐代设置属性
			var node = defs[d];
			
			for(var i=0; i< node.attributes.length; i++){
				var attr = node.attributes[i].name;
				var v = target.getAttribute(attr);
				if(v){		// 应该覆盖的定义
					if(! mirror.hasAttribute(attr)){		// 是父类所赋予的属性而不是用户指定的，应当被子类覆盖
						target.setAttribute(attr, combineValue(attr, v, node.getAttribute(attr)));
					} else {
						target.setAttribute(attr, combineValue(attr, node.getAttribute(attr), v));
					}
				} else {
					target.setAttribute(attr, node.getAttribute(attr));
				}
			}
		}
				
		var snowball = defs[0].cloneNode(true);
		for(var d = 1; d <defs.length; d++){	// 逐代设置 innerHTML
			var node = defs[d];
			var isBottom = (d == defs.length - 1), isTop = 0;
			
			if(isBottom){
				// if(Molecule.debug) console.info(node.name + ' replace with ', node.html);
				applyTemplate(snowball, node);
			} else {
				// if(Molecule.debug) console.info(node.name + ' replace with ', node.html);
				applyTemplate(snowball, node);
			}
			superDef = node;
		}		
		applyTemplate(target, snowball); 
		// if(Molecule.debug) console.info(node.name + ' become',target.outerHTML);
		
		target.removeAttribute('molecule');
		if(target.hasAttribute('molecule-obj') == false) target.setAttribute('molecule-obj', node.getAttribute('molecule-def'));
		target.removeAttribute('molecule-def');

		// molecule 声明先创建子molecule的先创建子 molecule
		if(target.hasAttribute('init-children-first')){
			target.removeAttribute('init-children-first');
			Molecule.scanMolecules(target, manual);
			target.setAttribute('init-children-first', '');
		}
		
		Molecule.processing = true;				// 检查此变量确定是否在 molecule 过程中，如不在过程中可以跳过部分代码
		for(var d = 0; d < defs.length; d++){	// 逐代执行脚本
			createMoleculeInstance(defs[d]);
		}
		Molecule.processing = false;
		
		$(target).trigger('molecule-inited', [target, node.fullname]);
		
		function createMoleculeInstance(def){
			if(def.moleculeConstructor){
				var exists = target[def.moleculeName];
				if(exists){
					if(exists.moleculePrototype = def){
						throw new Error("already has an instanceof of " + def.moleculeName)
					}
				}
				var m = null;
				if(def.moleculeConstructor.extends){
					m = target[def.moleculeConstructor.extends];
				} else {
					m = new Molecule(target);
				}
				if(m == null) debugger;
				m.moleculePrototype = def;
				def.moleculeConstructor.call(m);
				target[def.getAttribute('molecule-def')] = m;
				if(!exists) target[def.moleculeName] = m;
				if(target['moleculeInstance'] == null) {
					target['moleculeInstance'] = m;
				}
			}
		}

		function applyTemplate(target, src){
			var mirror = src.cloneNode(true);
			mirror.querySelectorAll('[molecule-placeholder]').forEach(function(holder){
				var id = holder.getAttribute('molecule-placeholder');
				var replacer = null;
				if(id == null){
					replacer = target.querySelector('[molecule-replace]'); 
				} else {
					replacer = target.querySelector('[molecule-replace=' + id + ']'); 
				}
				if(replacer != null){
					copyAttributes(holder, replacer, false);
					replacer.removeAttribute('molecule-replace');
					replacer.removeAttribute('molecule-placeholder');
					replaceNode(holder, replacer);
				}
			});
			mirror.querySelectorAll('[molecule-socket]').forEach(function(socket){
				var id = socket.getAttribute('molecule-socket');
				var plug = null;
				if(id == null){
					plug = target.querySelector('[molecule-plug]'); 
				} else {
					plug = target.querySelector('[molecule-plug=' + id + ']');
				}
				if(plug != null){
					var p = plug;
					if(p.tagName == 'TEMPLATE') p = plug.content;
					socket.removeAttribute('molecule-socket');
					Array.prototype.slice.call(p.childNodes).forEach(child => socket.appendChild(child));
					plug.remove();
				}
			});
			
			var p = mirror.querySelector('molecule-placeholder');
			if(p){
				target.childNodes.forEach(function(child){
					p.parentNode.insertBefore(child, p);
				});
				p.remove();
			} else {
				Array.prototype.slice.call(target.childNodes).forEach(child => mirror.appendChild(child));
			}
			Array.prototype.slice.call(mirror.childNodes).forEach(child => target.appendChild(child));
		}

		function copyAttributes(src, dest, override){
			for(var i=0; i< src.attributes.length; i++){
				var attr = src.attributes[i].name;
				var v = dest.getAttribute(attr);
				var srcValue = src.getAttribute(attr)
				if(!dest.hasAttribute(attr) || override || v.startsWith('+')){
					dest.setAttribute(attr, combineValue(attr, srcValue, v));
				} else {
					dest.setAttribute(attr, srcValue);
				}
			}
		}

		function replaceNode(origin, newNode){
			origin.parentNode.insertBefore(newNode, origin);
			origin.remove();
		}
		
		return target;
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
}

Molecule.allOf = function(ele){
	var r = []
	for(var k in ele){if(ele.hasOwnProperty(k) || k != 'moleculeInstance'){
		var v = ele[k];
		if(v && v.isMolecule){
			r.push(k);
		}
	}}
	return r;
}

$(document).ready(function(){
	Molecule.scanDefines();
	Molecule.scanMolecules();
	
	$(document).on('DOMNodeInserted', function(e){
		var target = (e.originalEvent.target || e.target);
		if(target.tagName){		// 可能嵌套于未声明为 molecule的元素中，<div><div molecule=...></div></div>, 仅能收到外层 div 的事件
			if(Molecule._scanningEle && $.contains(Molecule._scanningEle, target)) return;		// 正在扫描父元素，早晚会扫到它
			if(Molecule.debug) console.info('DOMNodeInserted ', e.target);
			Molecule.scanMolecules(target);
		}
	});
	
	
	$(document).on('DOMNodeRemoved', function(e){
		var target = (e.originalEvent.target || e.target);
		if(target.tagName){		// 可能嵌套于未声明为 molecule的元素中，<div><div molecule=...></div></div>, 仅能收到外层 div 的事件
			if(target.molecule){
				Molecule.allOf(target).forEach(function(m){m.onDOMNodeRemoved();});
			}
			target.querySelectorAll('[molecule-obj]').forEach(ele =>{
				Molecule.allOf(ele).forEach(function(m){m.onDOMNodeRemoved();});
			});
		}
	});
});	
