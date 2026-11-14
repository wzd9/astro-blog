---
title: 'Linux 使用 Certbot 申请 HTTPS 证书并配置自动续期'
description: "从新 Linux 服务器的环境检查、Certbot 安装、HTTP-01 验证到证书部署和自动续期，逐步配置 Nginx 与 Let's Encrypt。"
pubDate: '2026-11-14'
heroImage: '/src/assets/heroImage/8.jpg'
---

本文记录在一台新的 Linux 服务器上，使用 Certbot 从 Let's Encrypt 申请 HTTPS 证书，并配置自动续期和续期后重载 Nginx 的完整流程。示例采用 Nginx、HTTP-01 验证和 Webroot 方式。

> 命令中的 `example.com` 请替换为自己的域名。本文以 Ubuntu/Debian 和 Snap 版 Certbot 为安装示例；其他发行版请按系统和 Certbot 官方安装说明调整安装命令。不要把不同来源安装的 Certbot 混在一起。

## 一、理解流程

1. 域名 DNS 解析到这台服务器。
2. 公网可以访问服务器的 TCP 80 端口。
3. Nginx 将 `/.well-known/acme-challenge/` 映射到本机 Webroot 目录。
4. Certbot 在目录中放置验证文件，Let's Encrypt 通过 HTTP 请求验证域名。
5. 验证通过后，证书保存在 `/etc/letsencrypt/`。
6. Certbot 的定时任务检查证书是否进入续期窗口；成功续期后执行 deploy hook 重载 Nginx。

## 二、准备域名和服务器

### 1. 查看 Linux 版本

```bash
cat /etc/os-release
uname -m
```

这一步用于确认发行版和 CPU 架构，后续应选择匹配的 Certbot 安装方式。

### 2. 检查域名解析

将下面的域名换成实际域名：

```bash
dig +short A example.com
dig +short AAAA example.com
```

A 记录应指向服务器公网 IPv4。如果配置了 AAAA 记录，IPv6 也必须能到达这台服务器；错误的 AAAA 记录也可能导致验证失败。若域名前有 CDN 或代理，需要确认验证请求能到达源站。

### 3. 确认端口可达

HTTP-01 验证需要公网访问 TCP 80。正式提供 HTTPS 通常还需要 TCP 443。

```bash
sudo ss -lntp | grep -E ':(80|443)\b'
```

同时检查云平台安全组和 Linux 防火墙已放行 TCP 80、443。此时 Nginx 应已安装，并能为目标域名提供 HTTP 服务。

## 三、安装 Certbot

先查看机器上是否已安装 Certbot，避免重复安装或混用 apt、Snap、pip 等来源：

```bash
command -v certbot
certbot --version
snap list certbot
```

如果已存在，确认其安装来源、版本和续期调度，再继续使用现有安装。以下命令是 Ubuntu/Debian 使用 Snap 的示例，仅在尚未安装且决定采用 Snap 时执行：

```bash
sudo apt update
sudo apt install -y snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

验证命令路径和版本：

```bash
command -v certbot
certbot --version
```

路径应对应预期的 Snap 安装。若系统原本有另一个 Certbot，先处理清楚来源，不要直接叠加安装。

## 四、配置 HTTP-01 验证目录

### 1. 创建 Webroot

本文统一使用 `/var/www/letsencrypt` 作为验证文件目录：

```bash
sudo mkdir -p /var/www/letsencrypt/.well-known/acme-challenge
sudo chown -R root:root /var/www/letsencrypt
sudo chmod -R 755 /var/www/letsencrypt
```

Certbot 会把临时验证文件写到这里，Nginx 负责通过 HTTP 提供这些文件。

### 2. 配置 Nginx

在负责 `example.com` 的 HTTP `server` 块内加入以下 location。已有站点不要盲目增加重复的 `server` 块；应将 location 合并到正确的域名配置中。

```nginx
server {
    listen 80;
    server_name example.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

`root` 与 Certbot 的 `-w` 参数必须指向同一个目录。若站点有多个需要签发的域名，把它们列入 `server_name`，并确保 HTTP 请求能命中这个 server 块。确认没有鉴权、反向代理或其他 location 截获挑战路径。

检查配置语法并平滑重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

只有 `nginx -t` 显示配置通过后才执行 reload。

### 3. 测试挑战路径

先创建一个临时文件：

```bash
echo "acme-webroot-ok" | sudo tee \
  /var/www/letsencrypt/.well-known/acme-challenge/test-file
```

在服务器上测试：

```bash
curl -i http://example.com/.well-known/acme-challenge/test-file
```

也要从外部网络访问同一个 URL。响应状态应为 200，正文应为 `acme-webroot-ok`。这个测试确认域名、Nginx 路由和 Webroot 映射正确。

如果得到 403、404、错误正文或访问到了另一台机器，先排查 DNS A/AAAA、云安全组、防火墙、Nginx `server_name`、location 与目录权限。修复并重新测试成功后再申请证书。

测试完删除临时文件：

```bash
sudo rm -f /var/www/letsencrypt/.well-known/acme-challenge/test-file
```

## 五、申请证书

### 1. 为单个域名签发

```bash
sudo certbot certonly \
  --webroot \
  -w /var/www/letsencrypt \
  -d example.com \
  --key-type ecdsa \
  --cert-name example.com
```

参数说明：

- `certonly`：只申请证书，不自动修改 Nginx 配置。
- `--webroot`：通过现有 Web 服务提供 HTTP-01 验证文件。
- `-w`：指定验证文件目录，必须与 Nginx 配置一致。
- `-d`：指定证书要覆盖的域名。
- `--key-type ecdsa`：申请 ECDSA 密钥类型证书。
- `--cert-name`：指定 Certbot 内部使用的证书名称。

如果同一张证书需要覆盖根域名和 `www` 子域名，可重复添加 `-d`：

```bash
sudo certbot certonly \
  --webroot \
  -w /var/www/letsencrypt \
  -d example.com \
  -d www.example.com \
  --key-type ecdsa \
  --cert-name example.com
```

每个列出的域名都必须解析到可完成验证的服务。给已有证书增加或调整域名之前，先查看现有证书名称和覆盖域名：

```bash
sudo certbot certificates
```

### 2. 确认证书签发结果

```bash
sudo certbot certificates
```

确认输出中包含预期的证书名称、域名、有效期和文件路径。通常证书文件位于：

```text
/etc/letsencrypt/live/example.com/fullchain.pem
/etc/letsencrypt/live/example.com/privkey.pem
```

以命令实际显示的路径为准。如果没有出现目标证书，先解决签发错误，不要继续把不存在的路径写入 Nginx。

## 六、让 Nginx 使用证书

在对应的 HTTPS `server` 块中配置证书路径，并加入站点原有的静态文件或反向代理配置：

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # 在这里配置站点目录或反向代理
}
```

`fullchain.pem` 包含站点证书和证书链；`privkey.pem` 是私钥，必须限制访问，不能公开或提交到代码仓库。

检查并应用配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

随后用浏览器或 curl 检查 HTTPS 访问是否正常：

```bash
curl -I https://example.com
```

## 七、确认自动续期调度

Certbot 的 `renew` 命令会检查所有由 Certbot 管理的证书。定时任务经常运行是正常的；只要证书尚未进入续期窗口，该次运行就会跳过，不会每次都重新签发。不要把 `--force-renewal` 用作日常定时命令。

Snap 安装通常提供 systemd timer。检查：

```bash
sudo systemctl status snap.certbot.renew.timer
sudo systemctl list-timers --all | grep -i certbot
systemctl cat snap.certbot.renew.timer
```

如果使用其他安装来源，则检查该来源提供的调度方式。也检查是否已有重复的 cron 任务：

```bash
sudo grep -R "certbot renew" \
  /etc/crontab /etc/cron.d /etc/cron.daily /etc/cron.weekly \
  2>/dev/null
