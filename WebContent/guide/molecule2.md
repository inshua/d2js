# molecule (part ii)

## 其它问题

### 无法嵌套 script 的元素如何嵌套 molecule 构造函数

像 `input`,`img` 这样的元素，里面不能写 \<script\>，无法嵌入 `MOLECULE_DEF` `MOLECULE_DEF_END` 脚本。对于这样的元素，可以在下一个节点放一个 `molecule-for=MOLECULE名`的 script 块，如：

```html
<input molecule-def="MyInput>
<script molecule-for="MyInput>
	...
</script>
```

### 如何实现将实例所要围合的html放置在想放置的位置

就像html标记一样，molecule实例也可以围合html。所谓围合html，就像如下结构：
```html
<div molecule-def="MyMolecule"><span>dog</span></div>
<div molecule="MyMolecule">bone</div>
```
MyMolecule实例化后，`bone`默认位于 `dog` 之后。

如需要将 bone 放在 dog 之前，或其它自己想要围合的位置，可以使用 molecule 定义的特殊注释：` <!-- {INNER_HTML} -->`，用法如：

```html
<div molecule-def="MyMolecule">
	<!-- {INNER_HTML} -->
	<span>dog</span>
</div>
<div molecule="MyMolecule">bone</div>
```

![molecule inject](images/molecule-inject-pos.png?raw=true)

### td 如何直接放在 table molecule 中

像 td 这样的元素，必须放在 tr 标记中。一旦放在不正确的标记包括 table 中，便无法从 innerHTML 获取。如果要达到 <table molecule><td/></table> 这样的效果， 而不是 <table molecule><tr><td/></tr></table>，需要做两步操作。

0. 在 table molecule-def 处，可加上属性 escape-tag="td"
0. 在实例 table molecule 中，td前加上 `m:`

这样在展开时，m:td 将自动展开为 td。

可参见 `molecule-test/` 中的示例。

### molecule 手工初始化

molecule 实例可以声明为 `molecule-init="manual"`，这样这个 molecule不会自动创建。手动创建 molecule 可以调用
	
	Molecule.init(ele, true)
	
或

	$ele.molecule()
 
jQuery 函数 molecule()如已实例 molecule 则返回 molecule 对象，还未实例化时则实例化 molecule并返回实例化后的 molecule对象。

### molecule析构函数

molecule 构造函数中，可以定义析构函数：

	this.dispose = function(){
	...
	}
	
molecule 的析构过程由 Document 的 `DOMNodeRemoved` 事件引发，也即，节点从 Document 移除时，其关联的 molecule 即移除。

但有时并不希望发生 DOMNodeRemoved 时移除 molecule，例如，节点可能只是暂时不属于 Document，但是后面仍将添加回 Document，或移动节点到新的父节点，这时可以指定该实例的 html 属性 `molecule-auto-dispose` 为 false。

	<div molecule="AmazingMolecule" molecule-auto-dispose="false"></div>
	
当需要移除不属于 DOM Document 的 molecule html 元素时，可将 `molecule-auto-dispose` 设为 true, 再手工引发 DOMNodeRemoved 事件。

```js
	$ele.attr('molecule-auto-dispose', true);
	$ele.trigger('DOMNodeRemoved')
```
