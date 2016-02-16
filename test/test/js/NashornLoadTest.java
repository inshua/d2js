package test.js;

import java.io.File;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.NashornScriptEngine;

import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

public class NashornLoadTest {

	private static Logger logger = Logger.getLogger(NashornLoadTest.class);

	public static void main(String[] args) throws ScriptException {
		PropertyConfigurator.configure("./log4j.properties");
		
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("js");
		engine.put(ScriptEngine.FILENAME, new File("1.js").getAbsolutePath());
		engine.eval("print(__FILE__, __LINE__, __DIR__)");
		engine.eval("load('test/load_test/a.js')");
		System.out.println(engine.get(ScriptEngine.FILENAME));
		// engine.eval("load('test/load_test/a.js')");	// simply repeat 
		
		
	}
}
