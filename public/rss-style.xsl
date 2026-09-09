<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:output method="html" doctype-system="about:legacy-compat" />
	<xsl:template match="/rss">
		<html lang="zh-CN">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title><xsl:value-of select="channel/title" /> · RSS 订阅</title>
				<style>
					* {
						box-sizing: border-box;
					}
					body {
						margin: 0;
						font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC',
							'Microsoft YaHei', sans-serif;
						color: #27272a;
						background: #fafafa;
						line-height: 1.6;
					}
					main {
						max-width: 720px;
						margin: 0 auto;
						padding: 3rem 1.25rem 4rem;
					}
					.home {
						display: inline-block;
						font-size: 0.88rem;
						color: #2337ff;
						text-decoration: none;
						margin-right: 1rem;
						margin-bottom: 0.5rem;
					}
					.home:hover {
						text-decoration: underline;
					}
					.badge {
						display: inline-block;
						background: #2337ff;
						color: #fff;
						font-size: 0.75rem;
						font-weight: 700;
						letter-spacing: 0.1em;
						padding: 0.2em 0.7em;
						border-radius: 999px;
					}
					h1 {
						margin: 0.8rem 0 0.3rem;
						font-size: 1.8rem;
					}
					.site-desc {
						margin: 0 0 1.2rem;
						color: #71717a;
					}
					.hint {
						background: #eef1ff;
						border: 1px solid #c7d2fe;
						border-radius: 10px;
						padding: 0.8rem 1rem;
						font-size: 0.9rem;
						color: #3730a3;
						margin-bottom: 2rem;
					}
					h2 {
						font-size: 1.05rem;
						color: #52525b;
						border-bottom: 1px solid #e4e4e7;
						padding-bottom: 0.5rem;
					}
					ul {
						list-style: none;
						margin: 0;
						padding: 0;
					}
					li {
						padding: 1.1rem 0;
						border-bottom: 1px solid #e4e4e7;
					}
					li a {
						color: #2337ff;
						font-weight: 600;
						font-size: 1.05rem;
						text-decoration: none;
					}
					li a:hover {
						text-decoration: underline;
					}
					.date {
						color: #a1a1aa;
						font-size: 0.85rem;
						margin: 0.25rem 0 0.4rem;
					}
					li p {
						margin: 0;
						color: #52525b;
						font-size: 0.92rem;
					}
				</style>
			</head>
			<body>
				<main>
					<header>
						<a class="home" href="/">← 回到首页</a>
						<span class="badge">RSS</span>
						<h1><xsl:value-of select="channel/title" /></h1>
						<p class="site-desc"><xsl:value-of select="channel/description" /></p>
						<div class="hint">
							本页是博客的 RSS 订阅源。将地址栏链接复制到 RSS 阅读器（如 Folo、Feedly、NetNewsWire），
							有新文章时会自动推送给您。
						</div>
					</header>
					<h2>文章列表（共 <xsl:value-of select="count(channel/item)" /> 篇）</h2>
					<ul>
						<xsl:for-each select="channel/item">
							<li>
								<a href="{link}"><xsl:value-of select="title" /></a>
								<div class="date"><xsl:value-of select="substring(pubDate, 6, 11)" /></div>
								<p><xsl:value-of select="description" /></p>
							</li>
						</xsl:for-each>
					</ul>
				</main>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
