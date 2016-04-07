/*******************************************************************************
 * The MIT License (MIT)
 *
 * Copyright © 2015 Inshua(inshua@gmail.com). All rights reserved.
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
package org.siphon.jsmongo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Blob;
import java.sql.CallableStatement;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.RowId;
import java.sql.SQLException;
import java.sql.Time;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Base64.Decoder;
import java.util.function.Consumer;
import java.util.Date;
import java.util.List;

import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.sql.DataSource;

import org.apache.commons.lang3.ArrayUtils;
import org.apache.log4j.Logger;
import org.bson.BsonArray;
import org.bson.BsonBinary;
import org.bson.BsonBoolean;
import org.bson.BsonDateTime;
import org.bson.BsonDocument;
import org.bson.BsonDouble;
import org.bson.BsonElement;
import org.bson.BsonInt32;
import org.bson.BsonInt64;
import org.bson.BsonJavaScript;
import org.bson.BsonNull;
import org.bson.BsonNumber;
import org.bson.BsonObjectId;
import org.bson.BsonRegularExpression;
import org.bson.BsonString;
import org.bson.BsonTimestamp;
import org.bson.BsonValue;
import org.bson.Document;
import org.bson.types.Binary;
import org.bson.types.ObjectId;
import org.postgresql.util.PGobject;
import org.siphon.common.js.JsDateUtil;
import org.siphon.common.js.JsTypeUtil;
import org.siphon.jssql.DbConnectionUtil;
import org.siphon.jssql.SqlExecutorException;
import org.siphon.jssql.UnsupportedDataTypeException;

import com.mongodb.CursorType;
import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.UpdateResult;

import jdk.nashorn.api.scripting.ScriptObjectMirror;
import jdk.nashorn.internal.objects.NativeArray;
import jdk.nashorn.internal.objects.NativeDate;
import jdk.nashorn.internal.objects.NativeObject;
import jdk.nashorn.internal.objects.NativeRangeError;
import jdk.nashorn.internal.objects.NativeRegExp;
import jdk.nashorn.internal.objects.NativeString;
import jdk.nashorn.internal.runtime.ConsString;
import jdk.nashorn.internal.runtime.ScriptFunction;
import jdk.nashorn.internal.runtime.ScriptObject;
import jdk.nashorn.internal.scripts.JO;

public class MongoExecutor {

	private static Logger logger = Logger.getLogger(MongoExecutor.class);

	private MongoClient mongoClient;
	private MongoDatabase database;
	private ScriptEngine jsEngine;

	private org.siphon.common.js.JSON JSON;

	private JsTypeUtil jsTypeUtil;

	private String defaultJsonDbType;

	private JsDateUtil jsDateUtil;

	public MongoExecutor(MongoClient mongoClient, String database, ScriptEngine jsEngine) {
		this.mongoClient = mongoClient;
		this.database = mongoClient.getDatabase(database);
		this.jsEngine = jsEngine;
		jsDateUtil = new JsDateUtil(jsEngine);
		jsTypeUtil = new JsTypeUtil(jsEngine);
		this.JSON = new org.siphon.common.js.JSON(jsEngine);
	}

	// return NativeObject
	public Object insertRow(String table, ScriptObjectMirror row) throws SqlExecutorException, ScriptException {
		MongoCollection<Document> collection = database.getCollection(table);
		Document document = jsObjectToDocument(row);
		collection.insertOne(document);
		return documentToJsObject(document);
	}
	
	public Object updateRow(String table, ScriptObjectMirror row1, ScriptObjectMirror row2) throws SqlExecutorException, ScriptException{
		MongoCollection<Document> collection = database.getCollection(table);
		Document document = jsObjectToDocument(row1);
		Document document2 = jsObjectToDocument(row2);
		UpdateResult result = collection.updateOne(document, document2);
		
		return bsonObjectToJsObject(result.getUpsertedId());
	}
	

	public NativeArray query(String table) throws ScriptException, SqlExecutorException{
		ScriptObjectMirror arr = jsTypeUtil.newArray();
		MongoCollection<Document> collection = database.getCollection(table);
		for(Document doc : collection.find()){
			arr.callMember("push", this.documentToJsObject(doc));
		}
		return arr.to(NativeArray.class);
	}
	
	public Object eval(Object function, Object args) throws SqlExecutorException, ScriptException{
		if(function instanceof ScriptObjectMirror){
			function = ((ScriptObjectMirror) function).to(ScriptFunction.class);
		}
		if(function instanceof ScriptFunction){
			function = ((ScriptFunction) function).toSource();
		}
		Document command = new Document("$eval", new BsonJavaScript(function.toString()));
		if(args != null){
			command.append("args", jsValueToBson(args));
		}
		Document result = this.database.runCommand(command);
		return bsonObjectToJsObject(result.get("retval"));
	}
	
	public MongoCollection<Document> getCollection(String collection){
		return this.database.getCollection(collection);
	}
	
	public MongoDatabase getDatabase(){
		return this.database;
	}
	
	
	public Document jsObjectToDocument(ScriptObjectMirror object) throws SqlExecutorException {
		Document document = new Document();
		String[] names = object.getOwnKeys(false);
		for (int i = 0; i < names.length; i++) {
			String name = names[i];
			Object value = object.get(name);
			document.append(name, jsValueToBson(value));
		}

		return document;
	}

	public Document jsObjectToDocument(ScriptObject object) throws SqlExecutorException {
		Document document = new Document();
		String[] names = object.getOwnKeys(false);
		for (int i = 0; i < names.length; i++) {
			String name = names[i];
			Object value = object.get(name);
			document.append(name, jsValueToBson(value));
		}

		return document;
	}

	private BsonDocument jsObjectToBsonDocument(ScriptObjectMirror object) throws SqlExecutorException {
		BsonDocument document = new BsonDocument();
		String[] names = object.getOwnKeys(false);
		for (int i = 0; i < names.length; i++) {
			String name = names[i];
			Object value = object.get(name);
			document.append(name, jsValueToBson(value));
		}

		return document;
	}

	private BsonDocument jsObjectToBsonDocument(ScriptObject object) throws SqlExecutorException {
		BsonDocument document = new BsonDocument();
		String[] names = object.getOwnKeys(false);
		for (int i = 0; i < names.length; i++) {
			String name = names[i];
			Object value = object.get(name);
			document.append(name, jsValueToBson(value));
		}

		return document;
	}

	private BsonValue jsValueToBson(Object arg) throws SqlExecutorException {

		if (JsTypeUtil.isNull(arg)) {
			return BsonNull.VALUE;
		}

		String type = null;
		Object value = null;

		
		if (arg instanceof ScriptObjectMirror) {
			if (jsDateUtil.isNativeDate(arg))
				return jsSimpleValueToBson(((ScriptObjectMirror) arg).to(NativeDate.class));
			
			ScriptObjectMirror atm = (ScriptObjectMirror) arg;

			if (atm.isArray()) {
				return nativeArrayToBson(atm.to(NativeArray.class));
			}
			
			if (!atm.containsKey("_d2js_type")) {
				return jsObjectToBsonDocument(atm);
			} else {
				type = atm.get("_d2js_type").toString();
				value = atm.get("value");
			}
		} else if (arg instanceof ScriptObject) {
			if (arg instanceof NativeDate)
				return jsSimpleValueToBson((NativeDate) arg);
			
			if(arg instanceof NativeArray){
				return nativeArrayToBson((NativeArray) arg);
			}
			
			if(arg instanceof NativeRegExp){
				return new BsonRegularExpression((String) NativeRegExp.source((NativeRegExp)arg));
			}
			
			if(arg instanceof ScriptFunction){
				return new BsonString(((ScriptFunction) arg).toSource());
			}
			
			if(arg instanceof NativeString){
				return jsSimpleValueToBson(NativeString.toString(arg));
			}
			
			ScriptObject obj = (ScriptObject) arg;
			if (!obj.containsKey("_d2js_type")) {
				return jsObjectToBsonDocument(obj);
			} else {
				type = obj.get("_d2js_type").toString();
				value = obj.get("value");
			}
		} else {
			return jsSimpleValueToBson(arg);
		}

		if ("STRING".equals(type)) {
			return new BsonString(value.toString());
		} else if ("DECIMAL".equals(type)) {
			if (value instanceof Double) {
				return new BsonDouble((double) value);
			} else {
				return new BsonDouble(Double.parseDouble(value + ""));
			}
		} else if ("INT".equals(type)) {
			if (value instanceof Double) {
				if (((Double) value).isNaN()) {
					return new BsonDouble(Double.NaN);
				} else {
					return new BsonInt32(((Double) value).intValue());
				}
			} else {
				return new BsonInt32(new Integer(value + ""));
			}
		} else if ("BOOLEAN".equals(type)) {
			return new BsonBoolean(JsTypeUtil.isTrue(arg));
		} else if ("DOUBLE".equals(type) || "FLOAT".equals(type)) {
			if (value instanceof Double) {
				return new BsonDouble((Double) value);
			} else {
				return new BsonDouble(new Double(value + ""));
			}
		} else if ("DATE".equals(type)) {
			long t = parseDate(value);
			return new BsonDateTime(t);
		} else if("OBJECTID".equals(type)){
			return new BsonObjectId(new ObjectId((String)value));
		} else if ("TIME".equals(type)) {
			return new BsonDateTime(parseTime(value));
		} else if ("BINARY".equals(type)) {
			return new BsonBinary(parseBinary(value));
		} else if ("CLOB".equals(type)) {
			return new BsonString(value.toString());
		} else if ("LONG".equals(type)) {
			if (value instanceof Double) {
				if (((Double) value).isNaN()) {
					return new BsonDouble(Double.NaN);
				} else {
					return new BsonInt64(((Double) value).longValue());
				}
			} else {
				return new BsonInt64(new Long(value + ""));
			}
		} else if ("REGEX".equals(type)){
			return new BsonRegularExpression(type);
		} else {
			throw new SqlExecutorException("unknown object type " + type + "  " + value);
		}
		// else if ("OUTCURSOR".equals(type)) {
		// } else if ("ARRAY".equals(type)) {
		// } else if ("JSON".equals(type) || "JSONB".equals(type)){
		// } else {
		// }
	}

	private BsonValue nativeArrayToBson(NativeArray arr) throws SqlExecutorException {
		BsonArray result = new BsonArray();
		for (int i = 0; i < JsTypeUtil.getArrayLength(arr); i++) {
			result.add(jsValueToBson(arr.get(i)));
		}
		return result;
	}

	private BsonValue jsSimpleValueToBson(Object arg) throws SqlExecutorException {
		if (arg instanceof String) {
			String s= (String) arg;
			if(s.length() == 9 + 24 && s.startsWith("MONGOOBJ_")){
				return new BsonObjectId(new ObjectId(s.substring(9)));
			} else {
				return new BsonString(s);
			}
		} else if (arg instanceof Double) {
			return new BsonDouble(((Double) arg).doubleValue());
		} else if (arg instanceof Integer) {
			return new BsonInt32(((Integer) arg).intValue());
		} else if (arg instanceof Long) {
			return new BsonInt64(((Double) arg).longValue());
		} else if (arg instanceof NativeDate) {
			return new BsonDateTime(jsDateUtil.getTime((NativeDate) arg));
		} else if (arg instanceof Boolean) {
			return new BsonBoolean((Boolean) arg);
		} else if(arg instanceof ObjectId){
			return new BsonObjectId((ObjectId) arg);
		} else {
			throw new SqlExecutorException("unknown object type " + arg);
		}
	}

	private byte[] parseBinary(Object value) throws SqlExecutorException {
		if (value instanceof byte[]) {
			return (byte[]) value;
		} else if (value instanceof Byte[]) {
			return ArrayUtils.toPrimitive((Byte[]) value);
		}
		if (value instanceof ScriptObjectMirror && ((ScriptObjectMirror) value).isArray()) {
			value = ((ScriptObjectMirror) value).to(NativeArray.class);
		}
		if(value instanceof NativeArray){
			NativeArray arr = (NativeArray) value;
			byte[] r = new byte[JsTypeUtil.getArrayLength(arr)];
			for (int i = 0; i < JsTypeUtil.getArrayLength(arr); i++) {
				if (arr.get(i) instanceof Byte) {
					r[i] = (Byte) arr.get(i);
				} else if (arr.get(i) instanceof Double) {
					r[i] = ((Double) arr.get(i)).byteValue();
				} else if (arr.get(i) instanceof Integer) {
					r[i] = ((Integer) arr.get(i)).byteValue();
				}
			}
			return r;
		} else if (value instanceof String) {
			Decoder decoder = Base64.getDecoder();
			try {
				return decoder.decode((String) value);
			} catch (Exception e) {
				throw new SqlExecutorException("cannot parse base64 binary data " + value, e);
			}
		} else {
			throw new SqlExecutorException("unkown binary data " + value + " " + value.getClass());
		}
	}

	private Long parseTime(Object value) throws SqlExecutorException {
		if (value instanceof Double) {
			return ((Double) value).longValue();
		} else if (value instanceof String) {
			try {
				return sdfTime.parse((String) value).getTime();
			} catch (ParseException e) {
				throw new SqlExecutorException("unmatched datetime format " + value, e);
			}
		} else if (value instanceof NativeDate) {
			return jsDateUtil.getTime((NativeDate) value);
		} else if (value instanceof ScriptObjectMirror) {
			ScriptObjectMirror m = (ScriptObjectMirror) value;
			if (m.to(Object.class) instanceof NativeDate) {
				return jsDateUtil.getTime(m.to(NativeDate.class));
			} else {
				throw new SqlExecutorException("unknown date format " + value + " " + m.getClassName());
			}
		} else {
			throw new SqlExecutorException("unknown date format " + value + " " + value.getClass());
		}
	}

	private SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

	private SimpleDateFormat sdfTime = new SimpleDateFormat("HH:mm:ss");

	private Long parseDate(Object value) throws SqlExecutorException {
		if (JsTypeUtil.isNull(value)) {
			return null;
		}
		if (value instanceof Double) {
			return ((Double) value).longValue();
		} else if (value instanceof String) {
			try {
				return sdfDate.parse((String) value).getTime();
			} catch (ParseException e) {
				throw new SqlExecutorException("unmatched datetime format " + value, e);
			}
		} else if (value instanceof NativeDate) {
			return jsDateUtil.getTime((NativeDate) value);
		} else if (value instanceof ScriptObjectMirror && ((ScriptObjectMirror) value).to(Object.class) instanceof NativeDate) {
			return jsDateUtil.getTime((ScriptObjectMirror) value);
		} else {
			throw new SqlExecutorException("unknown date format " + value + " " + value.getClass());
		}
	}

	public Object documentToJsObject(Document document) throws ScriptException, SqlExecutorException {
		ScriptObjectMirror result = jsTypeUtil.newObject();
		for (String s : document.keySet()) {
			Object v = bsonObjectToJsObject(document.get(s));
			result.put(s, v);
		}
		return jsTypeUtil.getSealed(result);
	}

	public Object bsonObjectToJsObject(Object object) throws ScriptException, SqlExecutorException {
		if(object instanceof String 
				|| object instanceof Integer 
				|| object instanceof Long 
				|| object instanceof Double 
				|| object instanceof Date
				|| object instanceof Boolean){
			return object;
		}
		if (object instanceof BsonString) {
			return ((BsonString) object).getValue();
		} else if (object instanceof BsonInt32) {
			return ((BsonInt32) object).intValue();
		} else if (object instanceof BsonInt64) {
			return ((BsonInt64) object).longValue();
		} else if (object instanceof BsonBinary) {
			BsonBinary bin = ((BsonBinary) object);
			//return bin.getData();
			ScriptObjectMirror result = jsTypeUtil.newObject();
			result.put("_d2js_type", "BINARY");
			//result.put("value", Base64.getEncoder().encode(bin.getData()));
			result.put("value", bin.getData());
			return result.to(Object.class);
		} else if (object instanceof Binary){
			ScriptObjectMirror result = jsTypeUtil.newObject();
			result.put("_d2js_type", "BINARY");
			//result.put("value", Base64.getEncoder().encode(bin.getData()));
			result.put("value", ((Binary) object).getData());
			return result.to(Object.class);
		} else if (object instanceof BsonBoolean) {
			return ((BsonBoolean) object).getValue();
		} else if (object instanceof BsonArray) {
			BsonArray arr = ((BsonArray) object);
			ScriptObjectMirror result = jsTypeUtil.newArray();
			for (int i = 0; i < arr.size(); i++) {
				result.callMember("push", bsonObjectToJsObject(arr.get(i)));
			}
			return result.to(NativeArray.class);
		} else if(object instanceof List){
			List<?> ls = (List<?>) object;
			ScriptObjectMirror result = jsTypeUtil.newArray();
			for (int i = 0; i < ls.size(); i++) {
				result.callMember("push", bsonObjectToJsObject(ls.get(i)));
			}
			return result.to(NativeArray.class);
		} else if (object instanceof BsonDocument) {
			BsonDocument document = ((BsonDocument) object);
			ScriptObjectMirror result = jsTypeUtil.newObject();
			for (String s : document.keySet()) {
				result.put(s, bsonObjectToJsObject(document.get(s)));
			}
			return result.to(Object.class);
		} else if (object instanceof Document) {
			return documentToJsObject((Document) object);
		} else if (object instanceof ObjectId) {
			return "MONGOOBJ_" + ((ObjectId)object).toHexString();
//			String objectId = ((ObjectId) object).toHexString();
//			ScriptObjectMirror result = jsTypeUtil.newObject();
//			result.put("_d2js_type", "OBJECTID");
//			result.put("value", objectId);
//			return result.to(Object.class);
		} else if (object instanceof BsonDateTime) {
			return jsDateUtil.toNativeDate(((BsonDateTime) object).getValue());
		} else if (object instanceof BsonNull) {
			return null;
		} else if (object == null) {
			return null;
		} else if (object instanceof BsonNumber) {
			return ((BsonNumber) object).doubleValue();
		} else if (object instanceof BsonDouble) {
			return ((BsonDouble) object).doubleValue();
		} else {
			throw new SqlExecutorException("unknown bson type " + object + " type " + object.getClass().getName());
		}
	}

}
