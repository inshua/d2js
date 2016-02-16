package test.js;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;

public class TestChn {
	public static void main(String[] args) throws ScriptException {
		ScriptEngine engine = JsEngineUtil.newEngine();
		engine.eval("print(JSON.stringify({name : '张良'}))");
	}
}
