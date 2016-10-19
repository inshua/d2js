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
 *服务器端校验器。 Validation。别名 $V
 * 
 *使用方法:
 *```js
 * $V(this, rcd,{ 
 * 			name  : [V.notNull, V.shortest(5), V.unique('table')],
 * 			qq	  : V.notNull,
 * 			email : [V.notNull, V.email],
 * 	  })
 *```
 * @class V
 * @alias Validation
 */
function V(d2js, rcd, validators){
	for(var fld in validators){
		if(validators.hasOwnProperty(fld)){
			var value = rcd[fld];
			if(fld.indexOf(',') != -1){
				value = fld.split(',').reduce(function(value, fld){return value != null ? value[fld] : value}, rcd);
			}
			var vs = validators[fld];
			vs = (vs.push ? vs : [vs]);	 	// use push test is array
			for(var i=0; i<vs.length; i++){
				var validator = vs[i];
				if(validator.check){
					var msg = validator.check(value, fld, rcd, d2js);
					if(msg != null){
						throw new ValidationError(fld, validator.name, msg);
					}
				} else {
					logger.error("there is no check function on field {fname} {idx}".format({fname : fld, idx : i}));
				}
			}
		}
	}
}

/**
 * &nbsp; {@link V} 的别名。为了让校验这种功能性代码容易辨识，定义一个别名。
 */
var $V = V;	

/**
 * 非空检验器 
 * @memberof V
 */
V.notNull = {
	name : 'notNull',
	check : function(v, fld){ 
		if(v === 0) return;
		if(v === null || v == '' || typeof v == 'undefined') return '此处不允许为空'; 
	}
};

/**
 *email 检验器
 *@memberof V 
 */
V.email = {
	name : 'email',
	reg : /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/,
	check : function(v, fld){
		if(v==null||v=='') return;
		if(! this.reg.test(v)){
			return '此处应为合法的电子邮箱地址'; 
		}
	}
};

/**
 * 正则表达式检验器: `V.reg(/正则表达式/, '不符合指定的格式')`
 *@memberof V 
 */
V.reg = function(reg, desc){
	return {
		name : 'reg',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(! reg.test(v)){
				return desc; 
			}
		}
	};
};

/**
 * UNIQUE 唯一性满足检验器。 
 * 假定 当插入时，rcd.id 还没有值；当更新时，rcd.id 总有值。此时用法如：
 * ```js
 * unique('table')			// 数据库实际字段名与输入的字段名相同
 * unique('table', 字段名);	// 数据库实际字段名与输入的字段名不同
 * ```
 * 如为其它情形，应在更新时明确提供主键字段名及值，插入时也要提供。
 * 例如： 
 * ```js
 * unique('table', 'name', {no : 20}) 指示使用 no 作为主键，原值为 20。 用于更新。
 * unique('table', 'name', {no : null}) 同上，用于插入。
 * ```
 * @param table {string} 表名
 * @param tableField {string} 字段名。如与传入字段名相同可不填。
 * @param [primaryDesc]{object} 主键与值
 * @param [ignoreCase=false]{bool} 是否忽略大小写. 比较字符串时可以提供该参数.
 * @returns {String} 
 */
V.unique = function(table, tableField, primaryDesc, ignoreCase){	
	return {
		name : 'unique',	
		check : function(v, fld, rcd, d2js){
			if(v==null||v=='') return;
			var pk = 'id';
			if(primaryDesc == null){
				primaryDesc = {id : rcd.id};
			} else {
				for(var k in primaryDesc){
					if(primaryDesc.hasOwnProperty(k)){
						pk = k;
						break;
					}
				}
			}
			
			if(d2js.executor.isOracle()){
				var sql = 'select 1 from ' + table + ' where ' + (tableField || fld) + ' = ? and rownum=1';
				if(ignoreCase){
					sql = 'select 1 from ' + table + ' where upper(' + (tableField || fld) + ') = ? and rownum=1';
				}

				if(primaryDesc[pk] != null){
					sql += ' and ' + pk + ' <> ?';
				}
			} else if(d2js.executor.isPostgreSQL()){
				var sql = 'select 1 from ' + table + ' where ' + (tableField || fld) + ' = ?';
				if(ignoreCase){
					sql = 'select 1 from ' + table + ' where upper(' + (tableField || fld) + ') = ?';
				}
				if(primaryDesc[pk] != null){
					sql += ' and ' + pk + ' <> ?';
				}
				sql += ' limit 1';
			}
			
			
			var r = (primaryDesc[pk] == null) ? 
					d2js.query(sql, [ignoreCase ? (v && v.toUpperCase()) : v]) : 
					d2js.query(sql, [v, primaryDesc[pk]]);
					
			if(r.rows.length){
				return '取值为' + v + '的记录已经存在';
			}
		}
	};
};

