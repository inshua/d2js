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
package org.siphon.d2js.jshttp;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.WatchEvent;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.rmi.PortableRemoteObject;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import javax.sql.DataSource;

import org.apache.commons.lang3.StringUtils;
import org.apache.log4j.Logger;
import org.siphon.common.io.WatchDir;
import org.siphon.jssp.JsspGlobal;
import org.siphon.jssp.JsspSession;

public abstract class JsServlet extends HttpServlet {

	private static Logger logger = Logger.getLogger(JsServlet.class);

	protected static Map<String, Object> application = new JsspGlobal();

	@Override
	public void init() throws ServletException {
		super.init();

		String path = this.getServletContext().getRealPath("");
		final Path dir = new File(path).toPath();
		watchFileChange(dir);

	}

	public String[] getPreloadJs() {
		String js = this.getServletConfig().getInitParameter("PRELOADJS");
		if (StringUtils.isEmpty(js)) {
			return null;
		} else {
			return new String[] { this.getServletContext().getRealPath(js), js };
		}
	}

	public String[] getJsLibs() {
		String jslib = this.getServletConfig().getInitParameter("JSLIB");
		if (!StringUtils.isEmpty(jslib)) {
			if (StringUtils.isEmpty(jslib)) {
				return new String[] {};
			} else {
				List<String> ls = new ArrayList<String>();
				for (String s : jslib.split(",")) {
					if (!StringUtils.isEmpty(s)) {
						String path = this.getServletContext().getRealPath(s.trim());
						ls.add(path);
						// ls.add(s.trim());
					}
				}
				return (String[]) ls.toArray(new String[ls.size()]);
			}
		} else {
			return new String[] {};
		}
	}

	public static String getBodyAsString(HttpServletRequest request) throws IOException {

		String body = null;
		StringBuilder stringBuilder = new StringBuilder();
		BufferedReader bufferedReader = request.getReader();

		try {
			char[] charBuffer = new char[128];
			int bytesRead = -1;
			while ((bytesRead = bufferedReader.read(charBuffer)) > 0) {
				stringBuilder.append(charBuffer, 0, bytesRead);
			}
		} catch (IOException ex) {
			throw ex;
		} finally {
			if (bufferedReader != null) {
				try {
					bufferedReader.close();
				} catch (IOException ex) {
					throw ex;
				}
			}
		}

		body = stringBuilder.toString();
		return body;
	}

	private void watchFileChange(final Path dir) {
		new Thread(new Runnable() {
			public void run() {
				try {
					new WatchDir(dir, true) {

						@Override
						protected void onFileChanged(WatchEvent<Path> ev, Path file) {
							JsServlet.this.onFileChanged(ev, file);
						}
					}.processEvents();
				} catch (IOException e) {
					logger.error("", e);
				}
			}
		}).start();
	}

	protected abstract void onFileChanged(WatchEvent<Path> ev, Path file);

//	protected DataSource initDataSource() {
//		try {
//			Context ctx = new InitialContext();
//			Object obj = ctx.lookup(this.getServletContext().getInitParameter("dataSource"));
//			DataSource ds = (DataSource) PortableRemoteObject.narrow(obj, DataSource.class);
//			return ds;
//		} catch (ClassCastException e) {
//			logger.error("", e);
//		} catch (NamingException e) {
//			logger.error("", e);
//		}
//		return null;
//	}

	public static JsspSession getJsSesson(HttpSession session) {
		JsspSession jsspSession = (JsspSession) session.getAttribute("JSSPSESSION");
		if (jsspSession == null) {
			jsspSession = new JsspSession(session);
			session.setAttribute("JSSPSESSION", jsspSession);
		}
		return jsspSession;
	}
}
