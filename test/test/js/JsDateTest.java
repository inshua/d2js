package test.js;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeDate;
import org.siphon.common.js.JsTypeUtil;

public class JsDateTest {
	public static void main(String[] args) throws ScriptException {
		ScriptEngine engine = JsEngineUtil.newEngine();
		Object date = engine.eval("new Date()");
		JsTypeUtil t = new JsTypeUtil(engine);
		System.out.println(t.isNativeDate(date));
		
		System.out.println(t.getTime((ScriptObjectMirror) date));
		
		ScriptObjectMirror s = (ScriptObjectMirror) engine.eval("new Array(2)");
		System.out.println(s.isInstance(NativeArray.class));
//		System.out.println(s.to(NativeDate.class));		// java.lang.ClassCastException: Cannot cast jdk.nashorn.internal.objects.NativeArray to jdk.nashorn.internal.objects.NativeDate
		
		ScriptObjectMirror o = (ScriptObjectMirror) engine.get("Object");
		System.out.println(o);
	}
}
