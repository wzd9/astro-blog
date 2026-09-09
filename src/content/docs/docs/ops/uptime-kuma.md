---
title: 'Uptime Kuma 安装文档'
description: '在阿里云 Ubuntu 轻量服务器上安装部署 Uptime Kuma 监控中心，并通过 Nginx HTTPS 反向代理访问，监控 Spring Boot、MySQL、Redis 等服务。'
---

本文主要介绍 Uptime Kuma （以下简称 kuma ）的安装和部署，kuma 部署在阿里云轻量应用服务器上，是整个项目的统一监控中心。主要监控 Spring Boot，Spring Boot Actuator Health，MySQL，Redis 等等。

## 部署环境

 阿里云轻量应用服务器当前的环境：Ubuntu 22.04.5 LTS。kuma 默认监听：127.0.0.1:3001，本文通过 Nginx 的 HTTPS 反向代理访问。

## 安装 Node.js

检查：

```bash
node -v
npm -v
```

如果没有安装：

```bash
sudo apt update
sudo apt install -y curl git
```

安装 Node.js LTS：

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

检查：

```bash
node -v
npm -v
```

查询 Node.js 实际路径：

```bash
which node
```

## 下载 Uptime Kuma

进入中间件目录：

```bash
mkdir -p /home/xx/midware
cd /home/xx/midware
```

下载：

```bash
git clone https://github.com/louislam/uptime-kuma.git
```

进入目录：

```bash
cd /home/xx/midware/uptime-kuma
```

安装：

```bash
npm run setup
```

## 手动启动测试

安装完成后先手动启动测试：

```bash
cd /home/xx/midware/uptime-kuma
node server/server.js
```

默认端口：

```text
3001
```

检查：

```bash
ss -lntp | grep 3001
```

本机测试：

```bash
curl http://127.0.0.1:3001
```

如果能够返回网页内容，说明 Kuma 正常运行。测试完成后建议使用 systemd 管理。

## 使用 systemd 管理

创建服务：

```bash
sudo nano /etc/systemd/system/uptime-kuma.service
```

配置：

```ini
[Unit]
Description=Uptime Kuma
After=network.target

[Service]
Type=simple
User=xxx
WorkingDirectory=/home/xx/midware/uptime-kuma
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

> 如果 `which node` 返回的路径不是 `/usr/bin/node`，请修改 `ExecStart`。

重新加载：

```bash
sudo systemctl daemon-reload
```

启动：

```bash
sudo systemctl start uptime-kuma
```

设置开机启动：

```bash
sudo systemctl enable uptime-kuma
```

查看状态：

```bash
systemctl status uptime-kuma
```

## 常用 systemd 命令

启动：

```bash
sudo systemctl start uptime-kuma
```

停止：

```bash
sudo systemctl stop uptime-kuma
```

重启：

```bash
sudo systemctl restart uptime-kuma
```

查看：

```bash
systemctl status uptime-kuma
```

查看是否开机启动：

```bash
systemctl is-enabled uptime-kuma
```

## 查看 Kuma 日志

实时：

```bash
journalctl -u uptime-kuma -f
```

最近 100 行：

```bash
journalctl -u uptime-kuma -n 100 --no-pager
```

当天日志：

```bash
journalctl -u uptime-kuma --since today
```

## Nginx 反向代理

 因为作者的 kuma 和 Nginx 都安装在阿里云轻量应用服务器上，所以此处通过 Nginx 进行反向代理，链路为

```bash
公网 --> 域名 --> Nginx --> 127.0.0.1:3001 --> Uptime Kuma
```

 不建议直接开放 3001 端口。以下是作者的 Nginx 示例：

```nginx
server {
    listen 443 ssl;
    server_name www.xx.cn;

    ssl_certificate     /你的证书路径/fullchain.pem;
    ssl_certificate_key /你的证书路径/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
				#用于支持 Uptime Kuma 的 WebSocket 通信。
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 进入 Kuma页面

浏览器访问：[https://www.xx.com](https://www.xx.com/) 进入首页，首次进入需要创建管理员账号、设置管理员密码、初始化数据库，初始化完成后登录 Kuma,

![kuma首页](/images/blog/uptime-kuma-install/uptime-kuma-install-1.jpg)