sudo crontab -l
```

保留与当前安装方式匹配的调度即可，避免无必要地同时运行 timer 和 cron。

## 八、模拟续期验证

执行：

```bash
sudo certbot renew --dry-run
```

`--dry-run` 使用测试环境模拟续期，不会替换生产证书。命令成功表示 Certbot 的验证和续期配置能够完成模拟流程；如果失败，根据报错检查 DNS、80 端口、Webroot、Nginx 路由和续期配置。

查看详细日志：

```bash
sudo tail -n 100 /var/log/letsencrypt/letsencrypt.log
```

不要频繁使用 `--force-renewal` 测试，以免触发 CA 的签发速率限制。

## 九、续期成功后自动重载 Nginx

证书文件续期后，运行中的 Nginx 需要重新读取证书。配置 deploy hook，使 Certbot 只在证书成功签发或续期后检查配置并重载 Nginx。

创建 hook 目录和脚本：

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null <<'EOF'
#!/bin/sh
set -e

nginx -t
systemctl reload nginx
EOF
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

脚本先运行 `nginx -t`，只有配置检查成功才继续 reload。确认当前服务器使用 systemd 管理 Nginx；如果证书由其他服务使用，应将 hook 中的检查和 reload 命令改成对应服务的操作。

可再次运行模拟续期，确认续期流程和 hook 能正常执行：

```bash
sudo certbot renew --dry-run
```

## 十、日常检查与故障排查

查看证书及到期时间：

```bash
sudo certbot certificates
sudo openssl x509 \
  -in /etc/letsencrypt/live/example.com/cert.pem \
  -noout -subject -issuer -dates
```

常见问题处理方向：

| 现象 | 检查内容 |
|---|---|
| HTTP-01 验证失败 | DNS、TCP 80、安全组和防火墙是否正确 |
| 挑战路径返回 404 | Nginx 的 `root` 是否与 `-w` 相同，域名是否命中正确的 server 块 |
| 挑战路径返回 403 | 目录权限、Nginx 访问控制和其他 location 规则 |
| 验证请求到了错误服务器 | A/AAAA 记录、CDN 或代理回源配置 |
| 找不到续期 timer | Certbot 安装来源及其提供的调度方式 |
| 续期成功但浏览器仍看到旧证书 | Nginx 是否 reload，流量是否经过其他代理或负载均衡节点 |

## 部署后再确认一遍

证书签发成功只是完成了一半。最后从外部网络打开域名，确认 HTTPS 页面正常，再模拟一次续期，确认验证流程可以通过：

```bash
sudo certbot renew --dry-run
```

还要检查 Certbot 的定时任务确实处于启用状态，并确认续期后的 deploy hook 能让 Nginx 重新加载证书。

这几项都正常后，后续通常不需要手动续期。记得把 `/etc/letsencrypt/` 纳入受限访问的备份范围，尤其不要泄露其中的私钥文件。

## 官方资料

- [Certbot 用户指南](https://eff-certbot.readthedocs.io/en/latest/using.html)
- [Certbot 安装说明](https://certbot.eff.org/instructions)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [Let's Encrypt 验证类型](https://letsencrypt.org/docs/challenge-types/)
