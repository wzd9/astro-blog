---
title: Java 基础
description: Java 开发环境、集合框架、异常体系与泛型等基础要点
---

# Java 基础

本页整理 Java 基础中最常用、面试和开发中最常遇到的知识点，作为速查手册使用。

## 开发环境

- **JDK**：推荐安装 JDK 17/21（Temurin 或 Corretto），配置好 `JAVA_HOME` 环境变量
- **IDE**：IntelliJ IDEA（社区版免费），调试、重构、Maven 集成都很完善
- **构建工具**：Maven 或 Gradle，参见 [Maven 文档](/docs/java/maven/)

验证安装：

```bash
java -version
javac -version
```

## 基本数据类型

| 类型 | 字节 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `byte` | 1 | 0 | 字节型，范围 -128 ~ 127 |
| `short` | 2 | 0 | 短整型 |
| `int` | 4 | 0 | 整型，最常用 |
| `long` | 8 | 0L | 长整型，字面量加 `L` |
| `float` | 4 | 0.0f | 单精度，字面量加 `f` |
| `double` | 8 | 0.0 | 双精度，默认浮点类型 |
| `char` | 2 | '\u0000' | 单个字符 |
| `boolean` | - | false | 布尔值 |

注意：金额计算不要使用 `float`/`double`，使用 `BigDecimal`。

## 集合框架

集合主要分为两大接口体系：

- **Collection**：单列集合
  - `List`：有序可重复 —— `ArrayList`（常用）、`LinkedList`
  - `Set`：无序不重复 —— `HashSet`、`TreeSet`
  - `Queue`：队列 —— `ArrayDeque`、`PriorityQueue`
- **Map**：双列键值对 —— `HashMap`（常用）、`LinkedHashMap`、`TreeMap`、`ConcurrentHashMap`

常用经验：

1. 遍历 `Map` 推荐用 `entrySet()` 或 `forEach`，不要先 `keySet()` 再 `get`（多一次哈希查找）；
2. 多线程环境下使用 `ConcurrentHashMap`，不要用 `Collections.synchronizedMap` 包装 `HashMap`；
3. `ArrayList` 随机访问快，`LinkedList` 插入删除快，但实际开发中几乎都用 `ArrayList`。

## 异常体系

```
Throwable
├── Error（JVM 级错误，如 OutOfMemoryError，程序无法处理）
└── Exception
    ├── RuntimeException（非受检异常，如 NullPointerException）
    └── 其他 Exception（受检异常，必须 try-catch 或 throws）
```

实践建议：

- 不要捕获 `Exception` 后什么都不做（吞异常）；
- 业务异常建议自定义 `BusinessException` 继承 `RuntimeException`，配合全局异常处理器统一返回；
- 资源释放使用 try-with-resources 语法。

## 泛型

泛型的作用是把类型检查提前到编译期，避免强制类型转换：

```java
List<String> list = new ArrayList<>();
list.add("hello");
String s = list.get(0);  // 无需强转
```

常用通配符：

- `<? extends T>`：上界通配符，只能读不能写（生产者，`PECS` 原则中的 Producer Extends）；
- `<? super T>`：下界通配符，能写读出来是 Object（消费者，Consumer Super）。

## 常用新特性（JDK 8+）

```java
// Lambda + Stream：集合处理
List<String> names = users.stream()
        .filter(u -> u.getAge() >= 18)
        .map(User::getName)
        .sorted()
        .toList();

// Optional：避免空指针
String city = Optional.ofNullable(user)
        .map(User::getAddress)
        .map(Address::getCity)
        .orElse("未知");

// 新时间 API（java.time）
LocalDate today = LocalDate.now();
LocalDateTime now = LocalDateTime.now();
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
```
