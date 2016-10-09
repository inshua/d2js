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

import javax.servlet.http.HttpServletResponse;

import org.siphon.d2js.jshttp.JsEngineHandlerContext;
import org.siphon.jssp.JsspWriter;

public abstract class Formatter {

	public abstract void formatQueryResult(JsspWriter out, Object queryResult, String message, JsEngineHandlerContext engineContext)
			throws Exception;

	public abstract String formatRow(Object row, String message, JsEngineHandlerContext engineContext) throws Exception;

	public abstract String formatException(Object exception, JsEngineHandlerContext engineContext) throws Exception;

	public abstract String formatException(String exception, JsEngineHandlerContext engineContext) throws Exception;

	public abstract String formatExecuteResult(HttpServletResponse response, int number, JsEngineHandlerContext engineContext);

	public abstract void writeHttpHeader(HttpServletResponse response, JsEngineHandlerContext engineContext);


}
