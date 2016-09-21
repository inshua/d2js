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

import javax.script.ScriptEngine;
import javax.sql.DataSource;

import org.apache.commons.pool.BasePoolableObjectFactory;
import org.apache.commons.pool.ObjectPool;
import org.apache.commons.pool.impl.GenericObjectPool;
import org.apache.commons.pool.impl.GenericObjectPool.Config;
import org.apache.log4j.Logger;
import org.siphon.common.io.WatchDir;
import org.siphon.d2js.D2jsUnitManager;

import jdk.nashorn.api.scripting.ScriptObjectMirror;

public abstract class ServerUnitManager {

	private static Logger logger = Logger.getLogger(D2jsUnitManager.class);
	private Map<String, ObjectPool<JsEngineHandlerContext>> contextsPerFile = new ConcurrentHashMap<String, ObjectPool<JsEngineHandlerContext>>();
	protected String srcFolder;

	public ServerUnitManager() {
		super();
	}

	public ServerUnitManager(final String srcFolder) {
		this.srcFolder = srcFolder;
	}

	public JsEngineHandlerContext getEngineContext(final String srcFile, final String aliasPath, D2jsInitParams params) throws Exception {

		File file = null;
		if (contextsPerFile.containsKey(srcFile)) {
			ObjectPool<JsEngineHandlerContext> pool = contextsPerFile.get(srcFile);
			JsEngineHandlerContext ctxt = pool.borrowObject();
			ctxt.setPool(pool);
			return ctxt;
		} else if ((file = new File(srcFile)).exists()) {
			
			GenericObjectPool<JsEngineHandlerContext> enginePool;
			BasePoolableObjectFactory<JsEngineHandlerContext> factory = new BasePoolableObjectFactory<JsEngineHandlerContext>() {

				@Override
				public JsEngineHandlerContext makeObject() throws Exception {
					return createEngineContext(srcFile, aliasPath, params);
				}
				
			};

			enginePool = new GenericObjectPool<JsEngineHandlerContext>(factory);

			JsEngineHandlerContext ctxt = enginePool.borrowObject();
			ctxt.setPool(enginePool);
			
//			 * /*      */   public static final byte WHEN_EXHAUSTED_FAIL = 0;
///*      */   public static final byte WHEN_EXHAUSTED_BLOCK = 1;
///*      */   public static final byte WHEN_EXHAUSTED_GROW = 2;
///*      */   public static final int DEFAULT_MAX_IDLE = 8;
///*      */   public static final int DEFAULT_MIN_IDLE = 0;
///*      */   public static final int DEFAULT_MAX_ACTIVE = 8;
///*      */   public static final byte DEFAULT_WHEN_EXHAUSTED_ACTION = 1;
///*      */   public static final boolean DEFAULT_LIFO = true;
///*      */   public static final long DEFAULT_MAX_WAIT = -1L;
///*      */   public static final boolean DEFAULT_TEST_ON_BORROW = false;
///*      */   public static final boolean DEFAULT_TEST_ON_RETURN = false;
///*      */   public static final boolean DEFAULT_TEST_WHILE_IDLE = false;
///*      */   public static final long DEFAULT_TIME_BETWEEN_EVICTION_RUNS_MILLIS = -1L;
///*      */   public static final int DEFAULT_NUM_TESTS_PER_EVICTION_RUN = 3;
///*      */   public static final long DEFAULT_MIN_EVICTABLE_IDLE_TIME_MILLIS = 1800000L;
///*      */   public static final long DEFAULT_SOFT_MIN_EVICTABLE_IDLE_TIME_MILLIS = -1L;
			Config config = new Config();
			config.maxActive = 2000;
			config.maxIdle = 500;
			config.minIdle = 10;
			ScriptObjectMirror d2js = ctxt.getHandler();
			if(d2js.containsKey("configurePagePool")){
				d2js.callMember("configurePagePool", config);
			}
			enginePool.setConfig(config);

			contextsPerFile.put(srcFile, enginePool);

			return ctxt;
		} else {
			throw new IOException("file not found " + srcFile);
		}
	}

	protected abstract JsEngineHandlerContext createEngineContext(String srcFile, String aliasPath, D2jsInitParams params) throws Exception;

	public void onFileChanged(WatchEvent<Path> ev, Path file) {
		Kind<Path> kind = ev.kind();
		String filename = file.toString();
		if (kind == StandardWatchEventKinds.ENTRY_DELETE) {
			if (contextsPerFile.containsKey(filename)) {
				if (logger.isDebugEnabled()) {
					logger.debug(filename + " dropped");
				}
				contextsPerFile.remove(filename);
			}
		} else if (kind == StandardWatchEventKinds.ENTRY_MODIFY) {
			if (contextsPerFile.containsKey(filename)) {
				if (logger.isDebugEnabled()) {
					logger.debug(filename + " changed");
				}
				contextsPerFile.remove(filename);
			}
		}
	}

}