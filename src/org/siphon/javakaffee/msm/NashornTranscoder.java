package org.siphon.javakaffee.msm;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import javax.servlet.ServletContext;

import org.apache.catalina.Context;
import org.apache.catalina.Manager;
import org.apache.commons.io.IOUtils;
import org.apache.log4j.Logger;
import org.siphon.common.js.JSON;
import org.siphon.common.js.JsEngineUtil;
import org.siphon.common.js.UnsupportedConversionException;

import javax.script.ScriptEngine;

import com.alibaba.fastjson.parser.DefaultJSONParser;
import com.alibaba.fastjson.parser.JSONLexer;
import com.alibaba.fastjson.parser.JSONToken;
import com.alibaba.fastjson.parser.ParserConfig;
import com.alibaba.fastjson.parser.deserializer.ObjectDeserializer;
import com.alibaba.fastjson.serializer.JSONSerializer;
import com.alibaba.fastjson.serializer.ObjectSerializer;
import com.alibaba.fastjson.serializer.SerializeConfig;
import com.alibaba.fastjson.serializer.SerializerFeature;

import de.javakaffee.web.msm.MemcachedBackupSession;
import de.javakaffee.web.msm.SessionAttributesTranscoder;
import de.javakaffee.web.msm.TranscoderDeserializationException;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

public class NashornTranscoder implements SessionAttributesTranscoder {
	 
	private static Logger logger = Logger.getLogger(NashornTranscoder.class);	 
	 
	private boolean nashornFound = false;
	
	private JSON json = null;

	private ServletContext context;

	private SerializeConfig serializeConfig;

	private ParserConfig parserConfig;
	
	/**
	 * Constructor
	 * @param manager
	 */
	public NashornTranscoder(final Manager manager) {
		Context ctxt = manager.getContext();
		this.context = ctxt.getServletContext();
	}
	
	private synchronized void ensureScriptEnginesInited() {
		if(nashornFound) {
			return;
		} else {
			ScriptEngine engine = (ScriptEngine) this.context.getAttribute("d2js-nashorn-engine");
			this.json = new JSON(engine);
			
			if(engine == null) {
				// pass
			} else {
				nashornFound = true;
				this.initFastJson();
			}
		}
	}
	
	private synchronized void initFastJson() {
		if(this.serializeConfig != null) return;
		
		this.serializeConfig = new SerializeConfig();
		serializeConfig.put(ScriptObjectMirror.class, new ObjectSerializer() {
			
			@Override
			public void write(JSONSerializer serializer, Object object, Object fieldName, Type fieldType, int features)
					throws IOException {
				ScriptObjectMirror som = (ScriptObjectMirror) object;
				try {
					HashMap<String, Object> so = new HashMap();
					so.put("@type", som.getClass().getName());
					so.put("value", json.stringify(som));
					serializer.write(so);
				} catch (UnsupportedConversionException e) {
				
				}
			}
		});
		
		this.parserConfig = new ParserConfig();
		parserConfig.putDeserializer(ScriptObjectMirror.class, new ObjectDeserializer() {

			@Override
			public <T> T deserialze(DefaultJSONParser parser, Type type, Object fieldName) {
				JSONLexer lexer = parser.lexer;
				lexer.nextToken(JSONToken.LITERAL_STRING);	// "value"
				System.out.println(lexer.stringVal());
				lexer.nextToken(JSONToken.COLON);
				System.out.println(lexer.stringVal());
				lexer.nextToken(JSONToken.LITERAL_STRING);  // "json of script object mirror"
				System.out.println(lexer.stringVal());
				String s = lexer.stringVal();
				ScriptObjectMirror so;
				try {
					so = (ScriptObjectMirror) json.parse(s);
				} catch (Exception e) {
					return null;
				}
				lexer.nextToken(JSONToken.RBRACE);
				lexer.nextToken();
				return (T)so;
			}

			@Override
			public int getFastMatchToken() {
				return JSONToken.RBRACE;
			}
			
		});
		
	}

	/**
	 * Return the deserialized map
	 *
	 *  @param in bytes to deserialize
	 *  @return map of deserialized objects
	 */
	public ConcurrentMap<String, Object> deserializeAttributes(final byte[] in) {
		this.ensureScriptEnginesInited();
		
		if (logger.isDebugEnabled()) {
			logger.debug("deserialize the stream");
		}
		try {
			return (ConcurrentMap<String, Object>) com.alibaba.fastjson.JSON.parse(new String(in, "utf-8"), parserConfig);
		} catch( final RuntimeException | UnsupportedEncodingException e) {
			logger.warn("Caught Exception deserializing JSON "+e);
			throw new TranscoderDeserializationException(e);
		}
	}

	public byte[] serializeAttributes(final MemcachedBackupSession sessions, final ConcurrentMap<String, Object> attributes) {
		if (attributes == null) {
        	throw new NullPointerException();
        }
		
		this.ensureScriptEnginesInited();

        final ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try {
    		String serResult = com.alibaba.fastjson.JSON.toJSONString(attributes, serializeConfig, SerializerFeature.WriteClassName);
        	if (logger.isDebugEnabled()) {
        		logger.debug("JSON Serialised object: " + serResult);
        	}
        	return serResult.getBytes("utf-8"); // converts to bytes
        } catch (final Exception e) {
        	logger.warn("Caught Exception deserializing JSON " + e);
        	throw new IllegalArgumentException();
        } finally {
        	IOUtils.closeQuietly(bos);
        }
	}

}
