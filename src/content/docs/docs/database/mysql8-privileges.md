---
title: 'mysql8 配置用户权限'
description: 'MySQL 8 创建用户、授权、刷新权限与配置远程访问的常用语句。'
---

由于我的 mysql8 是由 docker 启动，先通过 docker 命令进入mysql 容器，再使用 mysql 命令登录 mysql。

```shell
docker exec -it mysql8[容器名称] bash
bash-4.4# mysql -u root -p
Enter password: 
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 8
Server version: 8.0.36 MySQL Community Server - GPL

Copyright (c) 2000, 2024, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.
#切换数据库实例
mysql> use mysql;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
```

## 2、用户操作

### 2.1、查看用户

```plaintext
select host, user, authentication_string , plugin from user;
```

### 2.2、创建本地用户

```plaintext
# 创建一个用户名为admin，密码为 admin123456 的本地用户。
create user 'admin'@'localhost' identified by 'admin123456';
# 使admin用户获得所有权限
grant all privileges on *.* to 'admin'@'localhost';
# 刷新授权才会生效
flush privileges;

# wzd_mianxi数据库创建用户wzd,并赋予权限
create user 'wzd'@'%' identified by '123456';
# 注意，数据库名不能设计成wzd-mianxi，否则授权会报错
grant all privileges on wzd_mianxi.* to 'wzd'@'%';
flush privileges;
```

### 2.3、创建外网可访问的用户

```plaintext
# 创建一个用户名为admin，密码为 admin123456 的本地用户
create user 'admin'@'%' identified by 'admin123456';
# 使admin用户获得所有权限
grant all privileges on *.* to 'admin'@'%';
# 刷新授权才会生效
flush privileges;
```

### 2.4、修改用户

```plaintext
# 查询用户信息
select * from user Where User='admin' and Host='localhost';
# 方式一：将用户名 admin 更新为 admin_newm
rename user 'admin'@'localhost' to 'admin_new'@'localhost';
# 方式二：将用户名 admin 更新为 admin_newm
update user set User='admin_new' where User='admin' and Host='localhost';
# 刷新授权才会生效
flush privileges;
```

### 2.5、删除用户

```plaintext
# 方式一：删除指定用户
drop user 'admin'@'localhost';
# 方式二：删除指定用户
delete from user Where User='admin' and Host='localhost';
# 刷新授权才会生效
flush privileges;
```

## 3、操作用户权限

#### 3.1、查看用户权限

```plaintext
show grants for 'admin'@'localhost'; 
```

### 3.2、修改用户权限

```plaintext
# 使admin用户获得所有权限。
grant all privileges on *.* to 'admin'@'localhost';
# 使admin用户获得所有数据库中所有表的(*.*)select、insert、update、delete权限
grant select,insert,update,delete on *.* to 'admin'@'localhost';
# 如果只想让该用户访问某一个数据库写成：testdb.* 即可
grant all privileges on testdb.* to 'admin'@'localhost';
# 刷新授权才会生效
flush privileges;
```

### 3.3、删除用户权限

```plaintext
# 删除amdin用户在本地访问mysql时的所有权限
revoke all privileges on *.* from 'admin'@'localhost';
# 删除amdin用户在本地访问mysql时的insert和update权限
revoke insert,update on testdb.* from 'admin'@'localhost';
# 刷新授权才会生效
flush privileges;
```

## 4、修改密码
