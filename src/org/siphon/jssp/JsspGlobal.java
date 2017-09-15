package org.siphon.jssp;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.siphon.common.js.JsTypeUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public class JsspGlobal implements Map<String, Object>{
	
	private ConcurrentHashMap<String, Object> map = new ConcurrentHashMap<>();

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
		if(value instanceof ScriptObjectMirror){
			return JsTypeUtil.getSealed((ScriptObjectMirror) value);
		} else {
			return value;
		}
	}

	@Override
	public Object put(String key, Object value) {
		if(value == null) map.remove(key);
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
