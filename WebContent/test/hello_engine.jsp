<%@page import="javax.script.Invocable"%>
<%@page import="org.siphon.common.js.JsEngineUtil"%>
<%@page import="javax.script.ScriptEngineManager"%>
<%@page import="javax.script.ScriptEngine"%>
<%
	ScriptEngine engine = (ScriptEngine)application.getAttribute("engine");
	if(engine == null){
		engine = JsEngineUtil.newEngine();
		engine.put("f", engine.eval("function f(out){out.print('hello')}"));
		application.setAttribute("engine", engine);
	}
	
	Invocable inv = (Invocable)engine;
	inv.invokeFunction("f", out);
%>
