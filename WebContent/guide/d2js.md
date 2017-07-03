# d2js

![overview](images/overview.png?raw=true)

d2js 是一套js数据前后端框架.

* d2js 框架提出了独有的数据路径、渲染、收集概念，适合各类 js 对象与 html ui 之间交互
* d2js 框架借鉴 ado.net 的 dataset-DataTable-DataRow 体系，可以轻松完成批量数据更新、主从表连带更新等特性
* 除 dataset-DataTable-DataRow 体系外，也提供便利的 orm 形式
* d2js 框架后端使用 js 语言编写，结合 sql 块设计，可以大大提高开发效率
* d2js 前后端开发实践都是热插拔式开发，不写配置文件，不写 java 代码
* d2js 框架允许网页设计与开发分离，先设计再开发
* d2js 切割分明，依托于 html 技术，可以和其它 ui 框架如 bootstrap, semantic-ui 等，及 molecule 一同使用
* d2js 框架前端和后端可单独使用

==================

d2js 前端基于经典的  mvc 理念设计, mvc 的是用于划分界面和数据逻辑的思想。

![mvc模型](images/mvc.jpg?raw=true)

* from: http://baike.sogou.com/v41960817.htm

d2js 遵循 mvc 思想设计，主要设计思想为`数据-渲染-收集`，d2js  将数据绘制到 GUI的行为称为*渲染(render)*，将其中从 GUI 输入导致的 controller 行为称为从界面*收集(collect)*。

![d2js 的 gui 理念](images/d2js-mvc.png?raw=true)

mvc 是一种设计思想，很多人错误的把思想当做了程序架构，从而走上 Model-Controller-Viewer 对象模型的歪路，这是对 mvc 思想的极大误解。

## 简单js对象的渲染——直接渲染

创建一个名为 a.html的网页：

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>d2js</title>
<script src="../jslib/jquery-3.2.1.js"></script>
<script src="../jslib/date.js/Date.js"></script>

<script src="../jslib/d2js/dataset.js"></script>
<script src="../jslib/d2js/render.js"></script>
<script src="../jslib/d2js/renderers.js"></script>
<script src="../jslib/d2js/collector.js"></script>
<script src="../jslib/d2js/pipelines.js"></script>
</head>
<body>

</body>

</html>
```

在 body 部分输入：

```html
<section id="info">
	<p data="name" renderer="std" />
	<p data="gender" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	$('#info').bindRoot(person)		// 绑定数据根。 或 d2js.bindRoot(info, person)
	$('#info').render();			// 渲染。 或 d2js.render(info)
</script>
```

输入网址查看效果：

![d2js guide 1](images/d2js-1.png?raw=true)

界面很朴素。d2js 是一个数据框架，依托于DOM，可以和各种流行的 css 框架结合。当页面披上 bootstrap, semantic-ui 等 css外衣后，何愁不美轮美奂。

d2js 主要扩充了 `d2js.root`, `data`, `renderer`, `collector` 4个 html 属性，用于声明页面元素的根数据、数据路径、渲染、收集行为。
渲染、收集过程采用声明式规则，对于不存在的对象属性，不发生渲染收集，对于存在的属性，调用 renderer,collector 指定的函数序列进行渲染收集。

### 数据路径

所扩充html属性中，`data`为`数据路径`，用于锚定数据。

```html
<section id="info">
	<p data="name" renderer="std" />
	<p data="gender" renderer="std" />
	<p data="fav,movies,0" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl', fav:{movies:['earth','matrix'], songs:['lalala']};
	$('#info').bindRoot(person).render();
</script>
```
`<p data="fav,movies,0" renderer="std" />` 中，数据路径有3个层次。很显然，每个 `,` 都带来一次层次推进。

### 公用数据根

除了使用 bindRoot，也可以使用 attribute 形式声明的公用数据根 `d2js.root`。使用方法如下：
```html
<section id="info" dj2s.root="person">
	<p data="name" renderer="std" />
	<p data="gender" renderer="std" />
	<p data="fav,movies,0" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl', fav:{movies:['earth','matrix'], songs:['lalala']};
	d2js.root.person = person;		// 挂在 d2js.root 下
	$('#info').render();
