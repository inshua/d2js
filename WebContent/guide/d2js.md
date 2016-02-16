# d2js
==================
d2js 是一套js数据前后端框架, 前端和后端可单独使用.

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
<script src="../jslib/jquery-1.10.2.js"></script>
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
	<p data="na" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	d2js.render($('#info'), person, true);		// 将 person对象渲染到 #info 元素 
	// 或使用 jQuery 形式: $('#info').render(person, true)
</script>
```

输入网址查看效果：

![d2js guide 1](images/d2js-1.png?raw=true)

界面很朴素。d2js 是一个数据框架，依托于DOM，可以和各种流行的 css 框架结合。当页面披上 bootstrap, semantic-ui 等 css外衣后，何愁不美轮美奂。

d2js 主要扩充了 `data`, `renderer`, `collector` 3个 html 属性，用于声明页面元素的渲染、收集行为。
渲染、收集过程采用声明式规则，对于不存在的对象属性，不发生渲染，对于存在的属性，调用 renderer 指定的函数序列进行渲染。
数据与 ui 都是 d2js.render 函数的参数，当调用 d2js.render 时，数据才与 ui 元素发生联系，d2js.render 调用完后，联系即消失。


### 渲染路径

所扩充html属性中，`data`为`渲染路径`，用于锚定数据。

```html
<section id="info">
	<p data="name" renderer="std" />
	<p data="gender" renderer="std" />
	<p data="fav,movies,0" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl', fav:{movies:['earth','matrix'], songs:['lalala']};
	d2js.render($('#info'), person, true);
</script>
```
`<p *data="fav,movies,0"* renderer="std" />` 中，data 部分为多层次的数据路径。
很显然，每个 `,` 都带来一次层次推进。

### 渲染器

渲染器是属于 `d2js.Renderers` 的成员函数，用于将锚定的数据值画到相应DOM元素。渲染器函数可以自行扩充。

例如 `std` 函数，定义于 `renderers.js` 中： `d2js.Renderers.std = function(){...}`

渲染器函数被调用时收到的实参参数列表为 html element 及按数据路径展开过程中的所有分解出的数据。

例如，当`d2js.render`作用于 `<p data="name" renderer="std" />` 和 `person` 对象时，`std` 函数实参参数列表如下：

```js
<p/>, 'mary', person, 'name', 'mary'
```

前 2 个实参固定为 `element` 和 `value`，后面的实参由数据路径的展开过程产生。

当 `d2js.render`作用于`<p data="fav,movies,0" renderer="std" />`时，`std` 函数将收到如下参数：

```
<p/>, 'earth', person, 'fav', person.fav, 'movies', person.fav.movies, 0, person.fav.movies[0] 即 'earth'
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
	d2js.render($('#info'), person, true);
</script>
```

也可以在渲染时提供自定义的渲染函数，如

```html
<section id="info">
	<p data="name" renderer="red" />
	<p data="gender" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	d2js.render($('#info'), person, true, 
		{red :  function(element, value){
				element.innerHTML = '<font color=red>' + value + '</font>';
			}
		}
	);
</script>
```

或在网页中嵌入一个 d2js 自定义标记 `renderer`：

```html
<section id="info">
	<p data="name">
		<renderer>element.innerHTML = '<font color=red>' + value + '</font>'</renderer> 
	</p>
	<p data="gender" renderer="std" />
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	d2js.render($('#info'), person, true);
</script>
```

![d2js guide 2](images/d2js-2.png?raw=true)

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
	d2js.render($('#info'), person, true);
</script>
```

![d2js guide 2](images/d2js-3.png?raw=true)

这里，管道函数`date`将日期类型的`person.birth`翻译为一个指定格式的字符串，其中，`format` 是管道函数 date 所约定的自定义属性。

管道函数接收的参数与渲染函数一样，只是它需要返回转换后的结果，且一般不应改变 element。

管道函数可以串联拼接，例如，可以定义一个简单的管道函数
```js 
d2js.Renderers.Pipelines.tomorrow = function(element, value){
	return new Date(value * 1 + 86400000);
}
```
使用 `tomorrow|date|std`可以先获取第二天的日期，再传入管道函数 date 转换为日期格式字符串。