/**
 * 文本长度检查器。不能超过 size。 (<=size)
 * @param size {number}
 * @returns {String} 
 */
V.longest = function(size){
	return {
		name : 'textlen',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.length > size){
				return '此处长度不能超过 ' + size;
			}
		}
	};
};

/**
 * 文本长度检查器。不能短于 size。 (>=size)
 * @param size {number}
 * @returns {String} 
 */
V.shortest = function(size){
	return {
		name : 'textlen',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.length < size){
				return '此处长度不能短于 ' + size;
			}
		}
	};
};

/**
 * 数值检查器。 必须 <= 规定数值。
 * @param size {number | string } number - 数值具体值， string - 另一字段名
 * @returns {String} 
 */
V.most = function(maxValue){
	return {
		name : 'numrange',
		check : function(v, fld){
			if(v==null||v=='') return;			
			var msg = '值不能超过' + maxValue;
			
			if(maxValue != null){
				if(isNaN(maxValue) && maxValue.substr){
					maxValue = rcd[maxValue];
				}
				if(v > maxValue) return msg;
			}
		}
	};
};

/**
 * 数值检查器。 必须 >= 规定数值。
 * @param minValue {(number|string)} number - 数值具体值， string - 另一字段名
 * @returns {String} 
 */
V.atLeast = function(minValue){
	return {
		name : 'numrange',
		check : function(v, fld){
			if(v==null||v=='') return;
			var msg = '应输入大于' + minValue +'的数据';
			
			if(minValue != null){
				if(isNaN(minValue) && minValue.substr){
					minValue = rcd[minValue];
				}
				if(v < minValue) return msg;
			}
			
		}
	};
};

/**
 * 数值检查器。必须 >= minValue && < maxValue
 * @param minValue {(number|string|null)} number - 数值具体值， string - 另一字段名， null - 忽略该参数
 * @param maxValue {(number|string|null)} number - 数值具体值， string - 另一字段名， null - 忽略该参数
 * @returns {String} 
 */
V.between = function(minValue, maxValue){
	return {
		name : 'numrange',
		check : function(v, fld, rcd){
			if(v==null||v=='') return;
			
			var msg = '值应位于' + minValue + ' 和 ' + maxValue + ' 之间';
			
			if(minValue != null){
				if(isNaN(minValue) && minValue.substr){
					minValue = rcd[minValue];
				}
				if(v < minValue) return msg;
			}
			if(maxValue != null){
				if(isNaN(maxValue) && maxValue.substr){
					maxValue = rcd[maxValue];
				}
				if(v >= maxValue) return msg;
			}			
		}
	};
};

/**
 * 散值取值范围检查器。取值必须位于所给数组中。
 * @param dict {array} 取值范围数组。如 `['M', 'F']`
 * @param msg {(string | null)} 错误消息 
 * @returns {String} 
 */
V.inside = function(dict, msg){
	return {
		name : 'numrange',
		check : function(v, fld){
			if(dict.indexOf(v) == -1){
				return msg || '取值不是合法选项';
			}
		}
	};
};

/**
 * 对象属性名称范围检查器。JSON类型的对象，其属性必须位于所给的数组范围
 * usage:
 * 
 * $V(this, rcd, {json_fld: V.attrs(['email', 'tel'])});
 * @param dict 属性名称列表
 */
V.attrs = function(dict){
	return {
		name : 'attrrange',
		check : function(obj){
			for(var attr in obj){if(obj.hasOwnProperty(attr)){
				if(dict.indexOf(attr) == -1){
					return '属性' + attr + '不是合法选项';
				}
			}}
		}
	};
}


/**
 * 服务器端类型转换器，如转换失败则抛错，这组工具会修改 record 的值，同时具备转换和校验的功能。
 * 
 * 使用方法:
 * ```js
 * $V(this, rcd,{ 
 * 			name  : [T.string, V.notNull, V.shortest(5), V.unique('table')],
 * 			qq	  : T.number(20),
 * 			email : [V.notNull, V.email],
 * 			telphones : [T.array],
 * 			tag : [T.object, T.json],		// 先将 object 从字符串转为 js 对象，再加上 $JSON() 引用 
 * 	  })
 * ```
 * 
 * @class T
 */
