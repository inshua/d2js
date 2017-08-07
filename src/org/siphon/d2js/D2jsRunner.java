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
import org.apache.commons.lang3.mutable.MutableObject;
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

	protected final ScriptEngine engine;

	private final JsTypeUtil jsTypeUtil;

	protected final JSON json;

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
	 * @throws Exception 
	 */
	public boolean ensureD2jsLoaded(String jsfile, String aliasPath) throws Exception {
		return d2jsManager.getD2js(jsfile, aliasPath) != null;
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

	public void run(HttpServletRequest request, HttpServletResponse response, String method)
			throws ServletException, IOException {
		
		String requestPath = getServletPath(request);
		String jsfile = request.getServletContext().getRealPath(requestPath);
		ScriptObjectMirror d2js = null;
		try {
			d2js = d2jsManager.getD2js(jsfile, requestPath);
			if(d2js == null){
				response.setStatus(404);
				PrintWriter out = response.getWriter();
				out.print(request.getServletPath() + " not found");
				out.flush();
				return;
			}
		} catch (Exception e3) {
			logger.error("", e3);
			throw new ServletException(e3);
		}
		
		JsspRequest jsspRequest = new JsspRequest(request, engine);

		ScriptObjectMirror params;
		try {
			params = getParams(jsspRequest);
		} catch (Exception e3) {
			response.setStatus(500);
			PrintWriter out = response.getWriter();
			out.print("{\"error\":{\"message\" : \"params must be json\"}}");
			out.flush();
			return;
		} 
		

		formatter.writeHttpHeader(response);
		
		JsspWriter out = null;
		//Task task = null;
		MutableObject<Task> taskDocker = new MutableObject<>();
		try {
			out = new JsspWriter(response, engine);
			JsspSession session = new JsspSession(request.getSession());
			
			// 可能由于 native 已经编译为 JO 之类，导致使用 ScrpiteObjectMirror 方式访问反而效率更低
			((Invocable)engine).invokeFunction("processRequest", jsfile, method, params, jsspRequest, response, session, out, taskDocker);
//			d2js = (ScriptObjectMirror) d2js.callMember("clone");
//			d2js.put("request", jsspRequest);
//			d2js.put("response", response);
//			d2js.put("session", session);
//			d2js.put("out", out);
//			d2js.put("task", task);
//			Object result = d2js.callMember(method, params);
//			if(JsTypeUtil.isNull(result)){
//				out.print("{\"success\":true}");
//			} else {
//				out.print(this.json.stringify(result));
//			}
//
			Task task = taskDocker.getValue();
			if(task != null && task.getCallbacker() != null){
				this.completeTask(taskDocker.getValue(), null);
			}
		} catch (Exception e) {
			try {
				Task task = taskDocker.getValue();
				if(task != null && task.getCallbacker() != null){
					this.completeTask(taskDocker.getValue(), e);
				}
			} catch (Exception e2) {
				logger.error("", e2);
			}

			Object ex = JsEngineUtil.parseJsException(e);
			if (ex instanceof Throwable == false) {
				boolean ignore = false;
				if (ex instanceof ScriptObjectMirror) {
					ScriptObjectMirror mex = (ScriptObjectMirror) ex;
					CharSequence name = (CharSequence) mex.get("name");
					if ("ValidationError".equals(name) || "MultiError".equals(name)) {
						ignore = true;
					}
				} else if (ex instanceof ScriptObject) {
					ScriptObject oex = (ScriptObject) ex;
					CharSequence name = (CharSequence) oex.get("name");
					if ("ValidationError".equals(name) || "MultiError".equals(name)) {
						ignore = true;
					}
				}
				if (!ignore)
					logger.error(json.tryStringify(ex), e);
			} else {
				logger.error("", (Throwable) ex);
			}

			try {
				out.print(formatter.formatException(ex, this.engine));
				out.flush();
			} catch (Exception e1) {
				logger.error("", e1);
			}
		} finally {
			out.flush();
		}
	}


	

}
