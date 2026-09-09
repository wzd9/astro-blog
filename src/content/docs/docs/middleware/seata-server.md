---
title: 'centos8 搭建 seata-server 平台'
description: '在 CentOS 8 环境下基于 Nacos 2.2.1 和 MySQL 8 搭建 Seata Server 1.6.1 分布式事务服务端的完整配置。'
---

## 一、环境准备

 本文主要介绍如何搭建seata-server管理平台。前期准备如下：

| 组件 | 版本 | 备注 |
| --- | --- | --- |
| centos | CentOS Linux release 8.4.2105 | 请自行搜索安装 |
| nacos | 2.2.1 | 请自行搜索安装 |
| mysql | 8.0.37 | 请自行搜索安装 |
| openjdk | 1.8.0\_312-b07 | 请自行搜索安装 |
| seata-server | 1.6.1 |  |

seata-server1.6.1 [下载地址](https://github.com/apache/incubator-seata/releases/tag/v1.6.1)

## 二、文件配置

 将下载的压缩包使用工具上传并解压。解压命令：

```shell
tar -zxvf seata-server-1.6.1.tar.gz
```

 解压后，进入文件目录的 conf 文件夹，需要进行相应的配置。先将 application.yml 进行备份

```shell
cp application.yml application_bk.yml
```

 修改 application.yml 的配置：

```shell
vim application.yml
```

 配置文件内容如下：

```yml
#  Copyright 1999-2019 Seata.io Group.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
# 端口
server:
  port: 7091
# 应用名称
spring:
  application:
    name: seata-server
# 日志目录
logging:
  config: classpath:logback-spring.xml
  file:
    path: ${user.home}/logs/seata
  extend:
    logstash-appender:
      destination: 127.0.0.1:4560
    kafka-appender:
      bootstrap-servers: 127.0.0.1:9092
      topic: logback_to_logstash
# 控制台账号密码
console:
  user:
    username: seata
    password: seata
# 核心配置
seata:
  # 配置中心
  config:
    # support: nacos, consul, apollo, zk, etcd3
    type: file
  # 注册中心
  registry:
    # support: nacos, eureka, redis, zk, consul, etcd3, sofa
    type: file
  # 存储方式
  store:
    # support: file 、 db 、 redis
    mode: file
#  server:
#    service-port: 8091 #If not configured, the default is '${server.port} + 1000'
# 控制台配置[不能少，少了报错]
  security:
    secretKey: SeataSecretKey0c382ef121d778043159209298fd40bf3850a017
    tokenValidityInMilliseconds: 1800000
    ignore:
      urls: /,/**/*.css,/**/*.js,/**/*.html,/**/*.map,/**/*.svg,/**/*.png,/**/*.ico,/console-fe/public/**,/api/v1/auth/login
```

修改后：**注意 ：server-addr，namespace，username， password，url ， user， password都需要自行修改**

```yml
#  Copyright 1999-2019 Seata.io Group.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
# 端口
server:
  port: 7091
# 应用名称
spring:
  application:
    name: seata-server
# 日志目录
logging:
  config: classpath:logback-spring.xml
  file:
    path: ${user.home}/logs/seata
  extend:
    logstash-appender:
      destination: 127.0.0.1:4560
    kafka-appender:
      bootstrap-servers: 127.0.0.1:9092
      topic: logback_to_logstash
# 控制台账号密码
console:
  user:
    username: seata
    password: seata
# 核心配置
seata:
  config:
    # support: nacos, consul, apollo, zk, etcd3
    type: nacos
    nacos:
      server-addr: 172.148.2.18:8848   # nacos的访问地址
      namespace: 6a5305df-a5cf-4ebd-8250-2446506dbfcd
      group: SEATA_GROUP  # nacos的分组
      username: nacos     # nacos的用户名
      password: nacos     # nacos的密码
      context-path:
      ##if use MSE Nacos with auth, mutex with username/password attribute
      #access-key:
      #secret-key:
      data-id: seata.properties  # nacos中的配置文件名称
  registry:
    # support: nacos, eureka, redis, zk, consul, etcd3, sofa
    type: nacos
    nacos:
      application: seata-server       # seata启动后在nacos的服务名
      server-addr: 172.148.2.18:8848  # nacos的访问地址
      group: SEATA_GROUP   # nacos的分组
      namespace: 6a5305df-a5cf-4ebd-8250-2446506dbfcd
      cluster: default     # 这个参数在每个微服务seata时会用到
      username: nacos      # nacos的用户名
      password: nacos      # nacos的密码
      context-path:
  store:
    # support: file 、 db 、 redis
    mode: db
    db:
      datasource: druid
      db-type: mysql
      driver-class-name: com.mysql.jdbc.Driver
      url: jdbc:mysql://172.148.2.18:3306/seata?characterEncoding=utf8&connectTimeout=10000&socketTimeout=30000&autoReconnect=true&useUnicode=true&useSSL=false
      user: root
      password: 123456
      min-conn: 10                # db 模式数据库初始连接数
      max-conn: 100               # db 模式数据库最大连接数
      global-table: global_table  # db 模式全局事务表名
      branch-table: branch_table  # db 模式分支事务表名
      lock-table: lock_table      # db 模式全局锁表名
      distributed-lock-table: distributed_lock  # db 模式 Sever 端事务管理全局锁存储表名
      query-limit: 1000    # db 模式查询全局事务一次的最大条数，默认100
      max-wait: 5000   # db 模式获取连接时最大等待时间，默认5000
#  server:
#    service-port: 8091 #If not configured, the default is '${server.port} + 1000'
  security:
    secretKey: SeataSecretKey0c382ef121d778043159209298fd40bf3850a017
    tokenValidityInMilliseconds: 1800000
    ignore:
      urls: /,/**/*.css,/**/*.js,/**/*.html,/**/*.map,/**/*.svg,/**/*.png,/**/*.ico,/console-fe/public/**,/api/v1/auth/login
```

 配置文件修改后，需要导入sql脚本，sql脚本下载地址如下：[https://gitee.com/seata-io/seata/blob/v1.6.1/script/server/db/mysql.sql](https://gitee.com/seata-io/seata/blob/v1.6.1/script/server/db/mysql.sql)。

## 三、启动

 由于配置中心和注册中心使用nacos，先启动nacos服务，然后在nacos中添加一个新的命名空间,配置文件中的namespace就是指定命名空间的id。点击创建配置，在创建页面，DATA\_ID使用配置文件的data-id，Group使用配置文件的group。配置内容如下：

```properties
store.mode=db
store.db.datasource=druid
store.db.dbType=mysql
store.db.driverClassName=com.mysql.cj.jdbc.Driver
store.db.url=jdbc:mysql://172.148.2.18:3305/seata?useUnicode=true
store.db.user=root
store.db.password=123456
store.db.minConn=5
store.db.maxConn=30
store.db.globalTable=global_table
store.db.branchTable=branch_table
store.db.queryLimit=100
store.db.lockTable=lock_table
store.db.maxWait=5000
```

 进入 seata-server的bin目录，执行启动命令：

```shell
./seata-server.sh -p 8091 -h 172.148.2.18 -m db
```

-   \-p 8091 : 指定 Seata Server 的服务端口（即 TC 的 RPC 通信端口，默认也是 8091）。TM / RM 通过这个端口和 Seata 通信。
-   \-h 172.148.2.18: 指定 Seata Server 注册到注册中心时的 IP 地址，客户端就是通过这个 IP 找到 TC 的。默认是读取本地 IP，这里是显式指定为服务器的实际 IP。
-   \-m db: 指定事务日志（如全局事务、分支事务）存储模式为数据库（db 模式），也可以为 file、redis、nacos 等，但最常用的是 db。

 启动命令如下：

```java
/usr/lib/jvm/java-1.8.0-openjdk/bin/java  -server -Dloader.path=/opt/seata/seata-1.6.1/lib -Xmx2048m -Xms2048m -Xmn1024m -Xss512k -XX:SurvivorRatio=10 -XX:MetaspaceSize=128m -XX:MaxMetaspaceSize=256m -XX:MaxDirectMemorySize=1024m -XX:-OmitStackTraceInFastThrow -XX:-UseAdaptiveSizePolicy -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/opt/seata/seata-1.6.1/logs/java_heapdump.hprof -XX:+DisableExplicitGC -Xloggc:/opt/seata/seata-1.6.1/logs/seata_gc.log -verbose:gc -XX:+PrintGCDetails  -XX:+PrintGCDateStamps -XX:+PrintGCTimeStamps -XX:+UseGCLogFileRotation -XX:NumberOfGCLogFiles=10 -XX:GCLogFileSize=100M -XX:+UseG1GC -Dio.netty.leakDetectionLevel=advanced -Dapp.name=seata-server -Dapp.pid=73553 -Dapp.home=/opt/seata/seata-1.6.1 -Dbasedir=/opt/seata/seata-1.6.1 -Dspring.config.location=/opt/seata/seata-1.6.1/conf/application.yml -Dlogging.config=/opt/seata/seata-1.6.1/conf/logback-spring.xml -jar /opt/seata/seata-1.6.1/target/seata-server.jar 
███████╗███████╗ █████╗ ████████╗ █████╗
██╔════╝██╔════╝██╔══██╗╚══██╔══╝██╔══██╗
███████╗█████╗  ███████║   ██║   ███████║
╚════██║██╔══╝  ██╔══██║   ██║   ██╔══██║
███████║███████╗██║  ██║   ██║   ██║  ██║
╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝

08:40:46.722  INFO --- [                     main] io.seata.server.ServerApplication        : Starting ServerApplication v1.6.1 using Java 1.8.0_312 on centos8 with PID 73594 (/opt/seata/seata-1.6.1/target/seata-server.jar started by root in /opt/seata/seata-1.6.1/bin)
08:40:46.724  INFO --- [                     main] io.seata.server.ServerApplication        : No active profile set, falling back to 1 default profile: "default"
08:40:47.449  INFO --- [                     main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port(s): 7091 (http)
08:40:47.455  INFO --- [                     main] o.a.coyote.http11.Http11NioProtocol      : Initializing ProtocolHandler ["http-nio-0.0.0.0-7091"]
08:40:47.456  INFO --- [                     main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
08:40:47.456  INFO --- [                     main] org.apache.catalina.core.StandardEngine  : Starting Servlet engine: [Apache Tomcat/9.0.62]
08:40:47.495  INFO --- [                     main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
08:40:47.495  INFO --- [                     main] w.s.c.ServletWebServerApplicationContext : Root WebApplicationContext: initialization completed in 750 ms
08:40:47.788  INFO --- [                     main] o.s.b.a.w.s.WelcomePageHandlerMapping    : Adding welcome page: class path resource [static/index.html]
08:40:47.889  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.889  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/'] with []
08:40:47.889  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/**/*.css']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.889  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/**/*.css'] with []
08:40:47.889  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/**/*.js']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/**/*.js'] with []
08:40:47.890  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/**/*.html']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/**/*.html'] with []
08:40:47.890  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/**/*.map']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/**/*.map'] with []
08:40:47.890  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/**/*.svg']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/**/*.svg'] with []
08:40:47.890  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/**/*.png']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/**/*.png'] with []
08:40:47.890  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/**/*.ico']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/**/*.ico'] with []
08:40:47.890  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/console-fe/public/**']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/console-fe/public/**'] with []
08:40:47.890  WARN --- [                     main] o.s.s.c.a.web.builders.WebSecurity       : You are asking Spring Security to ignore Ant [pattern='/api/v1/auth/login']. This is not recommended -- please use permitAll via HttpSecurity#authorizeHttpRequests instead.
08:40:47.890  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will secure Ant [pattern='/api/v1/auth/login'] with []
08:40:47.904  INFO --- [                     main] o.s.s.web.DefaultSecurityFilterChain     : Will not secure any request
08:40:47.922  INFO --- [                     main] o.a.coyote.http11.Http11NioProtocol      : Starting ProtocolHandler ["http-nio-0.0.0.0-7091"]
08:40:47.942  INFO --- [                     main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 7091 (http) with context path ''
08:40:47.948  INFO --- [                     main] io.seata.server.ServerApplication        : Started ServerApplication in 2.067 seconds (JVM running for 2.482)
08:40:48.518  INFO --- [                     main] com.alibaba.druid.pool.DruidDataSource   : {dataSource-1} inited
08:40:48.556  INFO --- [                     main] c.a.n.client.config.impl.ClientWorker    : [fixed-192.168.2.234_8848-6a5305df-a5cf-4ebd-8250-2446506dbfcd] [subscribe] store.db.distributedLockTable+SEATA_GROUP+6a5305df-a5cf-4ebd-8250-2446506dbfcd
08:40:48.557  INFO --- [                     main] c.a.nacos.client.config.impl.CacheData   : [fixed-192.168.2.234_8848-6a5305df-a5cf-4ebd-8250-2446506dbfcd] [add-listener] ok, tenant=6a5305df-a5cf-4ebd-8250-2446506dbfcd, dataId=store.db.distributedLockTable, group=SEATA_GROUP, cnt=1
08:40:48.557  INFO --- [                     main] c.a.nacos.client.config.impl.CacheData   : [fixed-192.168.2.234_8848-6a5305df-a5cf-4ebd-8250-2446506dbfcd] [add-listener] ok, tenant=6a5305df-a5cf-4ebd-8250-2446506dbfcd, dataId=store.db.distributedLockTable, group=SEATA_GROUP, cnt=2
08:40:48.557 ERROR --- [                     main] i.s.s.s.d.l.DataBaseDistributedLocker    : The distribute lock table is not config, please create the target table and config it
08:40:48.661  INFO --- [                     main] i.s.core.rpc.netty.NettyServerBootstrap  : Server started, service listen port: 8091
08:40:48.679  INFO --- [                     main] com.alibaba.nacos.client.naming          : initializer namespace from System Property :null
08:40:48.744  INFO --- [                     main] com.alibaba.nacos.client.naming          : [BEAT] adding beat: BeatInfo{port=8091, ip='192.168.2.234', weight=1.0, serviceName='SEATA_GROUP@@seata-server', cluster='default', metadata={}, scheduled=false, period=5000, stopped=false} to beat map.
08:40:48.744  INFO --- [                     main] com.alibaba.nacos.client.naming          : [REGISTER-SERVICE] 6a5305df-a5cf-4ebd-8250-2446506dbfcd registering service SEATA_GROUP@@seata-server with instance: Instance{instanceId='null', ip='192.168.2.234', port=8091, weight=1.0, healthy=true, enabled=true, ephemeral=true, clusterName='default', serviceName='null', metadata={}}
08:40:48.752  INFO --- [                     main] io.seata.server.ServerRunner             : seata server started in 803 millSeconds
08:46:18.163  INFO --- [p-nio-0.0.0.0-7091-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
08:46:18.164  INFO --- [p-nio-0.0.0.0-7091-exec-1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet 'dispatcherServlet'
08:46:18.169  INFO --- [p-nio-0.0.0.0-7091-exec-1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 5 ms
```

 **注意：seata-server默认启动占用的内存为2G，如果配置低，需要修改 bin 目录中 seata-server.sh文件，将JVM\_XMX、JVM\_XMS、JVM\_XMN几个参数值修改为512M、256M、256M。**

```shell
JAVA_OPT="${JAVA_OPT} -server -Dloader.path=${LOADER_PATH:="$BASEDIR/lib"} -Xmx${JVM_XMX:="2048m"} -Xms${JVM_XMS:="2048m"} -Xmn${JVM_XMN:="1024m"} -Xss${JVM_XSS:="512k"} -XX:SurvivorRatio=10 -XX:MetaspaceSize=${JVM_MetaspaceSize:="128m"} -XX:MaxMetaspaceSize=${JVM_MaxMetaspaceSize:="256m"} -XX:MaxDirectMemorySize=${JVM_MaxDirectMemorySize:=1024m} -XX:-OmitStackTraceInFastThrow -XX:-UseAdaptiveSizePolicy"
```

 访问 [http://172.148.2.18:7091](http://172.148.2.18:7091/) 即可进入登录页面，使用配置文件中的用户名和密码进行登录即可。

 **注意：7091是控制台的访问端口，8091是 seata-server的服务端口。如果有防火墙，两个端口都需要打开。**
