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

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.Function;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionContext;

import org.apache.commons.collections.EnumerationUtils;
import org.apache.commons.collections.ListUtils;
import org.apache.commons.collections.SetUtils;
import org.apache.commons.lang3.EnumUtils;
import org.apache.commons.lang3.ObjectUtils;
import org.siphon.common.js.JsTypeUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public class JsspSession implements HttpSession, Map<String, Object>{
	
	final HttpSession session;
	
	public JsspSession(HttpSession session){
		this.session = session;
	}

	public int size() {
		return EnumerationUtils.toList(session.getAttributeNames()).size();
	}

	public boolean isEmpty() {
		return session.getAttributeNames().hasMoreElements();
	}

	public boolean containsKey(Object key) {
		return session.getAttribute((String) key) != null;
	}

	public boolean containsValue(Object value) {
		for(Enumeration<String> en = session.getAttributeNames(); en.hasMoreElements(); ){
			String t = en.nextElement();
			if(ObjectUtils.equals(session.getAttribute(t), value)){
				return true;
			}
		}
		return false;
	}

	public Object get(Object key) {
		Object obj = session.getAttribute((String) key);
		if(obj instanceof ScriptObjectMirror){
			return JsTypeUtil.getSealed((ScriptObjectMirror) obj);
		}else {
			return obj;
		}
	}

	public Object put(String key, Object value) {
		Object oldValue= session.getAttribute(key);
		session.setAttribute(key, value);
		return oldValue;
	}

	public Object remove(Object key) {
		Object oldValue= session.getAttribute((String) key);
		session.removeAttribute((String) key);
		return oldValue;
	}

	public void putAll(Map<? extends String, ? extends Object> m) {
		for(String key : m.keySet()){
			session.setAttribute(key, m.get(key));
		}
	}

	public void clear() {
		for(Enumeration<String> en = session.getAttributeNames(); en.hasMoreElements(); ){
			String t = en.nextElement();
			session.removeAttribute(t);
		}
	}

	public Set<String> keySet() {
		Set<String> set = new  HashSet<String>();
		for(Enumeration<String> en = session.getAttributeNames(); en.hasMoreElements(); ){
			String t = en.nextElement();
			set.add(t);
		}
		return set;
	}

	public Collection<Object> values() {
		List<Object> ls = new ArrayList<Object>();
		for(Enumeration<String> en = session.getAttributeNames(); en.hasMoreElements(); ){
			String t = en.nextElement();
			ls.add(t);
		}
		return ls;
	}

	public Set<java.util.Map.Entry<String, Object>> entrySet() {
		Map<String, Object> m = new HashMap<String, Object>();
		for(Enumeration<String> en = session.getAttributeNames(); en.hasMoreElements(); ){
			String t = en.nextElement();
			m.put(t, session.getAttribute(t));
		}
		return m.entrySet();
	}

	public boolean equals(Object o) {
		return this.equals(o);
	}

	public int hashCode() {
		return this.hashCode();
	}

	public Object getAttribute(String arg0) {
		return session.getAttribute(arg0);
	}

	public Enumeration<String> getAttributeNames() {
		return session.getAttributeNames();
	}

	public long getCreationTime() {
		return session.getCreationTime();
	}

	public String getId() {
		return session.getId();
	}

	public long getLastAccessedTime() {
		return session.getLastAccessedTime();
	}

	public int getMaxInactiveInterval() {
		return session.getMaxInactiveInterval();
	}

	public ServletContext getServletContext() {
		return session.getServletContext();
	}

	public HttpSessionContext getSessionContext() {
		return session.getSessionContext();
	}

	public Object getValue(String arg0) {
		return session.getValue(arg0);
	}

	public String[] getValueNames() {
		return session.getValueNames();
	}

	public void invalidate() {
		session.invalidate();
	}

	public boolean isNew() {
		return session.isNew();
	}

	public void putValue(String arg0, Object arg1) {
		session.putValue(arg0, arg1);
	}

	public void removeAttribute(String arg0) {
		session.removeAttribute(arg0);
	}

	public void removeValue(String arg0) {
		session.removeValue(arg0);
	}

	public void setAttribute(String arg0, Object arg1) {
		session.setAttribute(arg0, arg1);
	}

	public void setMaxInactiveInterval(int arg0) {
		session.setMaxInactiveInterval(arg0);
	}


}
