package currency;

import java.util.Date;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

import javax.script.Bindings;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptException;

import org.apache.commons.lang3.time.StopWatch;
import org.siphon.common.js.JsEngineUtil;

import jdk.nashorn.internal.runtime.Context;

public class ConcurrencyPerform {

	public static void main(String[] args) {
		int count = 1000 * 100;
		// oneEngineMultiThread(count, 1000); //0.34593
		// oneEngineMultiThread(count, 1);
		// loop(count); 				// 0.3084
		//loopWithoutRunnable(count); 	// 0.30255
		//loopSameBinding(count);		// 0.01323
		loopInnerCode(count);			// 0.00489
		
	}

	private static void oneEngineMultiThread(int count, int threadCount) {
		AtomicInteger counter = new AtomicInteger(count);
		ScriptEngine engine = JsEngineUtil.newEngine();
		StopWatch watch = new StopWatch();
		Runnable runnable = new Runnable() {

			@Override
			public void run() {
				try {
					Bindings bindings = engine.createBindings();
					bindings.put("a", new Date() + "");
					engine.eval("1+a", bindings);
					int c = counter.decrementAndGet();
					if (c == count - 1) {
						System.out.println("start");
						watch.start();
					} else if (c == 0) {
						watch.stop();
						System.out.println("exhaust " + watch.getTime() / (double) count);
					}
				} catch (ScriptException e) {
					e.printStackTrace();
				}
			}
		};

		ExecutorService executorService = Executors.newFixedThreadPool(threadCount);
		for (int i = 0; i < count; i++) {
			executorService.execute(runnable);
		}
	}

	private static void loop(int count) {
		AtomicInteger counter = new AtomicInteger(count);
		ScriptEngine engine = JsEngineUtil.newEngine();
		StopWatch watch = new StopWatch();
		Runnable runnable = new Runnable() {

			@Override
			public void run() {
				try {
					Bindings bindings = engine.createBindings();
					bindings.put("a", new Date() + "");
					engine.eval("1+a", bindings);
					int c = counter.decrementAndGet();
					if (c == count - 1) {
						System.out.println("start");
						watch.start();
					} else if (c == 0) {
						watch.stop();
						System.out.println("exhaust " + watch.getTime() / (double) count);
					}
				} catch (ScriptException e) {
					e.printStackTrace();
				}
			}
		};

		for (int i = 0; i < count; i++) {
			runnable.run();
		}
	}

	private static void loopWithoutRunnable(int count) {
		AtomicInteger counter = new AtomicInteger(count);
		ScriptEngine engine = JsEngineUtil.newEngine();
		StopWatch watch = new StopWatch();

		for (int i = 0; i < count; i++) {
			try {
				Bindings bindings = engine.createBindings();
				bindings.put("a", new Date() + "");
				engine.eval("1+a", bindings);
				int c = counter.decrementAndGet();
				if (c == count - 1) {
					System.out.println("start");
					watch.start();
				} else if (c == 0) {
					watch.stop();
					System.out.println("exhaust " + watch.getTime() / (double) count);
				}
			} catch (ScriptException e) {
				e.printStackTrace();
			}
		}
	}
	
	private static void loopSameBinding(int count) {
		AtomicInteger counter = new AtomicInteger(count);
		ScriptEngine engine = JsEngineUtil.newEngine();
		StopWatch watch = new StopWatch();

		Bindings bindings = engine.createBindings();
		bindings.put("a", new Date() + "");
		engine.setBindings(bindings, ScriptContext.ENGINE_SCOPE);
		watch.start();
		for (int i = 0; i < count; i++) {
			try {
				engine.eval("1+a", bindings);
			} catch (ScriptException e) {
				e.printStackTrace();
			}
		}
		watch.stop();
		System.out.println("exhaust " + watch.getTime() / (double) count);
	}

	private static void loopInnerCode(int count) {
		AtomicInteger counter = new AtomicInteger(count);
		ScriptEngine engine = JsEngineUtil.newEngine();
		StopWatch watch = new StopWatch();
		
		Bindings bindings = engine.createBindings();
		bindings.put("count", count);
		try {
			Object f = engine.eval("function f(a){return 1 + a}");
			bindings.put("f", f);
		} catch (ScriptException e1) {
		}
		watch.start();
		try {
			engine.eval("for(var i=0;i<count;i++){f(new Date().toString());}", bindings);
			watch.stop();
			System.out.println("exhaust " + watch.getTime() / (double) count);
		} catch (ScriptException e) {
			e.printStackTrace();
		}
	}
	
	private static void loopInSameContext(int count) {
		AtomicInteger counter = new AtomicInteger(count);
		ScriptEngine engine = JsEngineUtil.newEngine();
		StopWatch watch = new StopWatch();
		
		Bindings bindings = engine.createBindings();
		bindings.put("count", count);
		try {
			Object f = engine.eval("function f(a){return 1 + a}");
			bindings.put("f", f);
		} catch (ScriptException e1) {
		}
		watch.start();
		try {
			engine.eval("for(var i=0;i<count;i++){f(new Date().toString());}", bindings);
			watch.stop();
			System.out.println("exhaust " + watch.getTime() / (double) count);
		} catch (ScriptException e) {
			e.printStackTrace();
		}
	}
}