</script>
```
上面, `dj2s.root="person"` 使用路径方式表示根数据，这种表示方式不需要再 bindRoot，第一次渲染时会自动由全局变量 d2js.root 出发按路径推导，并自动发生 bindRoot。

如后来 d2js.root.person 修改为其它对象，则需要手工调用 $e.bindRoot() 重新绑定根数据。（注意：必须是本元素，不能为子元素重新绑定）

数据路径总是从层次最近的具有根数据的容器元素出发。

### 渲染器

渲染器是属于 `d2js.Renderers` 的成员函数，用于将数据路径锚定的数据值画到相应DOM元素。渲染器函数可以自行扩充。

例如 `std` 函数，定义于 `renderers.js` 中： `d2js.Renderers.std = function(){...}`

渲染器函数被调用时收到的实参参数列表为 html element 及按数据路径展开过程中的所有分解出的数据。

例如，当`d2js.render`作用于 `<p data="name" renderer="std" />` 和 `person` 对象时，`std` 函数实参参数列表如下：

```js
<p/>, 'mary', 'name', person
```

前 2 个实参固定为 `element` 和 `value`，后面的实参由数据路径的展开过程产生。

当 `d2js.render`作用于`<p data="fav,movies,0" renderer="std" />`时，`std` 函数将收到如下参数：

```
<p/>, 'earth', 0, person.fav.movies, 'movies', person.fav, 'fav', person
```

自定义的渲染器可以根据该特性实现更灵活的渲染行为。

### 自定义渲染器

通过对 `d2js.Renderers`插拔成员函数，可以添加新的渲染器。
如：
```html
<section id="info">
	<p data="name" renderer="red" />
	<p data="gender" renderer="std" />
</section>
<script>
	d2js.Renderers.red = function(element, value){
		element.innerHTML = '<font color="red">' + value + '</font>';
	}
	var person = {name : 'mary', gender:'girl'};
	$('#info').bindRoot(person).render();
</script>
```

![d2js guide 2](images/d2js-2.png?raw=true)

除了使用全局的 d2js.Renderers，也可以在渲染时提供自定义的渲染函数，如

```html
<section id="info">
	<p data="name" renderer="red" />
	<p data="gender" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	$('#info').bindRoot(person).render(
		null, 
		{red :  function(element, value){
				element.innerHTML = '<font color=red>' + value + '</font>';
			}
		}
	);
</script>
```

或在 html 中嵌入一个 d2js 自定义标记 `renderer`：

```html
<section id="info">
	<p data="name">
		<renderer>element.innerHTML = '<font color=red>' + value + '</font>'</renderer> 
	</p>
	<p data="gender" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	$('#info').bindRoot(person).render();
</script>
```

此外，渲染器还可以是支持 render: function(){...} 的对象，以及渲染器生成器：
```js
{
	createRenderer : function(){
		return {renderer : function(element, value){
			...
		}}
	}
}
```


### 管道

渲染器可以使用管道实现诸如译值之类的行为。

```html
<section id="info">
	<p data="name" renderer="std" />
	<p data="gender" renderer="std" />
	<p data="lastLogon" format="MM-dd-yyyy" renderer="date|std" /><!-- date 是一个管道函数 -->
</section>
<script>
	var person = {name : 'mary', gender:'girl', lastLogon: new Date()};
	$('#info').bindRoot(person).render();
