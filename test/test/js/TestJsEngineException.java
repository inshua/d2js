package test.js;

import java.io.File;
import java.util.Arrays;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.UnsupportedConversionException;

import sun.font.NativeFont;
import sun.org.mozilla.javascript.internal.JavaScriptException;
import sun.org.mozilla.javascript.internal.NativeFunction;
import sun.org.mozilla.javascript.internal.NativeJavaObject;
import sun.org.mozilla.javascript.internal.NativeObject;

import com.sun.javafx.text.ScriptMapper;

public class TestJsEngineException {

	private static Logger logger = Logger.getLogger(TestJsEngineException.class);
	
	public static void main(String[] args) throws UnsupportedConversionException {
		PropertyConfigurator.configure("./log4j.properties");
		
//		ScriptEngine engine = JsEngineUtil.newEngine();
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("js");
		engine.put("javaObj", new TestJsEngineException());
		engine.put("logger", logger);
		JSON json = new JSON(engine);
		try {
			JsEngineUtil.eval(engine, "web/WEB-INF/jslib/lang.js", true, false);
			JsEngineUtil.eval(engine, "test/test_engine_exception.js", true, false);
		} catch(ScriptException e){
			logger.error("", e);
			// extractError(json, e);
		} catch (Exception e) {
			logger.error("", e);
		}
		
		// new JavaScriptException("");
	}
	
	private static void extractError(JSON json, ScriptException e) throws UnsupportedConversionException {
		if(e.getCause() instanceof JavaScriptException){
			JavaScriptException ex = (JavaScriptException)e.getCause();
			NativeJavaObject ex2 = (NativeJavaObject) ex.getValue();
			JavaScriptException ex3 = (JavaScriptException) ex2.unwrap();
			System.out.println(json.stringify(ex3.getValue()));
		}
	}

	public static void appendStackElement(ScriptException exception, Exception ex2){
		StackTraceElement[] eles = exception.getStackTrace();
		eles = ArrayUtils.addAll(eles, ex2.getStackTrace());
		exception.setStackTrace(eles);
	}
	
	public JavaScriptException toJavaScriptException(Object error){
		return new JavaScriptException(error);
	}
	
	
	public static void raiseJavaException() throws Exception{
		throw new Exception("test exception");
	}
	
	public static void run(ScriptEngine engine, NativeFunction fun, NativeObject thiz) throws NoSuchMethodException, ScriptException{
		Invocable invocable = (Invocable) engine;
		invocable.invokeMethod(fun, "call", thiz);
	}
}
