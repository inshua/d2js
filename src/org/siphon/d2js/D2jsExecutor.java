package org.siphon.d2js;

import java.nio.file.Path;
import java.nio.file.WatchEvent;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;

import org.apache.log4j.Logger;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.d2js.jshttp.D2jsInitParams;
import org.siphon.d2js.jshttp.JsEngineHandlerContext;
import org.siphon.d2js.jshttp.JsServlet;

/**
 * 简单的执行器，可以直接执行 d2js 文件中的方法。可以用于 java 调用 d2js 中的函数，d2js中也可以使用该函数。
 * 用法:
 * SimpleExecutor.exec("abcd.d2js", "test", params);
 * @author Inshua
 */
public class D2jsExecutor extends JsServlet {

	private static final long serialVersionUID = 7360192607248134346L;
	private D2jsUnitManager d2jsUnitManager;
	private D2jsInitParams d2jsInitParams;

	private static D2jsExecutor instance;
	
	@Override
	public void init() throws ServletException {
		super.init();
		String path = this.getServletContext().getRealPath("");
		
		d2jsInitParams = new D2jsInitParams();
		d2jsInitParams.setLibs(this.getJsLibs());
		d2jsInitParams.setApplication(JsServlet.application);
		d2jsInitParams.setPreloadJs(this.getPreloadJs());
		
		this.d2jsUnitManager = new D2jsUnitManager(path);
		
		instance = this;
	}
	
	protected Object execute(String jsfile, String method, Object... params) throws Exception{
		JsEngineHandlerContext engineContext = d2jsUnitManager.getEngineContext(this.getServletContext().getRealPath(jsfile), jsfile, d2jsInitParams);
		for(int i=0; i< params.length; i++){
			params[i] = engineContext.getJsTypeUtil().javaObjectToJs(params[i]);
		}
		Object res = engineContext.getEngineAsInvocable().invokeMethod(engineContext.getHandler(), method, params);
		return JsTypeUtil.jsObjectToJava(res);
	}
	
	public static Object exec(String jsfile, String method, Object... params) throws Exception{
		return instance.execute(jsfile, method, params);
	}
	
	@Override
	protected void onFileChanged(WatchEvent<Path> ev, Path file) {
		d2jsUnitManager.onFileChanged(ev, file);;
	}
}
