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
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.StandardWatchEventKinds;
import java.nio.file.WatchEvent;
import java.nio.file.WatchEvent.Kind;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import javax.script.ScriptEngine;
import javax.sql.DataSource;

import org.apache.commons.pool2.BasePooledObjectFactory;
import org.apache.commons.pool2.PooledObject;
import org.apache.commons.pool2.impl.DefaultPooledObject;
import org.apache.commons.pool2.impl.GenericObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.apache.log4j.Logger;
import org.siphon.common.io.WatchDir;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.d2js.D2jsUnitManager;


import jdk.nashorn.api.scripting.ScriptObjectMirror;
import sun.font.Script;

public abstract class ServerUnitManager {

	private static Logger logger = Logger.getLogger(D2jsUnitManager.class);
	protected String srcFolder;
	//protected ScriptEngine engine;

	protected final GenericObjectPool<ScriptEngine> enginePool;
	//protected final ThreadLocal<ScriptEngine> engine;
	
	
	public ServerUnitManager(final String srcFolder, D2jsInitParams initParams) {
		this.srcFolder = srcFolder;

		GenericObjectPoolConfig config = new GenericObjectPoolConfig();
		config.setMaxTotal(10000);
		config.setMaxIdle(1000);
		config.setMinIdle(10);
		
		enginePool = new GenericObjectPool<>(new BasePooledObjectFactory<ScriptEngine>() {

			@Override
			public ScriptEngine create() throws Exception {
				return createEngine(initParams);
			}

			@Override
			public PooledObject<ScriptEngine> wrap(ScriptEngine paramT) {
				return new DefaultPooledObject<ScriptEngine>(paramT);
			}

			
		}, config);
		
	}

	public JsEngineHandlerContext getEngineContext(final String srcFile, final String aliasPath) throws Exception {
		ScriptEngine engine = enginePool.borrowObject();
		// ScriptEngine engine = this.engine.get();
		Map<String, Object> contextsPerFile  = (Map<String, Object>) engine.get("allD2js");
		ScriptObjectMirror existed = (ScriptObjectMirror) contextsPerFile.get(srcFile);
		JsEngineHandlerContext result = new JsEngineHandlerContext();
		result.setScriptEngine(engine);
		result.setHandler(existed);
		result.setJson(new JSON(engine));
		result.setJsTypeUtil(new JsTypeUtil(engine));
		result.setEnginePool(this.enginePool);;
		if (existed == null) {
			synchronized(this){
				if(contextsPerFile.containsKey(srcFile)){
					result.setHandler((ScriptObjectMirror) contextsPerFile.get(srcFile));
				} else {
					if ((new File(srcFile)).exists()) {
						result = this.createEngineContext(engine, srcFile, aliasPath);
					} else {
						return null;
					}
				}
			}
		}
		return result;
	}

	protected abstract JsEngineHandlerContext createEngineContext(ScriptEngine engine, String srcFile, String aliasPath)
			throws Exception;

	public void onFileChanged(WatchEvent<Path> ev, Path file) {
//		Kind<Path> kind = ev.kind();
//		String filename = file.toString();
//		if (kind == StandardWatchEventKinds.ENTRY_DELETE) {
//			if (contextsPerFile.containsKey(filename)) {
//				if (logger.isDebugEnabled()) {
//					logger.debug(filename + " dropped");
//				}
//				contextsPerFile.remove(filename);
//			}
//		} else if (kind == StandardWatchEventKinds.ENTRY_MODIFY) {
//			if (contextsPerFile.containsKey(filename)) {
//				if (logger.isDebugEnabled()) {
//					logger.debug(filename + " changed");
//				}
//				contextsPerFile.remove(filename);
//			}
//		}
	}

	protected abstract ScriptEngine createEngine(D2jsInitParams initParams) throws Exception;

}