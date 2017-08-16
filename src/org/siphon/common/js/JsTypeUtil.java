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
package org.siphon.common.js;

import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Base64.Decoder;
import java.util.Date;
import java.util.Map;
import java.util.regex.Pattern;

import javax.script.Bindings;
import javax.script.CompiledScript;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.apache.commons.lang3.ArrayUtils;
import org.bson.BsonArray;
import org.bson.BsonBinary;
import org.bson.BsonBoolean;
import org.bson.BsonDateTime;
import org.bson.BsonDocument;
import org.bson.BsonDouble;
import org.bson.BsonInt32;
import org.bson.BsonInt64;
import org.bson.BsonNull;
import org.bson.BsonObjectId;
import org.bson.BsonRegularExpression;
import org.bson.BsonString;
import org.bson.BsonValue;
import org.bson.types.ObjectId;
import org.siphon.jssql.SqlExecutorException;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeDate;
import jdk.nashorn.internal.objects.NativeNumber;
import jdk.nashorn.internal.objects.NativeRegExp;
import jdk.nashorn.internal.objects.NativeString;
import jdk.nashorn.internal.runtime.ConsString;
import jdk.nashorn.internal.runtime.ScriptFunction;
import jdk.nashorn.internal.runtime.ScriptObject;
import jdk.nashorn.internal.runtime.Undefined;

public class JsTypeUtil {

	private NashornScriptEngine engine;
	private ScriptObjectMirror arrayConstructor;
	private ScriptObjectMirror objectConstructor;

	private ScriptObjectMirror dataTableConstructor;
	
	private ScriptObjectMirror newRegExp;
	private CompiledScript newDate;
	private Object global;

	public JsTypeUtil(ScriptEngine jsEngine) {
		this.engine = (NashornScriptEngine) jsEngine;
		try {
			Bindings b = engine.getContext().getBindings(ScriptContext.ENGINE_SCOPE);
			this.arrayConstructor = (ScriptObjectMirror) b.get("Array");
			this.objectConstructor = (ScriptObjectMirror) b.get("Object");
			this.newDate = this.engine.compile("new Date()");
			this.global = JsEngineUtil.getGlobal(jsEngine);
		} catch (Exception e) {
			e.printStackTrace();
			// logger.error("", e);
		}

	}

	public ScriptObjectMirror newArray(Object... objects) throws ScriptException {
		ScriptObjectMirror arrayMirror = (ScriptObjectMirror) this.arrayConstructor.newObject();
		NativeArray array = arrayMirror.to(NativeArray.class);
		for (int i = 0; i < objects.length; i++) {
			// NativeArray.push(array, objects[i]);
			arrayMirror.callMember("push", objects[i]);
		}
		return arrayMirror;
	}

	public static Object getSealed(ScriptObjectMirror scriptObjectMirror) {
		try {
			return scriptObjectMirror.to(Object.class);
		} catch (Exception e) {
			return null;
		}
	}

	public ScriptObjectMirror newObject() throws ScriptException {
		return (ScriptObjectMirror) this.objectConstructor.newObject();
	}

	public ScriptObjectMirror newDataTable() {
		if (this.dataTableConstructor == null) {
			this.dataTableConstructor = (ScriptObjectMirror) ((ScriptObjectMirror) this.engine.get("D2JS")).get("DataTable");
		}
		return (ScriptObjectMirror) this.dataTableConstructor.newObject();
	}

	public static boolean isNull(Object object) {
		if (object == null)
			return true;
		if (object instanceof ScriptObjectMirror) {
			ScriptObjectMirror m = (ScriptObjectMirror) object;
			if (m.isInstanceOf(NativeString.class) && m.isEmpty())
				return true; // 空字符串（空数组 isEmpty() 为 true)
			if (ScriptObjectMirror.isUndefined(m)) { // 实际上总是返回 null，不会返回
														// undefined
				return true;
			}
		}

		if (object instanceof String && ((String) object).length() == 0) // 即使是字符串会返回
																			// sobj
																			// 为
																			// NativeString
																			// 的
																			// SOM
			return true;

		if (object instanceof Undefined) {
			return true;
		}
		return false;
	}
	
	public Object toNativeDate(double time) throws ScriptException{
		ScriptObjectMirror m =  (ScriptObjectMirror) newDate.eval();
		NativeDate.setTime( m.to(NativeDate.class), time);
		return m;
	}
	
