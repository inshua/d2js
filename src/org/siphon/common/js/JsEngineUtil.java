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
package org.siphon.common.js;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.io.Reader;
import java.lang.reflect.Field;
import java.util.concurrent.Callable;

import javax.script.Invocable;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.script.SimpleScriptContext;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeError;
import jdk.nashorn.internal.runtime.ECMAException;

import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;

public class JsEngineUtil {

	private final static String importsFn = "/*******************************************************************************\n" +
			" * The MIT License (MIT)\n" +
			" * Copyright © 2015 Inshua,inshua@gmail.com, All rights reserved.\n" +
			" *\n" +
			" * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and\n" +
			" * associated documentation files (the “Software”), to deal in the Software without restriction,\n" +
			" * including without limitation the rights to use, copy, modify, merge, publish, distribute,\n" +
			" * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is\n" +
			" * furnished to do so, subject to the following conditions:\n" +
			" *\n" +
			" * The above copyright notice and this permission notice shall be included in all copies or substantial\n" +
			" * portions of the Software.\n" +
			" *\n" +
			" * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING\n" +
			" * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\n" +
			" * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES\n" +
			" * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN\n" +
			" * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n" +
			" *******************************************************************************/\n" +
			"if(typeof println == 'undefined') engine.put('println', print);\n" +
			"/**\n" +
			" * 引用另一个脚本，如果已经引用过，不再重复引用\n" +
			" * js不能确知该段代码文件自身的路径，现在这个功能是通过压栈来确保可以得到当前文件，动作过程如下\n" +
			" * 在java端 eval 脚本时，在 engine['IMPORTS_PATH_STACK'] 追加当前文件，通过获取 IMPORTS_PATH_STACK.last() 可以得到当前文件的路径\n" +
			" * 例如，当java eval \"a.js\" 时，栈状态为 ['a.js']\n" +
			" * 		当 a.js 的代码引用 b/b1.js 时，引用路径为 './b/b1.js'，栈状态为 ['a.js', 'b/b1.js']\n" +
			" * 			此时 b1.js 如欲引用 b/b2.js，可以使用 imports('b2.js')。因为栈顶可以取得 b/b1.js，所以可以使用关联路径。\n" +
			" * 			调用 import(b/b2.js) ，则栈状态变为 ['a.js', 'b/b1.js', 'b/b2.js']\n" +
			" * 			当 b2.js eval 完，栈状态恢复到['a.js', 'b/b1.js']\n" +
			" * 		当 b1.js eval 完，栈状态恢复到 ['a.js']\n" +
			" * 		此时，a.js 又可以按它的相对路径引用其它脚本\n" +
			" * \n" +
			" * 显然这个方式并不支持回调，如果在回调中要引用脚本，只能使用对默认路径的相对路径，通过 DEFAULT_IMPORTS_PATHS 获得。 \n" +
			" * 一般网站设成 ['WEB-INF/jslib/']\n" +
			" * 同步程序设置成 ['js/', 'jslib/']\n" +
			" * @param scriptFile\n" +
			" */\n" +
			"function imports(scriptFile){\n" +
			"	var stk = IMPORTS_PATH_STACK;\n" +
			"	var last = stk[stk.length-1];\n" +
			"	var currFile = new java.io.File(last);\n" +
			"	var abspath = new java.io.File(currFile, '../' + scriptFile).getCanonicalPath();\n" +
			"	var result;\n" +
			"	if(new java.io.File(abspath).exists()){\n" +
			"		stk.push(abspath);\n" +
			"		try{\n" +
			"			if(!IMPORTED_FILES[abspath]){\n" +
			"				//println('include ' + abspath + ' found at stack');\n" +
			"				IMPORTED_FILES[abspath] = true;\n" +
			"				engine.put(\"javax.script.filename\", abspath);\n" +
			"				result = engine.eval(new java.io.InputStreamReader(new java.io.FileInputStream(abspath), \"utf-8\"));\n" +
			"			}\n" +
			"		} catch(e){\n" +
			"			throw e;\n" +
			"		} finally {\n" +
			"			stk.pop();\n" +
			"		}\n" +
			"		return result;\n" +
			"	} else {\n" +
			"		var defaults = DEFAULT_IMPORTS_PATHS;\n" +
			"		for(var i=0; i<defaults.length; i++){\n" +
			"			var file = new java.io.File(defaults[i]);\n" +
			"			abspath = new java.io.File(file, scriptFile).getCanonicalPath();\n" +
			"			if(new java.io.File(abspath).exists()){\n" +
			"				stk.push(abspath);\n" +
			"				try{\n" +
			"					if(!IMPORTED_FILES[abspath]){\n" +
			"						//println('include ' + abspath + ' found at default path');\n" +
			"						IMPORTED_FILES[abspath] = true;\n" +
			"						engine.put(\"javax.script.filename\", scriptFile);\n" +
			"						result = engine.eval(new java.io.InputStreamReader(new java.io.FileInputStream(abspath), \"utf-8\"));\n" +
			"					}\n" +
			"				} catch(e){\n" +
			"					throw e;\n" +
			"				} finally {\n" +
			"					stk.pop();\n" +
			"				}\n" +
			"				return result;\n" +
			"			}\n" +
			"		}\n" +
			"		println(scriptFile + ' not found, imports failed, default paths: ' + DEFAULT_IMPORTS_PATHS + ' from: ' + last);\n" +
			"		return result;\n" +
			"	}\n" +
			"}	\n" +
			"/**\n" +
			" * 和 imports 类似，但是可以发生重复引用\n" +
			" * @param scriptFile\n" +
			" */\n" +
			"function include(scriptFile){\n" +
			"	var stk = IMPORTS_PATH_STACK;\n" +
			"	var last = stk[stk.length-1];\n" +
			"	var currFile = new java.io.File(last);\n" +
			"	var abspath = new java.io.File(currFile, '../' + scriptFile).getCanonicalPath();\n" +
			"	var result;\n" +
			"	if(new java.io.File(abspath).exists()){\n" +
			"		stk.push(abspath);\n" +
			"		try{\n" +
			"			//println('include ' + abspath + ' found at stack');\n" +
			"			IMPORTED_FILES[abspath] = true;\n" +
			"			engine.put(\"javax.script.filename\", scriptFile);\n" +
			"			result = engine.eval(new java.io.InputStreamReader(new java.io.FileInputStream(abspath), \"utf-8\"));\n" +
			"		} catch(e){\n" +
			"			throw e;\n" +
			"		} finally {\n" +
			"			stk.pop();\n" +
			"		}\n" +
			"		return result;\n" +
			"	} else {\n" +
			"		var defaults = DEFAULT_IMPORTS_PATHS;\n" +
			"		for(var i=0; i<defaults.length; i++){\n" +
			"			var file = new java.io.File(defaults[i]);\n" +
			"			abspath = new java.io.File(file, scriptFile).getCanonicalPath();\n" +
			"			if(new java.io.File(abspath).exists()){\n" +
			"				stk.push(abspath);\n" +
			"				//println('include ' + abspath + ' found at default path');\n" +
			"				try{\n" +
			"					IMPORTED_FILES[abspath] = true;\n" +
			"					engine.put(\"javax.script.filename\", abspath);\n" +
			"					result = engine.eval(new java.io.InputStreamReader(new java.io.FileInputStream(abspath), \"utf-8\"));\n" +
			"				} catch(e){\n" +
			"					throw e;\n" +
			"				} finally {\n" +
			"					stk.pop();\n" +
			"				}\n" +
			"				return result;\n" +
			"			}\n" +
			"		}\n" +
			"		println(scriptFile + ' not found, include failed, default paths: ' + DEFAULT_IMPORTS_PATHS + ' from: ' + last);\n" +
			"    return result;\n" +
			"  }\n" +
			"}\n" +
			"/**\n" +
			" * 找出文件路径。前面两个函数不用这个函数，是因为前面两个函数可能在eval的代码中调用 include 或 imports。\n" +
			" * @param filename\n" +
			" */\n" +
			"function findResource(filename){\n" +
			"  var stk = IMPORTS_PATH_STACK;\n" +
			"  var last = stk[stk.length-1];\n" +
			"  var currFile = new java.io.File(last);\n" +
			"  if(new java.io.File(filename).exists()){\n" +
			"    return filename;\n" +
			"  }\n" +
			"  var abspath = new java.io.File(currFile, '../' + filename).getCanonicalPath();\n" +
			"  var result;\n" +
			"  if(new java.io.File(abspath).exists()){\n" +
			"    return abspath;\n" +
			"  } else {\n" +
			"    var defaults = DEFAULT_IMPORTS_PATHS;\n" +
			"    for(var i=0; i<defaults.length; i++){\n" +
			"      var file = new java.io.File(defaults[i]);\n" +
			"      abspath = new java.io.File(file, filename).getCanonicalPath();\n" +
			"      if(new java.io.File(abspath).exists()){\n" +
			"        return abspath;\n" +
			"      }\n" +
			"    }\n" +
			"  }\n" +
			"}\n" +
			"/**\n" +
			" * 为JSON解析时提供日期解析。\n" +
			" * usage: JSON.parse(string, parseDate)\n" +
			" * @param key\n" +
			" * @param value\n" +
			" * @returns\n" +
			" */\n" +
			"function parseDate(key, value) {\n" +
			"    switch(typeof value){\n" +
			"    case 'string':\n" +
			"        var a = parseDate.reg.exec(value);\n" +
			"        if (a) {\n" +
			"            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[5] || 0, a[6] || 0, +a[7] || 0));\n" +
			"        }\n" +
			"        break;\n" +
			"    }\n" +
			"    return value;\n" +
			"}\n" +
			"parseDate.reg = /^(\\d{4})-(\\d{2})-(\\d{2})(T(\\d{2}):(\\d{2}):(\\d{2}(?:\\.\\d*)?)Z?)?$/;\n" +
			"engine.put('parseDate', parseDate);\n" +
			"// nashorn 无用\n" +
			"///**\n" +
			"// * 明确用 engine 调用某函数。\n" +
			"// * 使用场合：当使用 try catch(e){throw e} 时，会丢失堆栈信息，此时应使用\n" +
			"// * try{\n" +
			"// *     (function(){}).invoke()\n" +
			"// * } catch(e){throw e}\n" +
			"// */\n" +
			"//Function.prototype.invoke = function(scope){\n" +
			"//  engine.invokeMethod(this, \"call\", scope);\n" +
			"//}";

