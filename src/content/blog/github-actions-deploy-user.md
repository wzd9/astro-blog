---
title: 'GitHub Actions 新建专属部署用户'
description: '记录 Ubuntu 上部署账号的创建、SSH 公钥配置，以及和日常账号共享博客目录的做法。'
pubDate: '2026-10-31'
tags: ['Ubuntu', 'GitHub Actions', 'SSH', '部署']
heroImage: '/src/assets/IMG_6476.PNG'
---

给博客加自动部署时，我一开始也考虑过直接用平时登录服务器的账号。配置是省事，但这意味着日常账号的凭据也要交给 GitHub Actions。最后还是单独建了一个 `deploy-user`：工作流只负责上传文件，平时登录和维护继续用 `usertest`。

下面按实际配置记一下过程。用户名、目录和端口都要按自己的环境替换。

## 为什么单独建用户

部署工作流只需要把构建结果传到服务器，不需要拿到日常管理账号的登录凭据。以后不再用自动部署，删掉这个账号的公钥就能停用，不会影响平时的登录方式。

我的部署路径大致是这样：

```text
GitHub Actions
    → SSH 公钥登录 deploy-user
    → 阿里云转发端口
    → FRP 转发到 Ubuntu 的 SSH
    → 上传到 /home/usertest/servers/astro-blog
```

FRP 在这里负责把 SSH 连接转到 Ubuntu。外部端口由自己的 FRP 配置决定，记得和云端放行规则保持一致。

## 建用户和共享组

先查一下组和用户是否已经存在，避免重复创建。下面的命令需要 root 或 sudo 权限：

```bash
getent group build || sudo groupadd build
id deploy-user || sudo useradd --create-home --gid build --shell /bin/bash deploy-user
sudo passwd -l deploy-user
```

`deploy-user` 的主组是 `build`。锁定本地密码后，仍然可以给它配置 SSH 公钥登录。

日常管理账号 `usertest` 保留原来的主组，只把 `build` 加为附加组：

```bash
sudo usermod -aG build usertest
id usertest
```

这里要用 `-aG`，否则可能覆盖账号已有的附加组。加组后重新登录一次，让新会话加载组变更。

## 让两个账号都能维护博客目录

部署账号要往 `/home/usertest/servers/astro-blog` 上传文件，我也要能继续用 `usertest` 修改它们。只把目录的所属组改成 `build` 还不够，新文件的组权限不一定包含写入权限，容易出现一边上传、另一边只能看的情况。

先把现有目录归到 `usertest:build`，给组增加读写权限，并让目录继承 `build` 组：

```bash
sudo chown -R usertest:build /home/usertest/servers/astro-blog
sudo chmod -R g+rwX /home/usertest/servers/astro-blog
sudo find /home/usertest/servers/astro-blog -type d -exec chmod g+s {} \;
```

`g+rwX` 里的大写 `X` 不会给普通文件一律加上执行权限。目录设置 SGID 后，新建内容会继承 `build` 组。

我还给目录加了默认 ACL，让之后创建的内容也能由另一个账号修改。如果系统里没有 `setfacl` 和 `getfacl`，先安装 `acl`：

```bash
sudo apt update
sudo apt install acl
```

给现有内容和目录默认权限：

```bash
sudo setfacl -R -m g:build:rwX /home/usertest/servers/astro-blog
sudo find /home/usertest/servers/astro-blog -type d -exec \
setfacl -m d:u::rwx,d:g::rwx,d:g:build:rwx,d:m::rwx,d:o::r-x {} \;
```

用 `ls -ld` 看目录，权限字符串里通常会有 `s` 和末尾的 `+`：前者是 SGID，后者表示目录带有 ACL。具体规则可以用 `getfacl` 查看。SGID 管组继承，ACL 管组权限；文件能不能删除，则取决于父目录的权限。

## 配 SSH 公钥登录

在自己的电脑上生成一对专用密钥：

```bash
ssh-keygen -t ed25519 -C "github-actions-astro-blog" -f ~/.ssh/deploy-user
```

把 `.pub` 文件里的公钥放到 Ubuntu 的 `authorized_keys`，私钥留在本地，之后保存到 GitHub Actions Secret。私钥不要提交到仓库，也不要出现在日志里。

```bash
sudo install -d -m 700 -o deploy-user -g build /home/deploy-user/.ssh
sudo nano /home/deploy-user/.ssh/authorized_keys
sudo chown deploy-user:build /home/deploy-user/.ssh/authorized_keys
sudo chmod 600 /home/deploy-user/.ssh/authorized_keys
```

`authorized_keys` 里放的是公钥。先用新密钥确认能登录，再改 SSH 认证设置。修改时保留一个已经登录的管理会话，万一配置有误还能恢复。

在 `/etc/ssh/sshd_config` 中针对部署账号添加规则：

```text
Match User deploy-user
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    PubkeyAuthentication yes
    AuthenticationMethods publickey
```

这条规则只匹配 `deploy-user`。SSH 配置还可能有其他 `Match` 规则或 include 文件，所以改完要看最终生效值：

```bash
sudo sshd -t
sudo sshd -T -C user=deploy-user,host=localhost,addr=127.0.0.1 \
  | grep -E 'passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|authenticationmethods'
sudo sshd -T -C user=usertest,host=localhost,addr=127.0.0.1 \
  | grep -E 'passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|authenticationmethods'
```

确认 `deploy-user` 只能用公钥登录、`usertest` 的登录方式没有意外变化后，再 reload SSH。然后开一个新终端分别试登录，确认实际效果。

## 在 GitHub Actions 保存连接信息

仓库的 **Settings → Secrets and variables → Actions** 中添加所需的 Secret，例如：

| Secret | 内容 |
| --- | --- |
| `DEPLOY_HOST` | 公网连接地址 |
| `DEPLOY_PORT` | FRP 对外监听的 SSH 转发端口 |
| `DEPLOY_USER` | `deploy-user` |
| `DEPLOY_SSH_KEY` | 部署专用私钥全文 |
| `DEPLOY_KNOWN_HOSTS` | 已核验过的 SSH 主机公钥记录 |

把核对过的服务器主机公钥记录保存到 `DEPLOY_KNOWN_HOSTS`。`ssh-keyscan` 可以取回公钥，但它本身不验证服务器身份；要先通过可信渠道核对指纹。

## 验证一下两边的权限

登录服务器后，先用部署账号创建一个测试文件：

```bash
id
touch /home/usertest/servers/astro-blog/deploy-test.txt
ls -l /home/usertest/servers/astro-blog/deploy-test.txt
```

再用 `usertest` 登录，确认能编辑或删除这个文件。反过来也试一次：由 `usertest` 创建文件，再确认 `deploy-user` 能访问。测试文件清理掉之后，再检查两种 SSH 登录方式，最后跑一次 Actions 部署。

配完之后，Actions 用 `deploy-user` 上传，日常维护仍归 `usertest`，两个账号通过 `build` 组共享博客目录。以后不再需要自动部署，删掉部署账号的公钥即可。
