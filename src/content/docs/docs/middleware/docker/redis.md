---
title: 'docker 启动 redis'
description: '使用 Docker 快速启动 Redis 容器，配置端口映射与数据持久化。'
---

## 1、拉取redis

```shell
docker pull redis:latest
```

当前最新版本为7.2.4

## 2、创建挂载目录

```shell
mkdir /home/wzd/redis
mkdir /home/wzd/redis/data
```

## 3、下载 redis.conf 文件

```shell
wget http://download.redis.io/redis-stable/redis.conf
```

**注意：配置文件的版本需要和 redis 的版本对应，当前 redis 版本为7.2.4，配置文件的版本也应该为7.2.x,文件地址：**

[https://redis.io/docs/latest/operate/oss\_and\_stack/management/config/](https://redis.io/docs/latest/operate/oss_and_stack/management/config/)

## 4、设置权限

```shell
chmod 777 redis.conf
```

## 5、设置默认配置信息

```shell
vi /home/wzd/redis/redis.conf
```

```shell
bind 127.0.0.1 # 这行要注释掉，解除本地连接限制
protected-mode no # 默认yes，如果设置为yes，则只允许在本机的回环连接，其他机器无法连接。
daemonize no # 默认no 为不守护进程模式，docker部署不需要改为yes，docker run -d本身就是后台启动，不然会冲突
requirepass 123456 # 设置密码
appendonly yes # 持久化
```

## 6、docker 启动 redis

```shell
docker run \
-itd \
--name redis7.2.4 \
--privileged=true \
-p 6379:6379 \
-v /home/wzd/redis/redis.conf:/etc/redis/redis.conf \
-v /home/wzd/redis/data:/data \
redis:latest \
redis-server /etc/redis/redis.conf \
--appendonly yes \
--requirepass 123456 
```

参数说明：

```shell
docker run
-itd 
        -d	                                         在后台运行容器，并且打印容器id。
        -i	                                         即使没有连接，也要保持标准输入保持打开状态，一般与 -t 连用。
        -t	                                         分配一个伪tty，一般与 -i 连用。
--name redis7.2.4                                    容器名字
--privileged=true                                    容器内的root拥有真正root权限，否则容器内root只是外部普通用户权限
-p 6379:6379                                         把容器内的6379端口映射到宿主机6379端口
-v /home/wzd/redis/redis.conf:/etc/redis/redis.conf  把宿主机配置好的redis.conf放到容器内的这个位置中(文件)
-v /home/wzd/redis/data:/data                        把redis持久化的数据在宿主机内显示，做数据备份
redis:latest                                         镜像名字
redis-server /etc/redis/redis.conf                   这个是关键配置，让redis不是无配置启动，而是按照这个redis.conf的													 配置启动
--appendonly yes                                     开启数据持久化
--requirepass 123456                                 密码
```

**注意：启动 redis 需要添加 --privileged=true 命令，否则无法启动**

## 7、在 docker 中打开 redis 客户端

### 1、首先交互方式进入 redis 容器

```shell
docker exec -it [容器ID] /bin/bash
```

### 2、随后运行客户端

```shell
redis-cli
```

### 3、执行客户端命令

```plaintext
127.0.0.1:6379> get keys
(error) NOAUTH Authentication required.
```

出现该情况，输入密码即可

```shell
auth '123456'
auth 123456
#两种命令都可以
```
