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
import org.siphon.common.js.JsTypeUtil;

import sun.org.mozilla.javascript.internal.Context;
import sun.org.mozilla.javascript.internal.NativeArray;
import sun.org.mozilla.javascript.internal.NativeJavaObject;
import sun.org.mozilla.javascript.internal.Scriptable;

import com.sun.script.javascript.JSAdapter;

public class TestJsEngine {

	private static Logger logger = Logger.getLogger(TestJsEngine.class);
	
	public static void main(String[] args) {
//		PropertyConfigurator.configure("./log4j.properties");
//		
//		ScriptEngine engine = JsEngineUtil.newEngine();
//		try {
//			JsEngineUtil.eval(engine, "web/WEB-INF/jslib/lang.js", true, false);
//			
//			JsTypeUtil jsTypeUtil = new JsTypeUtil(engine);
//			NativeArray obj = jsTypeUtil.newArray(1,2,3);
//			JSON json = new JSON(engine);
//			System.out.println(json.stringify(obj));
//			
//			engine.put("arr", obj);
//			JsEngineUtil.eval(engine, "test.js", "println(arr.find(function(i){return i % 2 == 0}))");
//		} catch (Exception e) {
//			logger.error("", e);
//		}
	}
	
}
