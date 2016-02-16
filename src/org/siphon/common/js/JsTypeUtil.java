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

import java.lang.reflect.Field;

import javax.script.Bindings;
import javax.script.CompiledScript;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeString;
import jdk.nashorn.internal.runtime.Undefined;



public class JsTypeUtil {

	private NashornScriptEngine engine;
	private ScriptObjectMirror arrayConstructor;
	private ScriptObjectMirror objectConstructor;
	
	public JsTypeUtil(ScriptEngine jsEngine) {
		this.engine = (NashornScriptEngine) jsEngine;
		try {
		    Bindings b = engine.getContext().getBindings(ScriptContext.ENGINE_SCOPE);
			this.arrayConstructor = (ScriptObjectMirror) b.get("Array");
			this.objectConstructor = (ScriptObjectMirror) b.get("Object");
		} catch (Exception e) {
			e.printStackTrace();
			//logger.error("", e);
		}

	}

	public ScriptObjectMirror newArray(Object... objects) throws ScriptException {
		ScriptObjectMirror arrayMirror = (ScriptObjectMirror) this.arrayConstructor.call(null);
		NativeArray array = arrayMirror.to(NativeArray.class);
		for (int i = 0; i < objects.length; i++) {
			//NativeArray.push(array, objects[i]);
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
		return (ScriptObjectMirror) this.objectConstructor.call(null);
	}

	public static boolean isNull(Object object) {
		if (object == null)
			return true;
		if (object instanceof ScriptObjectMirror){
			ScriptObjectMirror m = (ScriptObjectMirror) object;
			if(m.isInstanceOf(NativeString.class) && m.isEmpty()) return true;					// 空字符串（空数组 isEmpty() 为 true)
			if(ScriptObjectMirror.isUndefined(m)){			// 实际上总是返回 null，不会返回 undefined
				return true;
			}
		}
			
		if (object instanceof String && ((String) object).length() == 0)		// 即使是字符串会返回 sobj 为 NativeString 的 SOM
			return true;
		
		if(object instanceof Undefined){
			return true;
		}
		return false;
	}
	
	public static boolean isTrue(Object obj) {
		if (JsTypeUtil.isNull(obj))
			return false;

		if (obj instanceof Boolean) {
			return (Boolean) obj;
		} else if (obj instanceof Double) {
			return (Double) obj == 0;
		} else if (obj instanceof Integer) {
			return (Integer) obj == 0;
		} else if (obj instanceof Long) {
			return (Long) obj == 0;
		} else if (obj instanceof Byte) {
			return (Byte) obj == 0;
		} else {
			return true;
		}
	}

	public ScriptObjectMirror bytesToNativeArray(byte[] arr) throws ScriptException {
		ScriptObjectMirror result = this.newArray();
		NativeArray array = result.to(NativeArray.class);
		for (int i = 0; i < arr.length; i++) {
			NativeArray.push(array, arr[i]);
			//result.callMember("push", arr[i]);
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

	public static int getArrayLength(NativeArray arr){
		Object length = arr.getLength();
		if(length instanceof Long){
			return ((Long) length).intValue();
		} else if(length instanceof Integer){
			return (Integer)length;
		} else {
			return Integer.parseInt(length.toString());
		}
	}
}
