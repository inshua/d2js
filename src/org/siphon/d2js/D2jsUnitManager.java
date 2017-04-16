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
import java.io.FilenameFilter;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.FileVisitOption;
import java.nio.file.FileVisitResult;
import java.nio.file.FileVisitor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.nio.file.Watchable;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.servlet.ServletContext;
import javax.sql.DataSource;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.filefilter.DirectoryFileFilter;
import org.apache.commons.io.filefilter.FileFilterUtils;
import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.log4j.Logger;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.d2js.jshttp.D2jsInitParams;
import org.siphon.d2js.jshttp.JsEngineHandlerContext;
import org.siphon.d2js.jshttp.ServerUnitManager;
import org.siphon.d2js.jshttp.Task;
import org.siphon.jssql.SqlExecutor;

public class D2jsUnitManager extends ServerUnitManager {

	private static Logger logger = Logger.getLogger(D2jsUnitManager.class);

	public D2jsUnitManager(ServletContext servletContext, D2jsInitParams initParams) {
		super(servletContext, initParams);
	}

	@Override
	protected ScriptEngine createEngine(D2jsInitParams initParams) throws Exception {
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("JavaScript");

		JsEngineUtil.initEngine(engine, initParams.getLibs());
		
		engine.put("servletContext", this.servletContext);

		File path = new File(srcFolder);

		engine.put("logger", logger);
		engine.put("application", initParams.getApplication());

		// 由 js 根据业务需要创建，创建后由 java 关闭
		if (initParams.getPreloadJs() != null) {
			String[] preloadJs = initParams.getPreloadJs(); // [abs path, alias]
			logger.info("evaluate preload js: " + preloadJs[0]);
			JsEngineUtil.eval(engine, preloadJs[0], preloadJs[1], FileUtils.readFileToString(new File(preloadJs[0]), "utf-8"),
					true, false);
		}

		return engine;
	}
	
	@Override
	protected ScriptObjectMirror createD2js(ScriptEngine engine, String srcFile, String aliasPath) throws Exception {
		File src = new File(srcFile);
		String code = FileUtils.readFileToString(src, "utf-8");
		String requestPath = this.localFilePathToRequestPath(srcFile);
		String covertedCode = this.convertCode(code, src, requestPath);
		File tmp = new File(srcFile + ".converted.js");
		FileUtils.write(tmp, covertedCode, "utf-8");
		if (logger.isDebugEnabled())
			logger.debug(srcFile + " converted as " + tmp.getAbsolutePath());

		ScriptObjectMirror d2js = (ScriptObjectMirror) JsEngineUtil.eval(engine, srcFile, aliasPath, covertedCode, false, true);
		return d2js;
	}

	protected String convertCode(String code, File src, String requestPath) throws Exception {
		// return "(function (d2js){" + new EmbedSqlTranslator().translate(code) + "; d2js.cloner = function(){};
		// d2js.cloner.prototype=d2js; return d2js;})(d2js.clone());";
		return "(function (d2js, src, path){"
				+ "d2js.srcFile = src; " 
				+ "d2js.path = path;"
				+ new EmbedSqlTranslator().translate(code) + "; "
				+ "d2js.initD2js && d2js.initD2js(); return d2js;})"
				+ "("
				+ "d2js.clone(), "
				+ "\"" + StringEscapeUtils.escapeJava(src.getAbsolutePath()) + "\","
				+ "\"" + (requestPath) + "\""
				+ ");";
	}

	// public void scanD2jsUnits() {
	// File dir = new File(this.srcFolder);
	// Collection<File> files = FileUtils.listFiles(dir, FileFilterUtils.suffixFileFilter(".d2js"),
	// DirectoryFileFilter.DIRECTORY);
	// for(File file : files){
	// try {
	// this.createEngineContext(this.engine, file.getAbsolutePath(), file.getAbsolutePath());
	// } catch (Exception e) {
	// logger.warn("load d2js failed " + file, e);
	// }
	// }
	// }

}
