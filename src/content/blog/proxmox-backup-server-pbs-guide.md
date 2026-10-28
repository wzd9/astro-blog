---
title: '服务器搭建（三）PBS 安装、配置与日常维护'
description: '在独立的 N100 小主机上部署 Proxmox Backup Server，从 WireGuard 组网到 PVE 备份任务、Prune/GC 与恢复演练。'
pubDate: '2026-10-28'
tags: ['Homelab', 'Proxmox', '备份', 'WireGuard']
heroImage: '/src/assets/泰山云海.jpg'
---

PVE 上跑着虚拟机之后，备份这件事就绕不开了。把备份放在 PVE 本机其实没多大意义，主机一挂，虚拟机和备份一起没了。所以这次把家里另一台 N100 单独拿出来，裸机装了 Proxmox Backup Server（PBS），只负责收备份。

这篇记录一下整个过程：装系统、用 WireGuard 打通两台机器、在 PVE 里挂上 PBS 存储、建备份任务，最后是 Prune 和 GC 这两个容易搞混的功能。文中的地址和配置都来自当时的记录，隔一段时间可能会变，动手前先看一眼设备当前的状态。

## 为什么备份要单独放一台机器

PBS 是 Proxmox 官方的备份服务器，专门接收 PVE 的虚拟机备份，自带去重、压缩和保留策略。几个角色分工如下：

- **PVE**：跑虚拟机；
- **PBS**：收备份、存备份；
- **WireGuard**：让不在同一个网络里的设备通过加密隧道互通；
- **恢复演练**：验证备份真的能用。

这里有个很容易被忽略的点：**备份任务显示成功，不代表一定恢复得出来。** 任务日志只能说明数据写进去了，能不能读回来，得实际恢复一次才知道。

## 设备和网络

| 设备 | 用途 | 配置 |
| --- | --- | --- |
| N150 | PVE 主机，跑虚拟机 | PVE 9.2.5，Debian 13.6 |
| N100 | 独立 PBS 备份服务器 | 16GB 内存，256GB SSD，另有 1TB 机械盘待接入 |
| 阿里云轻量服务器 | WireGuard 服务端与公网中转 | Ubuntu 22.04，2 vCPU / 2GB |

N100 和 N150 是两台机器，PBS 是裸机安装的，没有跑在 PVE 里面。这样就算 PVE 哪天开不了机，备份数据本身还在另一台设备上。

网络地址：

| 节点 | 局域网地址 | WireGuard 地址 |
| --- | --- | --- |
| 路由器/网关 | `192.168.5.1` | — |
| N150 / PVE | `192.168.5.3` | `10.98.0.2` |
| N100 / PBS | `192.168.5.4` | `10.98.0.3` |
| WireGuard 服务端 | 公网服务器 | `10.98.0.1` |
| iPhone / Windows / Mac | — | `10.98.0.9` / `.10` / `.11` |

服务端监听 UDP `51820`，云防火墙放行了这个端口，也开了 IPv4 转发。管理页面分别是：

- PVE：`https://192.168.5.3:8006/`
- PBS：`https://192.168.5.4:8007/`

## 安装 PBS

N100 上直接裸机安装，系统装在内部的 256GB SSD 上。根文件系统在 LVM 逻辑卷 `pbs-root` 里，ext4，Swap 约 8GB。登录后界面显示的版本是 4.2.0。

| 项目 | 配置 |
| --- | --- |
| 系统盘 | 内部 256GB Kimtigo SSD |
| 根文件系统 | `pbs-root`（LVM，ext4） |
| Swap | 约 8GB |
| 数据盘 | 1TB 机械硬盘（记录时尚未接入） |

浏览器第一次打开 `https://192.168.5.4:8007/` 会提示证书风险，别直接点忽略，先核对地址和指纹，确认是自己的 PBS 再往下走。

> **注意：** 管理员密码和私钥不要写进公开文档、截图或者代码仓库。平时用权限够用的账户就行，没必要一直挂着 root。

## 用 WireGuard 打通 PVE 和 PBS

两台机器不在同一个局域网，直接用局域网地址是通不了的。用 WireGuard 建一条隧道之后，PVE 和 PBS 就能通过 VPN 地址互相访问。

配置目标是 PVE `10.98.0.2`、PBS `10.98.0.3`、服务端 `10.98.0.1`。PBS 的配置文件在 `/etc/wireguard/wg0.conf`，私钥权限设为 `600`：

```bash
chmod 600 /etc/wireguard/pbs_private.key
```

检查状态用这几条：

```bash
ip addr show wg0
wg show
systemctl status wg-quick@wg0
ip route
```

分别看 `wg0` 接口在不在、对端有没有握手和流量、服务状态、以及路由表。如果 `wg0` 没起来，先别急着覆盖配置文件，看一下配置内容和服务日志，确认问题出在哪再改。

需要开机自启的话：

```bash
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
systemctl restart wg-quick@wg0
```

> **注意：** 重启 VPN 会临时断开远程连接。如果你正通过 VPN 管理这台机器，先确认有本地控制台或者别的恢复办法，再执行重启。

连通性测试用 ping：

```bash
# PBS → PVE
ping -c 4 10.98.0.2
ping -c 4 192.168.5.3

# PVE → PBS
ping -c 4 10.98.0.3
ping -c 4 192.168.5.4
```

当时双向都验证过，PVE 也通过 PBS 存储成功做过备份。

如果 VPN 地址通、局域网地址不通，一般是路由或者网段访问策略的问题；反过来 ping 不通也不一定就是 PBS 有问题，防火墙可能把 ICMP 拦了。结合 `wg show` 里的握手时间、路由表和 8007 端口能不能访问来判断更靠谱。

