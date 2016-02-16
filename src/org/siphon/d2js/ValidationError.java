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

public class ValidationError extends Exception{

	/**
	 * 
	 */
	private static final long serialVersionUID = 6368639035623095765L;

	private String filedName;
	
	public synchronized String getFiledName() {
		return filedName;
	}

	public synchronized void setFiledName(String filedName) {
		this.filedName = filedName;
	}

	public synchronized String getCheckerName() {
		return checkerName;
	}

	public synchronized void setCheckerName(String checkerName) {
		this.checkerName = checkerName;
	}

	private String checkerName;

	public ValidationError(String filedName, String checkerName, String message){
		super(message);
		this.filedName = filedName;
		this.checkerName = checkerName;
	}
	
	@Override
	public String toString() {
		String msg = this.getMessage();
		return String.format(
				"{\"success\" : false,"
				+ "\"isException\":true,"
			    + "\"field\": \"%s\","
				+ "\"check\": \"%s\","
				+ "\"message\": \"%s\"}", this.getFiledName(), this.getCheckerName(), msg.replaceAll("\"", "\\\""));
	}
}
