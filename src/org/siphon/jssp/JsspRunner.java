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
package org.siphon.jssp;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.util.Date;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;

import javax.script.Bindings;
import javax.script.Invocable;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import javax.sql.DataSource;

import org.apache.log4j.Logger;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.d2js.D2jsRunner;
import org.siphon.d2js.D2jsUnitManager;
import org.siphon.d2js.jshttp.D2jsInitParams;
import org.siphon.d2js.jshttp.JsEngineHandlerContext;
import org.siphon.d2js.jshttp.JsServlet;
import org.siphon.d2js.jshttp.ServerUnitManager;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.runtime.ScriptObject;

public class JsspRunner extends D2jsRunner{

	private JsspUnitManager jsspUnitManager;

	public JsspRunner(D2jsInitParams params, JsspUnitManager jsspUnitManager) {
		super(params, jsspUnitManager);
		this.jsspUnitManager = jsspUnitManager;
	}

	private static Logger logger = Logger.getLogger(JsspRunner.class);

	@Override
	protected void initEngineContext(JsEngineHandlerContext engineContext, HttpServletRequest request,
			HttpServletResponse response) throws IOException {
		super.initEngineContext(engineContext, request, response);
		ScriptEngine engine = engineContext.getScriptEngine();
		engine.put("jsspRunner", this);
	}
	
	@Override
	public void run(HttpServletRequest request, HttpServletResponse response, String method)
			throws ServletException, IOException {
		String jsfile = request.getServletContext().getRealPath(getServletPath(request));
		if(!new File(jsfile).exists()){
			response.setStatus(404);
			PrintWriter out = response.getWriter();
			out.print(request.getServletPath() + " not found");
			out.flush();
			return;
		}

		JsEngineHandlerContext engineContext = null;
		try {
			engineContext = d2jsManager.getEngineContext(jsfile, jsfile, this.getInitParams());
		} catch (Exception e3) {
			logger.error("", e3);
			throw new ServletException(e3);
		}

		JsspRequest jsspRequest = new JsspRequest(request, engineContext);
		
		ScriptObjectMirror params = null;
		try {
			params = getParams(engineContext, jsspRequest);
		} catch (Exception e3) {
			response.setStatus(500);
			PrintWriter out = response.getWriter();
			out.print("params must be json");
			out.flush();
			return;
		}

		try {
			initEngineContext(engineContext, jsspRequest, response);
			
			this.run(engineContext, jsspRequest, response, "jssp", params);
		} catch (Exception e) {
			throw new ServletException(e);
		} finally {
			if (engineContext != null)
				engineContext.free();
		}	
		
	}

	public void run(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		this.run(request, response, "jssp");
	}


}
