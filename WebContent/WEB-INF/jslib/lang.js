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
// ================= 扩充函数 ========================
/**
 * 根据判据函数查找满足条件的序号。如果没有找到返回 -1。
 * 用法:
 * ```js
 * [1, 2, 3, 4].find(function(item, index){
 * 		return item % 2 == 0;
 * });
 * ```
 * 得到 1。
 * @param fn {function} ***function(item, index) { return boolean}***
 * @returns {Object}
 */
Array.prototype.findIndex = function(fn, scope){
	for(var i=0; i< this.length; i++){
		if(fn.call(scope, this[i], i)) return i;
	}
	return -1;
};

/**
 * 根据判据函数查找满足条件的元素。如果没有找到返回 undefined。
 * 用法:
 * ```js
 * [1, 2, 3, 4].find(function(item, index){
 * 		return item % 2 == 0;
 * });
 * ```
 * 得到 2。
 * @param fn {function} ***function(item, index) { return boolean}***
 * @returns {Number}
 */
Array.prototype.find = function(fn, scope){
	for(var i=0; i< this.length; i++){
		if(fn.call(scope, this[i], i)) return this[i];
	}
};


/**
 * 找出两个数组（集合）的变化。
 * 例如
 * ```js 
 *     [1,2,3].diff([3,4])
 * ``` 
 * 得到
 * ```js 
 * 	   {appended : [4], removed : [1,2]}
 * ```
 * @param newArray {array} 新版本的数组
 * @returns {Object} {appended : [], removed : []}
 */
Array.prototype.diff = function(newArray){
	var n = [], r = [];
	for(var i=0; i<this.length; i++){
		if(newArray.indexOf(this[i]) == -1){
			r.push(this[i]);
		}
	}
	for(var i=0; i<newArray.length; i++){
		if(this.indexOf(newArray[i]) == -1){
			n.push(newArray[i]);
		}
	}
	return {appended : n, removed : r};
}

/**
 * 去除数组中所有相同的元素,得到新数组
 */
Array.prototype.distinct = function(){
	var arr = [];
	for(var i=0; i<this.length; i++){
		if(arr.indexOf(this[i]) == -1){
			arr.push(this[i]);
		}
	}
	return arr;
}

/**
 * 得到按属性的索引，如:
 * 		[{name: 'mike', phone: '12233'}, {name: 'tom', phone: '53332'},].indexOf('phone') 
 * 得到：
 * 		{'12233' : {name: 'mike', phone: '12233'}, '53332': {name: 'tom', phone: '53332'}}
 * 这里值部分为对象引用。
 */
Array.prototype.indexBy = function(key){
	var result = {};
	for(var i=0; i<this.length; i++){
		var el = this[i];
		var v = el[key];
		if(v != null && v != ''){
			result[v] = el;
		}
	}
	return result;
}

/**
 * 将当前对象与另一对象合并，另一对象的属性复制到本对象。
 * narshorn 的bug，当使用 JSON.parse(obj, parseDate) 后，随着 merge 的引入，就会出现堆栈溢出
 * 所以采用 defineProperty 的方式声明该成员不可枚举，无法被 JSON.stringify
 * @param b 另一对象
 * @param override 仅复制本对象没有的属性。
 * @returns {Object} 当前对象本身
 */
Object.defineProperty(Object.prototype, 'merge', {value: function(b, override){
	for(var k in b){
		if(override != false || k in this == false){
			this[k] = b[k];
		}
	}
	return this;
}, enumerable: false});

