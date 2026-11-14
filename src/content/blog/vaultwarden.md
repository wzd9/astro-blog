---
title: 'Linux 原生部署 Vaultarden：编译、systemd 与 Nginx 配置'
description: '记录在 Linux 服务器上不使用 Docker 部署 Vaultwarden 的步骤，涵盖 Rust 编译、数据目录、systemd、Nginx HTTPS、备份与升级。'
pubDate: '2026-11-14'
heroImage: '/src/assets/heroImage/7.jpg'
---

本文整理一套在 Linux 服务器上原生部署 Vaultwarden 的流程：从 Rust 源码编译可执行文件，由 systemd 管理服务进程，使用 SQLite 保存数据，并由 Nginx 提供 HTTPS 反向代理。全程不使用 Docker 或 Docker Compose。

> 示例以 Ubuntu/Debian、x86_64 或 aarch64、Nginx 和 SQLite 为参考。Vaultwarden、Rust、Web Vault 的版本和构建要求会变化，开始部署前请查看所选版本的 [Vaultwarden 官方仓库](https://github.com/dani-garcia/vaultwarden)及其 Wiki。文中 `www.example.com`、版本标签等均为示例，执行前需要替换为自己的值。原始记录没有保存最终使用的版本号和完整构建日志，因此本文提供的是可复用流程，不代表某台服务器当前状态。

## 一、部署架构

```text
浏览器 / Bitwarden 客户端
          |
          | HTTPS :443
          v
        Nginx
          |
          | HTTP，仅监听本机 127.0.0.1:8000
          v
  Vaultwarden 后端进程
          |
          v
      SQLite 和附件
```

程序、配置和持久化数据分开放置：

| 目录 | 用途 |
|---|---|
| `/opt/vaultwarden` | Vaultwarden 可执行文件 |
| `/etc/vaultwarden` | 环境变量配置 |
| `/var/lib/vaultwarden` | SQLite 数据库、附件、Send 和密钥等数据 |

这种分离方式便于升级程序，也能降低误删数据的风险。Vaultwarden 后端只监听本机，公网请求由 Nginx 接收。

## 二、部署前检查

### 1. 确认系统和架构

```bash
cat /etc/os-release
uname -m
uname -a
lscpu
df -h
```

常见架构对应的 Rust target 如下：

| `uname -m` | Rust target |
|---|---|
| `x86_64` | `x86_64-unknown-linux-gnu` |
| `aarch64` | `aarch64-unknown-linux-gnu` |

编译产物与系统架构、ABI 有关，不要把另一种架构或不兼容系统编译出的二进制直接复制过来。

### 2. 准备域名和 HTTPS

将用于访问 Vaultwarden 的域名解析到服务器，并确认公网 TCP 443 可达。使用 HTTP-01 申请证书时，还需要开放 TCP 80。证书可以按照本站的 [Certbot 证书申请与自动续期教程](/blog/linux-certbot-https-auto-renew/)先行申请。

## 三、创建专用用户和目录

创建不允许交互登录的系统用户，并准备程序、配置和数据目录：

```bash
sudo useradd --system \
  --home /var/lib/vaultwarden \
  --shell /usr/sbin/nologin \
  vaultwarden

sudo install -d -o root -g root -m 755 /opt/vaultwarden
sudo install -d -o root -g vaultwarden -m 750 /etc/vaultwarden
sudo install -d -o vaultwarden -g vaultwarden -m 750 /var/lib/vaultwarden
```

专用用户可避免服务长期以 root 身份运行。若用户或目录已经存在，先检查状态，不要重复创建或覆盖：

```bash
id vaultwarden
ls -ld /opt/vaultwarden /etc/vaultwarden /var/lib/vaultwarden
```

## 四、安装 Rust 并编译 Vaultwarden

### 1. 安装构建工具

Ubuntu/Debian 示例：

```bash
sudo apt update
sudo apt install -y build-essential pkg-config curl git libssl-dev libsqlite3-dev
```

不同 Vaultwarden 版本的系统依赖和编译特性可能不同。如官方构建说明要求其他依赖或选项，应以目标版本的说明为准。

### 2. 安装 Rust 工具链

以准备编译的普通用户执行 rustup 安装：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

按提示完成后加载 Cargo 环境，并确认版本：

```bash
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

记录 Rust 版本，后续升级或重编译时便于复现构建环境。

### 3. 获取并固定源码版本

```bash
git clone https://github.com/dani-garcia/vaultwarden.git
cd vaultwarden
git tag --sort=-v:refname | head
git checkout <确认过的版本标签>
```

把占位文本替换为计划部署的正式版本标签。生产环境建议固定版本，而不是长期直接跟随不断变化的主分支。进入该版本后，先阅读仓库中的构建说明。

### 4. 编译并安装可执行文件

常见的 Rust release 构建命令如下，实际命令和 feature 选项要以所选版本官方说明为准：

```bash
cargo build --release
file target/release/vaultwarden
ls -lh target/release/vaultwarden
```

确认编译成功且架构符合服务器后，将程序安装到固定目录：

```bash
sudo install -o root -g root -m 755 \
  target/release/vaultwarden \
  /opt/vaultwarden/vaultwarden

/opt/vaultwarden/vaultwarden --help
```

后端编译完成不一定代表 Web Vault 前端资源也已就绪。部署前要确认该版本的 Web Vault 准备方式、兼容版本、资源目录，以及由 Vaultwarden 还是 Nginx 提供静态文件。不要把其他版本的前端文件随意覆盖进来。

## 五、配置 Vaultwarden

创建环境变量文件：

```bash
sudo nano /etc/vaultwarden/vaultwarden.env
```

示例配置：

```ini
ROCKET_ADDRESS=127.0.0.1
ROCKET_PORT=8000

DOMAIN=https://www.example.com
DATA_FOLDER=/var/lib/vaultwarden

# 生成强随机值后再填写，不要使用示例或弱口令
ADMIN_TOKEN=替换为强随机令牌

# 仅在需要邮件功能时配置，并使用实际 SMTP 参数
# SIGNUPS_ALLOWED=false
# SMTP_HOST=
# SMTP_FROM=
# SMTP_FROM_NAME=
# SMTP_USERNAME=
# SMTP_PASSWORD=
```

生成随机管理令牌的示例：

```bash
openssl rand -base64 48
```

将输出填入 `ADMIN_TOKEN`，再将域名换成实际 HTTPS 地址。环境变量名称和支持情况以当前 Vaultwarden 版本文档为准。保护配置文件权限：

```bash
sudo chown root:vaultwarden /etc/vaultwarden/vaultwarden.env
sudo chmod 640 /etc/vaultwarden/vaultwarden.env
```

管理令牌、邮件密码等属于敏感信息，不要提交到 Git 或贴到公开日志中。

## 六、创建 systemd 服务

创建 unit 文件：

```bash
sudo nano /etc/systemd/system/vaultwarden.service
```

写入：

```ini
[Unit]
Description=Vaultwarden Server
After=network.target

[Service]
Type=simple
User=vaultwarden
Group=vaultwarden
WorkingDirectory=/opt/vaultwarden
EnvironmentFile=/etc/vaultwarden/vaultwarden.env
ExecStart=/opt/vaultwarden/vaultwarden
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

通知 systemd 重新读取 unit，设置开机启动并立即启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vaultwarden
sudo systemctl status vaultwarden
```

查看启动日志：

```bash
sudo journalctl -u vaultwarden -n 100 --no-pager
```

确认进程正常运行且监听在 `127.0.0.1:8000` 后再配置 Nginx。常用管理命令：

```bash
sudo systemctl start vaultwarden
sudo systemctl stop vaultwarden
sudo systemctl restart vaultwarden
sudo systemctl status vaultwarden
sudo journalctl -u vaultwarden -f
```

## 七、配置 Nginx HTTPS 反向代理

下面配置展示 HTTP 跳转和 HTTPS 反向代理的基本结构。证书路径应替换成 Certbot 实际签发的路径，域名也应换成自己的域名。

```nginx
server {
    listen 80;
    server_name www.example.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name www.example.com;

    ssl_certificate     /etc/letsencrypt/live/www.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查 Nginx 配置并平滑重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Vaultwarden 的通知或 WebSocket 功能可能需要额外的 Upgrade/Connection 代理头，应按目标版本的官方反向代理配置补全。如果 Web Vault 静态资源由 Nginx 单独提供，还需要配置其静态目录。

## 八、验证部署

先在服务器本机检查后端是否响应：

```bash
curl -i http://127.0.0.1:8000/
```

再从浏览器访问 `https://www.example.com`，确认 HTTPS 页面、静态资源、登录和 API 请求正常。若本机后端正常而公网返回 502，检查 Nginx 的 `proxy_pass`、Vaultwarden 监听地址和端口。

## 九、备份数据

至少要备份以下内容：

- `/var/lib/vaultwarden/`：数据库、附件、Send 文件和生成的密钥。
- `/etc/vaultwarden/`：环境变量配置，备份时保护管理令牌和邮件密码。
- `/etc/systemd/system/vaultwarden.service` 和 Nginx 站点配置。
- 独立存放的 Web Vault 静态资源（如有）。
- `/etc/letsencrypt/`：证书和私钥，备份时严格限制访问。

使用 SQLite 时，可在维护窗口停止服务后归档数据目录，避免复制时数据库仍在写入：

```bash
sudo systemctl stop vaultwarden
sudo tar -czf /root/vaultwarden-data-$(date +%F-%H%M%S).tar.gz \
  -C /var/lib vaultwarden
sudo systemctl start vaultwarden
```

备份完成后还应确认归档文件存在，并定期验证备份可恢复。仅把备份留在同一块磁盘上不能防止磁盘故障。

## 十、升级 Vaultwarden

升级前固定目标版本并阅读该版本的变更说明。建议按以下顺序操作：

1. 记录当前程序版本和 Rust 工具链版本。
2. 备份数据目录、环境变量、systemd、Nginx 配置和 Web Vault 资源。
3. 获取目标版本源码，并按该版本说明完成编译。
4. 停止服务并保存旧二进制。
5. 安装新二进制及匹配的 Web Vault 资源。
6. 启动服务并检查 systemd 日志、网页、登录、附件和通知。
7. 若出现异常，结合版本的数据库迁移说明决定回滚方式。

二进制替换示例（在目标版本已成功编译后执行）：

```bash
sudo systemctl stop vaultwarden
sudo cp -a /opt/vaultwarden/vaultwarden /opt/vaultwarden/vaultwarden.bak
sudo install -o root -g root -m 755 \
  target/release/vaultwarden \
  /opt/vaultwarden/vaultwarden
sudo systemctl start vaultwarden
sudo systemctl status vaultwarden
sudo journalctl -u vaultwarden -n 100 --no-pager
```

如果新版本已迁移数据库，不能只回滚二进制就假设数据兼容；应按该版本说明恢复匹配的数据备份。

## 十一、常见问题

| 现象 | 排查方向 |
|---|---|
| systemd 启动失败 | 检查 `systemctl status`、`journalctl`、程序路径、执行权限和环境变量文件 |
| `Exec format error` | 二进制架构与服务器架构不匹配 |
| Nginx 返回 502 | 检查 Vaultwarden 服务、监听地址、端口和 `proxy_pass` |
| HTTPS 无法访问 | 检查 DNS、80/443、防火墙、Nginx 语法和证书路径 |
| 页面打开但登录异常 | 检查 `DOMAIN`、代理头、后端日志及前后端版本匹配 |
| 静态资源加载失败 | 检查 Web Vault 是否部署、Nginx 静态目录和浏览器缓存 |
| 附件或 Send 异常 | 检查数据目录权限、磁盘空间和 `DATA_FOLDER` |
| 重启后数据丢失 | 确认数据使用持久化目录，而不是临时目录 |

常用排查命令：

```bash
sudo systemctl status vaultwarden --no-pager
sudo journalctl -u vaultwarden -n 100 --no-pager
ss -lntp | grep 8000
sudo nginx -t
sudo nginx -T
curl -i http://127.0.0.1:8000/
```

分享日志或配置前，删除管理令牌、密码和其他敏感值。

## 官方资料

- [Vaultwarden GitHub 仓库](https://github.com/dani-garcia/vaultwarden)
- [Vaultwarden Wiki](https://github.com/dani-garcia/vaultwarden/wiki)
- [Rust 安装说明](https://www.rust-lang.org/tools/install)
- [Cargo Book](https://doc.rust-lang.org/cargo/)
- [systemd service 文档](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