	public static long getTime(ScriptObjectMirror nativeDate){
		return (long)NativeDate.getTime(((ScriptObjectMirror)nativeDate).to(NativeDate.class));		
	}
	
	public static long getTime(NativeDate nativeDate){
		return (long)NativeDate.getTime(nativeDate);		
	}
	
	public static boolean isNativeDate(Object o){
		return o instanceof NativeDate || (o instanceof ScriptObjectMirror && ((ScriptObjectMirror)o).to(Object.class) instanceof NativeDate);
	}

	public static boolean isTrue(Object obj) {
		if (JsTypeUtil.isNull(obj))
			return false;

		if (obj instanceof Boolean) {
			return (Boolean) obj;
		} else if (obj instanceof Number) {
			return ((Number) obj).intValue() != 0;
		} else {
			return true;
		}
	}

	public ScriptObjectMirror bytesToNativeArray(byte[] arr) throws ScriptException {
		ScriptObjectMirror result = this.newArray();
		NativeArray array = result.to(NativeArray.class);
		for (int i = 0; i < arr.length; i++) {
			NativeArray.push(array, arr[i]);
			// result.callMember("push", arr[i]);
		}
		return result;
	}

	// 现在可以使用 Jata.type('byte[]') ... 了, 也可使用 Java.to([1,2,3], "int[]")
	public byte[] allocateBytes(int length) {
		return new byte[length];
	}

	// 现在可以使用 Java.type('Object []')
	public Object[] allocateObjectArray(int length) {
		return new Object[length];
	}

	public static int getArrayLength(NativeArray arr) {
		Object length = arr.getLength();
		if (length instanceof Long) {
			return ((Long) length).intValue();
		} else if (length instanceof Integer) {
			return (Integer) length;
		} else {
			return Integer.parseInt(length.toString());
		}
	}

	// 将js对象转换为 HashMap<String,Object> 和 List<Object>等java语言的事物
	private static Object jsObjectToJava(ScriptObjectMirror object) throws UnsupportedConversionException {
		if (!object.containsKey("_d2js_type")) {
			if (object.isArray()) {
				return jsObjectToJava(object.to(NativeArray.class));
			}
			Object sealed = object.to(Object.class);
			if (sealed instanceof ScriptObject) {
				return jsObjectToJava((ScriptObject) sealed);
			} else {
				return jsObjectToJava(sealed);
			}
		} else {
			String type = object.get("_d2js_type").toString();
			Object value = object.get("value");
			return jsObjectToJava(type, value);
		}
	}

	private static Object jsObjectToJava(ScriptObject object) throws UnsupportedConversionException {
		if (object.containsKey("_d2js_type")) {
			String type = object.get("_d2js_type").toString();
			Object value = object.get("value");
			return jsObjectToJava(type, value);
		}

		if (object instanceof NativeDate) {
			return jsObjectToJava((NativeDate) object);
		}

		if (object instanceof NativeArray) {
			return jsObjectToJava((NativeArray) object);
		}

		if (object instanceof NativeRegExp) {
			return jsObjectToJava((NativeRegExp) object);
		}

		if (object instanceof ScriptFunction) {
			return jsObjectToJava((ScriptFunction) object);
		}

		if (object instanceof NativeString) {
			return jsObjectToJava((NativeString) object);
		}
		
		Map<String, Object> result = new HashMap<>();
		String[] names = object.getOwnKeys(false);
		for (int i = 0; i < names.length; i++) {
			String name = names[i];
			Object value = object.get(name);
			result.put(name, jsObjectToJava(value));
		}
		return result;
	}

