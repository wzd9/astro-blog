---
title: '服务器搭建（二）：WireGuard 家庭服务器架构'
description: '梳理公网入口、WireGuard 私有网络、PVE/PBS 与自动部署之间的访问关系，明确 VPN 和家庭 LAN 的网段边界。'
pubDate: '2026-09-29'
updatedDate: '2026-10-20'
tags: ['WireGuard', 'Homelab', '网络架构']
heroImage: '/src/assets/IMG_6471.png'
---

import Callout from '../../components/Callout.astro';
import StepCard from '../../components/StepCard.astro';

家庭服务器上的服务逐渐变多后，继续用端口映射管理 PVE、数据库和缓存，会让公网入口越来越难梳理。这次架构调整把访问分成三条清晰的路径：公开网站通过 Nginx 提供服务；可信设备通过 WireGuard 进入私有网络；GitHub Actions 则通过现有 FRP 部署通道，把部署包交给 Ubuntu 虚拟机中的自建服务。

## 01 / 新版架构

<figure class="article-figure">
	<img src="/images/blog/wireguard-home-server/architecture.png" alt="家庭服务器公网、WireGuard VPN、家庭 LAN 与部署链路架构图" />
	<figcaption>公开访问、可信设备管理、家庭服务与自动部署各走各自的链路；图中地址均为示例。</figcaption>
</figure>

架构由四个部分组成：云端承接公开入口和 WireGuard 服务端；N150 运行 Proxmox VE 与 Ubuntu 应用虚拟机；N100 负责 Proxmox Backup Server 备份；受信任的电脑和手机通过 WireGuard 访问需要保护的管理面。

<Callout type="info" title="地址说明">
下文使用 `10.98.0.0/24` 作为 WireGuard VPN 示例网段，使用 `10.98.0.0/24` 作为家庭 LAN 示例网段。实际部署时请先核对路由器、云网络和客户端已有网段，避免重叠。
</Callout>

| 区域 | 设备或服务 | 职责 |
| --- | --- | --- |
| 公网入口 | 域名、云服务器、Nginx | 为博客等明确面向访客的服务提供 HTTPS 入口 |
| 私有访问 | WireGuard Server、电脑、手机、家庭侧 Peer | 为自己和受信任设备建立加密访问路径 |
| 虚拟化与备份 | N150 / Proxmox VE、N100 / PBS | 运行家庭虚拟机，并把备份职责交给独立设备 |
| 应用与部署 | Ubuntu 虚拟机、GitHub Actions、FRP | 承载应用和自建服务，接收自动化部署包 |

## 02 / 为什么从端口映射转向组网

FRP 适合把明确需要公网访问的服务转发到内网，也可以服务于受控的自动部署链路。但 PVE 管理界面、MySQL、Redis 等服务本身不需要面向所有公网用户开放。每多一个公网映射，都需要额外维护访问控制、认证、告警和后续变更。

接入 WireGuard 后，管理设备先通过密钥建立 VPN，再按路由访问家庭 LAN 中允许访问的主机。这样可以把公网入口和管理入口分开管理：网站继续使用域名、Nginx 和 HTTPS；PVE、PBS 和内部服务则限制在家庭网络与 VPN 路径内。

<div class="compare-grid">
	<div class="compare-card compare-old"><span>原有访问思路</span><strong>公网客户端</strong><i>→</i><strong>多个 FRP 映射</strong><i>→</i><strong>各类内网服务</strong></div>
	<div class="compare-card compare-new"><span>调整后的访问思路</span><strong>公开访客 → Nginx → 公开网站</strong><strong>可信设备 → WireGuard → 私有服务</strong><strong>GitHub Actions → FRP → 部署服务</strong></div>
</div>

## 03 / 网络与设备规划

下面是一套便于说明的地址规划。VPN 和家庭 LAN 使用不同网段；同一 LAN 中的设备地址仍需按路由器 DHCP 与静态租约情况调整。

| 网络或节点 | 示例地址 | 用途 |
| --- | --- | --- |
| WireGuard VPN | `10.98.0.0/24` | 云端、家庭侧 Peer 与可信客户端之间的 VPN 地址 |
| 云端 WireGuard Server | `10.98.0.1` | VPN 服务端示例地址 |
| 电脑 / 手机 Peer | `10.98.0.10`、`10.98.0.11` | 为每台可信设备分别分配地址与密钥 |
| 家庭 LAN | `10.98.0.0/24` | 家庭路由器下的物理主机和虚拟机网络 |
| N150 / PVE | `10.98.0.10` | 运行 Proxmox VE 的家庭服务器 |
| N100 / PBS | `10.98.0.20` | 承载 Proxmox Backup Server 的备份设备 |
| Ubuntu 虚拟机 | `10.98.0.30` | 承载应用、自建服务和部署接收服务 |

**路由配置要和真实拓扑一致。** 云端 Peer 需要知道到家庭 LAN 的路径，家庭侧 WireGuard 节点需要为 VPN 客户端提供正确的回程路由。具体 `AllowedIPs`、转发和防火墙规则取决于 WireGuard Peer 放在路由器、PVE 还是独立虚拟机上，不能直接照抄一份配置覆盖所有网络。

## 04 / 三条关键访问链路

### 公开服务：面向访客

<div class="route-flow" aria-label="公开服务访问流程"><span>访客</span><b>→</b><span>域名 / HTTPS</span><b>→</b><span>云端 Nginx</span><b>→</b><span>公开网站</span></div>

只把确实需要公开访问的 Web 服务放在这条链路上。PVE、PBS、数据库和缓存不应因为部署方便就顺手添加公网映射。

