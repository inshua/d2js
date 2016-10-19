package test.js;

import java.util.Date;

import javax.script.Bindings;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeFunction;
import jdk.nashorn.internal.objects.NativeObject;

public class JsNewObject {
	
	public static void main(String[] args) throws ScriptException {
		ScriptEngine engine = JsEngineUtil.newEngine();
	    Bindings b = engine.getContext().getBindings(ScriptContext.ENGINE_SCOPE);
	    System.out.println(b.get("Object")); // gets ECMAScript "Object" constructor
	    ScriptObjectMirror objConstructor = (ScriptObjectMirror) b.get("Object");
	        
	    Object obj = objConstructor.call(null);
	    System.out.println(obj);

	    engine.eval("Object.prototype.say = function(){print('abcd')}");
	    
	    ScriptObjectMirror om = (ScriptObjectMirror) objConstructor.call(null);
	    om.callMember("say");


	    JsTypeUtil t = new JsTypeUtil(engine);
	    System.out.println(t.newArray(1,2,3));
	    System.out.println(t.newObject());
	    
	    ScriptObjectMirror dateConstructor = (ScriptObjectMirror) b.get("Date");
	    Object date = dateConstructor.call(dateConstructor);
	    System.out.println(date);
	    		
//	    JsDateUtil d = new JsDateUtil(engine);
//	    System.out.println(d.toNativeDate(new Date().getTime()));
	}
}
