// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import { loadEnv } from 'vite';
import { defineConfig, fontProviders } from 'astro/config';

// 按运行模式加载环境变量：
//   npm run dev   → .env.development（SITE_URL=http://localhost:4321）
//   npm run build → .env.production（SITE_URL=https://blog.wzdboy.cn）
// site 用于 RSS / sitemap / canonical 等绝对 URL；站内跳转均为根相对路径，无需区分环境
const mode = process.env.NODE_ENV || 'development';
const env = loadEnv(mode, process.cwd(), '');
const SITE_URL = env.SITE_URL || 'https://blog.wzdboy.cn';

// https://astro.build/config
export default defineConfig({
	site: SITE_URL,
	// 关闭智能标点，避免正文中的 --flag 被渲染成 en-dash、引号被转成弯引号
	markdown: {
		smartypants: false,
	},
	integrations: [
		starlight({
			title: '我的技术文档',
			// 文档最终放在 /docs/ 下
			// route: '/docs',
			sidebar: [
				{
					label: '文档首页',
					link: '/docs/',
				},
				{
					label: 'Java',
					items: [
						{ label: 'Java 简介', link: '/docs/java/' },
						{ label: 'Java 基础', link: '/docs/java/basics/' },
						{ label: 'Spring Boot', link: '/docs/java/spring-boot/' },
						{ label: 'Maven', link: '/docs/java/maven/' },
						{ label: 'Maven 私服（Nexus）', link: '/docs/java/maven-nexus/' },
						{ label: 'JVM 内存区域', link: '/docs/java/jvm-memory/' },
						{ label: 'SpringBoot 可扩展接口', link: '/docs/java/springboot-extensions/' },
					],
				},
				{
					label: '数据库',
					items: [
						{ label: 'Redis 入门', link: '/docs/database/redis-basics/' },
						{ label: 'MySQL EXPLAIN 解析', link: '/docs/database/mysql-explain/' },
						{ label: 'MySQL8 用户权限', link: '/docs/database/mysql8-privileges/' },
						{ label: 'CentOS8 安装 MySQL', link: '/docs/database/centos8-mysql/' },
					],
				},
				{
					label: '中间件',
					items: [
						{ label: 'Docker 入门', link: '/docs/middleware/docker-tutorial/' },
						{ label: 'Docker 安装 MySQL', link: '/docs/middleware/docker-mysql/' },
						{ label: 'Docker 启动 Redis', link: '/docs/middleware/docker-redis/' },
						{ label: 'Docker 安装 Nginx', link: '/docs/middleware/docker-nginx/' },
						{ label: 'Docker 安装 Nacos', link: '/docs/middleware/docker-nacos/' },
						{ label: 'Docker 安装 ZooKeeper', link: '/docs/middleware/docker-zookeeper/' },
						{ label: 'Nacos 集群部署', link: '/docs/middleware/nacos-cluster/' },
						{ label: 'ZooKeeper 集群搭建', link: '/docs/middleware/zookeeper-cluster/' },
						{ label: 'Nginx 入门', link: '/docs/middleware/nginx-basics/' },
						{ label: 'Seata Server 搭建', link: '/docs/middleware/seata-server/' },
					],
				},
				{
					label: '运维与监控',
					items: [
						{ label: 'Linux', link: '/docs/linux/' },
						{ label: 'Ubuntu', link: '/docs/ubuntu/' },
						{ label: 'FRP 内网穿透', link: '/docs/ops/frp/' },
						{ label: 'Uptime Kuma 安装', link: '/docs/ops/uptime-kuma/' },
						{ label: 'Bark Server 安装', link: '/docs/ops/bark-server/' },
						{ label: 'CentOS8 防火墙指令', link: '/docs/ops/firewall/' },
						{ label: 'Hexo 命令', link: '/docs/ops/hexo-commands/' },
					],
				},
			],
		}),
		mdx(), 
		sitemap(),
	],
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
