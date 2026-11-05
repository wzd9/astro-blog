---
title: 'maven 私服安装和使用'
description: '使用 Nexus 搭建 Maven 私服的安装、配置，以及依赖上传与项目使用方法。'
---

## 1、官网下载

[下载地址](https://www.sonatype.com/products/repository-oss-downloadNexus)

本文主要是 Mac 安装，本文写于2024-05-07，下载的版本为 nexus-3.67.1-01-mac.tgz

**注意：nexus3 的 环境必须为 jdk8**

## 2、解压

将文件复制到 /Users/xx/environment/nexus,存放的目录可以按照自己的喜好来。对文件进行解压。

```shell
tar -zxvf nexus-3.67.1-01-mac.tgz
```

## 3、启动 nexus

### 3.1、修改配置文件

```shell
cd /Users/xx/environment/nexus/nexus-3.67.1-01/etc 
# vim nexus-default.properties
##
# Jetty section
application-port=8081
application-host=0.0.0.0
nexus-args=${jetty.etc}/jetty.xml,${jetty.etc}/jetty-http.xml,${jetty.etc}/jetty-requestlog.xml
nexus-context-path=/

# Nexus section
nexus-edition=nexus-pro-edition
nexus-features=\
 nexus-pro-feature

nexus.hazelcast.discovery.isEnabled=true
```

当前默认的的启动端口为8081，如果被占用，就换一个端口。nexus-context-path=/ 为启动路径，后面可以按照自己的喜好进行拼接，

如果拼接了参数，nexus 启动成功后，打开的网页路径后面也需要拼接上拼接的参数。

### 3.2、启动

进入 bin 目录，执行 启动命令

```shell
./nexus run
```

**注意：有些文档用的 nexus start 命令进行启动，本人试过，弹出 Starting nexus,但是实际上并没有启动。**

### 3.3、访问地址

访问 [http://localhost:8081/](http://localhost:8081/) 进入首页，登陆账户为 admini, 以前 admin 的初始密码为 admin123，后来密码改为写在 sonatype-work/nexus3/admin.password 文件中。使用 vim 命令查看。登陆后记得修改密码。
