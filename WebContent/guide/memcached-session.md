# 使用 memcached 共享 session

基于 https://github.com/magro/memcached-session-manager 实现了一个转换器: `org.siphon.javakaffee.msm.NashornTranscoderFactory`，利用这个转换器可以将 session 中的 java 及 nashorn js 对象转为 json 后存入 memcached（memcached-session-manager 也支持存入 redis 等，详见其文档）。

## META-INF/context.xml
```xml
<Context cookies="false"> <!-- cookies="false" 暴露 jsessionid，用于测试，实际运行不要添加-->
	<!--  ,n2:host2.yourdomain.com:11211 -->
  <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="n1:localhost:11211"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="org.siphon.javakaffee.msm.NashornTranscoderFactory"
    />
</Context>
```

测试 `request-session-test.jssp`
```html
<html>
<head>
	<title>测试 REQUEST SESSION</title>
	<meta charset="utf-8">
</head>


<body>
[%
 	logger.debug('session.name = ' + session.name);
	if(request.name){
		session.user = {name : request.name, email: request.email}
		response.sendRedirect('request-session-test.jssp;jsessionid=' + session.id);
	}
%]

<p>

[% if(session.user){ %]
	你好，[%= session.user.name %], 我将写信给你 [%= session.user.email %] 	
[% } else { %]
 	请输入您的个人信息
[% }%]

</p>

<form action="request-session-test.jssp;jsessionid=[%= session.id %]" method="post">

姓名: <input name="name">
Email: <input name="email">

<button type="submit">提交</button>
</form>

</body>

</html>

```
测试方法：于不同端口的多个 tomcat 运行同一个 webapp，输入姓名后，在不同端口使用同一  ;jsessionid 访问本页面，可以发现两个 tomcat 输出的 session 信息一样。

应用时要注意，session 中存放的 js 对象不能有 function，不能循环引用。