## 简单js对象的收集

渲染将数据画到界面上，反之，收集则是将界面上的内容采集到数据中。

```html
<section id="info">
	Name:<input data="name" renderer="std" collector="c|s">
	Gender:<input data="gender" renderer="std" collector="c|s"/>
</section>
<script>
	var person = {name : 'mary', gender:'girl'};
	d2js.render($('#info'), person, true);
	$('#info').on('input', function(){
		d2js.collect($('#info'), person, true);
		console.log('person change to ', person);
	});
</script>
```

![d2js guide collect](images/d2js-collect.png?raw=true)

收集器总是以管道组合形式出现。其中 `c` 是定义于 `collector.js`中的管道函数：

```js
d2js.Collectors.Pipelines.c = function(element, value){
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

当数据需要加工时，可以串接其它管道函数：

```html
<section id="info">
	Name:<input data="name" renderer="std" collector="c|s">
	Gender:<input data="gender" renderer="std" collector="c|s"/>
	Birth:<input data="birth" format="yyyy-MM-dd" renderer="date|std" collector="c|d|s"/>
</section>
<script>
	var person = {name : 'mary', gender:'girl', birth: new Date()};
	d2js.render($('#info'), person, true);
	$('#info').on('input', function(){
		d2js.collect($('#info'), person, true);	// 或 $('#info').collect(person, true);
		console.log('person change to ', person);
	});
</script>
```
`c|d|s` 中，`d` 是将数据转为日期类型的函数（`c` 采集到的是字符串）。

和很多其它框架不同，d2js 并不采用灵敏数据绑定的设计，不对控件侦听变动事件，只在调用 d2js.collect 时才执行收集过程。

### 自定义收集器

类似渲染器，可以有两种方式自定义收集器：

0. 对 d2js.Collectors 或 d2js.Collectors.Pipelines 插入函数
0. 在调用 d2js.collect 函数时，提供第 4 个参数 customCollectors。

## 绝对数据路径

数据路径支持 `#` 开始的绝对数据路径。如

```html
<section id="info">
	<p data="#person,name" renderer="std" />
</section>
<script>
	var person = {d2js: 'person', name : 'mary', gender:'girl'};
	// 锚定 name='mary'的 person 对象
	d2js.render($('#info'), person, false);

	var person = {name : 'jack', friend : {d2js: 'person', name : 'mary', gender:'girl'}};
	// 自动下溯，依然锚定 name='mary'的 person 对象
	d2js.render($('#info'), person, false);
</script>
```

后面将看到，绝对数据路径在 d2js 是运用更广泛的方式。

## d2js 与 RDBMS

d2js 具有与关系型数据库同构的 `dataset-DataTable-DataColumn,DataRow` 体系(该设计思想来源于 ADO.net)， 可以与关系型数据库极好的配合。

![dataset](images/d2js-dataset.png?raw=true)

### DataTable 及其渲染

```html
<section id="persons" data="#person,rows" renderer="repeater">
	<div repeater="true">
		<p data="name" renderer="std" />
		<p data="gender" renderer="std" />
	</div>
</section>
<script>
	var table = new d2js.DataTable('person');  // 定义一个表名为 person 的 DataTable 对象
	table.fill([		// 填充数据
			{name : 'tom', gender : 'male'},
			{name : 'jack', gender : 'male'},
			{name : 'mary', gender : 'female'}
		]);
	console.log('columns', table.columns);
	console.log('rows', table.rows);
	d2js.render($('#persons'), table);
</script>
```
![datatable 1](images/d2js-datatable-1.png?raw=true)

DataTable 在创建时，总是加入到 `d2js.dataset` 对象。

```js
	var table = new d2js.DataTable('person');
	console.log(d2js.dataset.person == table);		// 输出 true
```

DataTable 在创建时，总是生成属性 `d2js : tableName`， 绝对数据路径支持自动下溯特性，因此：

```js
	d2js.render($('#persons'), d2js.dataset);
	相当于：
	for(var tname in d2js.dataset){
		if(d2js.dataset[k].isDataTable){
			d2js.render($('#persons'), d2js.dataset[k]);
		}
	}
```

