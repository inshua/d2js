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
package org.siphon.jssp;

import java.util.Collection;
import java.util.Map;
import java.util.Set;

import javax.script.ScriptException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;

import org.siphon.common.js.JsTypeUtil;
import org.siphon.d2js.jshttp.JsEngineHandlerContext;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.runtime.JSType;

public class JsspRequest extends HttpServletRequestWrapper implements Map<String, Object> {

	private final Map<String, Object> map;
	private final JsEngineHandlerContext jsEngineHandlerContext;

	public JsspRequest(HttpServletRequest request, JsEngineHandlerContext jsEngineHandlerContext) {
		super(request);
		this.jsEngineHandlerContext = jsEngineHandlerContext;

		this.map = (Map<String, Object>) (Object) request.getParameterMap();
	}

	@Override
	public int size() {
		return map.size();
	}

	@Override
	public boolean isEmpty() {
		return map.isEmpty();
	}

	@Override
	public boolean containsKey(Object key) {
		return map.containsKey(key);
	}

	@Override
	public boolean containsValue(Object value) {
		return map.containsValue(value);
	}

	@Override
	public Object get(Object key) {
		Object value = map.get(key);
		if(value instanceof String[]){ 
			String[] v = (String[]) value;
			if (v == null || v.length == 0) {
				return null;
			} else if (v.length == 1) {
				return v[0];
			} else {
				ScriptObjectMirror arr = null;
				try {
					arr = jsEngineHandlerContext.getJsTypeUtil().newArray();
				} catch (ScriptException e) {
				}
				for (String s : v) {
					arr.callMember("push", s);
				}
				return arr.to(NativeArray.class);
			}
		} else {
			if(value instanceof ScriptObjectMirror){
				return JsTypeUtil.getSealed((ScriptObjectMirror) value);
			} else {
				return value;
			}
		}
	}

	@Override
	public Object put(String key, Object value) {
		return map.put(key, value);
	}

	@Override
	public Object remove(Object key) {
		return map.remove(key);
	}

	@Override
	public void putAll(Map<? extends String, ? extends Object> m) {
		map.putAll(m);
	}

	@Override
	public void clear() {
		map.clear();
	}

	@Override
	public Set<String> keySet() {
		return map.keySet();
	}

	@Override
	public Collection<Object> values() {
		return map.values();
	}

	@Override
	public Set<java.util.Map.Entry<String, Object>> entrySet() {
		return map.entrySet();
	}

}
