package mongo.test;

import java.io.FileNotFoundException;
import java.io.FileReader;

import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.siphon.common.js.JsEngineUtil;
import org.siphon.jsmongo.MongoExecutor;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoDatabase;

public class Test {
	public static void main(String[] args) throws FileNotFoundException, ScriptException {
		ScriptEngine engine = JsEngineUtil.newEngine();
		MongoClient client = new MongoClient("localhost:27017");
		
		MongoExecutor executor = new MongoExecutor(client, "test", engine);
		
		engine.put("executor", executor);
		
		engine.eval(new FileReader("test/test_mongo.d2js"));
	}
}
