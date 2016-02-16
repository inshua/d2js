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

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.nio.file.Watchable;
import java.util.Map;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.servlet.ServletContext;
import javax.sql.DataSource;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.log4j.Logger;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.d2js.jshttp.JsEngineHandlerContext;
import org.siphon.d2js.jshttp.ServerUnitManager;
import org.siphon.d2js.jshttp.Task;
import org.siphon.jssql.SqlExecutor;

public class D2jsUnitManager extends ServerUnitManager {

	private static Logger logger = Logger.getLogger(D2jsUnitManager.class);

	public D2jsUnitManager(String srcFolder) {
		super(srcFolder);
	}

	@Override
	protected JsEngineHandlerContext createEngineContext(String srcFile, String aliasPath, DataSource dataSource,
			final Map<String, Object> otherArgs) throws Exception {
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("JavaScript");

		JsEngineUtil.initEngine(engine, (Object[]) otherArgs.get("jslib"));

		File path = new File(srcFolder);

		engine.put("logger", logger);
		engine.put("dataSource", dataSource);
		engine.put("application", otherArgs.get("application"));
		// 由 js 根据业务需要创建，创建后由 java 关闭
		if (otherArgs.get("preloadJs") != null) {
			String[] preloadJs = (String[]) otherArgs.get("preloadJs");		// [abs path, alias]
			logger.info("evaluate preload js: " + preloadJs[0]);
			JsEngineUtil.eval(engine, preloadJs[0], preloadJs[1], FileUtils.readFileToString(new File(preloadJs[0]), "utf-8"), true, false);
		}

		File src = new File(srcFile);
		String code = FileUtils.readFileToString(src, "utf-8");
		String covertedCode = this.convertCode(code, src);
		File tmp = new File(srcFile + ".converted.js");
		FileUtils.write(tmp, covertedCode, "utf-8");
		if (logger.isDebugEnabled())
			logger.debug(srcFile + " converted as " + tmp.getAbsolutePath());

		JsEngineUtil.eval(engine, srcFile, aliasPath, covertedCode, false, true);

		JsEngineHandlerContext ctxt = new JsEngineHandlerContext();
		ctxt.setScriptEngine(engine);
		ctxt.setHandler((ScriptObjectMirror) engine.eval("d2js"));
		ctxt.setJson(new JSON(engine)); // jdk has a NativeJSON class inside but
										// it's sealed
		ctxt.setJsTypeUtil(new JsTypeUtil(engine));

		return ctxt;
	}

	protected String convertCode(String code, File src) throws Exception {
		return new EmbedSqlTranslator().translate(code);
	}

}