</script>
```

![d2js guide 2](images/d2js-3.png?raw=true)

这里，管道函数`date`将日期类型的`person.birth`翻译为一个指定格式的字符串，其中，`format` 是管道函数 date 所约定的自定义属性。

管道函数接收的参数与渲染函数一样，只是它需要返回转换后的结果，且一般不应改变 element。大部分渲染函数都是管道函数，如 std 就是一个管道函数，其返回结果为传入的 value。

管道函数可以串联拼接，例如，可以定义一个简单的管道函数
```js 
d2js.Renderers.tomorrow = function(element, value){
	return new Date(value * 1 + 86400000);
}
```
使用 `tomorrow|date|std`可以先获取第二天的日期，再传入管道函数 date 转换为日期格式字符串。

在使用 `$e.render(,自定义渲染器)` 时，自定义渲染器中也可以包含管道函数。

使用管道可以达到在不修改数据的前提下，将数据映射成另一份显示用的数据，达到`数据-显示`的分离。

## 简单js对象的收集

渲染将数据画到界面上，反之，收集则是将界面上的内容采集到数据中。

```html
<section id="info">
	Name:<input data="name" renderer="std" collector="c|s">
	Gender:<input data="gender" renderer="std" collector="c|s"/>
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	$('#info').bindRoot(person);
	$('#info').on('input', function(){
		$('#info').collect();
		console.log('person change to ', person);
	});
</script>
```

![d2js guide collect](images/d2js-collect.png?raw=true)

收集器总是以管道组合形式出现。其中 `c` 是定义于 `collector.js`中的管道函数：

```js
d2js.Collectors.c = function(element, value){
	var newValue = null;
	if('value' in element){
		newValue = element.value;
	} else if('innerHTML' in element){
		newValue = element.innerHTML;
	} else {
		throw new Error('unsupported element type' + element.nodeName);
	}
	return newValue;
}
```

`s` 是定义于 `collector.js`中的收集器函数：

```js
d2js.Collectors.s = d2js.KNOWN_COLLECTORS['s'] = function(element, newValue){
	var obj = arguments[arguments.length -2];
	var attr = arguments[arguments.length -1];
	if(newValue === '') newValue = null;
	if(obj != null){	// dont test attr in obj
		if(obj.set){
			obj.set(attr, newValue);
		} else if(obj._set){
			obj._set(attr, newValue);
		} else {
			obj[attr] = newValue;
		}
	}
}
```
可见，`c` 的作用是收集界面输入的数据，`s` 的作用是设置到数据路径所锚定的属性上。

在 `c|s` 之间可以串接其它管道函数对收集的数据进行更多加工：

```html
<section id="info">
	Name:<input data="name" renderer="std" collector="c|s">
	Gender:<input data="gender" renderer="std" collector="c|s"/>
	Birth:<input data="birth" format="yyyy-MM-dd" renderer="date|std" collector="c|d|s"/>
</section>
<script>
	var person = {name : 'mary', gender:'girl', birth: new Date()};
	$('#info').bindRoot(person);
	$('#info').on('input', function(){
		$('#info').collect();
		console.log('person change to ', person);
	});
</script>
```
`c|d|s` 中，`d` 是将数据转为日期类型的函数（`c` 采集到的是字符串）。

和很多其它框架不同，d2js 并不采用灵敏数据绑定的设计，不对控件侦听变动事件，只在调用 d2js.collect 时才执行收集过程。

### 自定义收集器

类似渲染器，可以有两种方式自定义收集器：

0. 对 d2js.Collectors 插入函数
0. 在调用 $el.collect 函数时，提供第 2 个参数 customCollectors。

## 数据根与数据路径的相对路径

如前所述，可使用 data 属性表示数据路径，数据路径在展开时总是从具有数据根的层次最近的容器元素开始（含数据路径所附元素本身）。

数据路径支持使用 , 延续上一层含有数据路径的元素的数据路径。如：

```html
<div d2js.root="person">
	<div>
		My Name: <span data="name" renderer="std"></span>
	</div>
	<div data=",friends"><!-- 数据路径含有 , -->
		<p>
			Friend Name: <span data=",0,name" renderer="std"></span>
		</p>
		<div>
			My Email: <span data="email" renderer="std"></span>
		</div>
		<p>
			Friend Name: <span data=",1,name" renderer="std"></span>
		</p>
	</div>
</div>
```

当数据根即要渲染的元素时，数据路径可指定为  this，如：
```html
<div>
	My Phone: <span d2js.root="person" data="this" renderer="phone|std"></span>