在实际开发中，常常需要将 dataset 中的数据全部更新到界面，后面一种写法更有普遍性。因此，`d2js.dataset` 被设计为 d2js.render 的默认参数。

故 `d2js.render($('#persons'), d2js.dataset);` 可进一步简化为：
```js
	d2js.render($('#persons'), null);
	或
	d2js.render($('#persons'));
```
当需要更新网页所有元素时，可使用
```js
	d2js.render(null, null);
	或
	d2js.render();
```

综上，d2js 可以支持对 html element 局部渲染，也支持与 DataTable 相关的元素的局部渲染。

### DataTable 的收集

```html
<section id="persons" data="#person,rows" renderer="repeater" collector="repeater">
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
		d2js.collect($('#persons'));
		console.log(table);
	});
</script>
```

注意观察当数据有变化时，`DataRow._state` 会变为 `'edit'` 状态。这个状态指示该行数据发生了编辑。

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

### DataTable 与 RDBMS

d2js 框架不仅仅具有前端功能，也支持服务器端功能。

目前，d2js 后端可部署于 jdk8 以上的 servlet3.0 容器，使用  jdbc 数据库连接 ，可较好的支持 oracle, postgresql 等数据库。

本示例中使用的是 `bookstore` 数据库，请见[Readme](../README.md)。

下面编写一个名为 `author.d2js` 文件，放在前述网页的同一文件夹。

```js
d2js.fetch = function(params){
	return this.query('select * from author order by name');
}
```
前端可由该` author.d2js` 的 `fetch` 函数获取数据：

```html
<section id="persons" data="#author,rows" renderer="repeater" collector="repeater">
	<div repeater="true">
		Name:<input data="name" renderer="std" collector="c|s">
		Gender:<input data="gender" renderer="std" collector="c|s">
	</div>
</section>
<script>
	var table = new d2js.DataTable('author', 'author.d2js');  
	table.load('fetch', function(){
		$('#persons').render(table);
	});
	$('#persons').on('input', function(){
		d2js.collect($('#persons'));
	});
</script>
```
这样，通过 `table.load('fetch')`，数据库中的数据就被提取到了前端。

显然，`load` 函数使用的是 ajax 方式提取的。可见，每个d2js都是一个可以通过ajax访问的服务。这种服务可以通过浏览器直接输入网址的形式观察到：

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
	
由于json可以传递若干常见数据类型，因此当使用 d2js 前端时，自动采用后面的做法。

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

在前端，可使用下面的编程方法注入查询参数。
```js
	table.load('fetch', {name : 'ma'});
```
也可由用户在网页输入，此时可设置输入参数的控件的数据路径为 `table,search,params,arg`，并设置相应的收集器：

```html
<section id="arguments">
	<!-- 用户在该控件输入要查询的人名 -->
	Name:<input data="#author,search,params,name" collector="c|s">
	<button onclick="search()">Search</button>
</section>
<hr>
<section id="persons" data="#author,rows" renderer="repeater" collector="repeater">
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

在d2js观念中，数据变动的粒度是行级的，变动类型有3种，编辑、新增、删除。为此，d2js文件需要编写三个接口函数：

```js
d2js.create = function(rcd){
	return this.insertRow('author', rcd, ['name', 'gender']);
}

d2js.modify = function(rcd){
	return this.updateRow('author', rcd, ['id', 'name', 'gender']);
}

d2js.destroy = function(rcd){
	return this.deleteRow('author', rcd);
}
```
`create`对应`_state` 为 `new`状态的 DataRow，`modify`对应`edit`状态的 DataRow，`destroy`对应`remove`状态的 DataRow。

在前端只需调用 `table.submit()`，服务器 `.d2js` 接口中的与行状态对应的函数将自动触发。该逻辑实现于 `base.js`中的`D2JS.prototype.update`函数。

```html
<section id="arguments">
	<!-- 用户在该控件输入要查询的人名 -->
	<input data="#author,search,params,name" collector="c|s">
	<button onclick="search()">Search</button>
