---
title: 'hexo 命令'
description: 'Hexo 常用命令备忘：安装初始化、新建文章、本地预览、生成静态文件与部署到 GitHub。'
---

1、安装和启动

```plaintext
# 安装hexo
npm install -g hexo-cli

# 初始化 hexo
hexo init

# hexo启动
hexo s
```

2、发布新文章

 在博客根目录下执行：hexo new "我的第一篇文章"，会在source/\_posts文件夹内生成一个.md文件。编辑该文件，修改起始字段为：

```plaintext
title 文章的标题
日期创建日期 （文件的创建日期）
更新 修改日期 （文件的修改日期）
comments 是否开启评论true
标签 标签
类别 分类
永久链接 url 中的名称（文件名）
```

 本地生成静态文件，将静态文件传至 GitHub, 运行一下命令：

```plaintext
hexo g
hexo d
```