if (typeof Object.assign != 'function') {
  Object.assign = function(target, varArgs) { // .length of function is 2
    if (target == null) { // TypeError if undefined or null
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource != null) { // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

var JsTypeUtil = Java.type('org.siphon.common.js.JsTypeUtil');
/**
 * 将本对象转为Java对象，为 JsTypeUtil.jsObjectToJava 的包装。
 * 很多库，比如activiti，都需要传递 Map<String, Object>等，采取本方式可以写作:
 *   submit({username: xxx, password: ''}.toJava())
 *   
 * (未实现)如对象已有 _java_type 说明，则自动取该说明指定的对象类型。如 {_java_type: 'com.my.entity.Person', name:'Mike'}.toJava() 可得到类型为 com.my.entity.Person 的对象。
 * @param [selfType] {Java.type|string} Java.type('') 返回值, or java class name。对数组默认为 ArrayList，对对象默认为 HashMap<String,Object>。
 * @param [elementType] {Java.type|string} Java.type('') 返回值, or java class name. 对数组默认为 ArrayList，对对象默认为 HashMap<String,Object>。
 * @returns {Object} java object
 */
Object.defineProperty(Object.prototype, 'toJava', {value: function(selfType, elementType){
	return JsTypeUtil.jsObjectToJava(this);
}, enumerable: false});


var jsTypeUtil = new JsTypeUtil(engine);
(function(){
	/**
	 * 从Java对象（Map<String,Object>, List,数组等）转换得到Js对象
	 * @param b 另一对象
	 * @returns {Object} 当前对象本身
	 */
	Object.fromJava = function(javaObj){
		return jsTypeUtil.javaObjectToJs(javaObj);
	}
})();

if(!String.prototype.trim){
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

String.prototype.contains = function(t) { 
	return this.indexOf(t) >= 0; 
};

String.prototype.toHtml = function(){
	return this.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\r\n|\r|\n/g, '<br>');
}

String.prototype.repeat = function(count){
	var arr = []
	for(var i=0; i< count; i++) arr.push(this);
	return arr.join('');
}

/**
 * 格式化字符串。
 * Usage:
 * ```js
 *   alert('Program: {key1} {key2}'.format({ 'key1' : 'Hello', 'key2' : 'World' }));
 * ```
 * @param values
 * @returns {String}
 */
String.prototype.format = function (values) {

    var regex = /\{([\w-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g;

    var getValue = function (key) {
            if (values == null || typeof values === 'undefined') return null;

            var value = values[key];
            var type = typeof value;

            return type === 'string' || type === 'number' ? value : null;
        };

    return this.replace(regex, function (match) {
        //match will look like {sample-match}
        //key will be 'sample-match';
        var key = match.substr(1, match.length - 2);

        var value = getValue(key);

        return value != null ? value : match;
    });
};

/**
 * 通过排序得到的新数组
 * @param fn {function} 排序函数，与 Array.prototype.sort 同
 * @param [scope] {object} 传入的 this 对象
 * @returns {Array}
 */
Array.prototype.orderBy = function(fn, scope) {
	var result = this.slice();
	result.sort(function(){fn.apply(scope, arguments);});
	return result;
};

/**
 * 使Error对象能Json化，see http://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
 */
Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        var alt = {};

        Object.getOwnPropertyNames(this).forEach(function (key) {
            alt[key] = this[key];
        }, this);

        return alt;
    },
    configurable: true
});

/**
 * 表示失败的错误
 */
function FailedError(message){
	Error.prototype.constructor.call(this);
	this.name = 'FailedError';		
	this.message = message;
}

/**
 * 表示致命错误的错误
 */
function FatalError(message){
	Error.prototype.constructor.call(this);
	this.name = 'FatalError';
	this.message = message;
}

/**
 * 多个错误
 */
function MultiError(errors){
	Error.prototype.constructor.call(this);
	this.name = 'MultiError';
	this.errors = errors || [];
	this.toString = function(){
		return '(MutiError '  + this.errors + ')';
	}
}

/**
 * 校验错误
 */
function ValidationError(field, validator, message){
	this.name = 'ValidationError';
	this.field = field;
	this.validator = validator;
	this.message = message;
}

var Throwable = Java.type('java.lang.Throwable'), 
	ScriptException = Java.type('javax.script.ScriptException'),
	ECMAException = Java.type('jdk.nashorn.internal.runtime.ECMAException'),
	StackTraceElement = Java.type('java.lang.StackTraceElement');

/**
 * 将 js 错误包装为可用的 java 错误, 以便在 logger.error(msg, warpJsError(error)) 中使用
 * @param e {Error} js error
 * @returns {ECMAException}
 */
function wrapJsError(e){
	if(Throwable.class.isInstance(e)) return e;
	
	if(e instanceof Error){
		var ecmaException = ECMAException.create(e, e.fileName, e.lineNumber, e.columnNumber);
		var stack = e.stack.split(/\r\n|\n|\r/);
		var javaStack = [];
		for(var i=0;i<stack.length; i++){
			var line = stack[i];
			var match = /at\s(.+)\s\((.*):(\d+)\)/.exec(line);
			if(match){
				var stackElement = new StackTraceElement('<nashorn>', match[1], match[2], match[3]);
				javaStack.push(stackElement);
			}
		}
		ecmaException.setStackTrace(Java.to(javaStack, 'java.lang.StackTraceElement[]'));
		return ecmaException;
	} else {
		return new ECMAException(e, null);
	}
}

/**
 * wrapJsError 的别名
 * @param e {Error} js error
 * @returns {ECMAException}
 */
Error.toJava = wrapJsError;
Object.defineProperty(Error, 'toJava', {value: wrapJsError, enumerable: false});



/**
 * 对对象的属性名做映射, 得到一个新对象. 
 * 如
 * ```js
 * 	translateObject({name : 'Mike', gender : 'M'}, ['name', 'gender'], ['姓名', '性别'])
 * ```
 * 得到 `{姓名 : 'Mike', 性别 :'M'}`
 * @param obj {object} 原对象
 * @param originAttrs {string[]} 原属性名列表, 数组
 * @param map {string[]} 映射后的属性名列表, 数组
 */
function translateObject(obj, originAttrs, map){
	var result = {};
	for(var i=0; i< originAttrs.length; i++){
		result[map[i]] = obj[originAttrs[i]];
	}
	return result;
}

