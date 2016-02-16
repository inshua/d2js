package test.js;

import java.io.File;
import java.io.IOException;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngine;

import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JsEngineUtil;

public class MyLoadTest {

	private static Logger logger = Logger.getLogger(MyLoadTest.class);

	public static void main(String[] args) throws ScriptException {
		PropertyConfigurator.configure("./log4j.properties");
		
		ScriptEngine engine = JsEngineUtil.newEngine();
		try {
			JsEngineUtil.eval(engine, "test/my_load_test/a.js", true, true);
		} catch (Exception e) {
			logger.error("", e);
		}
	}
}
