
# jssp
-----
尽管 `d2js 前端(html + ajax) + d2js 后端` 可以满足大部分应用场景，还是有很多场景需要页面在服务器端就绪后输出，不宜使用纯 ajax 技术。

jssp 是 JavaScript Server Page 的简称，是建构于 d2js 后端技术上的一种服务器端页面技术，运行于 jdk1.8以上 + servlet3.0 容器，采用 js 作为服务器端编程语言，并可以使用所有 d2js 后端技术，如 `query, queryRow, travel, doTransaction`等便利快捷的 d2js 函数。

在 http://jssp.sourceforge.net/ 也有一个称为 jssp 的开源项目。最早有 jssp 想法后，发现了该工程，并曾使用过其部分代码，到 jdk8 后，已经和该项目无关。

## 基本对象

与 jsp 一样，jssp 可以使用 `request`, `response`, `session`, `out`, `application` 等几个常用对象，并且这些对象已经对 js 语言做了适配。

下面新建3个页面，一个为 a.html, 一个为 b.jssp, 一个为 c.jssp

a.html
```html
<html>
<head>
	<title>信息采集</title>
	<meta charset="utf-8">
</head>
<body>
	请输入您的联系方式：
	<form action="b.jssp" method="post">
		姓名: <input name="name">
		Email: <input name="email">
		<button type="submit">提交</button>
	</form>
</body>

</html>
```

b.jssp
```html
<html>
<head>
	<title>采集成功</title>
	<meta charset="utf-8">
</head>
<body>
	联系方式已采集成功！<a href="c.jssp">查看</a>
	[%
		session.userInfo = {name : request.name, email : request.email};
		if(application.users == null) application.users = {};
		application.users[request.name] = request.email;
	%]
</body>

</html>
```

c.jssp
```html
<html>
<head>
	<title>采集成功</title>
	<meta charset="utf-8">
</head>
<body>
	所有人的联系方式：[%~ application.users %]
	<br>
	您的联系方式：[%~ session.userInfo %]
</body>

</html>
```
用浏览器打开 a.html，输入个人信息，点击“查看”链接。再用隐身模式或其它浏览器打开a.html，输入另外一个人的信息，点击查看。

![session and application](images/jssp-session-application.png?raw=true)


jssp 中，使用`[% %]` 括出服务器脚本块，jssp 具有和 jsp 一样的 `[%= expr %]` 语法，效果相当于 `out.print(expr)`。此外，为了操作json方便，jssp 还加入了 `[%~ js object %]` 语法，相当于 `[%= JSON.stringify(js object) %]`。

在jssp 中 ，`session`, `request`, `application` 支持 `java.util.Map` 接口，这使它可以像普通js对象一样可以通过设置和读取属性：

		session['a'] = 1 			相当于 		session.setAttribute("a", 1)
		var a = session['a'] + 1 	相当于		var a = session.getAttribute("a")
		session.a = 1				相当于		session['a'] = 1
		session.a ++				相当于		session.setAttribute('a', session.getAttribute('a') + 1)
		var name = request.name		相当于		var name = request.getParameter('name')

request, response, session 等都遵循 servlet3.0规范，具有servlet 所具有的函数如 `response.sendRedirect()`, `request.getPart()` 等等。

## 在 jssp 中使用 d2js 特性

jssp 实现于 d2js 技术上，每个 jssp 都会转换为一个 d2js 服务。例如上面的 c.jssp，转换后变为：
```js
d2js.jssp = function(params){response.setContentType('text/html; charset=utf-8'); out.print("<html>\r\n");
	out.print("<head>\r\n");
	out.print("\t<title>\u91C7\u96C6\u6210\u529F<\/title>\r\n");
	out.print("\t<meta charset=\"utf-8\">\r\n");
	out.print("<\/head>\r\n");
	out.print("<body>\r\n");
	out.print("\t\u6240\u6709\u4EBA\u7684\u8054\u7CFB\u65B9\u5F0F\uFF1A");out.print(JSON.stringify( application.users ));
	out.print("\t<br>\r\n");
	out.print("\t\u60A8\u7684\u8054\u7CFB\u65B9\u5F0F\uFF1A");out.print(JSON.stringify( session.userInfo ));
	out.print("<\/body>\r\n");
	out.print("\r\n");
	out.print("<\/html>");}
```