### 私有服务：可信设备管理

<div class="route-flow" aria-label="可信设备访问流程"><span>电脑 / 手机</span><b>→</b><span>WireGuard VPN</span><b>→</b><span>家庭 LAN</span><b>→</b><span>PVE / PBS / Ubuntu</span></div>

设备连接 VPN 后，根据路由和防火墙策略访问 N150 上的 PVE、N100 上的 PBS，以及 Ubuntu 虚拟机中的内部服务。服务本身仍要保留认证和最小权限设置，VPN 不替代应用层的安全控制。

### 自动部署：GitHub Actions 到 Ubuntu

<div class="route-flow" aria-label="自动部署流程"><span>GitHub Actions</span><b>→</b><span>云端 FRP 通道</span><b>→</b><span>Ubuntu 部署服务</span><b>→</b><span>应用更新</span></div>

这条链路沿用现有 FRP 部署方案，把部署包送到 Ubuntu 虚拟机中的自建服务。FRP 仅承担部署所需的转发；不要复用这条通道暴露 PVE、PBS、数据库或日常管理端口。部署凭据应使用专用密钥，并限制目标目录和可执行操作。

## 05 / 端口与安全边界

| 服务 | 示例端口 | 公网策略 | 访问边界 |
| --- | --- | --- | --- |
| HTTP / HTTPS | TCP `80`、`443` | 按公开站点需要开放 | 由 Nginx 做 TLS 终止和反向代理 |
| WireGuard | UDP `51820` | VPN 需要时开放 | 仅用于 VPN 握手与加密流量 |
| SSH | TCP `22` | 按需限制来源 | 优先密钥登录，并限制允许登录的账户 |
| FRP 部署转发 | 按现有配置 | 仅开放部署链路需要的入口 | 只到达 Ubuntu 部署服务 |
| PVE / PBS / MySQL / Redis | 依服务配置 | 不直接向公网开放 | 限制在家庭 LAN 与受控 VPN 路径 |

<Callout type="warning" title="修改网络配置前">
先保留本地或带外管理入口，并准备回滚方式。云安全组和系统防火墙都要检查；WireGuard 使用 UDP，TCP 端口规则不能代替 UDP 放行。设备遗失或不再可信时，应撤销对应 Peer。
</Callout>

## 06 / WireGuard 接入与验证

配置步骤会随 Peer 所在位置变化。以下流程用于核对部署顺序，具体命令和接口名称请结合你的系统、网卡和路由器配置。

<StepCard number="01" title="先确认两侧网段" result="VPN 与家庭 LAN 不重叠，且客户端当前网络不会与目标网段冲突。">
列出云端、家庭 LAN、VPN 和移动客户端所在网络。本文的示例是 VPN `10.98.0.0/24`、家庭 LAN `10.98.0.0/24`。
</StepCard>

<StepCard number="02" title="为每个设备配置独立 Peer" result="每个客户端都有独立地址，服务端能看到对应 Peer 的握手时间。">
分别生成并保管密钥，为电脑和手机单独创建 Peer。只在需要建立 VPN 的公网接口开放 WireGuard 使用的 **UDP** 端口；不要共享客户端私钥。
</StepCard>

<StepCard number="03" title="配置路由、转发与防火墙" result="客户端能到达策略允许的家庭地址，返回流量也能沿正确路径回到 VPN。">
根据 WireGuard 节点的实际位置检查 `AllowedIPs`、IPv4 转发、家庭侧回程路由和 PVE/Ubuntu 防火墙。若 WireGuard 运行在云端与家庭两端，确保两端都声明正确的对端网段。
</StepCard>

<StepCard number="04" title="从外部网络逐项验证" result="握手正常；PVE、PBS 和需要访问的 Ubuntu 服务按策略可达；公网网站仍可正常访问。">
先用手机蜂窝网络测试，再用电脑的外部网络验证。检查 VPN 握手、私网路由、服务端口和 DNS，逐项定位失败发生在哪一段。
</StepCard>

在 Linux 上可以用下面的命令查看接口状态。`wg0` 只是常见示例名称，请替换成实际接口。

```bash
sudo wg show
sudo systemctl status wg-quick@wg0
```

## 07 / 监控与日常维护

- 检查域名解析、HTTPS 证书和 Nginx 反向代理是否正常。
- 观察云端与家庭侧 WireGuard Peer 的握手时间、路由和防火墙日志。
- 确认 N150 / PVE 上的虚拟机状态，以及 N100 / PBS 的备份任务和存储空间。
- 检查 Ubuntu 应用服务、数据库、缓存与部署接收服务的健康状态。
- 演练一次备份恢复，并确认 GitHub Actions 部署失败时有可执行的回滚流程。

监控优先通过已存在的 VPN 或主机侧采集路径访问私有服务，避免为了监控再增加一个公网映射。告警信息可以区分公网入口、VPN、主机、备份和单个应用，便于快速判断故障范围。

## 08 / 小结

这套架构把访问职责分开：**公开网站走 Nginx 与 HTTPS，可信设备通过 WireGuard 访问家庭私有网络，GitHub Actions 经 FRP 把部署包送到 Ubuntu 服务。** N150 运行 PVE，N100 运行 PBS，Ubuntu 虚拟机承载应用；VPN 使用 `10.98.0.0/24`，家庭 LAN 使用 `10.98.0.0/24` 作为互不重叠的示例网段。

后续增加服务时，先判断它属于公开访问、可信设备管理还是自动部署，再决定入口和权限范围。这样网络结构更容易理解，端口策略、备份与故障排查也能各自保持清晰。
