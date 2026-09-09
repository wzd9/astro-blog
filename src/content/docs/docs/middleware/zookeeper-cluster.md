---
title: 'zookeeper 集群搭建'
description: 'ZooKeeper 集群的搭建步骤与配置文件说明。'
---

本文主要讲述如何在 centos8 上搭建 zookeeper 集群。centos8 基础知识自行搜索，本文不过多赘述。

## 1、准备工作

 配置 idk环境，本文为 jdk1.8，下载 SSH 连接工具，本文使用 tabby。准备 三台 服务器，也可以一台，在同时启动三个 zookeeper（伪集群）。本文用三台服务器作为案例，ip 地址分别为 173.16.4.130，173.16.4.131，173.16.4.131。

## 2、下载 zookeeper并解压

```shell
wget https://dlcdn.apache.org/zookeeper/zookeeper-3.8.4/apache-zookeeper-3.8.4-bin.tar.gz
```

## 3、解压

```shell
tar -zxvf apache-zookeeper-3.8.4-bin.tar.gzz  -c /opt/zookeeper
cd /opt/zookeeper/
mv apache-zookeeper-3.8.4-bin apache-zookeeper-3.8.4
```

## 4、zookeeper 配置（重要）

### 4.1、进入 conf 目录，新增 data 和 log 文件夹

```shell
cd /opt/zookeeper/apache-zookeeper-3.8.4/conf
mkdir data
mkdir log
ls
configuration.xsl  data log logback.xml zoo_sample.cfg
```

### 4.2、配置 zookeeper 配置文件

```shell
cp zoo_sample.cfg zoo.cfg
ls
configuration.xsl  data  logback.xml  zoo.cfg  zoo_sample.cfg
```

```shell
vim zoo.cfg
```

将文件配置成如下内容：

```shell
# The number of milliseconds of each tick
tickTime=2000
# The number of ticks that the initial 
# synchronization phase can take
initLimit=10
# The number of ticks that can pass between 
# sending a request and getting an acknowledgement
syncLimit=5
# the directory where the snapshot is stored.
# do not use /tmp for storage, /tmp here is just 
# example sakes.
dataDir=/opt/zookeeper/apache-zookeeper-3.8.4/conf/data
dataLogDir=/opt/zookeeper/apache-zookeeper-3.8.4/conf/log
# the port at which the clients will connect
clientPort=2181
# the maximum number of client connections.
# increase this if you need to handle more clients
#maxClientCnxns=60
#
# Be sure to read the maintenance section of the 
# administrator guide before turning on autopurge.
#
# https://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_maintenance
#
# The number of snapshots to retain in dataDir
#autopurge.snapRetainCount=3
# Purge task interval in hours
# Set to "0" to disable auto purge feature
#autopurge.purgeInterval=1

## Metrics Providers
#
# https://prometheus.io Metrics Exporter
#metricsProvider.className=org.apache.zookeeper.metrics.prometheus.PrometheusMetricsProvider
#metricsProvider.httpHost=0.0.0.0
#metricsProvider.httpPort=7000
#metricsProvider.exportJvmInfo=true

# 添加如下内容 server.x=A:B:C
server.1=173.16.4.130:2888:3888
server.2=173.16.4.131:2888:3888
server.3=173.16.4.132:2888:3888
```

参数介绍：

| 属性 | 注释 |
| --- | --- |
| tickTime | 在运行过程中，Leader负责与ZK集群中所有机器进行通信，例如通过一些心跳检测机制，来检测机器的存活状态。如果L发出心跳包在syncLimit之后，还没有从F那里收到响应，那么就认为这个F已经不在线了。注意：不要把这个参数设置得过大，否则可能会掩盖一些问题。 |
| initLimit | Follower在启动过程中，会从Leader同步所有最新数据，然后确定自己能够对外服务的起始状态。Leader允许 Follower 在 **initLimit** 时间内完成这个工作。通常情况下，我们不用太在意这个参数的设置。如果ZK集群的数据量确实很大了，F在启动的时候，从Leader上同步数据的时间也会相应变长，因此在这种情况下，有必要适当调大这个参数了。 |
| syncLimit | 有 5 （可配置）台机器可以同时运转。 |
| dataDir | 4.1 步骤中新增的 data 的路径。存储快照文件snapshot的目录。默认情况下，事务日志也会存储在这里。建议同时配置参数dataLogDir, 事务日志的写性能直接影响zk性能。 |
| clientPort | 客户端连接server的端口，即对外服务端口，一般设置为2181。 |
| server.1=173.16.4.130:2888:3888 | 第一台服务器 IP 地址 |
| server.2=173.16.4.131:2888:3888 | 第二台服务器 IP 地址 |
| server.3=173.16.4.132:2888:3888 | 第三台服务器 IP 地址 |
| server.x=\[hostname\]:nnnnn\[:nnnnn\] | 这里的x是一个数字，与myid文件中的id是一致的。右边可以配置两个端口，第一个端口用于F和L之间的数据同步和其它通信，第二个端口用于Leader选举过程中投票通信。 |

 **注意： 2888 是Zookeeper 集群中服务器之间通信的端口，用于数据同步。3888 是Zookeeper 选举的端口，用于集群领导者选举时的通信。Zookeeper 集群中的 2888 和 3888 端口是可以修改的。你可以在 `zoo.cfg` 配置文件中更改这些端口，只需要确保所有节点的配置文件中的端口设置保持一致，并且新的端口没有被其他应用程序占用。**

 确保每个节点（每台服务器）上的防火墙允许 Zookeeper 使用的端口（2181, 2888, 3888）。

 开放防火墙端口

