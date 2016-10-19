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

import java.sql.SQLException;

import javax.script.ScriptEngine;
import javax.servlet.http.HttpServletResponse;

import org.siphon.common.js.JSON;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.jssp.JsspWriter;
import org.siphon.jssql.SqlExecutorException;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeError;
import jdk.nashorn.internal.objects.NativeJSON;
import jdk.nashorn.internal.objects.NativeTypeError;
import jdk.nashorn.internal.runtime.Context;
import jdk.nashorn.internal.runtime.ScriptObject;

public class D2jsFormatter extends Formatter {

	@Override
	public void formatQueryResult(JsspWriter out, Object queryResult, String message) throws Exception {
		if(!out.isDirty()){
			if (JsTypeUtil.isNull(queryResult)){
				out.print("{\"success\" : true}");
			} else {
				out.printJson(queryResult);
			}
		}
	}

	@Override
	public String formatException(Object exception, ScriptEngine engine) throws Exception {
		if (exception instanceof ScriptObjectMirror){
			return formatException(JsTypeUtil.getSealed((ScriptObjectMirror) exception), engine);		
		} else if( exception instanceof ScriptObject) {
			//NativeError, NativeTypeError, NativeEvalError, ...
			// 现在已找到方法能 JSON.stringify Error 对象，不再需要 hack instMessage
//			if(((ScriptObject) exception).getOwnKeys(false).length == 0){
//				Object instMessage = ((ScriptObject) exception).get("message");		// instMessage
//				if(instMessage != null){
//					exception = instMessage;
//				}
//			}		
		}else if (exception instanceof SqlExecutorException){
			SqlExecutorException sqlExecutorException = (SqlExecutorException) exception;
			if(sqlExecutorException.getCause() instanceof SQLException){
				exception = sqlExecutorException.getCause().getMessage();
			} else {
				exception = sqlExecutorException.getMessage();
			}
		} else if(exception instanceof Throwable){
			if(((Throwable) exception).getCause() instanceof SqlExecutorException){
				return formatException(((Throwable) exception).getCause(), engine);
			}
			exception = ((Throwable) exception).getMessage();
		} else {
			exception = exception.toString();
		}
		ScriptObjectMirror result = new JsTypeUtil(engine).newObject();
		result.put("error", exception);

		return new JSON(engine).stringify(result);
	}

	@Override
	public String formatException(String exception, ScriptEngine engine) throws Exception {
		JsTypeUtil jsTypeUtil = new JsTypeUtil(engine);

		ScriptObjectMirror result = jsTypeUtil.newObject();
		result.put("error", exception);

		return new JSON(engine).stringify(result);

	}

	@Override
	public void writeHttpHeader(HttpServletResponse response) {
		response.setContentType("application/json");
		response.setCharacterEncoding("utf-8");
		response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, post-check=0, pre-check=0");
		response.setHeader("Connection", "Keep-Alive");
		response.setHeader("Pragma", "no-cache");

	}

}
