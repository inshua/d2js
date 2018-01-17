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
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;

import javax.script.ScriptEngine;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang3.StringEscapeUtils;
import org.siphon.common.js.JSON;
import org.siphon.common.js.UnsupportedConversionException;

public class JsspWriter {

	
	
	private final HttpServletResponse response;
	private PrintWriter writer;
	private ServletOutputStream outputStream;
	
	private boolean dirty = false;
	private final ScriptEngine engine;
	
	public JsspWriter(HttpServletResponse response, ScriptEngine engine) {
		this.response = response;
		this.engine = engine;
	}
	

	public void print(String s) throws IOException {
		if(this.writer== null ){
			this.writer = response.getWriter();
			this.dirty = true;
		}
		this.writer.print(s);
	}
	
	public void write(byte[] data) throws IOException {
		if(this.outputStream == null){
			this.outputStream = response.getOutputStream();
			this.dirty = true;
		}
		this.outputStream.write(data);
		
	}
	
	public void flush() throws IOException {
		if(this.writer != null){
			this.writer.flush();
		}
		if(this.outputStream != null){
			this.outputStream.flush();
		}
	}

	void close() throws IOException {
		if(this.writer != null){
			this.writer.close();
		}
		if(this.outputStream != null){
			this.outputStream.close();
		}
	}
	
	public void printHtml(String s) throws IOException{
		this.print(StringEscapeUtils.escapeHtml4(s));
	}
	
	public void printJs(String s) throws IOException{
		this.print(StringEscapeUtils.escapeEcmaScript(s));
	}
	
	public void printJson(Object o) throws IOException{
		this.print(new JSON(engine).tryStringify(o));
	}


	public boolean isDirty() {
		return dirty;
	}
}