因此，在jssp中，可以像普通 d2js 一样，使用 js 数据库访问功能。

下面的页面用于查询 author 表：

author.jssp

```html
<html>

<head><title>Author</title></head>
<body>
[%
	sql{.
		select * from author 
		sql{.?(params.name)
			where strpos(name, :name) > 0
		.} 
		order by name
	.} 
	var r = this.query(sql, params); 
%]

<form action="author.jssp" method="get">
	Name : <input name="name">
	<input type="submit">
</form>

<table border="1">
<caption>authors</caption>
<thead>
[%	r.columns.forEach(function(col){ %]
	<td>[%= col.name %]</td>	
[%	}); %]
</thead>

[%	r.rows.forEach(function(row){ %]
<tr>
	[%	r.columns.forEach(function(col){ %]
		<td>[%= row[col.name] %]</td>
	[%	}); %]
</tr>				
	
[%	}); %]

</table>
</body>

</html>
```

![jssp db](images/jssp-db.png?raw=true)


## jssp 中引用其它 jssp

可以使用 `includeJssp` 简单的将其它 jssp 合并到本 jssp

a.jssp
```html
<html>
<body>
	<h1>内容来自 body.jssp<h2>
	[% this.includeJssp('body.jssp') %]
</body>
</html>
```

body.jssp
```html
<p>hello, i am body</p>
```

`includeJssp` 函数实现于 `WEB-INF/jslib/jssp.js`。该函数实现仅有一行：

```js
D2JS.prototype.includeJssp(jsspFile, params){
	this.callD2js(jsspFile, 'jssp', params);
}
```

### jssp 中引用其它 d2js

使用 `d2js.callD2js(d2jsFile, method, params)` 可以调用另一 d2js文件中的函数。

这样一来，同一份 d2js 接口，既可以以 ajax 方式为前端服务，也可以以函数调用方式服务于服务器端页面。不论是 ajax 方式，还是服务器端方式，都实现了界面与数据接口的脱耦。

### jssp 输出js对象到前端

在 jssp 中，可以轻松输出 js 对象到浏览器端脚本。如：

```html
<html>
<head>
	<title>sample</title>
	<meta charset="utf-8">
</head>
<body>
</body>
[%
	var personInServer = {name: 'mary', gender: 'girl'}
%]
<script>
	var person = [%~ personInServer%];
	alert(person.name);
</script>	
</html>
```

## 其它

* 已知BUG

	jssp 及 d2js 的正则表达式中如果存在 /"/ 这样的正则表达式，即正则表达式字面量(regexp literal)中含有引号或单引号，应使用 new RegExp('"') 或写作 /\x22/。这是因为 d2js 词法语法转换程序处理了字符串字面量，但没有处理正则表达式字面量，因此上面的语句会被误认作字符串没有结尾。

* jssp 与 d2js 都默认启用 multipart，可以使用 `request.getPart` 获取 multipart form 的数据。

* jssp 中 `out.write` 可以输出二进制数据，如
	
	out.write([1,2,3,4])
	
事实上 d2js 也可以使用 `out.write` 或 `out.print`，一旦 d2js 函数自己调用 `out.write` 或 `out.print`产生了输出，函数的返回结果就不再按标准格式(json)输出。也就是说，对于 d2js 框架，下面这种有返回结果且没有输出的函数 d2js 按 json形式输出函数返回结果：
```js
d2js.fetch = function(params){
	return this.query('select * from author');
}
```
对于自己产生了输出的函数，如：
```js
d2js.fetch = function(params){
	out.print('hello world');
	return this.query('select * from author');
}
```
服务器不再输出函数返回结果。

对于返回 `undefined` 且无输出的函数，如：

```js
d2js.fetch = function(params){
	// do nothing
}
```
服务器将输出
	
	{"success" : true}
	
* jssp 中像 d2js 一样可以使用 `logger` 对象输出 log4j 日志

关于 jssp 的更详细的特性，请观看 `jssp-test/` 中的示例及其源码。
