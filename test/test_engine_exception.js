// var a = b / 1;

/*
javax.script.ScriptException: sun.org.mozilla.javascript.internal.EcmaError: ReferenceError: "b" is not defined. (test/test_engine.js#1) in test/test_engine.js at line number 1
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:224)
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:240)
	at javax.script.AbstractScriptEngine.eval(AbstractScriptEngine.java:264)
	at com.softview.common.js.JsEngineUtil.eval(JsEngineUtil.java:292)
	at test.TestJsEngineException.main(TestJsEngineException.java:21)
*/

// throw new Error('abcd');

/*
2015-06-30 22:24:21 ERROR - 
javax.script.ScriptException: Error: abcd in test/test_engine.js at line number 12
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:224)
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:240)
	at javax.script.AbstractScriptEngine.eval(AbstractScriptEngine.java:264)
	at com.softview.common.js.JsEngineUtil.eval(JsEngineUtil.java:292)
	at test.TestJsEngineException.main(TestJsEngineException.java:21)
*/

// javaObj.raiseJavaException();

/*
2015-06-30 22:33:11 ERROR - 
javax.script.ScriptException: sun.org.mozilla.javascript.internal.WrappedException: Wrapped java.lang.Exception: test exception (test/test_engine.js#24) in test/test_engine.js at line number 24
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:224)
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:240)
	at javax.script.AbstractScriptEngine.eval(AbstractScriptEngine.java:264)
	at com.softview.common.js.JsEngineUtil.eval(JsEngineUtil.java:292)
	at test.js.TestJsEngineException.main(TestJsEngineException.java:22)
Caused by: sun.org.mozilla.javascript.internal.WrappedException: Wrapped java.lang.Exception: test exception (test/test_engine.js#24)
	at sun.org.mozilla.javascript.internal.Context.throwAsScriptRuntimeEx(Context.java:1808)
	at sun.org.mozilla.javascript.internal.MemberBox.invoke(MemberBox.java:196)
	... 4 more
Caused by: java.lang.Exception: test exception
	at test.js.TestJsEngineException.raiseJavaException(TestJsEngineException.java:30) *******************
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:57)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:606)
	at sun.org.mozilla.javascript.internal.MemberBox.invoke(MemberBox.java:167)
	... 15 more
*/


try{
	javaObj.raiseJavaException();
} catch(e){
	throw wrapJsError(e);
}

/*
 2015-06-30 23:55:46 ERROR - 
javax.script.ScriptException: sun.org.mozilla.javascript.internal.NativeJavaObject@4b19b8ae in test/test_engine.js at line number 52
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:224)
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:240)
	at javax.script.AbstractScriptEngine.eval(AbstractScriptEngine.java:264)
	at com.softview.common.js.JsEngineUtil.eval(JsEngineUtil.java:293)
	at test.js.TestJsEngineException.main(TestJsEngineException.java:28)
Caused by: sun.org.mozilla.javascript.internal.JavaScriptException: javax.script.ScriptException: JavaException: java.lang.Exception: test exception in test/test_engine.js at line number 50 (test/test_engine.js#52)
	at sun.org.mozilla.javascript.internal.Interpreter.interpretLoop(Interpreter.java:1066)
	at sun.org.mozilla.javascript.internal.Interpreter.interpret(Interpreter.java:849)
	at sun.org.mozilla.javascript.internal.InterpretedFunction.call(InterpretedFunction.java:162)
	at sun.org.mozilla.javascript.internal.ContextFactory.doTopCall(ContextFactory.java:430)
	at com.sun.script.javascript.RhinoScriptEngine$1.superDoTopCall(RhinoScriptEngine.java:116)
	at com.sun.script.javascript.RhinoScriptEngine$1.doTopCall(RhinoScriptEngine.java:109)
	at sun.org.mozilla.javascript.internal.ScriptRuntime.doTopCall(ScriptRuntime.java:3160)
	at sun.org.mozilla.javascript.internal.InterpretedFunction.exec(InterpretedFunction.java:173)
	at sun.org.mozilla.javascript.internal.Context.evaluateReader(Context.java:1169)
	at com.sun.script.javascript.RhinoScriptEngine.eval(RhinoScriptEngine.java:214)
	... 4 more
Caused by: java.lang.Exception: test exception
	at test.js.TestJsEngineException.raiseJavaException(TestJsEngineException.java:42)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:57)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:606)
	at sun.org.mozilla.javascript.internal.MemberBox.invoke(MemberBox.java:167)
	at sun.org.mozilla.javascript.internal.NativeJavaMethod.call(NativeJavaMethod.java:245)
	at sun.org.mozilla.javascript.internal.Interpreter.interpretLoop(Interpreter.java:1706)
*/

try{
	try{
		javaObj.raiseJavaException();
	} catch(e){
		throw wrapJsError(e);
	}
} catch(e){
	throw e;
}

// !!! throw new Error() 在 js 中捕获，再 throw，会丢失错误堆栈
//try{
//	throw javaObj.toJavaScriptException(new Error('abcd'));
//} catch(e){
//	logger.error("", wrapJsError(e));
//}

//try{
//	javaObj.run(engine, function(){		// 只有这样调用
//		throw new Error('test');
//	}, null)
//} catch(e){
//	throw e;
//}
//


//try{
//	engine.invokeMethod(function(){
//		throw new Error('test');
//	}, "call", null);
//} catch(e){
//	throw e;
//}

// so ..

//function run(fun, thiz){
//	engine.invokeMethod(fun, "call", thiz);
//}
//
//try{
//	run(function(){
//		throw new Error('test');
//	});
//} catch(e){
//	throw e;
//}

// and ..
//Function.prototype.invoke = function(scope){
//	println('this is ' + this);
//	engine.invokeMethod(this, "call", scope);
//}

//try{
//	(function(){
//		throw new Error('test');
//	}).invoke();
//} catch(e){
//	throw e;
//}

//throw {name : 'test', desc : '123'};


//try{
//	(function(){
//		throw {name : 'test', desc : '123'};
//	}).invoke();
//} catch(e){
//	println(e.javaException.getClass());
//	println(JSON.stringify(e.javaException.getCause().getValue()));
//	throw e.javaException.getCause();
//	// println(e);
//	// throw e;
//}