</section>
<hr>
<section id="persons" data="#author,rows" renderer="repeater" collector="repeater">
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
	table.on('load', function(){$('#persons').render(this)};
	table.load('fetch');
	
	table.on('submit', function(error){	// 提交成功后再次加载数据
		console.log('submit done', error);
		table.load('fetch');
	});
	
	$('#persons').on('input', function(){
		d2js.collect($('#persons'));
	});
	
	function search(){
		$('#arguments').collect();
		table.load('fetch');
	}
</script>
```

## 高级话题

### 调试渲染器和收集器

为了查明渲染器的行为，可以在 `<tag data="" renderer="">` 增加 `trace-render`，即
	
	<tag data="" renderer="" trace-render>
	
这样当渲染该元素时，会自动进入断点。

同样，启用 `trace-collect` 可以追踪收集器的行为。

### 禁用收集器

有时有的元素虽然指定了数据路径和收集器，但是暂时不需要收集，此时可指定 'no-collect' 为 true，该属性对子元素有屏蔽作用——除非对子元素收集。

### d2js 中的词典

在实际业务中，经常遇到枚举性质的词典，例如 `M=男 F=女`，数据库中存储的值为M,F，需要显示出来的是"男，女"。d2js 可以方便的处理词典。

对于一次性的词典，在渲染器直接指定即可。如
```html
<p id="info" data="gender" renderer="dict({M:'男', F:'女'})|std">
<script>
	$('#info').render({name : 'mary', gender: 'F'}, true);
</script>
```
对于多次使用的词典，可以创建为 `d2js.dataset.dicts` 的成员，如：
```html
<input id="info" data="gender" dict="gender" renderer="dict|std">
<script>
	d2js.dataset.dicts.gender = {M : '男', F: '女'};
	// 或简写为 
	Dicts.gender = {M : '男', F: '女'};
	
	$('#info').render({name : 'mary', gender: 'F'}, true);
</script>
```

此外，d2js 也支持数组性的词典，详见 d2js 手册。

### 渲染下拉列表框 select

下拉列表框实际上有两种类型的数据来源，一种是词典，一种是数据表。

对于词典性数据，如前述`性别`词典，期望得到

```html
	<select>
		<option value="M">男</option>
		<option value="F">女</option>
	</select>
```
由于 select 本身是一种单值输入控件，具有输入控件固有的数据路径，故不能对 select 使用 *data="词典" renderer="下拉列表"* 这样的表述。
对下拉列表提供数据，需要在外层嵌套一层 div 或其它元素。如前述`性别`词典，可以表述为：

```html
	<div data="#dicts" dict="gender" renderer="dictToList|options">
		<select data="gender" renderer="std"></select>
	</div>
	<script>
		Dicts.gender = {M : '男', F: '女'};
	
		$('#info').render({name : 'mary', gender: 'F'}, true);
	</script>
```

以 DataTable 为数据来源的下拉列表框，可以表述为:

```html
	<div data="#gender,rows" renderer="options('value', 'mean')">
		<select data="gender" renderer="std"></select>
	</div>
	<script>
		new d2js.DataTable('gender').fill([{value: 'M', mean: '男'}, {value: 'F', mean: '女'}]);
		$('#info').render();
	
		$('#info').render({name : 'mary', gender: 'F'}, true);
	</script>
```
其中 `renderer="options('value', 'mean')"`，当值字段为 id，含义字段为 name 时，可以缩写为 

	renderer="options"
	
### 表达式渲染器 expr

可以使用表达式渲染器渲染一些简单的内容，如：

```html
<div data="#person,rows,0" renderer="expr">
	<div class="header">{{name}}</div>
</div>
```

表达式渲染器书写更美观的，但是由于大量替换 innerHTML，效率较 std 渲染器低。

### 重复项渲染器 repeater

```html
<div data="#person,rows" renderer="repeater">
	<div repeater="true">
		<div class="header" data="name" renderer="std"></div>
	</div>
	<div repeater-empty="true>
		没有符合条件的查询结果
	</div>
</div>
```
repeater渲染器对所提供的数组类型的数据进行循环，将 `repeater="true"` 的子元素视为模板，不断重复。
重复得到的克隆体元素，其具有 repeater-copy="true"属性，并获得 jQuery 的 repeater-obj 数据，即可以通过 $('[repeater-copy]).data('repeater-obj')访问相应的实际数据。如本例中，即可访问 DataRow 对象。
当数组为空时，子元素中 `repeater-empty="true"` 的子元素会被展示出来。

模板子元素，也即`repeater="true"`的元素，可以存在多个，并使用 when 表达式决定是否应当对本条数据展示，如：
```html
<div data="#person,rows" renderer="repeater">
	<div repeater="true" when="gender='F'">
		<div class="girl header" data="name" renderer="std"></div>
		<div>女性促销信息</div>
	</div>
	<div repeater="true" when="gender='M'">
		<div class="boy header" data="name" renderer="std"></div>
	</div>
	<div repeater-empty="true>
		没有符合条件的查询结果
	</div>
</div>
```
重复项渲染器中，可以使用 expr 渲染器。此时，expr 元素的数据路径可指定为 `this`：
```html
<div data="#person,rows" renderer="repeater">
	<div repeater="true" data="this" renderer="expr">
		<div class="header">{{name}}</div>
	</div>
	<div repeater-empty="true>
		没有符合条件的查询结果
	</div>
</div>
```

### 表格渲染器，页码渲染器及可以编辑单行的对话框

请见所提供的 `d2js-test/4.html` 的示例及其源码。

### d2js 中使用事务

d2js 中可以使用方便的使用数据库的事务。

```js
d2js.test = function(){
	return this.doTransaction(function(){
		this.execute('update staff set salary = salary * 1.1');
		return this.query('select * from staff where id = ?', [12]);
	})
}
```

### d2js 日志输出

d2js 现在使用 log4j 框架，每个引擎初始化即带有一个 `logger` 全局对象，可以使用 `logger.info, logger.debug, logger.error` 等日志函数，用法与 log4j 一样。

可以在日志中使用 `JSON.strigify(js object)` 输出 js 对象，包括数据库查询结果、接收到的参数等等。

可以在日志中使用 `logger.error('<<description>>', wrapJsError(e))` 打印错误堆栈日志。

完善的错误处理得益于 jdk8 以上版本所提供的 narshorn js 引擎。

### d2js 编写伪存储过程

事实上，如果不担心性能，d2js 可以部分取代存储过程，充当 js 语言编写的存储过程。

d2js 提供 query, queryRow, querScalar, travel 等便捷的函数获取数据，提供 insertRow, updateRow, deleteRow, mergeRow 等函数更新数据库，并支持事务、IN-OUT游标、JSON,JSONB,ARRAY等等各种数据库语言自己都难以驾驭的数据类型，同时，d2js 还可以使用 request,session,response等web服务器对象，所以将d2js视为一种存储过程编写机制也不失为一种有趣的尝试。

当然，由于d2js不运行于数据库服务器，每次执行SQL都将产生网络开销，所以效率不能与真正的存储过程相提并论。

但是在不考虑运行效率的场合，使用 d2js 的存储过程也有较大的优势：
* 动态语言不需要 orm 就可以取用存储在数据库中的业务对象，对商业逻辑的表达能力更强
* d2js 所依赖的 nashorn 引擎可以提供错误的堆栈信息，大部分数据库都没有错误堆栈
* 日志与服务器日志合在一处，便于排查错误
* 可以使用 js 的全部语法特性，并能通过 nashorn 引擎使用 java 语言的各种设施
* d2js 中可以方便的从 session 等服务器端对象获取所需信息
* 服务器可以联合使用其它的 nosql 数据库
* 在实际开发中，d2js 灵活的注入或构造查询结果数据，在数据库没有就绪时可以先构造假数据

### 服务器端数据校验

d2js 可以编写服务器校验逻辑，对输入的数据进行校验。如：

```js
d2js.create = function(rcd){
	$V(rcd, {
		name : [V.notNull, V.shortest(5)],
		gender : [V.inside(['M', 'F'])]
	});
	
	this.insertRow('author', rcd, ['name', 'gender']);
}
```
校验函数定义在 `WEB-INF/jslib/d2js/validation.js` 中。

当校验失败时，前端对应的数据行 row._error_at[colName] 将出现值，可以使用渲染器 `flderr` 将其绘出。可参考 `d2js-test/4.html`，该页面用到了 bootstrap.js 样式。

其中渲染字段错误的代码如：

```html
  <div class="form-group" data="#author,curr,_error_at,name" renderer="flderr" trace>
    <label>Name</label>
    <input type="text" class="form-control" data="#author,curr,name" renderer="std" collector="c|s">
  </div>
```

![d2js validation](images/d2js-validation.png?raw=true)

其中，`curr` 属性为当前行，是该页面对 table 插拔的一个自定义属性，不是 dataset 标准属性。

在后台 `.d2js` 文件中，也可以简单的引发其它错误：
```js
d2js.modify = function(rcd){
	throw new Error('permission denied');
}
```
使用下面 html 可以渲染校验错误：

```html
<div data="#author,curr,_error" renderer="stderr"></div>
```
![d2js validation](images/d2js-validation2.png?raw=true)

可见，d2js 中的渲染是涵摄很广的概念。DataTable,DataRow 的错误、分页、状态都可以通过渲染来表达。

### 自定义校验器

校验函数定义在 `WEB-INF/jslib/d2js/validation.js` 中。

如自定义校验器为全项目公共校验器，可以放在该文件中。

如自定义校验器为模块级校验器，可放于模块公共 js 文件中，模块中的各个 d2js 文件使用 `include()` 导入。

如自定义校验器为功能内公用校验器，可在该功能 d2js 中定义校验器对象，如：

```js
	var myValidator = {
		name : 'my validator',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.toUpperCase() != v) return '必须全部为大写字母';
		}
	}
	
	d2js.create = function(rcd){
		$V(rcd, {
			name : [V.notNull, V.shortest(5), myValidator],
			gender : [V.inside(['M', 'F'])]
		});
		
		this.insertRow('author', rcd, ['name', 'gender']);
	}
	
	d2js.modify = function(rcd){
		$V(rcd, {
			name : [V.notNull, V.shortest(5), myValidator],
			gender : [V.inside(['M', 'F'])]
		});
		
		this.updateRow('author', rcd, ['id', 'name', 'gender']);
	}
