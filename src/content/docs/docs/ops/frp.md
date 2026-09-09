---
title: 'FRP 内网穿透'
description: 'FRP 服务端与客户端的下载、安装和配置，实现内网服务通过公网服务器暴露访问。'
---

## 一、服务器启动

### 1、查看服务器架构类型

 执行下列命令查看架构类型：

```shell
uname -m
```

 如果返回 x86\_64，则下载 linux\_amd64 类型的，如果返回 aarch64，则下载 linux\_arm 类型的。本文服务器使用的是 frp\_0.65.0\_linux\_amd64.tar.gz。客户端为作者自己本地 centos8 虚拟机，架构类型为 aarch64，使用 frp\_0.65.0\_linux\_arm64.tar.gz。

下载地址：

```plaintext
https://github.com/fatedier/frp/releases
```

**注意：为避免错误，服务器端和客户端下载的包最好版本号一致。**

### 2、解压到指定位置

```shell
tar -zxvf frp_0.65.0_linux_amd64.tar.gz -C [指定目录]
```

### 3、修改配置

 到第二步指定目录的应用根目录下，修改文件 frps.toml。frps.toml 默认绑定端口为 7000，也可以自行配置。

```shell
# 执行
vim frps.toml
# 返回
bindPort = 7000
```

**注意：端口配置完成后，需要在防火墙中开启 7000 端口。**

### 4、启动

 到 frp 根目录下执行启动命令。

```shell
# 启动命令
./frps -c frps.toml 
# 后台启动命令（二选一即可）
nohup ./frps -c frps.toml > frps.log 2>&1 &
```

| 命令 | 介绍 |
| --- | --- |
| nohup | 退出 SSH 后继续运行 |
| \> frps.log | 日志保存 |
| 2>&1 | 错误输出也写入日志 |
| & | 后台运行 |

 查看启动日志.

```shell
2026-07-20 19:12:32.129 [I] [frps/root.go:108] frps uses config file: frps.toml
2026-07-20 19:12:33.013 [I] [server/service.go:236] frps tcp listen on 0.0.0.0:7000
2026-07-20 19:12:33.013 [I] [frps/root.go:117] frps started successfully
```

## 二、客户端启动

### 1、查看服务器架构类型

 和服务器启动第一步一样。

### 2、解压到指定位置

 和服务器启动第二步一样。

### 3、修改配置

 到第二步指定目录的应用根目录下，修改文件 frpc.toml。配置如下。

```shell
serverAddr = "127.0.0.1"
serverPort = 7000

[[proxies]]
name = "test-tcp"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 6000
```

| key | value |
| --- | --- |
| serverAddr | frps 服务端的 IP 地址。即第一步服务器的地址。 |
| serverPort | frps 监听的控制端口。即第一步服务器配置的端口号。 |
| \[\[proxies\]\] | 定义一个穿透规则。可以配置多个。 |
| name | 代理名称。可以随意取，方便查看。 |
| type | 表示 TCP 转发。 |
| localIP | frpc 要访问哪里的服务。 |
| localPort | 被访问的服务端口。 |
| remotePort | frps 对外开放的端口。 |

### 4、启动

 到 frp 根目录下执行启动命令。

```shell
# 启动命令
./frpc -c frpc.toml
# 后台启动命令（二选一即可）
nohup ./frpc -c frpc.toml > frpc.log 2>&1 &
```

 查看启动日志。

```shell
2026-07-18 21:26:43.081 [I] [proxy/proxy_manager.go:177] [f422cfce251f2c54] proxy added: [test-tcp]
2026-07-18 21:26:43.106 [I] [client/control.go:172] [f422cfce251f2c54] [test-tcp] start proxy success
2026-07-18 21:27:23.565 [I] [client/service.go:325] [f422cfce251f2c54] try to connect to server...
2026-07-18 21:27:23.652 [I] [client/service.go:317] [f422cfce251f2c54] login to server success, get run id [f422cfce251f2c54] 
```

## 三、frp 身份认证

 如果需要使用身份认证，用于让 `frpc` 和 `frps` 建立连接时验证双方身份，防止别人随便连接你的 frps。可以在 服务器的 frps 和 客户端的 frpc 配置文件中分别加上以下配置。两边必须要保持一致。

```shell
auth.method = "token"
auth.token = "123456"
```

| 命令 | 介绍 |
| --- | --- |
| auth.method | 表示认证方式使用 token（密钥）认证 |
| auth.token | 认证密码 |
