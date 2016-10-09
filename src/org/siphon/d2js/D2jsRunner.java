/*******************************************************************************
 * The MIT License (MIT)
 * Copyright © 2015 Inshua,inshua@gmail.com, All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the “Software”), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/
package org.siphon.d2js;

import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Struct;
import java.util.Currency;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.rmi.PortableRemoteObject;
import javax.script.Bindings;
import javax.script.Invocable;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.servlet.AsyncContext;
import javax.servlet.DispatcherType;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeObject;
import jdk.nashorn.internal.runtime.ScriptObject;

import org.apache.catalina.Globals;
import org.apache.catalina.startup.EngineConfig;
import org.apache.commons.dbcp2.BasicDataSource;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.StopWatch;
import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.d2js.jshttp.D2jsInitParams;
import org.siphon.d2js.jshttp.JsEngineHandlerContext;
import org.siphon.d2js.jshttp.JsServlet;
import org.siphon.d2js.jshttp.ServerUnitManager;
import org.siphon.d2js.jshttp.Task;
import org.siphon.jssp.JsspRequest;
import org.siphon.jssp.JsspSession;
import org.siphon.jssp.JsspWriter;

public class D2jsRunner {

	private static Logger logger = Logger.getLogger(D2jsRunner.class);

	protected final ServerUnitManager d2jsManager;

	private final Formatter formatter = new D2jsFormatter();

	private final ScriptEngine engine;

	private final JsTypeUtil jsTypeUtil;

	private final JSON json;

	public D2jsRunner(D2jsUnitManager d2jsManager) {
		this.d2jsManager = d2jsManager;
		this.engine = d2jsManager.getEngine();
		this.engine.put("d2jsRunner", this);
		this.jsTypeUtil = new JsTypeUtil(this.engine);
		this.json = new JSON(this.engine);
	}
	
	protected ScriptObjectMirror getParams(JsspRequest request) throws Exception {
		String s = request.getParameter("params");
		if (s != null) {
			return (ScriptObjectMirror) json.parse(s);
		}

		ScriptObjectMirror params = jsTypeUtil.newObject();
		Map<String, String[]> parameterMap = request.getParameterMap();
		for (String p : parameterMap.keySet()) {
			params.put(p, request.get(p));
		}
		return params;
	}


	public void completeTask(Task task, Exception exception) throws Exception {
		ScriptObjectMirror cb = null;
		if (exception == null) {
			cb = (ScriptObjectMirror) task.end();
		} else {
			cb = (ScriptObjectMirror) task.end(exception, engine);
		}
		if (cb != null && cb.containsKey("callback")) {
			((Invocable) engine).invokeMethod(cb, "callback", cb);
		}
	}

	public ServerUnitManager getUnitManager() {
		return d2jsManager;
	}

	/**
	 * 为 d2js 中隔离调用另一个 d2js 提供支持
	 * @param jsfile
	 * @param request
	 * @param response
	 * @param method
	 * @return 
	 * @return
	 * @throws Exception
	 */
	public ScriptObjectMirror getD2js(String jsfile, JsspRequest request, HttpServletResponse response)
			throws Exception {
		ScriptObjectMirror engineContext = null;
		try {
			engineContext = d2jsManager.getD2js(jsfile, request.getContextPath());
			return engineContext;

		} catch (Exception e3) {
			throw new ServletException(e3);
		}
	}

	public String getServletPath(HttpServletRequest request){
		// FORWARD,  INCLUDE,  REQUEST,  ASYNC,  ERROR
		if(request.getDispatcherType() == DispatcherType.REQUEST){
			return request.getServletPath();
		} else if(request.getDispatcherType() == DispatcherType.INCLUDE){
			return (String) request.getAttribute(Globals.DISPATCHER_REQUEST_PATH_ATTR);
		} else {
			return request.getServletPath();	// not sure
		}
	}

	public void run(AsyncContext asyncContext, String method)
			throws ServletException, IOException {
		
		HttpServletRequest request = (HttpServletRequest) asyncContext.getRequest();
		HttpServletResponse response = (HttpServletResponse) asyncContext.getResponse();
		StopWatch watch = new StopWatch();
		
		String jsfile = request.getServletContext().getRealPath(getServletPath(request));
		watch.start();
		ScriptObjectMirror d2js = null;
		try {
			d2js = d2jsManager.getD2js(jsfile, getServletPath(request));
			if(d2js == null){
				response.setStatus(404);
				PrintWriter out = response.getWriter();
				out.print(request.getServletPath() + " not found");
				out.flush();
				asyncContext.complete();
				return;
			}
		} catch (Exception e3) {
			logger.error("", e3);
			throw new ServletException(e3);
		}
		
		if(watch.getTime() > 10) logger.debug("getEngineContext exhaust " + watch.getNanoTime() / 1000000.0);
		watch.reset();

		JsspRequest jsspRequest = new JsspRequest(request, engine);

		ScriptObjectMirror params;
		try {
			params = getParams(jsspRequest);
		} catch (Exception e3) {
			response.setStatus(500);
			PrintWriter out = response.getWriter();
			out.print("params must be json");
			out.flush();
			asyncContext.complete();
			return;
		} 
		

		formatter.writeHttpHeader(response);
		
		JsspWriter out = null;
		Task task = new Task();
		try {
			out = new JsspWriter(response, engine);
			JsspSession session = new JsspSession(request.getSession());
			
			((Invocable)engine).invokeFunction("processRequest", jsfile, method, params, jsspRequest, response, session, out, task);
			
			if(task.getCallbacker() != null){
				this.completeTask(task, null);
			}
		} catch (Exception e) {
			try {
				this.completeTask(task, e);
			} catch (Exception e2) {
				logger.error("", e2);
			}

			Object ex = JsEngineUtil.parseJsException(e);
			if (ex instanceof Throwable == false) {
				boolean ignore = false;
				if (ex instanceof ScriptObjectMirror) {
					ScriptObjectMirror mex = (ScriptObjectMirror) ex;
					if (mex.containsKey("name") && "ValidationError".equals(mex.get("name"))) {
						ignore = true;
					}
				} else if (ex instanceof ScriptObject) {
					ScriptObject oex = (ScriptObject) ex;
					if (oex.containsKey("name") && "ValidationError".equals(oex.get("name"))) {
						ignore = true;
					}
				}
				if (!ignore)
					logger.error(json.tryStringify(ex), e);
			} else {
				logger.error("", (Throwable) ex);
			}

			try {
				out.print(formatter.formatException(ex, null));
				out.flush();
			} catch (Exception e1) {
				logger.error("", e1);
			}
		} finally {
			asyncContext.complete();
		}
	}

	

}