	/**
	 * 
	 * @param jsEngine
	 * @param libs [path, path, ...]
	 */
	public static void initEngine(ScriptEngine jsEngine, Object[] libs) {
		try {
			jsEngine.put("engine", jsEngine);
			NashornScriptEngine nashornScriptEngine = (NashornScriptEngine) jsEngine;
			JsTypeUtil jsTypeUtil = new JsTypeUtil(jsEngine);
			ScriptObjectMirror importedFiles = jsTypeUtil.newObject();
			jsEngine.put("IMPORTED_FILES", importedFiles);

			ScriptObjectMirror stk = jsTypeUtil.newArray();
			jsEngine.put("IMPORTS_PATH_STACK", stk);

			ScriptObjectMirror defaults = (libs.length > 0 && libs[0] != null && libs[0] instanceof String
					&& ((String) libs[0]).length() > 0) ? jsTypeUtil.newArray(libs) : jsTypeUtil.newArray();
			jsEngine.put("DEFAULT_IMPORTS_PATHS", defaults);

			jsEngine.put(ScriptEngine.FILENAME, "common/engine.js");
			jsEngine.eval(importsFn);
		} catch (ScriptException e) {
			e.printStackTrace();
		}
	}

	public static ScriptEngine newEngine() {
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("JavaScript");
		initEngine(engine, new Object[] {});
		return engine;
	}

