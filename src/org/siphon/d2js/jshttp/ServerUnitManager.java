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
package org.siphon.d2js.jshttp;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.StandardWatchEventKinds;
import java.nio.file.WatchEvent;
import java.nio.file.WatchEvent.Kind;
import java.util.concurrent.ConcurrentHashMap;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.servlet.ServletContext;

import org.apache.commons.io.FilenameUtils;
import org.apache.log4j.Logger;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.d2js.D2jsUnitManager;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public abstract class ServerUnitManager {

	private static Logger logger = Logger.getLogger(D2jsUnitManager.class);
	protected String srcFolder;
	protected  ScriptEngine engine;
	private ConcurrentHashMap<String, ScriptObjectMirror> allD2js = new ConcurrentHashMap<>();
	protected final ServletContext servletContext;

	public ScriptEngine getEngine() {
		return engine;
	}
	
	public void init(D2jsInitParams initParams) {
		try {
			createEngine(initParams);
			//allD2js = (ConcurrentHashMap<String, ScriptObjectMirror>) this.engine.get("allD2js");
		} catch (Exception e) {
			logger.error("", e);
			throw new RuntimeException(e);
		}
	}

	public ServerUnitManager(ServletContext servletContext) {
		this.servletContext = servletContext;
		this.srcFolder = servletContext.getRealPath("");
	}
	
	public String localFilePathToRequestPath(String srcFile){
		String delta = FilenameUtils.separatorsToUnix(srcFile.substring(srcFolder.length()));
		return (delta.charAt(0) != '/') ? "/" + delta : delta;
	}

	public ScriptObjectMirror getD2js(final String srcFile, final String aliasPath) throws Exception {
		// ScriptEngine engine = this.engine.get();
		ScriptObjectMirror existed = (ScriptObjectMirror) allD2js.get(srcFile);
		if (existed == null) {
			synchronized(this){
				if(allD2js.containsKey(srcFile)){
					return (ScriptObjectMirror) allD2js.get(srcFile);
				} else {
					if ((new File(srcFile)).exists()) {
						ScriptObjectMirror d2js = this.createD2js(engine, srcFile, aliasPath);
						allD2js.put(srcFile, d2js);
						return d2js;
					} else {
						return null;
					}
				}
			}
		}
		return existed;
	}

	protected abstract ScriptObjectMirror createD2js(ScriptEngine engine, String srcFile, String aliasPath)
			throws Exception;

	public void onFileChanged(WatchEvent<Path> ev, Path file) {
		Kind<Path> kind = ev.kind();
		String filename = file.toString();
		try {
			if (kind == StandardWatchEventKinds.ENTRY_DELETE) {
				if (allD2js.containsKey(filename)) {
					if (logger.isDebugEnabled()) {
						logger.debug(filename + " dropped");
					}
					ScriptObjectMirror d2js = allD2js.get(filename);
					if(d2js.containsKey("releaseD2js")){
						d2js.callMember("releaseD2js");
					}
					allD2js.remove(filename);
					//TODO call releaseD2js?
				}
			} else if (kind == StandardWatchEventKinds.ENTRY_MODIFY) {
				if (allD2js.containsKey(filename)) {
					if (logger.isDebugEnabled()) {
						logger.debug(filename + " changed");
					}
					ScriptObjectMirror d2js = allD2js.get(filename);
					if(d2js.containsKey("releaseD2js")){
						d2js.callMember("releaseD2js");
					}
					allD2js.remove(filename);
				}
			}
		} catch (Exception e) {
			logger.error("file synchronize failed on " + filename + " changed ", e);
		}
	}

	protected  void createEngine(D2jsInitParams initParams) throws Exception{
		engine = new ScriptEngineManager().getEngineByName("JavaScript");
		engine.put("allD2js", allD2js);
		engine.put("servletContext", this.servletContext);
		engine.put("logger", logger);
		engine.put("application", initParams.getApplication());

		JsEngineUtil.initEngine(engine, initParams.getLibs());
	}

	public ServletContext getServletContext() {
		return servletContext;
	}

}