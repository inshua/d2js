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
package org.siphon.d2js.jshttp;

import javax.script.Bindings;
import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

import org.apache.commons.pool2.ObjectPool;
import org.apache.commons.pool2.PooledObject;
import org.apache.log4j.Logger;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsTypeUtil;

public class JsEngineHandlerContext {

	private static Logger logger = Logger.getLogger(JsEngineHandlerContext.class);
	
	private ScriptEngine scriptEngine;
	

	public ScriptEngine getScriptEngine() {
		return scriptEngine;
	}

	public void setScriptEngine(ScriptEngine scriptEngine) {
		this.scriptEngine = scriptEngine;
	}

	public ScriptObjectMirror getHandler() {
		return handler;
	}

	public void setHandler(ScriptObjectMirror handler) {
		this.handler = handler;
	}

	private ScriptObjectMirror handler;
	
	
	private JsTypeUtil jsTypeUtil;

	private JSON json;

	private ObjectPool<ScriptEngine> enginePool;

	public Invocable getEngineAsInvocable() {
		return (Invocable) this.scriptEngine;
	}

	public void setJsTypeUtil(JsTypeUtil jsTypeUtil) {
		this.jsTypeUtil = jsTypeUtil;
	}

	public JsTypeUtil getJsTypeUtil() {
		return jsTypeUtil;
	}

	public void setJson(JSON json) {
		this.json = json;
	}

	public JSON getJson() {
		return json;
	}
	
	public Object invokeMethod(Bindings bindings, String method, Object... params) throws NoSuchMethodException, ScriptException{
		bindings.put("params", params);
		bindings.put("d2js", this.getHandler());
		return this.scriptEngine.eval("d2js." + method + ".apply(d2js, params)", bindings);	// very fast, 0.0532ms
		//return this.getEngineAsInvocable().invokeMethod(this.getHandler(), method, params);
	}

	public void setEnginePool(ObjectPool<ScriptEngine> enginePool) {
		this.enginePool = enginePool;
	}
	
	public void free(){
		try {
			if(enginePool != null){
				this.enginePool.returnObject(this.scriptEngine);
			}
			
		} catch (Exception e) {
		}
	}

}
