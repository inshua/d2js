# d2js, jssp 及 molecule 框架

## d2js 
## [Quick Start](WebContent/guide/d2js.md)
### 后端为 SSH 框架杀手，前端为 angular 杀手

* d2js 框架提出了独有的数据路径、渲染、收集概念，适合各类 js 对象与 html ui 之间交互
* d2js 框架借鉴 ado.net 的 dataset-DataTable-DataRow 体系，可以轻松完成批量数据更新、主从表连带更新等特性，
* 除 dataset-DataTable-DataRow 体系外，也提供便利的 orm 形式
* d2js 框架后端使用 js 语言编写，结合 sql 块设计，可以大大提高开发效率
* d2js 前后端开发实践都是热插拔式开发，不写配置文件，不写 java 代码
* d2js 框架允许网页设计与开发分离，先设计再开发
* d2js 切割分明，依托于 html 技术，可以和其它 ui 框架如 bootstrap, semantic-ui 等，及 molecule 一同使用

d2js 框架学习成本低，可以利用可视化SQL设计器，一般1天就可以上手。

```

## jssp 
## [Quick Start](WebContent/guide/jssp.md) 
### 大致可以取代 php

尽管 `d2js 前端(html + ajax) + d2js 后端` 可以满足大部分应用场景，还是有很多场景需要页面在服务器端就绪后输出，不宜使用纯 ajax 技术。

jssp 是 JavaScript Server Page 的简称，是建构于 d2js 后端技术上的一种服务器端页面技术，运行于 jdk1.8以上 + servlet3.0 容器，采用 js 作为服务器端编程语言，并可以使用所有 d2js 后端技术，如 `query, queryRow, travel, doTransaction`等便利快捷的 d2js 函数。

------

上面的题目粗看有点哗众取宠，一旦实际使用会发现，去事实不远。需要澄清的是，这几个框架并不是为了扮演对应的那些框架的颠覆者而搞出来的。

d2js 原型早在 2007 年即已实现并实用了多年，当时原理是前端的 ado.net，后端的 ado dataadapter，已经包括了 render-collect等机制（区别于灵敏绑定），后台使用 DSL->Java 带有契约式编程风格，当时取代的是 struts2 框架，限于为原公司成果，此处不多介绍。

d2js jssp 及 molecule 框架之间具有可分可合既互相扶持又能独立作战的生态，并不是为了与市面上的各个框架竞争而发明的，也没有受过它们任何思想启发。

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

### 使用 ANT 脚本创建使用 d2js 框架的新项目
0. 按前面步骤下载本项目后，在项目根目录下找到 `build.xml`
0. 运行该 ant 脚本的 `crate-d2js-project` 任务
0. 在弹出的提示框依次输入项目名称、workspace 路径、数据库连接等信息，项目即创建成功
0. 使用 eclipse 的导入现存项目功能导入 eclipse

该 ant 脚本可根据提供的信息自动创建项目，以后也可以改变项目名称或其它设定：

0. 在 `WebContent/WEB-INF/config/database.js`中修改数据库连接。
0. 修改 `WebContent/jslib/molecule.js`，将 `Molecule.ModulesPath` 中的网站名称修改为你的项目名称，或自己用其它方式在其它地方设置`Molecule.ModulesPath`
0. 该站其它自定义特性可在 `application.d2js.js`, `application.jssp.js` 中单独编写（如 productName 等）

### 在现有 web 项目中使用 d2js 技术

本框架可以和大部分 java web 框架并存。

0. 获取 d2js 代码
0. 把 `WebContent/jslib` 和 `WebContent/WEB-INF/jslib`, `WebContent/WEB-INF/lib` 复制到你的项目中
0. 打开 `WEB-INF/web.xml`，增加 `<web-fragment>d2js-fragment</web-fragment>`
0. 仿照`WebContent/WEB-INF/config/database.js`，设置好数据库路径 

d2js 和你的 java 项目使用的是同一个容器，可以顺利访问容器提供的 session，也支持从 springmvc、mybatis 等框架获取 DataSource。

### 更新 d2js 代码

当 d2js 框架本身提交了新改动后，如何更新使用了 d2js 框架的工程呢？

项目的 `build.xml` 中有一个名为 `update-d2js` 的任务，通常只需运行该任务，d2js 相关的源文件即会自动更新到最新版本。

### 重要资源

0. UAC 实体权限框架。采用 d2js 技术编写的权限框架。已应用于多个商业项目。https://github.com/inshua/uac
0. [d2js + activiti 备忘 - Inshua - 博客园](https://www.cnblogs.com/inshua/p/12036343.html)
0. [在 d2js 使用多种数据源如spring数据源 - Inshua - 博客园](https://www.cnblogs.com/inshua/p/8488643.html)
0. [d2js 中实现 memcached 共享 session 的过程 - Inshua - 博客园](https://www.cnblogs.com/inshua/p/8135192.html)


