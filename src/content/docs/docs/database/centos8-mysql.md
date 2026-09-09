---
title: 'centos8 安装 mysql'
description: '在 aarch64 架构的 CentOS 8 上通过 rpm-bundle 安装 MySQL 8.0.31 的完整步骤。'
---

## 一、环境准备

 本文主要介绍如何在centos8安装mysql。前期准备如下：

| 组件 | 版本 | 备注 |
| --- | --- | --- |
| centos | entOS Linux release 8.4.2105 | aarch64 |
| mysql | mysql-8.0.31-1.el8.aarch64.rpm-bundle.tar | 选择对应架构的版本 |

 查看系统架构：

```shell
[root@centos8 mysql]# uname -m
aarch64
[root@centos8 mysql]# 
```

## 二、获取 MySQL 8.0.31

 到mysql[官网](https://downloads.mysql.com/archives/community/)下载对应 的版本，或者使用下面命令直接下载。

```shell
wget https://downloads.mysql.com/archives/get/p/23/file/mysql-8.0.31-1.el8.aarch64.rpm-bundle.tar
```

 下载完成后使用命令解压到指定目录(可以自行更换指定目录)：

```shell
[root@centos8 mysql]# tar -xvf mysql-8.0.31-1.el8.aarch64.rpm-bundle.tar -C /opt/mysql

[root@centos8 mysql]# ll
总用量 1695176
-rw-r--r--. 1 root root  867921920 9月  14 2022 mysql-8.0.31-1.el8.aarch64.rpm-bundle.tar
-rw-r--r--. 1 7155 31415  16283124 9月  14 2022 mysql-community-client-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415  35260756 9月  14 2022 mysql-community-client-debuginfo-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415   2539152 9月  14 2022 mysql-community-client-plugins-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415   3108992 9月  14 2022 mysql-community-client-plugins-debuginfo-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415    664948 9月  14 2022 mysql-community-common-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415   4042028 9月  14 2022 mysql-community-debuginfo-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415  24598416 9月  14 2022 mysql-community-debugsource-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415   2255348 9月  14 2022 mysql-community-devel-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415   2221752 9月  14 2022 mysql-community-icu-data-files-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415   1526568 9月  14 2022 mysql-community-libs-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415   2943636 9月  14 2022 mysql-community-libs-debuginfo-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415  65036424 9月  14 2022 mysql-community-server-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415  24285636 9月  14 2022 mysql-community-server-debug-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415 151241280 9月  14 2022 mysql-community-server-debug-debuginfo-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415 231212008 9月  14 2022 mysql-community-server-debuginfo-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415 275123012 9月  14 2022 mysql-community-test-8.0.31-1.el8.aarch64.rpm
-rw-r--r--. 1 7155 31415  25557552 9月  14 2022 mysql-community-test-debuginfo-8.0.31-1.el8.aarch64.rpm
```

## 三、安装MySQL 8.0.31

 安装之前，需要先安装net-tools和perl，采用yum安装的方式：

```shell
yum -y install net-tools
yum install -y perl
```

 然后开始分6步安装软件：

```shell
rpm -ivh mysql-community-common-8.0.31-1.el8.aarch64.rpm      
```

```shell
rpm -ivh mysql-community-client-plugins-8.0.31-1.el8.aarch64.rpm
```

```shell
rpm -ivh mysql-community-libs-8.0.31-1.el8.aarch64.rpm 
```

```shell
rpm -ivh mysql-community-client-8.0.31-1.el8.aarch64.rpm
```

```shell
rpm -ivh mysql-community-icu-data-files-8.0.31-1.el8.aarch64.rpm 
```

```shell
rpm -ivh mysql-community-server-8.0.31-1.el8.aarch64.rpm 
```

## 四、验证

 上面的6个软件包装完后，MySQL就已经安装完成。可以做如下验证操作：

 查看软件包

```shell
[root@centos8 mysql]# rpm -qa | grep -i mysql
mysql-community-client-8.0.31-1.el8.aarch64
mysql-community-common-8.0.31-1.el8.aarch64
mysql-community-libs-8.0.31-1.el8.aarch64
mysql-community-icu-data-files-8.0.31-1.el8.aarch64
mysql-community-client-plugins-8.0.31-1.el8.aarch64
mysql-community-server-8.0.31-1.el8.aarch64
[root@centos8 mysql]# 
```

 查看安装的文件情况：

```shell
[root@centos8 mysql]# find / -name mysql
/etc/logrotate.d/mysql
/var/lib/mysql
/var/lib/mysql/mysql
/usr/bin/mysql
/usr/lib64/mysql
/opt/mysql
[root@centos8 mysql]# 
```

 查看安装的软件版本

```shell
[root@centos8 mysql]# mysql -V
mysql  Ver 8.0.31 for Linux on aarch64 (MySQL Community Server - GPL)
[root@centos8 mysql]# 
```

 最后就是启动服务，并将服务写入开机自启中，并查看服务状态：

```shell
[root@centos8 mysql]# systemctl enable mysqld && systemctl start mysqld && systemctl status mysqld
● mysqld.service - MySQL Server
   Loaded: loaded (/usr/lib/systemd/system/mysqld.service; enabled; vendor preset: disabled)
   Active: active (running) since Tue 2025-05-13 21:18:02 CST; 23min ago
     Docs: man:mysqld(8)
           http://dev.mysql.com/doc/refman/en/using-systemd.html
 Main PID: 12913 (mysqld)
   Status: "Server is operational"
    Tasks: 40 (limit: 14674)
   Memory: 405.5M
   CGroup: /system.slice/mysqld.service
           └─12913 /usr/sbin/mysqld

5月 13 21:17:58 centos8 systemd[1]: Starting MySQL Server...
5月 13 21:18:02 centos8 systemd[1]: Started MySQL Server.
[root@centos8 mysql]# 
```

## 五、MySQL初始化

 MySQL安装完成后，需要做一些初始化操作，比方说更改默认密码等：

```shell
[root@centos8 mysql]# grep "temporary password" /var/log/mysqld.log
2025-05-13T13:17:59.603457Z 6 [Note] [MY-010454] [Server] A temporary password is generated for root@localhost: aMsukaita1_5
```

 通过临时密码登录MySQL命令行:

```shell
[root@centos8 mysql]# mysql -u root -p
Enter password: 
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 21
Server version: 8.0.31 MySQL Community Server - GPL

Copyright (c) 2000, 2022, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> 
```

 更改root账号的密码：

```shell
alter user root@localhost identified by 'qszxD@123';
Query OK, 0 rows affected (0.00 sec)
```

**注意：需要设置一个复杂的密码，简单密码会报错**

 至此，mysql已经启动完成。如果需要外网连接mysql，需要开通3306端口，并将root账户从本地连接设置为所有人可以连接或者指定ip连接。

```shell
firewall-cmd --zone=public --add-port=3306/tcp --permanent
firewall-cmd --reload
```

```shell
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'qszxD@123';
CREATE USER 'root'@'%' IDENTIFIED BY 'qszxD@123';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

* * *

**注意：如果之前安装过mysql,请卸载干净后再进行安装。**

文章参照 [https://www.modb.pro/db/632370](https://www.modb.pro/db/632370) 所写，特此感谢作者分享。如果有讲解的不清楚的可以参照此文。
