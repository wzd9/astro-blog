---
title: 'docker 安装 nacos v1.4.7'
description: '使用 Docker 安装并启动 Nacos v1.4.7 的配置步骤与验证方法。'
---

## 1、下载镜像

```shell
docker pull nacos/nacos-server:v1.4.7
```

## 2、创建容器网络

```shell
docker network create nacos_network
```

## 3、启动容器

```shell
docker run --name nacos -d \
-p 8848:8848 \
--network nacos_network \
-e MODE=standalone \
nacos/nacos-server
```

 这个命令会启动一个名为 nacos 的容器，并将其绑定到物理机的 8848 端口。同时，它还会将容器添加到之前创建的 nacos\_network 容器网络中，并设置容器模式为 standalone（单机）。

```shell
docker run --name nacos2.2.0 -d \
-p 8848:8848 \
-p 9848:9848 \
--network nacos_network \
-e MODE=standalone \
nacos/nacos-server:v2.2.0
```

**环境：Nacos版本 2.2.0，docker镜像，centos8  
问题描述：页面访问正常，curl -X POST正常，但是使用Java SDK集成发布失败  
原因定位：跟踪源码，异常描述： Client not connected,current status:STARTING，客户端gRPC无法和服务端创建链接，在Nacos2.X版本中，增加了gRPC通信端口，需要由docker一并映射出来，否则就会出现无法初始化连接。  
解决方案：在docker容器中映射9848端口**

## 4、访问 Nacos Web 控制台

启动完 Nacos 容器后，就可以通过 http://虚拟机IP:8848/nacos 访问 Nacos Web 控制台了。在控制台上，可以进行服务注册、配置管理和服务发现等操作

## 5、配置 Nacos 数据库存储

 默认情况下，Nacos 使用内置的 Derby 数据库进行数据存储。虽然 Derby 是一个轻量级的数据库，但当数据量较大时，它可能会导致性能瓶颈和数据丢失的问题。因此，建议将 Nacos 数据库存储改为 MySQL 或 PostgreSQL 等外部数据库。

