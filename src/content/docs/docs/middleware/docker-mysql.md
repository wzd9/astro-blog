---
title: 'docker 安装 Mysql 8.0.11'
description: '使用 Docker 安装 MySQL 8.0.11，配置端口映射、root 密码与数据持久化。'
---

## 1、下载镜像

```shell
docker pull mysql:8.0.11
```

## 2、创建挂载目录

 使用 -p 创建多级目录，即 /home目录下创建 mysql 目录， mysql 目录下又创建 log 、data 、conf 三个目录

```shell
mkdir -p /home/mountDirectory/mysql-8.0.1/logs
mkdir -p /home/mountDirectory/mysql-8.0.1/data
mkdir -p /home/mountDirectory/mysql-8.0.1/conf
```

## 3、创建my.cnf 配置文件

 MySQL默认配置文件 /etc/my.cnf 末尾中有这么一行：!includedir /etc/mysql/conf.d/ ，意思是，在 /etc/mysql/conf.d/ 目录下新建自定义的配置文件 my.cnf也会被读取到，而且还是优先读取的（Docker Hub中的MySQL教程文档）,进入 /etc目录下创建。

```shell
touch my.cnf
```

将一下内容写入到 my.cnf 配置文件中

```shell
[mysqld]
init-connect="SET collation_connection=utf8mb4_0900_ai_ci"
init_connect="SET NAMES utf8mb4"
skip-character-set-client-handshake
default_authentication_plugin=mysql_native_password
sql_mode=STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
#mysql不区分表名大小写
lower_case_table_names=1
```

## 4、创建容器

将配置选项作为标志传递给mysqld，MYSQL\_ROOT\_PASSWORD 指定密码

```shell
docker run --name mysql8 \
-v /home/mountDirectory/mysql-8.0.11/logs:/var/log/mysql \
-v /home/mountDirectory/mysql-8.0.11/data:/var/lib/mysql \
-v /home/mountDirectory/mysql-8.0.11/conf:/etc/mysql/conf.d \
-p 3305:3306 \
-e MYSQL_ROOT_PASSWORD=123456 \
--restart=always \
-d mysql:8.0.11 \
--init-connect="SET collation_connection=utf8mb4_0900_ai_ci" \
--init-connect="SET NAMES utf8mb4" \
--skip-character-set-client-handshake
```

## 5、使用 DataGrip 连接

连接 url 如下

````mysql
jdbc:mysql://ip地址:端口号/mysql?useSSL=no&allowPublicKeyRetrieval=true
````
