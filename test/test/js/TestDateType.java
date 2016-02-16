package test.js;

import java.util.Date;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeDate;
import jdk.nashorn.internal.objects.NativeJSON;
import jdk.nashorn.internal.runtime.JSType;
import jdk.nashorn.internal.runtime.ScriptFunction;

import org.apache.commons.dbcp.BasicDataSource;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.common.js.UnsupportedConversionException;

public class TestDateType {

	private static Logger logger = Logger.getLogger(TestDateType.class);
	
	public static void main(String[] args) throws Exception {
		PropertyConfigurator.configure("./log4j.properties");
		
		ScriptEngine engine = JsEngineUtil.newEngine();
		try {
			ScriptObjectMirror obj = (ScriptObjectMirror) engine.eval("new Date()");
			NativeDate date = obj.to(NativeDate.class);
			NativeDate.setTime(date, new Date().getTime() + 86400000L);
			System.out.println(obj);
			
			
			obj = (ScriptObjectMirror) engine.eval("function(){ print('hello'); }");
			ScriptFunction fun = obj.to(ScriptFunction.class);
			obj.callMember("call");
			System.out.println(obj);
			
			JsTypeUtil jsTypeUtil = new JsTypeUtil(engine);
			JSON json = new JSON(engine);
			engine.eval("1");		// it's java.lang.Integer
			
			
			engine.eval("true");	// it's Boolean

			ScriptObjectMirror marr = (ScriptObjectMirror) engine.eval("[1,2,3]");
			NativeArray arr = marr.to(NativeArray.class);
			System.out.println(NativeArray.length(arr).getClass() + " : " + NativeArray.length(arr));
			System.out.println(arr.getLength().getClass() + " : " + arr.getLength());

			ScriptObjectMirror mobj = jsTypeUtil.newObject();
			mobj.put("name", "tom");
			// NativeArray.push(arr, mobj);
			marr.callMember("push", mobj);
			NativeArray.push(arr, 12);
			System.out.println(json.stringify(marr));
			
			
			marr = (ScriptObjectMirror) engine.eval("(function(){return {name : 'jack', age : 1, parent : {name : 'mike'}};})()");
			System.out.println(marr.keySet());
			System.out.println(marr.get("age").getClass());
			
			System.out.println(marr.get("parent").getClass());
			


			BasicDataSource bds = new BasicDataSource();
			bds.setDriverClassName("org.postgresql.Driver");

			bds.setUrl("jdbc:postgresql://localhost:5432/booktown");

			bds.setUsername("postgres");
			bds.setPassword("pass4postgres");

			engine.put("dataSource", bds);
			String d2js = "...\\.metadata\\.plugins\\org.eclipse.wst.server.core\\tmp0\\wtpwebapps\\d2js\\WEB-INF\\jslib\\lang.js";
			JsEngineUtil.eval(engine, d2js, true, true);
			String s = "{\"_m\":\"fetch\",\"_page\":\"{\\\"start\\\":0,\\\"limit\\\":10}\"}";
			Object object = json.parse(s);
			//NativeJSON.parse()
			System.out.println(object);

			engine.put("s", s);
			object = JsEngineUtil.eval(engine, "test.js", "JSON.parse(s, parseDate)");
			System.out.println(object);
		} catch (ScriptException e) {
			logger.error("", e);
		}
		
		
	}
}
