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

import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.jasper.tagplugins.jstl.core.Out;

public class JsspTranslator {

	private String code;

	public JsspTranslator(String code) {
		this.code = code;
	}

	public String translate() {
		StringBuffer result = new StringBuffer();
		result.append("d2js.jssp = function(params){var request = this.request;var response = this.response; var out = this.out;var session = this.session;");
		result.append("response.setContentType('text/html; charset=utf-8'); ");

		StringBuffer line = new StringBuffer();
		boolean afterCode = false;
		for (int i = 0; i < code.length(); i++) {
			char c = code.charAt(i);
			switch (c) {
			case '[':
				if (code.startsWith("[%", i)) {

					if (line.length() > 0) {
						result.append(outputLine(line));
						line.setLength(0);
					}

					StringBuffer code = new StringBuffer();
					if (this.code.startsWith("[%=", i)) {
						i += 2;
						i += tillTerm(i + 1, code);
						result.append("out.print(").append(code).append(");");
					} else if (this.code.startsWith("[%~", i)) {
						i += 2;
						i += tillTerm(i + 1, code);
						result.append("out.print(JSON.stringify(").append(code).append("));");
					} else if (this.code.startsWith("[%-", i)) {
						i += 2;
						i += tillTerm(i + 1, code);
						result.append("out.printHtml(").append(code).append(");");
					} else {
						i++;
						i += tillTerm(i + 1, code);
						result.append(code);
					}
					afterCode = true;
				} else {
					line.append(c);
				}
				break;

			case '\r':
				if (code.startsWith("\r\n", i)) {
					i++;
				}
			case '\n':
				if (line.length() == 0 && afterCode) {
					result.append(System.lineSeparator());
				} else {
					line.append(System.lineSeparator());
					result.append(outputLine(line)).append(System.lineSeparator());
					line.setLength(0);
				}
				break;

			default:
				if (afterCode)
					afterCode = false;
				line.append(c);
			}
		}

		if (line.length() > 0) {
			result.append(outputLine(line));
		}

		result.append("}");

		return result.toString();
	}

	private int tillTerm(int start, StringBuffer output) {
		int i = start;
		till: for (; i < code.length(); i++) {
			char c = code.charAt(i);
			switch (c) {
			case '%':
				if (code.startsWith("%]", i)) {
					i += 2;
					break till;
				} else {
					output.append(c);
				}
				break;
			case '"':
			case '\'': // bypass string
				output.append(c);
				i++;
				for (; i < code.length(); i++) {
					char e = code.charAt(i);
					output.append(e);
					if (e == '\\') {
						i++;
						output.append(code.substring(i, i + 1));
					} else if (e == c) {
						break;
					}
				}
				break;

			case '/': // bypass comment
				output.append(c);
				if (code.startsWith("/*", i)) {
					output.append('*');
					i += 2;
					for (; i < code.length(); i++) {
						c = code.charAt(i);
						output.append(c);
						if (c == '*' && code.startsWith("*/", i)) {
							i++;
							output.append('/');
							break;
						}
					}
				} else if (code.startsWith("//", i)) {
					output.append('/');
					i += 2;
					for (; i < code.length(); i++) {
						c = code.charAt(i);
						output.append(c);
						if (c == '\r' || c == '\n') {
							break;
						} else if (c == '%' && code.startsWith("%]", i)) {
							output.setLength(output.length() - 1);
							i += 2;
							break till;
						}
					}
				}
				break;

			default:
				output.append(c);
			}

		}
		return i - start;
	}

	private String outputLine(StringBuffer line) {
		return "out.print(\"" + StringEscapeUtils.escapeEcmaScript(line.toString()) + "\");";
	}

}