### 步骤 1：安装 MySQL 数据库

 首先，需要在本地机器或其他服务器上安装 MySQL 数据库，请参照[https://gitee.com/wangzhidao/document-warehouse/tree/master/文档/docker](https://gitee.com/wangzhidao/document-warehouse/tree/master/%E6%96%87%E6%A1%A3/docker)。

### 步骤 2：创建 Nacos 数据库和用户

 安装完成 MySQL 后，启动mysql，容器需要创建一个新的数据库和用户，并授予其访问权限。可以使用以下命令创建一个名为 nacos 的数据库和用户：

```shell
docker exec -it [容器ID] /bin/bash
```

```plaintext
mysql -u root -p
CREATE DATABASE nacos DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nacos'@'%' IDENTIFIED BY '123456';
GRANT ALL PRIVILEGES ON nacos.* TO 'nacos'@'%';
FLUSH PRIVILEGES;
EXIT;
EXIT;
```

 这样，就创建了一个名为 nacos 的数据库和一个名为 nacos 的用户，并赋予它们访问权限。

### 步骤 3：修改 Nacos 配置文件

 在启动 Nacos 容器之前，需要修改配置文件以将 Nacos 数据库存储改为 MySQL。

首先，需要找到容器内部的 nacos 目录，可以使用以下命令进入容器内部：

```shell
docker exec -it nacos /bin/bash
cd /home/nacos/conf
```

在 conf 目录下，可以找到 application.properties 文件。将该文件拷贝到本地机器上，并使用文本编辑器打开该文件。

 1 、从容器拷贝文件到宿主机

 docker cp 容器名：容器中要拷贝的文件名及其路径 要拷贝到宿主机里面对应的路径

```shell
docker cp nacos:/home/nacos/conf/application.properties /home/wzd/
```

 2、从宿主机拷贝文件到容器

 docker cp 宿主机中要拷贝的文件名及其路径 容器名：要拷贝到容器里面对应的路径

```shell
docker cp /home/wzd/application.properties nacos:/home/nacos/conf/application.properties 
```

修改 application.properties,内容如下

```properties
# spring
server.servlet.contextPath=${SERVER_SERVLET_CONTEXTPATH:/nacos}
server.contextPath=/nacos
server.error.include-message=ALWAYS
server.port=8848
spring.datasource.platform=mysql
nacos.cmdb.dumpTaskInterval=3600
nacos.cmdb.eventTaskInterval=10
nacos.cmdb.labelTaskInterval=300
nacos.cmdb.loadDataAtStart=false
db.num=1
db.url.0=jdbc:mysql://192.168.130.128:3305/nacos?characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useSSL=false&allowPublicKeyRetrieval=true
db.user=nacos
db.password=123456
### The auth system to use, currently only 'nacos' is supported:
nacos.core.auth.system.type=nacos

### The token expiration in seconds:
nacos.core.auth.default.token.expire.seconds=18000

### The default token:
# 注意：nacos v1.4.7是开启鉴权的，所以需要在application.properties中的配置信息。
# 在application.properties找到nacos.core.auth.default.token.secret.key，
# 默认情况下nacos.core.auth.default.token.secret.key是没有值得，所以导致启动nacos后报上面的错，
# 根据官网说的，需要在启动nacos前给nacos.core.auth.default.token.secret.key填个256bit的token值，
# 也可以复制官网上给的默认token值，SecretKey012345678901234567890123456789012345678901234567890123456789，这样问题就解决了。
nacos.core.auth.default.token.secret.key=SecretKey012345678901234567890123456789012345678901234567890123456789

### Turn on/off caching of auth information. By turning on this switch, the update of auth information would have a 15 seconds delay.
nacos.core.auth.caching.enabled=false
nacos.core.auth.enable.userAgentAuthWhite=false
nacos.core.auth.server.identity.key=
nacos.core.auth.server.identity.value=
server.tomcat.accesslog.enabled=false
server.tomcat.accesslog.pattern=%h %l %u %t "%r" %s %b %D
# default current work dir
server.tomcat.basedir=file:.
## spring security config
### turn off security
nacos.security.ignore.urls=/,/error,/**/*.css,/**/*.js,/**/*.html,/**/*.map,/**/*.svg,/**/*.png,/**/*.ico,/console-fe/public/**,/v1/auth/**,/v1/console/health/**,/actuator/**,/v1/console/server/**
# metrics for elastic search
management.metrics.export.elastic.enabled=false
management.metrics.export.influx.enabled=false

nacos.naming.distro.taskDispatchThreadCount=10
nacos.naming.distro.taskDispatchPeriod=200
nacos.naming.distro.batchSyncKeyCount=1000
nacos.naming.distro.initDataRatio=0.9
nacos.naming.distro.syncRetryDelay=5000
nacos.naming.data.warmup=true
```

### 步骤 4：重新启动 Nacos 容器

修改完配置文件后，需要重新启动 Nacos 容器。可以使用以下命令停止并删除之前的容器：

```shell
docker stop nacos && docker rm nacos
```

重新启动容器

```shell
docker run --name nacos -d \
-p 8848:8848 \
--network nacos_network \
-e MODE=standalone \
-e SPRING_DATASOURCE_PLATFORM=mysql \
-e MYSQL_SERVICE_HOST=192.168.130.128 \
-e MYSQL_SERVICE_DB_NAME=nacos \
-e MYSQL_SERVICE_USER=nacos \
-e MYSQL_SERVICE_PASSWORD=nacos \
nacos/nacos-server:v1.4.7
```

访问 [http://192.168.130.128:8848/nacos](http://192.168.130.128:8848/nacos)，账号密码分别为nacos和nacos,即可登录

## 注意：在第二次启动nacos时，一直提示数据库连接不上，经过测试，数据库连接是通的，本地数据库连接工具也能正常连接，此时，这里需要注意的是如果你直接修改了示例文件中的配置文件，需要将# 号后面的 空格去掉，否则就回阴沟里帆船了。
