package test.js;

import java.lang.reflect.Field;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public class CrossEngineTest {
	public static void main(String[] args) throws ScriptException, IllegalArgumentException, IllegalAccessException, NoSuchFieldException, SecurityException {

		ScriptEngine engine1 = JsEngineUtil.newEngine();
		ScriptEngine engine2 = JsEngineUtil.newEngine();
		
		Object o = engine1.eval("(function(){return {name : 'jack', age : 1, printName : function(){print(this.name)}}})()");
		
		Bindings bindings = engine2.createBindings();
		bindings.put("o", o);
		
		engine2.eval("o.printName()", bindings);
		engine2.eval("o['printName'].call(o)", bindings);
		
		Object o2 = engine1.eval("JSON.parse('{\"d\":\"1977-02-03T00:00:00.000Z\"}', parseDate)");
		
		ScriptObjectMirror som = (ScriptObjectMirror) o2;
		
//		Field fld = som.getClass().getDeclaredField("global");
//		fld.setAccessible(true);
//		System.out.println(fld.get(som));
//		fld.set(som, fld.get(bindings));
		
		engine2.put("o2", som.to(Object.class));
		
		
		engine2.eval("print(JSON.stringify(o2))");
		
	}
}