```

如为一次性使用，也可直接嵌入于函数中。如：

```js
	d2js.create = function(rcd){
		$V(rcd, {
			name : [V.notNull, V.shortest(5), {
						name : 'my validator',
						check : function(v, fld){
							if(v==null||v=='') return;
							if(v.toUpperCase() != v) return '必须全部为大写字母';
						}
					}],
			gender : [V.inside(['M', 'F'])]
		});
		
		this.insertRow('author', rcd, ['name', 'gender']);
	}
```

### 多国语言的建议

各种程序内消息，建议编写一个用法如下的函数 `LM(message)`(locale message):

```js
	var myValidator = {
		name : 'my validator',
		check : function(v, fld){
			if(v==null||v=='') return;
			if(v.toUpperCase() != v) 
				return LM('必须全部为大写字母');	// 根据用户当前语言获取适合他阅读的消息
		}
	}
```

所有语言的消息可以放在 `WEB-INF/jslib/i18n` 中。以下面的形式存储:

```js
	LM['en-US'] = {
		'必须全部为大写字母' : 'must in uppercase',
		'权限不足': 'permission denied',
	}
```
这样，可以编写一个小工具，搜索所有项目中的字面常量，加入 `LM` 中。

如何实现 `LM` 函数呢？读者可自己思考。提示，在 d2js 中可以使用 session。


### json 字段的显示与收集

postgresql9.3 以后的版本都提供 json 数据类型，pg9.4以上支持 jsonb 数据类型（d2js 默认使用 jsonb 数据类型）。使用 d2js 可以尽情发挥json类型的优势。

示例数据表 author 有字段名为 info 的 jsonb 字段，用来存储其它字段中描述不周的信息。现假如需要将 linkin 账号放在 info 字段。

json 字段的值到网页前端即自动变成 js 对象。如上述 author 表的 info 字段为 jsonb 类型，可以使用 row.info.linkin 访问其 linkin 属性。

在界面渲染时，只要在数据路径使用
	
	info,linkin
	
即可显示该字段。

对于 json 中的属性，收集器不能再使用 `s` 收集器，使用 `s` 收集器不会引起 DataRow 的状态发生变化。对于此种对象类型的字段，应使用 `oc`收集器。即：

```html
	<input data="info,linkin" renderer="std" collector="c|oc">