	public static Object eval(ScriptEngine jsEngine, String srcFile) throws ScriptException, IOException {
		jsEngine.put(ScriptEngine.FILENAME, srcFile);
		return jsEngine.eval(FileUtils.readFileToString(new File(srcFile)));
	}

	public static Object eval(ScriptEngine jsEngine, String srcFile, String code) throws ScriptException {

		jsEngine.put(ScriptEngine.FILENAME, srcFile);
		return jsEngine.eval(code);
	}

	public static Object eval(ScriptEngine jsEngine, String srcFile, boolean onlyOnce, boolean preservePathInStack)
			throws Exception {
		ScriptObjectMirror importedFiles = (ScriptObjectMirror) jsEngine.get("IMPORTED_FILES");
		if (importedFiles.containsKey(srcFile)) {
			if (onlyOnce)
				return null;
		} else {
			importedFiles.put(srcFile, true);
		}
		ScriptObjectMirror stk = (ScriptObjectMirror) jsEngine.get("IMPORTS_PATH_STACK");
		// NativeArray.pushObject(stk.to(NativeArray.class), srcFile);
		//stk.callMember("push", srcFile);

		try {
			String code = FileUtils.readFileToString(new File(srcFile), "utf-8");
			return eval(jsEngine, srcFile, code);
		} catch (ScriptException | FileNotFoundException e) {
			throw e;
		} finally {
			if (!preservePathInStack)
				NativeArray.pop(stk.to(NativeArray.class));
		}
	}

