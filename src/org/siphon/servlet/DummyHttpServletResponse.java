/*******************************************************************************
 * The MIT License (MIT)
 * Copyright © 2016 Inshua,inshua@gmail.com, All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the “Software”), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/
package org.siphon.servlet;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;
import java.util.StringTokenizer;

import javax.servlet.ServletOutputStream;
import javax.servlet.WriteListener;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

import org.apache.commons.io.output.WriterOutputStream;
import org.apache.tomcat.util.http.fileupload.ByteArrayOutputStream;

/**
 * 闲话不多说：
 * DummyHttpServletResponse dummyResp = new DummyHttpServletResponse(response);
	//request.getServletContext().getRequestDispatcher("/test/b.jsp?a=/1").include(request, dummyResp);
	//request.getServletContext().getRequestDispatcher("/molecules/xxx.html").include(request, dummyResp);
	request.getServletContext().getRequestDispatcher("/molecules/xxx.jssp").include(request, dummyResp);
	
	out.write(StringEscapeUtils.escapeHtml4(dummyResp.getResponseAsString()));
 * @author Inshua
 *
 */
public final class DummyHttpServletResponse extends HttpServletResponseWrapper {
	final ByteArrayOutputStream barr = new ByteArrayOutputStream();
	final PrintWriter myout = new PrintWriter(barr);
	private WriterOutputStream os = null;
	private PrintWriter writer = null;

	public DummyHttpServletResponse(HttpServletResponse response) {
		super(response);
		os = new WriterOutputStream(myout, response.getCharacterEncoding());
	}

	@Override
	public PrintWriter getWriter() throws IOException {
		return writer;
	}

	public ServletOutputStream getOutputStream() throws IOException {
	    return new ServletOutputStream() {
			
			@Override
			public void write(int b) throws IOException {
	            os.write(b);
	        }
	        public void flush() throws IOException {
	            os.flush();
	        }
	        @Override
	        public void close() throws IOException {
	        	super.close();
	        }
			
			@Override
			public void setWriteListener(WriteListener arg0) {
			}
			
			@Override
			public boolean isReady() {
				return true;
			}
		};
	}

	public void setContentType(String contentType) {
	    String charset = getContentTypeCharset(contentType);
	    if(writer!=null) writer.flush();
	    if(os!= null){
			try {
				os.flush();
			} catch (IOException e) {
			}
	    }

	    os = new WriterOutputStream(myout, charset != null ? charset: this.getResponse().getCharacterEncoding());
	    writer = new PrintWriter(os){
	    	@Override
	    	public void write(char[] buf, int off, int len) {
	    		super.write(buf, off, len);
	    		super.flush();		// JspWriter 已经有 buffer，所以有数据最好 flush，且， JspWriterImpl 最后在 flushBuffer 时调用的也是该签名的函数
	    	}
	    	@Override
	    	public void print(String s) {
	    		super.print(s);
	    		super.flush();		// jssp 使用 print
	    	}
	    	@Override
	    	public void flush() {
	    		super.flush();
	    	}
	    };
	}

	// This is copied from NetUtils
	public String getContentTypeCharset(String contentType) {
	    final Map parameters = getContentTypeParameters(contentType);
	    return (String) ((parameters == null) ? null : parameters.get("charset"));
	}

	public Map getContentTypeParameters(String contentType) {
	    if (contentType == null)
	        return null;
	    // Check whether there may be parameters
	    final int semicolumnIndex = contentType.indexOf(";");
	    if (semicolumnIndex == -1)
	        return null;
	    // Tokenize
	    final StringTokenizer st = new StringTokenizer(contentType, ";");
	    if (!st.hasMoreTokens())
	        return null; // should not happen as there should be at least the content type
	    st.nextToken();
	    // No parameters
	    if (!st.hasMoreTokens())
	        return null;
	    // Parse parameters
	    final Map parameters = new HashMap();
	    while (st.hasMoreTokens()) {
	        final String parameter = st.nextToken().trim();
	        final int equalIndex = parameter.indexOf('=');
	        if (equalIndex == -1)
	            continue;
	        final String name = parameter.substring(0, equalIndex).trim();
	        final String value = parameter.substring(equalIndex + 1).trim();
	        parameters.put(name, value);
	    }
	    return parameters;
	}

	public ByteArrayOutputStream getResponseAsStream() {
		try {
			this.os.flush();
		} catch (IOException e) {
		}
		return barr;
	}
	
	public String getResponseAsString() {
		try {
			this.os.flush();
		} catch (IOException e) {
		}
		return barr.toString();
	}
}