</div>
```

d2js.root 使用字符串属性时，规范与数据路径相同，同样可以使用 , 但 d2js.root 的相对路径总是从上一个d2js.root开始计算，而与 data 属性无关。

除了用于延续的 , 还有一种相对路径： .. 。

```
.. 不论是用于 d2js.root 属性还是 data 属性，.. 总是引用上一级 d2js.root。
```

关于数据路径，可参考 `d2js-test/index.html` 中数据路径的示例。

## d2js 与 RDBMS

d2js 具有与关系型数据库同构的 `dataset-DataTable-DataColumn,DataRow` 体系(该设计思想来源于 ADO.net)， 可以与关系型数据库极好的配合。

![dataset](images/d2js-dataset.png?raw=true)


```
对于习惯使用 ORM 的朋友，d2js 也支持 [orm 方式](orm.md)。
```

### DataTable 及其渲染

```html
<section id="persons" d2js.root="person,rows" data="this" renderer="repeater">
	<div repeater="true">
		<p data="name" renderer="std" />
		<p data="gender" renderer="std" />
	</div>
</section>
<script>
	var table = new d2js.DataTable('person');  // 定义一个表名为 person 的 DataTable 对象。这种方式创建的表默认属于 d2js.root。
	table.fill([		// 填充数据
			{name : 'tom', gender : 'male'},
			{name : 'jack', gender : 'male'},
			{name : 'mary', gender : 'female'}
		]);
	console.log('columns', table.columns);
	console.log('rows', table.rows);
	$('#persons').render();
</script>
```
![datatable 1](images/d2js-datatable-1.png?raw=true)

DataTable 在创建时，默认总是加入到 `d2js.dataset` 对象。但也支持独立表，子数据集，独立子数据集等特性。

在 d2js 框架中，d2js.root 是  d2js.dataset 对象的别名。

```js
	var table = new d2js.DataTable('person');
	console.log(d2js.dataset.person == table);		// 输出 true
```

d2js 可以支持对 html element 局部渲染，也支持与 DataTable 相关的元素的局部渲染。

如同一页面有数个 DataTable，只想与 person 表有关的元素，可以传递 $el.render(目标数据) 参数。如：
```js
	$('#persons').render(person);
```

### DataTable 的收集

```html
<section id="persons" d2js.root="person,rows" data="this" renderer="repeater">
	<div repeater="true">
		Name:<input data="name" renderer="std" collector="c|s">
		Gender:<input data="gender" renderer="std" collector="c|s">
	</div>
</section>
<script>
	var table = new d2js.DataTable('person');  
	table.fill([		// 填充数据
			{name : 'tom', gender : 'male'},
			{name : 'jack', gender : 'male'},
			{name : 'mary', gender : 'female'}
		]);
	$('#persons').on('input', function(){
		$('#persons').collect()
		console.log(table);
	});
</script>
```

当数据有变化时，`DataRow._state` 会变为 `'edit'` 状态。这个状态指示该行数据发生了编辑。

### 使用 DataRow

DataTable 中的数据行可以当做实体对象访问：

```js
	table.rows.forEach(function(person, index){
		console.log(index, person.name, person.gender);
	});
	var mary = table.find('name', 'mary');
	console.log('mary\'s gender: ', mary.gender);