	public static Object eval(ScriptEngine jsEngine, String srcFile, String script, boolean preservePathInStack)
			throws NoSuchMethodException, ScriptException {
		return eval(jsEngine, srcFile, srcFile, script, false, preservePathInStack);
	}

	public static Object eval(ScriptEngine jsEngine, String srcFile, String aliasPath, String script, boolean onlyOnce,
			boolean preservePathInStack) throws NoSuchMethodException, ScriptException {
		ScriptObjectMirror importedFiles = (ScriptObjectMirror) jsEngine.get("IMPORTED_FILES");
		if (importedFiles.containsKey(srcFile)) {
			if (onlyOnce)
				return null;
		} else {
			importedFiles.put(srcFile, true);
		}
		ScriptObjectMirror stk = (ScriptObjectMirror) jsEngine.get("IMPORTS_PATH_STACK");
		//NativeArray.pushObject((Object)(stk.to(NativeArray.class)), (Object)srcFile);
		stk.callMember("push", srcFile);

		try {
			return eval(jsEngine, aliasPath, script);
		} catch (ScriptException e) {
			throw e;
		} finally {
			if (!preservePathInStack)
				NativeArray.pop(stk.to(NativeArray.class));
		}
	}

	/**
	 * 分析引擎抛出的错误。包括 js new Error new 自定义错误  以及 js 中调用 java 引发的错误。 
	 * @return 如为 js 错误，则返回有 name 和 value 的 Scriptable，如为 java 错误，返回  throwable
	 */
	public static Object parseJsException(Throwable e) {
		for (Throwable throwable : ExceptionUtils.getThrowables(e)) {
			if (throwable instanceof ECMAException) {
				ECMAException je = (ECMAException) throwable;
				if (je.thrown != null) {
					Object thrown = je.thrown;
					if (thrown instanceof Throwable) {
						return parseJsException((Throwable) thrown);
					} else if (thrown instanceof NativeError) {
						return thrown;
//						Object nashornException = ((NativeError) thrown).nashornException;
//						if (nashornException != null) {
//							if (nashornException instanceof Throwable) {
//								return parseJsException((Throwable) nashornException);
//							} else {
//								return nashornException;
//							}
//						} else {
//							return thrown;
//						}
					} else {
						return thrown;
					}
				}
			}
		}
		return e;
	}
	
	public static Object invokeMethodCrossEngine(ScriptEngine masterEngine, ScriptEngine serverEngine, Object object, String method, Object[] arguments) throws NoSuchMethodException, ScriptException{
		if(masterEngine == serverEngine){
			return ((Invocable)serverEngine).invokeMethod(object, method, arguments);
		} else {
			Object[] arguments2 = new Object[arguments.length];
			for(int i=0; i<arguments.length; i++){
				if(arguments[i] instanceof ScriptObjectMirror){
					arguments2[i] = ((ScriptObjectMirror)arguments[i]).to(Object.class);
				} else {
					arguments2[i] = arguments[i];
				}
			}
			Object res = null;
			if(object instanceof ScriptObjectMirror){
				res = ((ScriptObjectMirror) object).callMember(method, arguments2);
			} else {
				res = ((Invocable)serverEngine).invokeMethod(object, method, arguments2);
			}
			if(res instanceof ScriptObjectMirror){
				return ((ScriptObjectMirror) res).to(Object.class);
			} else {
				return res;
			}
		}
	}
	
	public static Object getGlobal(ScriptEngine engine){
		ScriptContext context = engine.getContext();
		ScriptObjectMirror binding = (ScriptObjectMirror) context.getBindings(ScriptContext.ENGINE_SCOPE);
		Field globalField = null;
		try {
			globalField = ScriptObjectMirror.class.getDeclaredField("global");
			globalField.setAccessible(true);
			Object global = globalField.get(binding);
			return global;
		} catch (NoSuchFieldException e) {
		} catch (SecurityException e) {
		} catch (IllegalArgumentException e) {
		} catch (IllegalAccessException e) {
		}
		return null;
	}
	
	public static Object getGlobal(ScriptObjectMirror scriptObjectMirror){
		Field globalField = null;
		try {
			globalField = ScriptObjectMirror.class.getDeclaredField("global");
			globalField.setAccessible(true);
			Object global = globalField.get(scriptObjectMirror);
			return global;
		} catch (NoSuchFieldException e) {
		} catch (SecurityException e) {
		} catch (IllegalArgumentException e) {
		} catch (IllegalAccessException e) {
		}
		return null;
	}
	
}
