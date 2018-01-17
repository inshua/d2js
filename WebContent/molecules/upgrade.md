# molecule 升级要点

原来形式的

```html
	<tag molecule-def="A">
		<script>
			function someFunction(){}
			// MOLECULE_DEF
			function A(){
				code
			}
			// MOLECULE_DEF_END
			Molecule.create(A)
		</script>
	</tag>
	<tag molecule-def="B">
	</tag>
```
升级后改为

```html
	<template>
		<tag molecule-def="A">
			<script constructor>
				code
			</script>
			<script>
				function someFunction(){}
			</script>
		</tag>
		<tag molecule-def="B">
		</tag>
	</template>
```
也就是说，将定义挪到 `template` 标记中, 一个 template 可以放入多个 molecule-def。

## 构造函数

以前构造函数嵌入在 script 块中，现在改为
```html
	<script constructor>
		code
	</script>
```
去除函数声明及 `Molecule.create`。

其它不属于构造函数的单次调用的函数，应另外创建 script 块。

因此，前面的块：

```html
<script>
	function someFunction(){}
	// MOLECULE_DEF
	function A(){
		code
	}
	// MOLECULE_DEF_END
	Molecule.create(A)
</script>
```
现在变为：
```html
	<script constructor>
		code
	</script>
	<script>
		function someFunction(){}
	</script>
```

对于子类，也就是使用 `Molecule.extend(B)`的派生 Molecule。现在可使用如下形式表述：

```html
<script>
	// MOLECULE_DEF
	function B(){
		code
	}
	// MOLECULE_DEF_END
	Molecule.create(B)
</script>
```
现在变为：
```html
	<script constructor extends>
		code
	</script>
```

当需要指明派生的父类时，写作：

```html
	<script constructor extends=A> <!-- A 为父类 -->
		code
	</script>
```

## 样式

以前有的 molecule 通过 [{$:'tag', style_rule: 'style'}].defCss() 创建样式的，应整合入 style，也就是说：

```html
<tag molecule-def="A">
	<script>
		[{$:'tag', style_rule: 'style'}].defCss() 
		...
	</script>
</tag>
```
调整为：
```html
<tag molecule-def="A">
	<style>
		tag{
			style_rule : style
		}
	</style>
</tag>
```

## 插入点

以前通过 <!-- {INNER_HTML} --> 实现插入点，现在使用 <molecule-placeholder></molecule-placeholder> 达到相同效果。

例如：

```html
<div molecule-def="A">
	<div>
		<!-- {INNER_HTML} -->
	</div>
</div>
```

现在改为

```html
<div molecule-def="A">
	<div>
		<molecule-placeholder></molecule-placeholder>
	</div>
</div>
```
`molecule-placeholder` 还能实现更强大的效果。另外，本次升级增加了 `molecule-slot` 和 `molecule-plug` 机制，关于这两点可以参考 molecule 示例。

## 孤立元素的处理
像 input, textarea 等元素，无法嵌套 script 或 style 块。上一版本即支持使用 molecule-for 达到将 nextSibling script 划作 molecule 使用的效果。
本轮优化后，script, style 块均支持 molecule-for 属性声明。如：

```html
	<textarea molecule-def="TextArea" class="form-control" renderer="std" collector="c|s" cols="40" rows="8"></textarea>
	<script molecule-for="TextArea" constructor>
		var col = this.$el.closest('.field').attr('col');
		this.$el.attr('data', col);
		this.$el.closest('.field').addClass('form-textarea-item');
	</script>
	<style molecule-for="TextArea">
		.form-textarea-item>label {
			vertical-align: top;
		}
	</style>
```

### Table 元素的处理（escape-tag）

在html中，td tr 等元素只能从属于相应的父节点。如 tr 只能属于 thead,tbody,tfoot,table中的一个，如将其置于 div 中，会由于归属问题导致事实上插入失败。

上一版本使用 escape-tag 处理该问题。如以往是这样实现置入表格的列的：

```html
	<div molecule-def="A" escape-tag="th">
		<table>
			<thead>
				<tr>
					<!-- {INNER_HTML} -->
				</tr>
			</thead>
		</table>
	</div>
	<div molecule="A">
		<m:td>name</m:td>
	</div>
```
本版本可自动处理 tr td 等表格元素（声明不同，用法还是相同）。
```html
	<div molecule-def="A">
		<table>
			<thead>
				<tr>
					<!-- template 可以插入到 table 元素下而不产生排斥反应，所以在这种场景应使用 template molecule-placeholder --> 
					<template molecule-placeholder></template> 
				</tr>
			</thead>
		</table>
	</div>
	<div molecule="A">
		<m:td>name</m:td>
	</div>
```

### 引用 molecule

以前通过 loadHtml('bootstrap-basic.html') 引用组件，现在改为 

```html
<molecule src="bootstrap-basic.html"></molecule>
```

在组件定义中也可以通过该形式可以引用其它组件。

### 自动升级 upgrade.html

将文件提交到 upgrade.html，可以实现自动升级。但这个过程存在瑕疵，需要人工编辑。

主要问题有：
1. 语句划分不当。如 } 划分到另一个 script 块。
1. 所有 molecule-def 输出到同一个 template。有些 molecule 应该另外开 template，原因不明。molecule-def=List 会发生这个问题。
1. defCss 需要人工转换。转换方法 upgrade.html 页面有说明。
1. 有时 style 会溢出 template，需要人工放进去。

除了这些缺陷外，基本上能满足使用。