```

d2js 数据校验方面，使用如下表达：

```js
d2js.create = function(rcd){
	$V(rcd, {
		name : [V.notNull, V.shortest(5)],
		gender : [V.inside(['M', 'F'])],
		info : [V.attrs(['linkin'])],	// 防止用户注入其它属性
		'info,linkin': [V.shortest(5)]
	});
	
	this.insertRow('author', rcd, ['name', 'gender', 'info']);
}
```
在 d2js 中，jsonb 数据类型可以畅通无阻的 insert, update。


### 主从表

在d2js中，主从表在前端汇合，后端不需要做声明。

前端声明两个表的关系的方法：

```js
	var author = new d2js.DataTable('author', 'author.d2js');
	var book = new d2js.DataTable('book', 'book.d2js');
	
	author.addRelation('id', 'book', 'author');
```

表之间的关系建立后，可以使用`findChildRows, findParentRows` 等函数访问子表行和父表行。

在调用主表的 `submit` 提交数据时，子表数据也会连带提交。服务器所预备的若干个 d2js 的数据更新函数会陆续发生调用。虽然被调用的函数分散在不同的 d2js 文件中，整个提交过程仍在同一个事务中进行，一旦出错即整体回滚。

尽管 d2js.dataset 支持表间关系，在实践中，d2js.DataTable 的数据来源通常**应当为查询结果集**，与数据库的表**不能**简单的一一对应，页面的d2js.dataset仅仅是RDBMS的一个**剪影(snap)**，千万要遏制把数据库结构照搬到网页上的冲动。


### 将d2js后端应用于其它前端框架

d2js 前后端耦合程度很低，作为一种 RESTful 接口，d2js 服务可以轻松运用于其它前端框架。这里给出一个 ExtJS 的前端实现作为分享：

```js
Ext.define('Ext.data.reader.D2jsJson', {
    extend: 'Ext.data.reader.Json',
    alias : 'reader.d2js',
    successProperty : null,
    messageProperty : null,
    totalProperty : 'total',
    
    getResponseData: function(response) {
        var data, error;
 
        try {
            data = Ext.decode(response.responseText);
            if(data.error) {
            	error = new Ext.data.ResultSet({
	                total  : 0, count  : 0, records: [], success: false,
	                message: data.error
	            });
            }
        } catch(ex){
        	error = new Ext.data.ResultSet({
        		total  : 0, count  : 0, records: [], success: false,
                message: response.responseText
            });
        }        
        if(!error){
        	try{        		
	            return this.readRecords(data);
	        } catch (ex) {
	        	error = new Ext.data.ResultSet({
	        		total  : 0, count  : 0, records: [], success: false,
	                message: ex.message
	            });	            
	        }
        }
        this.fireEvent('exception', this, response, error);
    	
        Ext.Logger.warn('Unable to parse the JSON returned by the server');

        return error;
    },
    
    getMeta : function(data){
    	return {root : 'rows', fields : data.columns};
    },

    readRecords: function(data) {
    	if(data.error){
    		throw new Error(data.error);
    	} else {
    		return this.callParent(arguments);
    	}
    },
    buildExtractors : function(){
    	this.callParent(arguments);
    	this.getRoot = function(data){
    		if(data.data) return data.data.rows;
    		if(data.rows) return data.rows;
    		return null;
    	}
    	this.getMeta = function(data){
    		if(data.data) return data.data.columns;
    		if(data.columns) return data.columns;
    		return null;
    	}
    }
	
});

