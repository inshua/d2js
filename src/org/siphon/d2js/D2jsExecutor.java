package org.siphon.d2js;

import java.nio.file.Path;
import java.nio.file.WatchEvent;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;

import org.apache.log4j.Logger;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.d2js.jshttp.D2jsInitParams;
import org.siphon.d2js.jshttp.JsEngineHandlerContext;
import org.siphon.d2js.jshttp.JsServlet;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

/**
 * 简单的执行器，可以直接执行 d2js 文件中的方法。可以用于 java 调用 d2js 中的函数，d2js中也可以使用该函数。
 * 用法:
 * D2jsExecutor.exec("abcd.d2js", "test", params);
 * @author Inshua
 */
public class D2jsExecutor extends JsServlet {

	private static final long serialVersionUID = 7360192607248134346L;
	private D2jsUnitManager d2jsUnitManager;

	private static D2jsExecutor instance;

	@Override
	public void init() throws ServletException {
		super.init();
		String path = this.getServletContext().getRealPath("");

		D2jsInitParams d2jsInitParams = new D2jsInitParams();
		d2jsInitParams.setLibs(this.getJsLibs());
		d2jsInitParams.setApplication(JsServlet.application);
		d2jsInitParams.setPreloadJs(this.getPreloadJs());

		this.d2jsUnitManager = new D2jsUnitManager(path, d2jsInitParams);

		instance = this;
	}

	protected Object execute(String jsfile, String method, Object... params) throws Exception {
		ScriptObjectMirror d2js = d2jsUnitManager.getD2js(this.getServletContext().getRealPath(jsfile), jsfile);

		ScriptEngine engine = d2jsUnitManager.getEngine();
		JsTypeUtil jsTypeUtil = new JsTypeUtil(engine);
		for (int i = 0; i < params.length; i++) {
			params[i] = jsTypeUtil.javaObjectToJs(params[i]);
		}
		Object res = d2js.callMember(method, params);
		return JsTypeUtil.jsObjectToJava(res);
	}

	public static Object exec(String jsfile, String method, Object... params) throws Exception {
		return instance.execute(jsfile, method, params);
	}

	@Override
	protected void onFileChanged(WatchEvent<Path> ev, Path file) {
		d2jsUnitManager.onFileChanged(ev, file);
	}
}
