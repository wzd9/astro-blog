---
title: 'docker 安装 nginx'
description: '使用 Docker 安装 Nginx，并挂载配置文件与静态资源目录。'
---

### docker安装nignx

## 1、拉取nginx镜像

```shell
docker pull nginx:latest
```

## 2、创建Nginx配置文件

```shell
启动前需要先创建Nginx外部挂载的配置文件（ /home/wzd/nginx/conf/nginx.conf）
之所以要先创建 , 是因为Nginx本身容器只存在/etc/nginx 目录 , 本身就不创建 nginx.conf 文件
当服务器和容器都不存在 nginx.conf 文件时, 执行启动命令的时候 docker会将nginx.conf 作为目录创建 , 这并不是我们想要的结果 。

# 创建挂载目录
mkdir -p /home/wzd/nginx/conf
mkdir -p /home/wzd/nginx/log
mkdir -p /home/wzd/nginx/html
```

## 3、创建容器并运行

 Docker 创建Nginx容器

```shell
# 生成容器
docker run --name nginx -p 9001:80 -d nginx
#容器中的nginx.conf文件和conf.d文件夹复制到宿主机
# 将容器nginx.conf文件复制到宿主机
docker cp nginx:/etc/nginx/nginx.conf /home/wzd/nginx/conf/nginx.conf
# 将容器conf.d文件夹下内容复制到宿主机
docker cp nginx:/etc/nginx/conf.d /home/wzd/nginx/conf/conf.d
# 将容器中的html文件夹复制到宿主机
docker cp nginx:/usr/share/nginx/html /home/wzd/nginx/

# 直接执行docker rm nginx或者以容器id方式关闭容器
# 找到nginx对应的容器id
docker ps -a
# 关闭该容器
docker stop nginx
# 删除该容器
docker rm nginx
 
# 删除正在运行的nginx容器
docker rm -f nginx
```

## 4、重新启动容器

```shell
docker run \
-p 9002:80 \
--name nginx \
-v /home/wzd/nginx/conf/nginx.conf:/etc/nginx/nginx.conf \
-v /home/wzd/nginx/conf/conf.d:/etc/nginx/conf.d \
-v /home/wzd/nginx/log:/var/log/nginx \
-v /home/wzd/nginx/html:/usr/share/nginx/html \
-d nginx:latest
```

参数注释：

| 命令 | 描述 |
| :-- | --- |
| --name nginx | 启动容器的名字 |
| \-d | 后台运行 |
| \-p 9002:80 | 将容器的 80(后面那个) 端口映射到主机的 9002(前面那个) 端口 |
| \-v /home/nginx/conf/nginx.conf:/etc/nginx/nginx.conf | 挂载nginx.conf配置文件 |
| \-v /home/nginx/conf/conf.d:/etc/nginx/conf.d | 挂载nginx配置文件 |
| \-v /home/nginx/log:/var/log/nginx | 挂载nginx日志文件 |
| \-v /home/nginx/html:/usr/share/nginx/html | 挂载nginx内容 |
| nginx:latest | 本地运行的版本 |
| \\ | shell 命令换行 |

 **注意：-p 9002:80 ，将 容器的80端口映射到 docker 所在服务器（虚拟机）的 9002 端口，此时虚拟机的9002端口并没有在防火墙中开启，但是虚拟机外的网络依旧能访问到9002端口,是因为docker 容器创建时，如果指定了容器映射的宿主机端口（9002），docker就会在 iptables 的规则链中加上自己容器对外提供服务所需的规则链，所以docker 容器跑的服务，虚拟机所在的主机（本地电脑）可以访问到！**

单行模式

```shell
docker run \ 
-p 9002:80 \
--name nginx \
-v /home/wzd/nginx/conf/nginx.conf:/etc/nginx/nginx.conf \
-v /home/wzd/nginx/conf/conf.d:/etc/nginx/conf.d \
-v /home/wzd/nginx/log:/var/log/nginx \
-v /home/wzd/nginx/html:/usr/share/nginx/html \
-d nginx:latest
```