Ext.define('Ext.data.writer.D2jsJson', {
    extend: 'Ext.data.writer.Json',
    alias : 'writer.d2js',
    writeRecords: function(request, data) {
    	var root = this.root;
        
        if (this.expandData) {
            data = this.getExpandedData(data);
        }
        
        if (this.allowSingle && data.length === 1) {
            data = data[0];
        }

        var params = request.params.params;
        if(params) params = JSON.parse(params);
        
        Ext.apply(params, data);
        
        request.params.params = JSON.stringify(params);
        
        return request;
    }, 
    getRecordData: function(record, operation) {
    	var r = this.callParent(arguments);
    	if(operation.action == 'update'){
    		r._origin = record.raw;
    	}
    	return r;
    }
});

Ext.define('Ext.data.proxy.D2js', {
    extend: 'Ext.data.proxy.Rest',
    alternateClassName: 'Ext.data.RestProxy',
    alias : 'proxy.d2js',
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'POST',
        destroy: 'POST'
    },
    d2jsMethods: {
        create : 'create',
        read   : 'fetch',
        update : 'modify',
        destroy: 'destroy'
    },
    reader : {
		type : 'd2js'
	}, writer : {
		type : 'd2js'
	},
	appendId : false,
	
    getParams: function(operation) {
        var me = this,
            params = {},
        	sorters = operation.sorters;
        
        params = operation.params.q || {};        

        if(operation.start != null && operation.limit != null){
        	params._page = {start : operation.start || 0, limit : operation.limit || 0};        
        }
        
        if(sorters){
	        var sorts = {};
	        for(var i=0; i<sorters.length; i++){
	        	sorts[sorters[i].property] = sorters[i].direction; 
	        }
	        params._sorts = sorts;
        }

        delete operation.params.q;
        
        params = { params : JSON.stringify(params)};
        if(operation.params._m){
        	params._m = operation.params._m; 
        } else {
        	params._m = this.d2jsMethods[operation.action];
        }
        return params;
    }
});

