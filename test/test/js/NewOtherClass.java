package test.js;

import javax.script.Bindings;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public class NewOtherClass {
	public static void main(String[] args) throws ScriptException {
		ScriptEngine engine = JsEngineUtil.newEngine();
		
		engine.eval("function C(){this.test=function(){println('this is c')}}");
		
	    Bindings b = engine.getContext().getBindings(ScriptContext.ENGINE_SCOPE);
	    ScriptObjectMirror c = (ScriptObjectMirror) engine.get("C");
	    
	    ScriptObjectMirror obj = (ScriptObjectMirror) c.newObject();
	    obj.callMember("test");
	    
	}

}
