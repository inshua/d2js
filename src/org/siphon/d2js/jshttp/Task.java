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

import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public class Task {

	private ScriptObjectMirror callbacker;

	public void start(ScriptObjectMirror callbacker) {
		this.callbacker = callbacker;

	}

	public Object end() {
		Object cb = this.callbacker;
		this.callbacker = null;
		return cb;
	}

	public Object getCallbacker() {
		return callbacker;
	}

	public ScriptObjectMirror end(Exception e, ScriptEngine engine) {
		ScriptObjectMirror cb = this.callbacker;
		if (cb != null) {
			Object ex = JsEngineUtil.parseJsException(e);
			if (!(ex instanceof Throwable)) {
				cb.put("exception", ex);
			} else {
				ScriptObjectMirror jserr = null;
				try {
					jserr = new JsTypeUtil(engine).newObject();
				} catch (ScriptException e1) {
				}
				jserr.put("name", "JavaError");
				Throwable javaerr = ((Throwable) ex);
				jserr.put("message", "[" + javaerr.getClass().getName() + "]:" + javaerr.getMessage());
				cb.put("exception", jserr);
			}
			this.callbacker = null;
		}
		return cb;
	}

}