Mac 上还出现过短暂访问不了 PVE/PBS、过一会儿自己恢复的情况。遇到时按这个顺序看：客户端 WireGuard 连没连、对端最近有没有握手、路由有没有覆盖 VPN 网段、两端的接口和路由状态、最后再看云安全组和本机防火墙有没有动过。

## 建一个数据存储

PBS 装好之后还是空的，得先建个数据存储（datastore）放备份。在左侧「数据存储」里点「添加数据存储」：

<figure class="article-figure">
	<img src="/images/blog/proxmox-backup-server-pbs-guide/pbs-backup.png" alt="PBS 数据存储页面，已有 pbs-backup 存储，容量 212.53 GB" />
	<figcaption>PBS 4.2.0 的数据存储页面，左侧列表里是已有存储和添加入口。</figcaption>
</figure>

<figure class="article-figure">
	<img src="/images/blog/proxmox-backup-server-pbs-guide/add-backup.png" alt="PBS 新增数据存储对话框，填写名称、类型和绝对路径" />
	<figcaption>新增数据存储：名称自定义，类型选「本地」，备份路径填 N100 上新建目录的绝对路径。</figcaption>
</figure>

名称自己起，数据存储类型选「本地」，备份路径填 N100 上提前建好的目录，要写绝对路径。GC 时间表和精简时间表保持默认的 daily 就行，其他选项暂时不用动。

## 在 PVE 里挂上 PBS

PBS 那边有存储了，接下来让 PVE 能访问它。入口是 **数据中心 → 存储 → 添加 → Proxmox Backup Server**。

| 字段 | 含义 |
| --- | --- |
| ID | PVE 里显示的存储名称，和上一步建的存储同名，如 `pbs-backup` |
| 服务器 | PBS 可访问的 IP 或主机名 |
| 用户名 | 需要有目标 datastore 权限的 PBS 账户 |
| 密码或 API Token | 按实际认证方式填 |
| Datastore | PBS 里已经建好的数据存储 |
| 指纹 | 核对 PBS 当前显示的证书指纹 |

证书指纹：

```text
79:53:9e:9c:d4:81:9a:15:2a:22:29:c1:bc:32:a1:56:2c:bf:d0:61:72:ee:a7:cb:ae:f3:65:84:cb:32:8e:b2
```

指纹在证书重新生成后会变，添加时以 PBS 当前界面显示的为准。服务器地址按实际网络选局域网或 VPN 地址，路由没确认之前不要来回切。

## 建备份任务

存储挂上之后，到 PVE 的 **数据中心 → 备份**，右上角点「新增」。

<figure class="article-figure">
	<img src="/images/blog/proxmox-backup-server-pbs-guide/pve-add-pbs.png" alt="PVE 创建备份作业对话框，节点 pve、存储 pbs-backup、计划 2:00、快照模式" />
	<figcaption>创建备份作业：节点选当前 PVE，存储选 <code>pbs-backup</code>，勾选启用后点「创建」。</figcaption>
</figure>

节点选当前的 PVE，存储填上一步的 `pbs-backup`，计划时间按自己的习惯来，我这边设的是 2:00。选择模式选「包括选中的虚拟机」，模式选「快照」，压缩用 ZSTD。勾上「启用」，点右下角创建。

建好之后建议先手动跑一次，确认整条链路没问题：任务日志里能看到成功，PBS 那边也能看到对应的快照。这比等定时任务半夜失败要安心得多。

## Prune 和 GC 不是一回事

这两个功能名字都跟清理有关，但干的事完全不同。

### Prune（修剪）

按保留策略删掉不需要的旧快照。策略别设得太激进，不然想回滚到某个版本的时候可能已经没了。调整之前先想清楚自己要保留多久。

### GC（垃圾回收）

PBS 靠数据块去重省空间，同一个数据块可能被好几个快照引用。Prune 删了快照之后，对应的数据块不一定马上释放，因为可能还有别的快照在引用它。GC 负责把已经没人引用的块清掉，空间才会真正回来。

<figure class="article-figure">
	<img src="/images/blog/proxmox-backup-server-pbs-guide/Prune.png" alt="PBS 中的 Prune 任务配置" />
	<figcaption>Prune 按保留策略清理旧快照。</figcaption>
</figure>

<figure class="article-figure">
	<img src="/images/blog/proxmox-backup-server-pbs-guide/gc.png" alt="PBS 中的 Garbage Collection 任务配置" />
	<figcaption>GC 回收已经没有快照引用的数据块。</figcaption>
</figure>

## 附录：常用命令

```bash
# PBS：磁盘与文件系统
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS,MODEL
df -hT

# PBS：WireGuard
ip addr show wg0
wg show
systemctl status wg-quick@wg0
ip route

# PBS：内核与硬件日志
journalctl -k -b -p err
journalctl -k -b -p warning
dmesg -T | grep -Ei 'error|fail|nvme|I/O|reset|timeout'
smartctl -a /dev/nvme0

# PVE：虚拟机与网络配置
qm config 100
cat /etc/network/interfaces
```

| 服务 | 地址 |
| --- | --- |
| PVE Web | `https://192.168.5.3:8006/` |
| PBS Web | `https://192.168.5.4:8007/` |
| PVE WireGuard | `10.98.0.2` |
| PBS WireGuard | `10.98.0.3` |
| WireGuard 服务端 | `10.98.0.1:51820/UDP` |

---
以上就是本次 PBS 安装配置的全部内容。