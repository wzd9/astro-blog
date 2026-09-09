---
title: Spring Boot
description: Spring Boot 快速上手、核心注解、配置文件与常用 Starter
---

# Spring Boot

Spring Boot 基于 Spring 框架，通过"约定优于配置"和自动装配，让开发者可以快速创建独立运行的、生产级别的 Spring 应用，是目前 Java 后端开发的事实标准。

## 核心特性

- **自动配置**：根据 classpath 中的依赖自动装配 Bean，大多数场景零配置
- **起步依赖（Starter）**：一个依赖引入一整套相关组件，不用自己拼凑版本
- **内嵌容器**：内置 Tomcat，`java -jar` 即可运行，无需单独部署 WAR 包
- **Actuator**：提供健康检查、指标监控等生产级端点

## 快速创建

推荐使用官方脚手架 [Spring Initializr](https://start.spring.io/) 创建项目，选择：

- Project：Maven
- Language：Java
- JDK：17 或 21
- 依赖：Spring Web、Lombok（可选）、Spring Boot DevTools（可选）

也可以使用 IDEA 的 "New Project → Spring Initializr" 向导。

## 最小示例

```java
@RestController
@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @GetMapping("/hello")
    public String hello() {
        return "Hello, Spring Boot!";
    }
}
```

启动后访问 `http://localhost:8080/hello` 即可看到返回结果。

## 常用注解

| 注解 | 作用 |
| --- | --- |
| `@SpringBootApplication` | 启动类注解，包含自动配置 + 组件扫描 |
| `@RestController` | 声明 REST 控制器，返回 JSON |
| `@RequestMapping` / `@GetMapping` / `@PostMapping` | 路由映射 |
| `@Service` / `@Repository` / `@Component` | 把类交给 Spring 容器管理 |
| `@Autowired` / `@Resource` | 依赖注入（推荐构造器注入） |
| `@Configuration` + `@Bean` | Java 配置类，声明 Bean |
| `@Valid` + `@NotNull` 等 | 参数校验 |
| `@Transactional` | 声明式事务 |

## 配置文件

配置文件放在 `src/main/resources/` 下，支持 `application.properties` 和 `application.yml` 两种格式，推荐 YAML：

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/demo?useUnicode=true&characterEncoding=utf8
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

logging:
  level:
    com.example: debug
```

多环境配置使用 `application-dev.yml`、`application-prod.yml`，通过 `spring.profiles.active=dev` 切换。

## 常用 Starter

- `spring-boot-starter-web`：Web 开发（Spring MVC + 内嵌 Tomcat）
- `spring-boot-starter-data-redis`：Redis 集成
- `spring-boot-starter-validation`：参数校验
- `mybatis-spring-boot-starter`：MyBatis 集成（第三方）
- `spring-boot-starter-actuator`：监控端点
- `spring-boot-starter-test`：测试支持

## 推荐实践

1. 接口层做统一响应包装和全局异常处理（参见[博客文章](/blog/spring-boot-unified-response/)）；
2. 配置项使用 `@ConfigurationProperties` 绑定到配置类，而不是散落的 `@Value`；
3. 日志使用 SLF4J + Logback，不要在代码里 `System.out.println`；
4. 生产环境通过 Actuator + Prometheus 暴露监控指标。
