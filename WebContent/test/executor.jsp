<%@page import="java.util.Date"%>
<%@page import="org.apache.commons.lang3.time.StopWatch"%>
<%@page import="org.siphon.d2js.D2jsExecutor"%>
<%
	StopWatch watch = new StopWatch();
	watch.start();
	for(int i=0; i<1000*10; i++){
		Object obj =  D2jsExecutor.exec("d2js-test/author.d2js", "test", new Date());
	}
	watch.stop();
	out.print(watch.getTime() / 10000.0);
	//out.print(obj);
%>