```

DataRow 总是属于 DataTable，DataTable 的每个 DataColumn，在DataRow都有列名对应的属性。

DataRow 可以通过`DataTable.prototype.newRow()` 创建，通过 `DataTable.prototype.addRow` 添加到 `table.rows` 数组，此时 `_state` 为 `'new'`。

通过 `_remove()` 方法可以删除 DataRow 对象，此时该对象还放在 `DataTable.rows` 中，只是 `_state` 为 `'remove'`。

通过` _set(columnName, value)` 可以修改字段值，如值确实有变化，会导致 `_state` 变为 `'edit'`。使用 `row[colName] = new value` 则不会引发 `_state` 变化，所以大部分情况应使用 `_set`, 该函数为 continous 函数，可连续使用：`row._set('name','Jack')._set('age', 18)`，批量赋值也可以使用 `_setValues` 函数。常用的收集器 `s` 对 DataRow 类型的对象默认调用的就是 `_set` 方法。

DataRow 像普通的 js 对象一样，可以插拔自己的属性，也可以修改 DataRow.prototype 使所有 DataRow 实例获得新的属性方法。

数据库设计中字段名应尽量避免与 DataRow 的固有属性方法重名，DataRow 固有的属性方法总是以 `_` 开始，只要字段名不以 `_` 开始就不会发生冲突。

DataTable 支持子类化 d2js.DataRow，关于如何子类化请参加 d2js-test 中的示例 3-1。

### DataTable 与 RDBMS

d2js 框架不仅仅具有前端功能，也支持服务器端功能。

目前，d2js 后端可部署于 jdk8 以上的 servlet3.0 容器，使用  jdbc 数据库连接 ，可较好的支持 oracle, postgresql 等数据库。并支持使用 mongo-java-driver 连接 mongodb。

本示例中使用的是 `bookstore` 数据库，请见[Readme](../README.md)。

下面编写一个名为 `author.d2js` 文件，放在前述网页的同一文件夹。

```js
d2js.fetch = function(params){
	sql{.
		select * from author order by name
	.}
	return this.query(sql);
}
```
前端可由该` author.d2js` 的 `fetch` 函数获取数据：

```html
<section id="persons" d2js.root="author,rows" data="this" renderer="repeater">
	<div repeater="true">
		Name:<input data="name" renderer="std" collector="c|s">
		Email:<input data="email" renderer="std" collector="c|s">
	</div>
</section>
<script>
	var table = new d2js.DataTable('author', 'author.d2js');  
	table.load('fetch', function(){
		$('#persons').render();
	});
	$('#persons').on('input', function(){
		$('#persons').collect;
	});
</script>
```
![d2js output](images/d2js-table-render.png?raw=true)

这样，通过 `table.load('fetch')`，数据库中的数据就被提取到了前端。

显然，`load` 函数使用的是 ajax 方式提取的。可见，每个后端d2js文件都是一个可以通过ajax访问的服务。这种服务可以通过浏览器直接输入网址的形式观察到：

在浏览器地址栏输入：

	http://<<your website>>/author.d2js?_m=fetch

![d2js output](images/d2js-output.png?raw=true)

可以看到，该接口实际上返回了一个json格式的查询结果，由此不难推断 load 函数的运作原理。

### 参数化查询及 sql{. .} 块

d2js 接口可以支持两种形式输入参数。
0. 简单输入

	http://.../author.d2js?_m=fetch&name=mary

0. 参数打包为JSON输入

	http://.../author.d2js?_m=fetch&params={"name":"mary"}
	
由于json可以传递若干常见数据类型，因此 d2js 前端向服务器请求时总是采取 params={JSON} 的做法。

接口可以接收传入的查询参数：
`author.d2js`
```js
d2js.fetch = function(params){
	return this.query('select * from author where name= ? order by name', [params.name]);
}
```
或
```js
d2js.fetch = function(params){
	return this.query('select * from author where name= :name order by name', params);
}
```
关于 `query`函数及 d2js 对象的其它函数，可详见 `WEB-INF/jslib/d2js/base.js`。

输入前述网址可测试效果。

如欲实现模糊查询，可将sql语句改为
```js
d2js.fetch = function(params){
	return this.query('select * from author where strpos(name,:name) > 0 order by name', params);
}
```

下面的代码实现了检查是否需要匹配 `name` 条件：
```js
d2js.fetch = function(params){
	var sql = 'select * from author where 1=1'
	if(params.name){
		sql += ' and strpos(name,:name) > 0';
	}
	sql += 'order by name';
	return this.query(sql, params);
}
```
`d2js.query`和`d2js.execute`等函数并不是简单的拼接sql字符串，而是使用 `PrepareStatement`实现的真正的参数化查询，因此无需顾虑SQL注入。
	
在 d2js 中，还有一种更直观的书写形式：
```js
d2js.fetch = function(params){
	sql{.
		select * from author where 1=1
		code{.
			if(params.name){
				sql{.	and strpos(name,:name) > 0	.}
			}
		.}
		order by name
	.}
	return this.query(sql, params);
}
```
或写作
```js
d2js.fetch = function(params){
	sql{.
		select * from author where 1=1
		sql{.?(params.name)
			and strpos(name,:name) > 0
		.}
		order by name
	.}
	return this.query(sql, params);
}
```
当SQL语句较为复杂时，使用SQL块可以给开发带来极大的便利。通常只需将SQL语句从可视化SQL编辑器粘贴到d2js文件，将若干参数变为 `:arg` 的形式，即可完成一个接口的编写。需要对SQL修改时，也只需将d2js中的代码粘贴到SQL编辑器，修改完后再粘贴回来即可。

d2js 这样设计是遵从数据库为中心的思想，通过改进表达方式充分发挥关系运算理论的优势。

在前端，可使用下面的编程方法注入查询参数。
```js
	table.load('fetch', {name : 'ma'});
