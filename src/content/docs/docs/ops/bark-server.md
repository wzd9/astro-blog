---
title: 'Bark Server 安装文档'
description: '在阿里云轻量服务器上部署 Bark Server，接收 Uptime Kuma 的告警并将通知推送到 iPhone。'
---

本文主要介绍 Bark Server （以下简称 bark ）的安装和部署，bark 部署在阿里云轻量应用服务器上，是作者的个人项目中的 iOS 推送服务端，主要负责接收 Uptime Kuma 的告警，并将通知推送到 iPhone。

## 下载 Bark Server

当前使用：

```text
bark-server_linux_amd64
```

创建目录：

```bash
mkdir -p /home/xx/midware/bark
cd /home/xx/midware/bark
```

下载完成后：

```bash
ls -lh
```

增加执行权限：

```bash
chmod +x bark-server_linux_amd64
```

检查：

```bash
file bark-server_linux_amd64
```

## 启动 Bark Server

推荐只监听本机：

```text
127.0.0.1:8080
```

启动：

```bash
./bark-server_linux_amd64
```

检查：

```bash
ss -lntp | grep 8080
```

本机测试：

```bash
curl -i http://127.0.0.1:8080
```

如果能够得到 Bark Server 响应，说明服务正常。

## 使用 systemd 管理

创建：

```bash
sudo nano /etc/systemd/system/bark-server.service
```

示例：

```ini
[Unit]
Description=Bark Server
After=network.target

[Service]
Type=simple
User=xx
WorkingDirectory=/home/xx/midware/bark
ExecStart=/home/xx/midware/bark/bark-server_linux_amd64
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

重新加载：

```bash
sudo systemctl daemon-reload
```

启动：

```bash
sudo systemctl start bark-server
```

设置开机启动：

```bash
sudo systemctl enable bark-server
```

查看：

```bash
systemctl status bark-server
```

## 常用 systemd 命令

启动：

```bash
sudo systemctl start bark-server
```

停止：

```bash
sudo systemctl stop bark-server
```

重启：

```bash
sudo systemctl restart bark-server
```

查看：

```bash
systemctl status bark-server
```

检查开机启动：

```bash
systemctl is-enabled bark-server
```

## 查看日志

实时：

```bash
journalctl -u bark-server -f
```

最近 100 行：

```bash
journalctl -u bark-server -n 100 --no-pager
```

当天日志：

```bash
journalctl -u bark-server --since today
```

## Nginx 反向代理

 因为作者的 bark 和 Nginx 都安装在阿里云轻量应用服务器上，所以此处通过 Nginx 进行反向代理，链路为

```bash
公网 --> 域名 --> Nginx --> 127.0.0.1:8080 --> Bark Server
```

Nginx 配置示例：

```nginx
server {
    listen 443 ssl;
    server_name www.xx.cn;

    ssl_certificate     /你的证书路径/fullchain.pem;
    ssl_certificate_key /你的证书路径/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 测试 Bark Server

浏览器访问：

```text
https://www.xx.cn
```

命令行：

```bash
curl -i https://www.xx.cn
```

如果可以正常返回响应：

```text
域名
 ↓
Nginx
 ↓
127.0.0.1:8080
 ↓
Bark Server
```

说明服务正常。

## 测试 iPhone 推送

使用 Bark 设备 Key 测试：

```bash
curl -i "https://www.xx.cn/你的设备Key/测试"
```

根据当前 Bark Server 版本使用对应 API 格式。

成功条件：

```text
HTTP 请求成功
+
iPhone Bark App 收到通知
```

 **注意：ios 手机上下载的 bark 图标为红色，App Store 中搜索 bark，下载 Bark - 给你的手机发推送，别选错了。安装完成后打开，点击右上角加号，输入你的服务器地址，本文此处输入 <https://www.xx.cn/>，保存后点击右上角的 ☁️ 图标，找到你刚才输入的服务器，可以复制 Key，该 Key 极为你的设备Key**。

## 配置 Uptime Kuma

 Uptime Kuma 同样安装在阿里云轻量应用服务器上。

进入：

```text
Uptime Kuma
 → Settings
 → Notifications
 → Add Notification
 → Bark
```

填写：

```text
Bark Server URL:
https://www.xx.cn
```

以及：

```text
Device Key
```

点击：

```text
Test
```

成功后：

```text
Uptime Kuma
      │
      ▼
阿里云 Bark Server
      │
      ▼
iPhone
```

## 保护 Device Key

 Device Key 是推送凭证。不要 **提交到 GitHub、写进公开配置文件、发到公开群聊、写进前端代码**，如果泄露，其他人可能利用你的 Bark Server 向设备发送消息。
