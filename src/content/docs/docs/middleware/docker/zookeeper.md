---
title: 'docker 安装 zookeeper'
description: '使用 Docker 安装并启动 ZooKeeper 的步骤与连接验证方法。'
---

## 1、下载镜像

```shell
docker pull zookeeper:3.9.1
```

## 2、配置挂载目录

 在 /home/mountDirectory/ 目录下新增 文件夹 zookeeper，在 zookeeper 目录下新增 data 目录。

## 3、启动容器

```shell
docker run -d -e TZ="Asia/Shanghai" -p 2181:2181 -v /home/mountDirectory/zookeeper/data:/data --name zookeeper --restart always zookeeper:3.9.1
```

参数注释：

| 参数 | 释义 |
| --- | --- |
| `-e TZ="Asia/Shanghai"` | 指定上海时区 |
| `-d` | 表示在一直在后台运行容器 |
| `-p 2181:2181` | 对端口进行映射，将本地2181端口映射到容器内部的2181端口 |
| `--name` | 设置创建的容器名称 |
| `-v` | 将本地目录(文件)挂载到容器指定目录 |
| `--restart always` | 始终重新启动zookeeper |

## 4、测试

```shell
docker exec -it zookeeper /bin/bash
```

进入容器内，然后进入 bin目录，使用 ./zkCli.sh 命令启动客户端。