	private static Object jsObjectToJava(String type, Object value) throws UnsupportedConversionException {
		if ("STRING".equals(type)) {
			return value.toString();
		} else if ("DECIMAL".equals(type)) {
			if (value instanceof Double) {
				return value;
			} else {
				return Double.parseDouble(value + "");
			}
		} else if ("INT".equals(type)) {
			if (value instanceof Double) {
				if (((Double) value).isNaN()) {
					return Double.NaN;
				} else {
					return (Integer) (((Double) value).intValue());
				}
			} else {
				return new BsonInt32(new Integer(value + ""));
			}
		} else if ("BOOLEAN".equals(type)) {
			return JsTypeUtil.isTrue(value);
		} else if ("DOUBLE".equals(type) || "FLOAT".equals(type)) {
			if (value instanceof Double) {
				return (Double) value;
			} else {
				return new Double(value + "");
			}
		} else if ("DATE".equals(type)) {
			long t = parseDate(value);
			return new Date(t);
		} else if ("TIME".equals(type)) {
			return new Date(parseTime(value));
		} else if ("BINARY".equals(type)) {
			return parseBinary(value);
		} else if ("CLOB".equals(type)) {
			return value.toString();
		} else if ("LONG".equals(type)) {
			if (value instanceof Double) {
				if (((Double) value).isNaN()) {
					return Double.NaN;
				} else {
					return ((Double) value).longValue();
				}
			} else {
				return new Long(value + "");
			}
		} else if ("REGEX".equals(type)) {
			return Pattern.compile(value.toString());
		} else {
			throw new UnsupportedConversionException("unknown object type " + type + "  " + value, null);
		}
	}

	private static Object jsObjectToJava(NativeDate arg) {
		return new Date((long) NativeDate.getTime(arg));
	}

	private static Object jsObjectToJava(NativeArray arg) throws UnsupportedConversionException {
		int size = getArrayLength(arg);
		List<Object> result = new ArrayList<>(size);
		for (int i = 0; i < size; i++) {
			result.add(jsObjectToJava(arg.get(i)));
		}
		return result;
	}

	private static Object jsObjectToJava(NativeRegExp arg) {
		NativeRegExp regexp = (NativeRegExp) arg;
		// 按理应该取出flag，但是现在取不到
		return Pattern.compile((String) NativeRegExp.source(regexp));
	}

	private static Object jsObjectToJava(ScriptFunction arg) throws UnsupportedConversionException {
		// throw new UnsupportedConversionException("cannot convert js function to java", null);
		return null;
	}

	private static Object jsObjectToJava(NativeString arg) {
		return NativeString.toString(arg);
	}

	private static Object jsObjectToJava(NativeNumber arg) {
		return NativeNumber.valueOf(arg);
	}

	public static Object jsObjectToJava(Object arg) throws UnsupportedConversionException {
		if (isNull(arg)) {
			return null;
		}
		if (arg instanceof ScriptObjectMirror) {
			return jsObjectToJava((ScriptObjectMirror) arg);
		} else if (arg instanceof ScriptObject) {
			return jsObjectToJava((ScriptObject) arg);
		} else if (arg instanceof ConsString){
			return arg.toString();
		} else {
			return arg;
		}
	}

	private static byte[] parseBinary(Object value) throws UnsupportedConversionException {
		if (value instanceof byte[]) {
			return (byte[]) value;
		} else if (value instanceof Byte[]) {
			return ArrayUtils.toPrimitive((Byte[]) value);
		}
		if (value instanceof ScriptObjectMirror && ((ScriptObjectMirror) value).isArray()) {
			value = ((ScriptObjectMirror) value).to(NativeArray.class);
		}
		if (value instanceof NativeArray) {
			NativeArray arr = (NativeArray) value;
			byte[] r = new byte[JsTypeUtil.getArrayLength(arr)];
			for (int i = 0; i < JsTypeUtil.getArrayLength(arr); i++) {
				if (arr.get(i) instanceof Byte) {
					r[i] = (Byte) arr.get(i);
				} else if (arr.get(i) instanceof Double) {
					r[i] = ((Double) arr.get(i)).byteValue();
				} else if (arr.get(i) instanceof Integer) {
					r[i] = ((Integer) arr.get(i)).byteValue();
				}
			}
			return r;
		} else if (value instanceof String) {
			Decoder decoder = Base64.getDecoder();
			try {
				return decoder.decode((String) value);
			} catch (Exception e) {
				throw new UnsupportedConversionException("cannot parse base64 binary data " + value, e);
			}
		} else {
			throw new UnsupportedConversionException("unkown binary data " + value + " " + value.getClass(), null);
		}
	}

