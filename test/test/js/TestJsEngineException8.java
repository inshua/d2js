package test.js;

import java.io.File;
import java.io.FileReader;
import java.lang.reflect.Field;
import java.util.Arrays;

import javax.script.CompiledScript;
import javax.script.Invocable;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.script.SimpleScriptContext;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.api.scripting.ScriptUtils;
import jdk.nashorn.internal.objects.Global;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.runtime.ECMAException;
import jdk.nashorn.internal.runtime.JSONFunctions;
import jdk.nashorn.internal.runtime.ScriptEnvironment;
import jdk.nashorn.internal.runtime.ScriptFunction;
import jdk.nashorn.internal.runtime.ScriptObject;
import jdk.nashorn.internal.runtime.ScriptRuntime;

import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.UnsupportedConversionException;

import sun.font.NativeFont;
import sun.org.mozilla.javascript.internal.Context;
import sun.org.mozilla.javascript.internal.JavaScriptException;
import sun.org.mozilla.javascript.internal.NativeFunction;
import sun.org.mozilla.javascript.internal.NativeJavaObject;
import sun.org.mozilla.javascript.internal.NativeObject;
import sun.org.mozilla.javascript.internal.ScriptableObject;

import com.sun.javafx.text.ScriptMapper;

public class TestJsEngineException8 {

	private static Logger logger = Logger.getLogger(TestJsEngineException8.class);

	public static void main(String[] args) throws UnsupportedConversionException, ScriptException, IllegalArgumentException, IllegalAccessException, NoSuchFieldException, SecurityException, NoSuchMethodException {
		PropertyConfigurator.configure("./log4j.properties");

		// ScriptEngine engine = JsEngineUtil.newEngine();
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("js");
		engine.put("javaObj", new TestJsEngineException8());
		engine.put("logger", logger);
		try {
			engine.put(ScriptEngine.FILENAME, "test/test_engine_exception.js");
			engine.eval(new FileReader("test/test_engine_exception8.js"));
		} catch (ScriptException e) {
			logger.error("", e);
			extractError((ScriptObjectMirror) engine.eval("JSON"), e);
		} catch (Exception e) {
			logger.error("", e);
		}
		
		NashornScriptEngine nashornScriptEngine = (NashornScriptEngine) engine; 

		ScriptContext context = nashornScriptEngine.getContext();
		SimpleScriptContext simpleScriptContext = (SimpleScriptContext) context;
		simpleScriptContext.getAttribute("engineScope");
		ScriptObjectMirror global = (ScriptObjectMirror) simpleScriptContext.getBindings(ScriptContext.ENGINE_SCOPE);
		global.getMember("global");
		Field fld = global.getClass().getDeclaredField("global");
		fld.setAccessible(true);
		Object v = fld.get(global);
		
		Global global2 = (Global) v;
		// Object arr = ScriptRuntime.construct((ScriptFunction)global2.array, 100, global2);
		ScriptFunction arrCons = (ScriptFunction) global2.G$array();
		//ScriptRuntime.construct((ScriptFunction)global2.array, 100, global2);
		
//		jdk.nashorn.api.scripting.NashornScriptEngine engine2;
//		Object arr = jdk.nashorn.internal.runtime.ScriptRuntime.NEW();
//		System.out.println(arr.getClass());
		// new JavaScriptException("");
		
		//ScriptObjectMirror.wrap(ScriptRuntime.construct((ScriptFunction)arrCons, ScriptObjectMirror.unwrapArray(new Object[]{}, global2)), global2);		
//		Object arr = global.call(global2.array);

		Invocable invocable = (Invocable) engine;
		
		
		ScriptObjectMirror json = (ScriptObjectMirror) engine.eval("JSON");
		CompiledScript arrayConstructor = nashornScriptEngine.compile("new Array()");
		ScriptObjectMirror ma = (ScriptObjectMirror) arrayConstructor.eval();
		Field faSobj = ma.getClass().getDeclaredField("sobj");
		faSobj.setAccessible(true);
		NativeArray arr = (NativeArray) faSobj.get(ma);
		
		System.out.println("arr == convert arr: " + (arr == ma.to(NativeArray.class)));
		
		//NativeArray arr = (NativeArray) ma.to(NativeArray.class);
		
		NativeArray.pushObject(arr, "abcd");
		NativeArray.pushObject(arr, 1);

		System.out.println(json.callMember("stringify", arr));
		
		engine.eval("Array.prototype.first = function(){return this[0];}");
		
		Object obj = invocable.invokeMethod(ma, "first");
		System.out.println(obj);
		
		obj = engine.eval("null");
		ScriptObjectMirror ms = (ScriptObjectMirror) obj;
		System.out.println(ms  + " is null");
		
		obj = engine.eval("(function(){})()");
		ms = (ScriptObjectMirror) obj;
		System.out.println("is empty " + ms);
		
		obj = engine.eval("new String()");
		ms = (ScriptObjectMirror) obj;
		System.out.println("is empty " + ms.isEmpty());
		
		obj = engine.eval("new Array()");
		ms = (ScriptObjectMirror) obj;
		System.out.println("is empty " + ms.isEmpty());
		
		
//		System.out.println(arr);
	}

	private static void extractError(ScriptObjectMirror json, ScriptException e) throws UnsupportedConversionException {
		ECMAException exception = (ECMAException) e.getCause();
		System.out.println(json.callMember("stringify", exception.thrown));

	}

	public static void appendStackElement(ScriptException exception, Exception ex2) {
		StackTraceElement[] eles = exception.getStackTrace();
		eles = ArrayUtils.addAll(eles, ex2.getStackTrace());
		exception.setStackTrace(eles);
	}

	public JavaScriptException toJavaScriptException(Object error) {
		return new JavaScriptException(error);
	}

	public void raiseJavaException() throws Exception {
		throw new Exception("test exception");
	}

	public static void run(ScriptEngine engine, NativeFunction fun, NativeObject thiz) throws NoSuchMethodException,
			ScriptException {
		Invocable invocable = (Invocable) engine;
		invocable.invokeMethod(fun, "call", thiz);
	}
}
