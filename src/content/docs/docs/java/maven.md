---
title: Maven
description: Maven 坐标、依赖管理、常用命令与国内镜像配置
---

# Maven

Maven 是 Java 项目最主流的构建工具和依赖管理工具，通过 `pom.xml` 描述项目结构、管理第三方依赖，并提供标准化的构建生命周期。

## 核心概念：坐标

Maven 用三个坐标唯一定位一个依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>  <!-- 组织/团体 -->
    <artifactId>spring-boot-starter-web</artifactId> <!-- 项目/模块 -->
    <version>3.3.0</version>                     <!-- 版本 -->
</dependency>
```

- **groupId**：通常是公司或组织域名倒写，如 `com.alibaba`
- **artifactId**：模块名
- **version**：版本号，`SNAPSHOT` 表示快照版（开发中），`RELEASE` 表示正式版

## 依赖范围 scope

| scope | 编译 | 测试 | 运行 | 典型用途 |
| --- | --- | --- | --- | --- |
| `compile`（默认） | ✅ | ✅ | ✅ | 绝大多数依赖 |
| `provided` | ✅ | ✅ | ❌ | 容器已提供，如 `servlet-api` |
| `test` | ❌ | ✅ | ❌ | 如 JUnit |
| `runtime` | ❌ | ✅ | ✅ | 如 JDBC 驱动 |

## 常用命令

```bash
mvn clean            # 清理 target 目录
mvn compile          # 编译主代码
mvn test             # 运行测试
mvn package          # 打包（jar/war），会先执行测试
mvn package -DskipTests  # 打包并跳过测试
mvn install          # 打包并安装到本地仓库
mvn dependency:tree  # 查看依赖树，排查依赖冲突
```

## 国内镜像配置

Maven 默认从中央仓库下载依赖，国内访问较慢，建议在 `settings.xml` 中配置阿里云镜像。

`settings.xml` 位置：Windows 下为 `C:\Users\用户名\.m2\settings.xml`（没有可手动创建）。

```xml
<settings>
  <mirrors>
    <mirror>
      <id>aliyunmaven</id>
      <mirrorOf>*</mirrorOf>
      <name>阿里云公共仓库</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

IDEA 中确认：`Settings → Build Tools → Maven → User settings file` 指向该文件。

## 依赖冲突排查

引入多个依赖时，可能间接引入同一个库的不同版本（Maven 默认按"最短路径 + 先声明"原则裁决）。出现 `NoSuchMethodError`、`ClassNotFoundException` 时：

1. 执行 `mvn dependency:tree` 查看依赖树；
2. 找到冲突的包和版本；
3. 用 `<exclusions>` 排除不需要的传递依赖：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>some-lib</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-log4j12</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

## Spring Boot 中的版本管理

Spring Boot 项目继承 `spring-boot-starter-parent` 后，常用依赖（Spring、Jackson、Logback 等）的版本由父 POM 统一管理，引入 starter 时**不需要写版本号**，避免版本不兼容：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
</parent>
```