Ext.define('Org.Siphon.D2js.Store', {
	extend : 'Ext.data.Store', autoLoad : false,
	pageSize : 10, remoteSort : true, proxy : { type : 'db2js' }, listeners : {
		update : Ext.emptyFn
	}, load : function(options) {
		var bparams = this.baseParams;
		if (options && options.params && bparams && bparams.params) {
			Ext.applyIf(options.params, bparams.params);
		}
		options = Ext.applyIf(options || {}, bparams);
		this.callParent([ options ]);
	}, constructor : function(config) {
		this.proxy.model = this.model;
		this.callParent([ config ]);
		this.proxy.url = this.proxy.url || (this.model ? (new this.model()).url : null) || config.url;
		this.baseParams = config.baseParams;
	}, q : function(query) {	/* {cond : value, cond : value} */
		var qd = this.baseParams && this.baseParams.params && this.baseParams.params.q;
		if (qd) {
			qd = Ext.apply(qd, query);
		} else {
			qd = query;
		}
		if (!this.baseParams)
			this.baseParams = {};
		if (!this.baseParams.params)
			this.baseParams.params = {};
		this.baseParams.params.q = qd;
		return this;
	}, m : function(method) {
		if (!this.baseParams)
			this.baseParams = {};
		if (!this.baseParams.params)
			this.baseParams.params = {};
		this.baseParams.params._m = method;
		return this;
	}
});

/**
 * 使用方法  :
 * var store = Ext.create('Org.Siphon.DynaStore', {url : 'author.d2js'});
 * store.m('fetch').load({params : {name : 'Kant'}}); 
 */
Ext.define('Org.Siphon.DynaStore', {
	extend : 'Org.Siphon.Store', autoLoad : false, proxy : {
		type : 'db2js', reader : {type : 'db2js', useRemoteMeta : true} 
	},
	setProxy: function(proxy) {		// ext 忘了设置 proxy.store,但是在proxy.setModel(model, true)需要用到
		var p = this.callParent([proxy]);
		p.store = this;
		return p;
    },
    setModel: function(model){		// ext 没有这个函数,但是 proxy.setModel(model, true) 调用到了它
    	this.model = model;
    }
});

```

其它客户端形式也可以根据自身情况开发接口连接 d2js 服务或开发类似 d2js 的前端框架。
* .net 可以利用现有 ADO.net 的 DataSet 框架，编写 TableAdapter 实现调用服务器 .d2js 的功能，但由于控件无法插拔，较难实现 render 和 collect 体系；
* java 包括服务器端、Android 端，可以编写类似的 DataSet 框架，同样由于面向对象的控件无法插拔，较难实现 render 与 collect；
* ios 等其它平台与 java 同理。