function T(){}

/**
 * 将数据转换为整数
 */
T.int = {
      name : 'int',
      check : function(v, fld, rcd){
			var n = v * 1;
			if(isNaN(n)) return '此处需要填入整数';
			if(n != Math.floor(n)) return '数字' + n +'不是整数'
			rcd[fld] = n;
      }
}

/**
 * 将数据转为字符串，如为 '' 转为 null
 */
T.string = {name : 'string', check : function(v, fld, rcd){
	if(v == null){
		rcd[fld] = null;
	} else {
		rcd[fld] = v + '';
	}
}}

/**
 * 将原本是数组的数据套上 `$ARRAY()` 标记，如为字符串，将试图 JSON.parse 为数组
 */
T.array = function(elementType){
	return {
		name : 'array', 
		check : function(v, fld, rcd){
			if(v != null){
				if(typeof v == 'string'){
					try{
						v = JSON.parse(v, parseDate);
					}catch(e){
						return '\"' + v + '\"不是合法的JSON字符串';				
					}
				} 
				if(v instanceof Array){
					rcd[fld] = $ARRAY(elementType, v);
				} else {
					return '此处需要填入数组'
				}
			}
		}
	}
}

/**
 * 将JSON字符串转为对象，如果原本是对象则不转换。
 */
T.object = { name : 'object', check : function(v, fld, rcd){
	if(v != null){
		if(typeof v == 'string'){
			try{
				v = JSON.parse(v, parseDate);
			}catch(e){
				return '\"' + v + '\"不是合法的JSON字符串';				
			}
		}
	}
	rcd[fld] = v;
}}

/**
 * 将JS对象套上 $JSON() 壳，如为字符串，将试图使用 JSON.parse 转为 JS 对象
 */
T.json = {name : 'json', check : function(v, fld, rcd){
	if(v != null){
		if(typeof v == 'string'){
			try{
				v = JSON.parse(v, parseDate);
			}catch(e){
				return '\"' + v + '\"不是合法的JSON字符串';				
			}
		} 
		rcd[fld] = $JSON(v);
	}
}}

/**
 * 将JS对象套上 $JSONB() 壳，如为字符串，将试图使用 JSON.parse 转为 JS 对象
 */
T.jsonb = {name : 'json', check : function(v, fld, rcd){
	if(v != null){
		if(typeof v == 'string'){
			try{
				v = JSON.parse(v, parseDate);
			}catch(e){
				return '\"' + v + '\"不是合法的JSON字符串';				
			}
		} 
		rcd[fld] = $JSONB(v);
	}
}}

/**
 * 检查数据为 Date 格式。如果为字符串，将先后按 JSON.parse 和 Date.parse 转换，全部失败则失败。
 */
T.date = {name : 'date', check : function(v, fld, rcd){
	if(v != null){
		if(typeof v == 'string'){
			try{
				v = JSON.parse(v, parseDate);
			}catch(e){
				try{
					v = Date.parse(v);
				}catch(e){
					return '\"' + v + '\"不是合法的日期格式字符串';	
				}
			}			
		} 
		if(!v instanceof Date){
			return '此处需要输入日期';
		}
		rcd[fld] = v;
	}
}}


/**
 * 检查数据为 Boolean 格式。与js逻辑不同，字符串只接受 true,false,yes,no及其首字母。
 */
T.boolean = {
         name : 'boolean',
         check : function(v, fld, rcd){
   			var r = false;
   			switch(typeof v){
   			case 'boolean': r = v; break;
   			case 'string':
   				v = v.toLowerCase();
   				if(v == 'false' || v == 'f' || v == 'n' || v == 'no' || v == ''){
   					r = false;
   				} else if (v == 'true' || v == 't' || v == 'y' || v == 'yes'){
   					r = true;
   				} else if(!isNaN(v * 1)){
   					r = (v * 1 == 0);
   				} else {
   					return '不能识别的逻辑值';
   				}
   				break;
   			case 'number':
   				r = (v == 0);
   				break;
   			case 'object':
   				return '不能识别的逻辑值';
   			}
   			rcd[fld] = r;
         }
   }

V.noSql = {
           name : 'nosql',
           check: function(v){
        	   
           }
}