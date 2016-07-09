package test.js;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.apache.commons.lang3.ObjectUtils;
import org.siphon.common.js.JsEngineUtil;

import jdk.internal.dynalink.CallSiteDescriptor;
import jdk.internal.dynalink.linker.GuardedInvocation;
import jdk.internal.dynalink.linker.LinkRequest;
import jdk.nashorn.internal.objects.Global;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeJSAdapter;
import jdk.nashorn.internal.runtime.ScriptObject;

public class ScriptObjectTest extends ScriptObject{

	public static void main(String[] args) throws ScriptException {

		ScriptEngine engine = JsEngineUtil.newEngine();
		
		engine.put("foo", new ScriptObjectTest());
		Map m = new HashMap();
		m.put("age" , 1);
		engine.put("bar", m);
		engine.eval("print(bar.age)");
		engine.eval("bar.name = 'aa'");
		System.out.println(m);
		
//		engine.eval("foo.id = 1");
//		engine.eval("print(foo.id)");
//		engine.eval("foo.name = 'test'");
//		engine.eval("print(foo.name)");
	}

	private HashMap<String, Object> hashMap;
	
	public ScriptObjectTest() {
		this.hashMap = new HashMap<String, Object>();
	}
	
	@Override
	public Iterator<String> propertyIterator() {
		return hashMap.keySet().iterator();
	}
	
	@Override
	public boolean containsKey(Object key) {
		System.out.println("test contains " + key);
		return super.containsKey(key) || this.hashMap.containsKey(key);
	}
	
	@Override
	public Object get(Object key) {
		System.out.println("get " + key);
		return ObjectUtils.defaultIfNull(super.get(key), this.hashMap.get(key));
	}
	
	@Override
	public Object put(Object key, Object value, boolean strict) {
		System.out.println("put " + key);
		if(super.containsKey(key)) {
			return super.put(key, value, strict);
		} else {
			return this.hashMap.put((String) key, value);
		}
	}
	
	@Override
	public GuardedInvocation noSuchMethod(CallSiteDescriptor desc, LinkRequest request) {
		return super.noSuchMethod(desc, request);
	}
	
	@Override
	public GuardedInvocation noSuchProperty(CallSiteDescriptor desc, LinkRequest request) {
		return super.noSuchProperty(desc, request);
	}
	
//	@Override
//	protected Object invokeNoSuchProperty(String name, int programPoint) {
//		return super.invokeNoSuchProperty(name, programPoint);
//	}
//	
	
	
	
}