```plaintext
firewall-cmd --zone=public --add-port=2181/tcp --permanent
```

 重启防火墙

```plaintext
systemctl status firewalld
```

 查看防火墙开放的端口

```plaintext
firewall-cmd --zone=public --list-ports
```

### 4.3、配置 myid 文件 （重要）

 在每台服务器上执行如下命令：

```shell
cd /opt/zookeeper/apache-zookeeper-3.8.4/conf/data
echo "1" > myid
```

 **注意， echo "1" 中的数字，这个数字和 zoo.cfg 中配置的 server.x=A:B:C 相同，根据各自的 ip 进行配置, 比如 173.16.4.130 配置的数字是1，173.16.4.131 配置的数字是2。**

## 5、启动zookeeper

```shell
#173.16.4.130
[root@centos8 conf]# cd /opt/zookeeper/apache-zookeeper-3.8.4/bin/
[root@centos8 bin]# ./zkServer.sh start /opt/zookeeper/apache-zookeeper-3.8.4/conf/zoo.cfg 
..启动内容省略...
[root@centos8 bin]# ./zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /opt/zookeeper/apache-zookeeper-3.8.4/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: follower

#173.16.4.131
[root@centos8 conf]# cd /opt/zookeeper/apache-zookeeper-3.8.4/bin/
[root@centos8 bin]# ./zkServer.sh start /opt/zookeeper/apache-zookeeper-3.8.4/conf/zoo.cfg 
..启动内容省略...
[root@centos8 bin]# ./zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /opt/zookeeper/apache-zookeeper-3.8.4/bin/../conf/zoo.cfg
Client port found: 2182. Client address: localhost. Client SSL: false.
Mode: leader

#173.16.4.132
[root@centos8 conf]# cd /opt/zookeeper/apache-zookeeper-3.8.4/bin/
[root@centos8 bin]# ./zkServer.sh start /opt/zookeeper/apache-zookeeper-3.8.4/conf/zoo.cfg 
..启动内容省略...
./zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /opt/zookeeper/apache-zookeeper-3.8.4/bin/../conf/zoo.cfg
Client port found: 2183. Client address: localhost. Client SSL: false.
Mode: follower
```

| 参数 | 注释 |
| --- | --- |
| Mode: follower | 跟随者。 |
| Mode: leader | 领导者。 |

## 6、集群角色

 Leader：领导者

 事物请求（写操作）的唯一调度者和处理者，保证集群事务处理的顺序性；集群内部各个服务器的调度者。对于 create、setData、delete 等有写操作的请求，则统一转发给 leader 处理，leader 需要决定编号、执行操作，这个过程称为事物。

 Follower： 跟随者

 处理客户端非事物（读操作）请求（可以直接响应），转发事物请求给 Leader ；参与集群 Leader 选举投票。

 Observer: 观察者

 对于非事物请求可以独立处理（读操作），对于事物请求会转发给 Leader 处理， Observer 节点接收来自 Leader 的 inform 信息，更新自己本地的缓存，不参与提交和选举投票。通常在不影响集群事务处理能力的前提下提升集群的非事物处理能力。

## 7、增加systemd管理zookeeper功能

### 7.1、新建 service 文件

```shell
[root@centos8 /]# vim /etc/systemd/system/zookeeper.service
```

 在文件中新增以下内容：

```shell
[Unit]
Description=zookeeper.service
After=network.target
ConditionPathExists=/opt/zookeeper/apache-zookeeper-3.8.4/conf/zoo.cfg
[Service]
Type=forking
User=root
Group=root
ExecStart=/opt/zookeeper/apache-zookeeper-3.8.4/bin/zkServer.sh start
ExecStop=/opt/zookeeper/apache-zookeeper-3.8.4/bin/zkServer.sh stop
[Install]
WantedBy=multi-user.target
```

 执行以下命令重启守护线程：

```shell
[root@centos8 /]# systemctl daemon-reload
```

### 7.2、修改 zkEnv.sh 文件

 直接使用systemctl启动zookeeper会因找不到java的路径报错，我们需要手动修改 zkEnv.sh 文件：

```shell
[root@centos8 /]# vim /opt/zookeeper/apache-zookeeper-3.8.4/bin/zkEnv.sh
```

 编辑如下内容：

```shell
#添加如下一行
JAVA_HOME=/usr/lib/jvm/java
#到此两行上方即可:
ZOOBINDIR="${ZOOBINDIR:-/usr/bin}"
ZOOKEEPER_PREFIX="${ZOOBINDIR}/.."
```

### 7.3、启动和停止

```shell
[root@localhost conf]# systemctl start zookeeper
[root@localhost conf]# systemctl stop zookeeper
```

## 8、开机自启

 执行以下命令：

```shell
[root@localhost conf]# systemctl enable zookeeper
```
