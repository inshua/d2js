package test.js;

import javax.script.Bindings;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Document.OutputSettings;
import org.jsoup.nodes.Element;
import org.siphon.common.js.JsEngineUtil;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeJSON;

public class JsonTest {
	public static void main(String[] args) throws ScriptException {
		ScriptEngine engine = JsEngineUtil.newEngine();
	    Bindings b = engine.getContext().getBindings(ScriptContext.ENGINE_SCOPE);
	    System.out.println(b.get("JSON")); // gets ECMAScript "Object" constructor
	    ScriptObjectMirror jsonm = (ScriptObjectMirror) b.get("JSON");
	    //System.out.println(jsonm.callMember("parse", "[]"));
	    System.out.println(jsonm.to(Object.class));
	    
	    System.out.println(engine.eval("JSON.parse('\"1975-05-04T16:00:00.000Z\"', parseDate)"));
	    
	    Element element;
	    Document document;
	    OutputSettings outputSettings =  new OutputSettings();
	    outputSettings.prettyPrint()
	    document.outerHtml()
	}
}
