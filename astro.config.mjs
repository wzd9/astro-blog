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
const IS_PROD = mode === 'production';
const env = loadEnv(mode, process.cwd(), '');
const SITE_URL = env.SITE_URL || 'https://blog.wzdboy.cn';

// https://astro.build/config
export default defineConfig({
	site: SITE_URL,
	devToolbar: {
		enabled: false,
	},
	integrations: [
		starlight({
			title: '我的技术文档',
			// dev 模式关闭 pagefind（避免 /pagefind/* 404 警告），build 模式开启（生成搜索索引）
			pagefind: IS_PROD,
			// 把博客页的主题选择同步到 Starlight Docs 页，以及让 Starlight 内置 ThemeSelect 的选择反向同步回博客页
			head: [
				{
					tag: 'script',
					attrs: { 'is:inline': true },
					content: `
						/* Starlight Docs 页 <-> 博客页 主题双向同步脚本
						(() => {
							const root = document.documentElement;

							// 1) 把 Starlight 的 dataset.theme 同步到 html class（博客自定义 CSS 变量 + Giscus 都依赖这一套）
							const syncFromDatasetToClass = (theme) => {
								if (theme !== 'light' && theme !== 'dark') return;
								root.classList.remove('light', 'dark');
								root.classList.add(theme);
								// 广播 themechange，供 Giscus 等订阅方接收
								document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
							};

							const getStoredTheme = () => {
								const sl = localStorage.getItem('starlight-theme');
								if (sl === 'light' || sl === 'dark') return sl;
								const legacy = localStorage.getItem('theme');
								if (legacy === 'light' || legacy === 'dark') return legacy;
								return null;
							};

							// 2) 监听 Starlight 内部 data-theme 变化（用户在 Docs 页点 ThemeSelect 下拉时触发）
							new MutationObserver(() => {
								syncFromDatasetToClass(root.dataset.theme);
							}).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

							// 3) 首帧强制对齐：Starlight ThemeProvider 已先设置完 dataset.theme 后，把 class/事件补齐
							syncFromDatasetToClass(root.dataset.theme);

							// 4) 跨标签页 storage 事件：博客页改了主题，Docs 页立即同步刷新 UI 下拉选择器状态
							window.addEventListener('storage', (e) => {
								if (e.key !== 'starlight-theme' && e.key !== 'theme') return;
								const stored = getStoredTheme();
								const finalTheme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
								// 更新 dataset.theme（会被 MutationObserver 再同步到 class）
								root.dataset.theme = finalTheme;
								// 同步 Starlight 内置 ThemeSelect 的下拉选择（选 light/dark/auto 图标态）
								if (typeof window.StarlightThemeProvider !== 'undefined') {
									window.StarlightThemeProvider.updatePickers(stored || 'auto');
								}
							});
						})();
					`,
				},
			],
			// Expressive Code 高亮配置：添加 mysql 语言支持
			expressiveCode: {
				shiki: {
					bundledLangs: ['common', 'mysql'],
				},
			},
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
