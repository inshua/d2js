package test.js;

import java.io.File;
import java.lang.reflect.Field;
import java.util.Arrays;

import javax.script.Bindings;
import javax.script.Invocable;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.script.SimpleScriptContext;

import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.api.scripting.ScriptUtils;
import jdk.nashorn.internal.runtime.Context;
import jdk.nashorn.internal.runtime.ScriptObject;

public class ScriptObjectCall {

	private static Logger logger = Logger.getLogger(ScriptObjectCall.class);
	
	public static void main(String[] args) {
		
		ScriptEngine engine = JsEngineUtil.newEngine();
		try {
			engine.eval("function F(){ this.hello = function(){return 'world'}}");
			ScriptObjectMirror sm = (ScriptObjectMirror) engine.eval("new F()");
			Object result = sm.callMember("hello");
			System.out.println(result);

			
			ScriptObject so = (ScriptObject) sm.to(Object.class);
			System.out.println(so);
			
			
			NashornScriptEngine nse = (NashornScriptEngine) engine;
			SimpleScriptContext context = (SimpleScriptContext) engine.getContext();
			ScriptObjectMirror binding = (ScriptObjectMirror) context.getBindings(ScriptContext.ENGINE_SCOPE);
			Field globalField = ScriptObjectMirror.class.getDeclaredField("global");
			globalField.setAccessible(true);
			Object global = globalField.get(binding);
			sm = (ScriptObjectMirror) ScriptObjectMirror.wrap(so, global);
			result = nse.invokeMethod(sm, "hello");
			System.out.println(result);
		} catch (Exception e) {
			logger.error("", e);
		}
	}
	
}
