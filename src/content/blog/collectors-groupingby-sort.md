---
title: '关于 Collectors.groupingBy 按照某个字段进行分组并排序的问题'
description: 'Java Stream 中使用 Collectors.groupingBy 分组后顺序不固定的问题分析，以及分组并保持排序的解决方法。'
pubDate: '2025-01-04'
---

 最近，在工作中遇到一个问题，是关于Collectors.groupingBy 按照某个字段进行分组并排序的问题。特此记录。

 众所周知，对一个 List<Map<String, Object>> 类型的集合，如果需要按照元素中的某个字段进行分组，通常使用 lambda 表达式对集合进行流处理。然后使用 Collectors.groupingBy 函数进行分组，此方法源码如下:

```java
public static <T, K> Collector<T, ?, Map<K, List<T>>> groupingBy(Function<? super T, ? extends K> classifier) {
   return groupingBy(classifier, toList());
}
```

 该方法需要一个 Function 函数。返回方法如下：

```java
public static <T, K, A, D>
    Collector<T, ?, Map<K, D>> groupingBy(Function<? super T, ? extends K> classifier,
                                          Collector<? super T, A, D> downstream) {
        return groupingBy(classifier, HashMap::new, downstream);
    }
```

 从此方法中看出，除了一个 Function 函数外，还需要一个 默认的 HashMap，但是 HashMap 是一个无序集合，它存储键值对（key-value）但是不保证顺序。也就是说，当你遍历 HashMap 时，元素的顺序可能可插入的顺序无关。这是 HashMap 的特性，不像 LinkedHashMap 或者 TreeMap 那样可以保证顺序。所以，如果要保证按照某个字段进行分组后，还能同时保证排序，groupingBy 方法中需要将 HashMap 改为 LinkedHashMap 或者 TreeMap 即可。

## 示例如下：

### 1、使用 HashMap 接收数据时：

```java
package com.example.demo.test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class Test {

    public static void main(String[] args) {
        List<Map<String, Object>> list = getDate();
        Map<Object, List<Map<String, Object>>> dateMap = list.stream().
                collect(Collectors.groupingBy(e -> e.get("date")));
        System.out.println(dateMap);
    }

    public static List<Map<String, Object>> getDate(){
        List<Map<String, Object>> list = new ArrayList<>();
        Map<String, Object> map1 = new HashMap<>();
        Map<String, Object> map2 = new HashMap<>();
        Map<String, Object> map3 = new HashMap<>();
        map1.put("date", "20240830");
        map1.put("value", "张三1");
        map2.put("date", "20240926");
        map2.put("value", "张三2");
        map3.put("date", "20241028");
        map3.put("value", "张三3");
        list.add(map1);
        list.add(map2);
        list.add(map3);
        return list;
    }
}
```

 执行 main 方法，返回的 dateMap 顺序应该和 list 中的添加顺序一致。打印结果如下：

```java
{20240926=[{date=20240926, value=张三2}], 20241028=[{date=20241028, value=张三3}], 20240830=[{date=20240830, value=张三1}]}
```

 结果并非如此。

### 2、使用 LinkedHashMap/TreeMap 接收数据

```java
package com.example.demo.test;

import java.util.*;
import java.util.stream.Collectors;

/**
 * @Classname Test
 * @Description TODO
 * @Date 2025/1/4 14:59
 * @Created by wangrui
 */
public class Test {

    public static void main(String[] args) {
        List<Map<String, Object>> list = getDate();

        Map<Object, List<Map<String, Object>>> linkedHashMap = list.stream()
                .collect(Collectors.groupingBy(e -> e.get("date"), LinkedHashMap::new, Collectors.toList()));
        Map<Object, List<Map<String, Object>>> treeMap = list.stream()
                .collect(Collectors.groupingBy(e -> e.get("date"), TreeMap::new, Collectors.toList()));
        System.out.println("linkedHashMap接收数据：" + linkedHashMap);
        System.out.println("treeMap接收数据：" + treeMap);

    }

    public static List<Map<String, Object>> getDate(){
        List<Map<String, Object>> list = new ArrayList<>();
        Map<String, Object> map1 = new HashMap<>();
        Map<String, Object> map2 = new HashMap<>();
        Map<String, Object> map3 = new HashMap<>();
        map1.put("date", "20240830");
        map1.put("value", "张三1");
        map2.put("date", "20240926");
        map2.put("value", "张三2");
        map3.put("date", "20241028");
        map3.put("value", "张三3");
        list.add(map3);
        list.add(map1);
        list.add(map2);
        return list;
    }
}
```

 执行 main 方法，返回的 dateMap 顺序应该和 list 中的添加顺序一致。打印结果如下：

```java
linkedHashMap接收数据：{20241028=[{date=20241028, value=张三3}], 20240830=[{date=20240830, value=张三1}], 20240926=[{date=20240926, value=张三2}]}
treeMap接收数据：{20240830=[{date=20240830, value=张三1}], 20240926=[{date=20240926, value=张三2}], 20241028=[{date=20241028, value=张三3}]}
```

 此时发现，linkedHashMap 接收数据是按照 list 插入元素的顺序进行排序的，但是 TreeMap 并非如此。这是因为 linkedHashMap 和 TreeMap 两者之间的差别。

1、LinkedHashMap:

-   LinkedHashMap 保留了插入元素的顺序。这意味着， list 中的 date 元素（对应Map元素）出现的顺序会决定 LinkedHashMap 的顺序。
    
-   因此，linkedHashMap 中的键值对是按照 List 中的顺序排列的。
    

2、TreeMap：

-   TreeMap 是一个基于红黑树的有序 Map 实现。它会对键进行自然排序（如果键实现了 Comparable 接口） 或者使用指定的 Comparator 进行排序。
-   由于 e.get("date") 此时的数据是一个String 类型，String 实现了 Comparable 接口，此时会按照自然顺序进行排序。这就是以上代码中， 使用 TreeMap 进行接收数据时，打印的结果是按照自然排序排列的原因。
-   因此，treeMap 中的键值对顺序可能与 list 的顺序不同，但一定是按键值的排序顺序排列的。
