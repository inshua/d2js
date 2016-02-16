/*******************************************************************************
 * The MIT License (MIT)
 * Copyright 漏 2015 Inshua,inshua@gmail.com, All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the 鈥淪oftware鈥�), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 鈥淎S IS鈥�, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/
package org.siphon.common.js;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

import javax.script.CompiledScript;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeDate;

import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

public class JsDateUtil {

	private static Logger logger = Logger.getLogger(JsDateUtil.class);
	
	private final NashornScriptEngine engine;

	private CompiledScript newDate;

	

	public JsDateUtil(ScriptEngine jsEngine){
		this.engine = (NashornScriptEngine) jsEngine;
		try {
			// 不知什么原因，(ScriptObjectMirror) engine.getContext().getBindings(ScriptContext.ENGINE_SCOPE).get("Date") 不行，返回的是 new Date().toString() 的结果
			this.newDate = this.engine.compile("new Date()");
		} catch (ScriptException e) {
		}
		
	}
	
	public Object toNativeDate(double time) throws ScriptException{
		ScriptObjectMirror m =  (ScriptObjectMirror) newDate.eval();
		NativeDate.setTime( m.to(NativeDate.class), time);
		return m;
	}
	
	public long getTime(ScriptObjectMirror nativeDate){
		return (long)NativeDate.getTime(((ScriptObjectMirror)nativeDate).to(NativeDate.class));		
	}
	
	public long getTime(NativeDate nativeDate){
		return (long)NativeDate.getTime(nativeDate);		
	}
	
	public boolean isNativeDate(Object o){
		return o instanceof NativeDate || (o instanceof ScriptObjectMirror && ((ScriptObjectMirror)o).to(Object.class) instanceof NativeDate);
	}
	
	
}
