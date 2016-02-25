# d2js, jssp 及 molecule 框架

## 指南

里面内容很丰富，点进去点进去点进去

* [d2js](WebContent/guide/d2js.md)
* [jssp](WebContent/guide/jssp.md)
* [molecule](WebContent/guide/molecule.md)

指南中的例子需按上述研究与参与开发的过程初始化环境后使用。

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
0. 在 `WebContent/META-INF/context.xml`中修改数据库连接。

启动网站后，打开 [http://localhost:8080/d2js/](http://localhost:8080/d2js/) 即可看到功能展示页面。

### 在新项目中使用 d2js 技术

0. 确保上述 jdk, 数据库, web 服务器环境正常
0. 导入 [d2js.war](./org.siphon.d2js.war?raw=true)
0. 在 `WebContent/META-INF/context.xml`中修改数据库连接。
0. 修改 `WebContent/jslib/jssp/website.js`，设置网站路径
0. 修改 `WebContent/jslib/molecule.js`，将 `Molecule.ModulesPath` 中的网站名称修改为你的项目名称，或自己用其它方式在其它地方设置`Molecule.ModulesPath`

### 在现有 web 项目中使用 d2js 技术

本框架可以和大部分 java web 框架并存。

0. 将[d2js.war](./org.siphon.d2js.war?raw=true)下载后解压
0. 把 jslib 和 WEB-INF/jslib, WEB-INF/lib 复制到你的项目中
0. 打开 WEB-INF/web.xml，将 jssp 和 d2js 的 servlet 配置复制到你的 web.xml 中
0. 仿照 META-INF/context.xml，设置好数据库路径 


