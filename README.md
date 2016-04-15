# d2js, jssp 及 molecule 框架

## 指南

里面内容很丰富，点进去点进去点进去

### [d2js](WebContent/guide/d2js.md) 后端为 SSH 框架杀手，前端为 angular 杀手

* d2js 框架提出了独有的数据路径、渲染、收集概念，适合各类 js 对象与 html ui 之间交互
* d2js 框架借鉴 ado.net 的 dataset-DataTable-DataRow 体系，可以轻松完成批量数据更新、主从表连带更新等特性
* d2js 框架后端使用 js 语言编写，结合 sql 块设计，可以大大提高开发效率
* d2js 前后端开发实践都是热插拔式开发，不写配置文件，不写 java 代码
* d2js 框架允许网页设计与开发分离，先设计再开发
* d2js 切割分明，依托于 html 技术，可以和其它 ui 框架如 bootstrap, semantic-ui 等，及 molecule 一同使用

d2js 框架学习成本低，可以利用可视化SQL设计器，一般1天就可以上手。由于概念完整，开发中常见的主从表等等问题都可以轻松解决。

### [jssp](WebContent/guide/jssp.md) 觉得可以取代 php...

尽管 `d2js 前端(html + ajax) + d2js 后端` 可以满足大部分应用场景，还是有很多场景需要页面在服务器端就绪后输出，不宜使用纯 ajax 技术。

jssp 是 JavaScript Server Page 的简称，是建构于 d2js 后端技术上的一种服务器端页面技术，运行于 jdk1.8以上 + servlet3.0 容器，采用 js 作为服务器端编程语言，并可以使用所有 d2js 后端技术，如 `query, queryRow, travel, doTransaction`等便利快捷的 d2js 函数。

### [molecule](WebContent/guide/molecule.md) React.js 等组件化框架杀手

* molecule 组件将 js 与 html 合为一体，每个 html 块都可以形成组件
* molecule 开发过程先形成可以运行的功能，再将其组件化，符合先原型后复用的软件工程思想
* molecule 无需使用 js 生成 html，html 是 html, js 是 js，混合而不杂乱
* molecule 组件页面总是能运行的，不需要写单独的 demo 网页
* molecule 切割巧妙，可以和 jQuery 组件互通
 
molecule 框架大约 15 分钟即可入门。支持继承、复合等面向对象理念，有效确保实现更复杂的组件，例子中有树视图、下拉树等供参考。

------

上面的题目有点哗众取宠，一旦实际使用会发现，确实符合事实。需要澄清的是，这几个框架并不是为了扮演对应的那些框架的颠覆者而搞出来的。

d2js 原型早在 2007 年即已实现并实用了多年，当时原理是前端的 ado.net，后端的 ado dataadapter，已经包括了 render-collect等机制（区别于灵敏绑定），后台使用 DSL->Java 带有契约式编程风格，当时取代的是 struts2 框架，限于为原公司成果，此处不多介绍。

这3个框架之间具有可分可合既互相扶持又能独立作战的生态，并不是为了与市面上的各个框架竞争而发明的，也没有受过它们任何思想启发。

```
指南中的例子请按下述“研究与参与开发的过程”搭建环境后使用。
```

## 参考手册

按下述研究与参与开发 d2js 项目的过程初始化环境后，在项目 `jsdoc` 中有使用 jsdoc 生成的手册。

## 初始化环境