```
也可由用户在网页输入，此时可设置输入参数的控件的数据路径为 `table,search,params,arg`，并设置相应的收集器：

```html
<section id="arguments" d2js.root="author,search,params">
	<!-- 用户在该控件输入要查询的人名 -->
	Name:<input data="name" collector="c|s">
	<button onclick="search()">Search</button>
</section>
<hr>
<section id="persons" d2js.root="author" data="rows" renderer="repeater">
	<div repeater="true">
		Name:<input data="name" renderer="std" collector="c|s">
		Gender:<input data="gender" renderer="std" collector="c|s">
	</div>
</section>
<script>
	var table = new d2js.DataTable('author', 'author.d2js', {silent:false});	// 指定 silent=false选项，在数据 load 时自动触发 d2js.render(null, table)  
	table.load('fetch');
	function search(){
		$('#arguments').collect();
		table.load('fetch');
	}
</script>
```

![d2js search](images/d2js-search.png?raw=true)

### 提交变动

用户在前端页面进行的数据修改，经收集后，可以通过 `table.submit()` 一次性提交到服务器。

在d2js观念中，数据变动的粒度是行级的，变动类型有3种，编辑、新增、删除。为此，author.d2js 文件需要编写三个接口函数：

```js
d2js.create = function(rcd){
	return this.insertRow('author', rcd, ['name', 'email']);
}

d2js.modify = function(rcd){
	return this.updateRow('author', rcd, ['id', 'name', 'email']);
}

d2js.destroy = function(rcd){
	return this.deleteRow('author', rcd);
}
```
`create`对应`_state` 为 `new`状态的 DataRow，`modify`对应`edit`状态的 DataRow，`destroy`对应`remove`状态的 DataRow。

在前端只需调用 `table.submit()`，服务器 `author.d2js` 接口中的与行状态对应的函数将自动触发。该逻辑实现于 `base.js`中的`D2JS.prototype.update`函数。

```html
<section id="arguments" d2js.root="author,search,params">
	<!-- 用户在该控件输入要查询的人名 -->
	Name:<input data="name" collector="c|s">
	<button onclick="search()">Search</button>
</section>
<hr>
<section id="persons" d2js.root="author" data="rows" renderer="repeater">
	<div repeater="true">
		Name:<input data="name" renderer="std" collector="c|s">
		Gender:<input data="gender" renderer="std" collector="c|s">
	</div>
</section>
<section>
	<button onclick="table.submit()">Submit</button>
</section>
<script>
	var table = new d2js.DataTable('author', 'author.d2js');
	table.on('load', function(){$('#persons').render(this)});
	table.load('fetch');
	
	table.on('submit', function(error){	
		console.log('submit done', error);
		table.load('fetch');	// 提交成功后再次加载数据
	});
	
	$('#persons').on('input', function(){
		$('#persons').collect();
	});
	
	function search(){
		$('#arguments').collect();
		table.load('fetch');
	}
</script>
```
![d2js search](images/d2js-table-collect.png?raw=true)

打开数据库，可见表数据确实发生了变化：

![d2js search](images/d2js-table-submit.png?raw=true)

## 高级话题

这个markdown文件已经太大了，请点击到该部分[高级话题](d2js-2.md)