	public static Long parseTime(Object value) throws UnsupportedConversionException {
		if (value instanceof Double) {
			return ((Double) value).longValue();
		} else if (value instanceof String) {
			try {
				return sdfTime.parse((String) value).getTime();
			} catch (ParseException e) {
				throw new UnsupportedConversionException("unmatched datetime format " + value, e);
			}
		} else if (value instanceof NativeDate) {
			return getTime((NativeDate) value);
		} else if (value instanceof ZonedDateTime){
			return ((ZonedDateTime) value).toInstant().toEpochMilli();
		} else if (value instanceof ScriptObjectMirror) {
			ScriptObjectMirror m = (ScriptObjectMirror) value;
			Object o = m.to(Object.class);
			if (o instanceof NativeDate) {
				return getTime(m.to(NativeDate.class));
			} else if (o instanceof ZonedDateTime){
					return ((ZonedDateTime) o).toInstant().toEpochMilli();
			} else {
				throw new UnsupportedConversionException("unknown date format " + value + " " + m.getClassName(), null);
			}
		} else {
			throw new UnsupportedConversionException("unknown date format " + value + " " + value.getClass(), null);
		}
	}

	private static SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

	private static SimpleDateFormat sdfTime = new SimpleDateFormat("HH:mm:ss");

	public static Long parseDate(Object value) throws UnsupportedConversionException {
		if (JsTypeUtil.isNull(value)) {
			return null;
		}
		if (value instanceof Double) {
			return ((Double) value).longValue();
		} else if (value instanceof String) {
			try {
				return sdfDate.parse((String) value).getTime();
			} catch (ParseException e) {
				throw new UnsupportedConversionException("unmatched datetime format " + value, e);
			}
		} else if (value instanceof NativeDate) {
			return getTime((NativeDate) value);
		} else if (value instanceof ScriptObjectMirror && ((ScriptObjectMirror) value).to(Object.class) instanceof NativeDate) {
			ScriptObjectMirror m = (ScriptObjectMirror) value;
			Object o = m.to(Object.class);
			if (o instanceof NativeDate) {
				return getTime(m.to(NativeDate.class));
			} else if (o instanceof ZonedDateTime){
					return ((ZonedDateTime) o).toInstant().toEpochMilli();
			} else {
				throw new UnsupportedConversionException("unknown date format " + value + " " + m.getClassName(), null);
			}
		} else if (value instanceof ZonedDateTime){
			return ((ZonedDateTime) value).toInstant().toEpochMilli();
		} else {
			throw new UnsupportedConversionException("unknown date format " + value + " " + value.getClass(), null);
		}
	}

	/**
	 * 将java对象转为 js 对象，主要转换 HashMap, List, Date, RegExp, Double, Integer, Long, Float, Boolean 等类型，其它类型包括 byte 类型都直接传递
	 * @param object
	 * @return
	 * @throws ScriptException 
	 */
	public Object javaObjectToJs(Object object) throws ScriptException {
		if(object == null) return null;
		
		if (isStringKeyMap(object)) {
			ScriptObjectMirror obj = this.newObject();
			Map<String, Object> m = (Map<String, Object>) object;
			for (String key : m.keySet()) {
				obj.put(key, javaObjectToJs(m.get(key)));
			}
			return obj.to(Object.class);
		} else if (object instanceof List) {
			ScriptObjectMirror arr = this.newArray();
			List objects = (List)object;
			for (int i = 0; i < objects.size(); i++) {
				// NativeArray.push(array, objects[i]);
				arr.callMember("push", javaObjectToJs(objects.get(i)));
			}
			return arr.to(Object.class);
		} else if(object.getClass().isArray()){
			ScriptObjectMirror arr = this.newArray();
			for(int i=0; i<Array.getLength(object); i++){
		        arr.callMember("push", javaObjectToJs(Array.get(object, i)));
		    }
			return arr.to(Object.class);
		} else if(object instanceof Date){
			return toNativeDate(((Date) object).getTime());
		} else if (object instanceof Pattern){
			if(this.newRegExp == null){
				this.newRegExp = (ScriptObjectMirror) this.engine.get("RegExp");
			}
			return newRegExp.callMember("call", null, ((Pattern) object).pattern());
		} else {
			return object;
		}
	}

	private boolean isStringKeyMap(Object object) {
		if (object instanceof Map) {
			Map m = (Map) object;
			if (m.isEmpty())
				return true;
			return m.keySet().iterator().next() instanceof String;
		}
		return false;
	}
	
	public Object toScriptObjectMirror(Object object){
		return ScriptObjectMirror.wrap(object, global);
	}
	
}