### 研究与参与开发 d2js 项目
0. 安装  [jdk8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
0. 安装 [postgres9.4](http://www.postgresql.org/) 以上版本数据库
0. 在 postgres 中建立数据库，名为`bookstore`, 从 `WebContent/bookstore/bookstore.backup` 恢复该数据库。
0. 下载解压[eclipse wtp](http://www.eclipse.org/webtools/)
0. 下载解压[tomcat7](http://tomcat.apache.org/download-70.cgi) 或以上版本
0. 在 eclipse 中导入 git 项目 [https://github.com/inshua/d2js.git](https://github.com/inshua/d2js.git)，这是一个 web 项目
0. 设置 tomcat `server.xml` 中 `connector` 的 `URIEncoding=”utf-8”`。
0. 在 `WebContent/WEB-INF/config/database.js`中修改数据库连接。

启动网站后，打开 [http://localhost:8080/d2js/](http://localhost:8080/d2js/) 即可看到功能展示页面。

### 在新项目中使用 d2js 技术

0. 确保上述 jdk, 数据库, web 服务器环境正常
0. 导入 [d2js.war](./org.siphon.d2js.war?raw=true)
0. 在 `WebContent/WEB-INF/config/database.js`中修改数据库连接。
0. 修改 `WebContent/WEB-INF/config/website.js`，设置网站路径
0. 修改 `WebContent/jslib/molecule.js`，将 `Molecule.ModulesPath` 中的网站名称修改为你的项目名称，或自己用其它方式在其它地方设置`Molecule.ModulesPath`

### 在现有 web 项目中使用 d2js 技术

本框架可以和大部分 java web 框架并存。

0. 将[d2js.war](./org.siphon.d2js.war?raw=true)下载后解压
0. 把 jslib 和 WEB-INF/jslib, WEB-INF/lib 复制到你的项目中
0. 打开 WEB-INF/web.xml，将 jssp 和 d2js 的 servlet 配置复制到你的 web.xml 中
0. 仿照`WebContent/WEB-INF/config/database.js`，设置好数据库路径 

## QA

### 我不想使用 java 容器，想在 node.js/.net/php/native app 项目中使用 d2js 前端，如何实现？

只要好好分析一番 d2js 服务器所给出的数据响应以及前端提交数据的处理，实际上很容易使用 php 或其它技术实现一个类似的后端平台。

如果你不与数据库打交道，只是欣赏渲染、收集的思路（嵌入到native app的页面需要这样），只要不调用 DataTable.load 及 DataTable.submit，d2js 可以工作的很正常。

### 我想使用 extjs 作为前端，如何实现？

请放心，你不是来砸场子的，我自己就这么干过。请见[d2js指南](WebContent/guide/d2js-2.md)， 里面提供了一个extjs的 Store类。此外，通过编程，.net 客户端也可以很好的衔接。

### 我想使用 react.js 作为前端，如何实现？

react 技术地位和 molecule 相似，但又比 molecule 差劲，建议你还是扔了它吧，不信你可以用它试试如何实现 molecule 第一个例子。

### 我想单独使用 molecule，但是molecule中好像使用了 d2js 的东西？

d2js 的 DataTable 使用数据路径的表达方式有时会显得啰嗦，使用 molecule 可以大幅简化 d2js 的开发，所以真正 d2js 项目中离不开 molecule，使用 bootstrap、semantic-ui 等更离不开 molecule 了。

但 molecule 自身是独立的，molecule 并没有使用 d2js 任何技术，除了一个 extract.jssp 页面。

extract.jssp 用途有2：

0. 直接调用该网页，可以将所有放在 molecule/ 目录的 html 中的 molecule-def 抽取，生成molecule定义的 json。所以这个过程中， extract.jssp 其实是一个小程序，在后续过程中使用的是其生成的 json。你完全可以使用它生成molecule定义json然后复制到自己的项目中
0. 在 `Molecule.loadHtml`中，从指定的  html 文件提取相应 molecule定义json。如果你喜欢 loadHtml 的方式，你可以将 extract.jssp 所做的工作改为 jsp 实现，或你正在使用的其它语言的实现方式。如果你已经实现了欢迎分享~

所以，你只要把 molecule.js 复制到项目中即可使用。

### 为什么不提供 d2js.min.js？

我认为这种 js 你在开发中会无法定位错误，无法理解到底发生了什么，请好好学习 ant 或其它打包技术，在打包时生成 min.js 吧。让打包的技术发生在打包阶段，不要干扰开发。


