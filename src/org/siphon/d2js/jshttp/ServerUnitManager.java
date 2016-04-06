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

import javax.sql.DataSource;

import org.apache.commons.pool.BasePoolableObjectFactory;
import org.apache.commons.pool.ObjectPool;
import org.apache.commons.pool.impl.GenericObjectPool;
import org.apache.log4j.Logger;
import org.siphon.common.io.WatchDir;
import org.siphon.d2js.D2jsUnitManager;

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
			ObjectPool<JsEngineHandlerContext> enginePool;
			BasePoolableObjectFactory<JsEngineHandlerContext> factory = new BasePoolableObjectFactory<JsEngineHandlerContext>() {

				@Override
				public JsEngineHandlerContext makeObject() throws Exception {
					return createEngineContext(srcFile, aliasPath, params);
				}
			};

			enginePool = new GenericObjectPool<JsEngineHandlerContext>(factory);

			JsEngineHandlerContext ctxt = enginePool.borrowObject();
			ctxt.setPool(enginePool);

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