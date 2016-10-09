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

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.WatchEvent;
import java.util.HashMap;

import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang3.StringUtils;
import org.siphon.d2js.D2jsRunner;
import org.siphon.d2js.D2jsUnitManager;
import org.siphon.d2js.jshttp.D2jsInitParams;
import org.siphon.d2js.jshttp.JsServlet;

/**
 * Servlet implementation class JsspServlet
 */
@MultipartConfig
public class JsspServlet extends JsServlet {

	private static final long serialVersionUID = 4043721090235859907L;

	public JsspServlet() {
		super();
	}

	@Override
	public void init() throws ServletException {
		super.init();

		String path = this.getServletContext().getRealPath("");
		
		D2jsInitParams args = new D2jsInitParams();
		args.setLibs(this.getJsLibs());
		args.setApplication(JsServlet.application);
		args.setPreloadJs(this.getPreloadJs());
		args.setGlobalLockObject(new Object());
		
		JsspRunner jsspRunner = new JsspRunner(new JsspUnitManager(path, args));
		this.getServletContext().setAttribute("jsspRunner", jsspRunner);		
	}

	@Override
	protected void service(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		JsspRunner jsspRunner = (JsspRunner) this.getServletContext().getAttribute("jsspRunner");
		jsspRunner.run(request, response);
	}

	@Override
	protected void onFileChanged(WatchEvent<Path> ev, Path file) {
		JsspRunner runner = (JsspRunner) this.getServletContext().getAttribute("jsspRunner");
		if (runner != null) {
			runner.getUnitManager().onFileChanged(ev, file);
		}
	}

}
