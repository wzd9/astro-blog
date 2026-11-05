---
title: 'SpringBoot 的可扩展接口'
description: '介绍 Spring 与 Spring Boot 启动过程中涉及的可扩展接口、各扩展点的使用场景及调用顺序。'
---

本文转自 [https://cloud.tencent.com/developer/article/2322443](https://cloud.tencent.com/developer/article/2322443)。

## 一、介绍

 本文主要介绍 Spring 和 SpringBoot 在启动过程中涉及到的可扩展接口，以及各个扩展点的使用场景。并整理出一个 bean 在 Spring 内部从被加载到到最后初始化完成所有可扩展点的顺序调用图。

## 二、可扩展接口启动调用顺序图

![时序图](/images/blog/springboot-extension-points/springboot-extension-points-1.png) 

## 三、ApplicationContextInitializer

 该接口在 org.springframework.context 包下，这是整个 Spring 容器在刷新之前初始化 ConfigurableApplicationContext 的回调接口，简单来说就是在容器刷新之前调用此类的 initialize 方法。这个点允许用户自己扩展。用户可以在整个 Spring 容器还没有被初始化之前做一些事情。适用的场景：在开始激活一些配置，或者利用这个时候 class 还没有被类加载器加载的时机，进行动态字节码注入等操作。扩展方式如下：

```java
package com.example.demo;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

public class ApplicationContextInitializerTest implements ApplicationContextInitializer<ConfigurableApplicationContext>{
    
    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        boolean active = applicationContext.isActive();
        System.out.println("active=" + active);
        System.out.println("ApplicationContextInitializerTest的initialize方法执行");
    }
}
```

 因为此时容器还没有被初始化，想要扩展生效，有以下的几种方式：

 1、在启动类中将 ApplicationContextInitializerTest 对象添加到 SpringApplication 中。

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication springApplication = new SpringApplication(DemoApplication.class);
        springApplication.addInitializers(new ApplicationContextInitializerTest());
        springApplication.run(args);
//        SpringApplication.run(DemoApplication.class, args);
    }
}
```

 2、在配置文件中进行配置

```properties
context.initializer.classes=com.example.demo.ApplicationContextInitializerTest
```

 3、利用Spring SPI扩展，在spring.factories中加入如下信息

```properties
org.springframework.context.ApplicationContextInitializer=com.example.demo.ApplicationContextInitializerTest
```

 启动后打印如下信息:

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java ......
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-17 17:21:13.605  INFO 45505 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11
2024-12-17 17:21:13.605 DEBUG 45505 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
.
.
.
2024-12-17 17:21:13.973  INFO 45505 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.482 seconds (JVM running for 0.643)
```

## 四、BeanDefinitionRegistryPostProcessor

 该接口在 org.springframework.beans.factory.support 包下，这个接口在读取项目中的 beanDefinition 之后执行，提供一个补充的扩展点。适用的场景：你可以在这里动态注册自己的 beanDefinition，可以加载 classpath之外的 bean。扩展方式如下：

```java
package com.example.demo;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor;
import org.springframework.stereotype.Component;

@Component
public class BeanDefinitionRegistryPostProcessorTest implements BeanDefinitionRegistryPostProcessor {
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException {
        System.out.println("BeanDefinitionRegistryPostProcessorTest的注册方法执行");
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        System.out.println("BeanDefinitionRegistryPostProcessorTest的postProcessBeanFactory方法执行");
    }
}
```

 项目启动后打印日志如下：

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java ...

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-17 17:28:52.003  INFO 45585 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11
2024-12-17 17:28:52.004 DEBUG 45585 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
.
.
.
BeanDefinitionRegistryPostProcessorTest的注册方法执行
BeanDefinitionRegistryPostProcessorTest的postProcessBeanFactory方法执行
.
.
.
2024-12-17 17:28:52.385  INFO 45585 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.492 seconds (JVM running for 0.66)
```

## 五、BeanFactoryPostProcessor

 该接口在 org.springframework.beans.factory.config 包下，这个接口是 beanFactory 的扩展接口，调用时机在 Spring 读取 bean Definition 信息之后，实例化 bean 之前。在这个时机，用户可以通过实现这个扩展接口来自行处理一些东西，比如修改已经注册的 beanDefinition 的元信息。扩展方式为：

```java
package com.example.demo;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.stereotype.Component;

@Component
public class BeanFactoryPostProcessorTest implements BeanFactoryPostProcessor {
    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        System.out.println("BeanFactoryPostProcessorTest的postProcessBeanFactory方法执行");
    }
}
```

 项目启动后打印日志如下：

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java
.
.

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-17 17:54:01.036  INFO 45814 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11
2024-12-17 17:54:01.036 DEBUG 45814 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
2024-12-17 17:54:01.037  INFO 45814 --- [           main] com.example.demo.DemoApplication         : No active profile set, falling back to 1 default profile: "default"
BeanDefinitionRegistryPostProcessorTest的注册方法执行
BeanDefinitionRegistryPostProcessorTest的postProcessBeanFactory方法执行
BeanFactoryPostProcessorTest的postProcessBeanFactory方法执行
.
.
2024-12-17 17:54:01.408  INFO 45814 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.483 seconds (JVM running for 0.664)
```

## 六、InstantiationAwareBeanPostProcessor

 该接口在 org.springframework.beans.factory.config 包下，接口继承了 BeanPostProcess 接口，区别如下：

BeanPostProcess 接口只在 bean 的初始化阶段进行扩展（注入 Spring 上下文前后），而 InstantiationAwareBeanPostProcessor 接口在此基础上新增了三个方法（注意：本文的 Spring 版本为 v5.3.24），把可扩展的范围增加了实例化阶段和属性注入阶段。

-   **postProcessBeforeInstantiation**：实例化bean之前，相当于new这个bean之前。
-   **postProcessAfterInstantiation**：实例化bean之后，相当于new这个bean之后，属性填充之前被调用。
-   **postProcessProperties**：在属性填充阶段（即依赖注入）进行额外处理，例如：动态修改或计算属性值，条件性地注入属性值，为某些属性添加自定义逻辑。
-   **~postProcessPropertyValues~**（弃用）：bean已经实例化完成，在属性填充阶段触发，`@Autowired`,`@Resource`等注解原理基于此方法实现。
-   **postProcessBeforeInitialization**：初始化bean之前，相当于把bean注入spring上下文之前。
-   **postProcessAfterInitialization**：初始化bean之后，相当于把bean注入spring上下文之后。

 适用场景：写中间件或者业务中，都能利用这个特性。比如对实现了某一类接口的 bean 在各个生命期间进行收集，或者对某个类型的 bean 进行统一的赋值等等。扩展方式如下：

```java
package com.example.demo;

import org.springframework.beans.BeansException;
import org.springframework.beans.PropertyValues;
import org.springframework.beans.factory.config.InstantiationAwareBeanPostProcessor;
import org.springframework.stereotype.Component;

@Component
public class InstantiationAwareBeanPostProcessorTest implements InstantiationAwareBeanPostProcessor {

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("InstantiationAwareBeanPostProcessorTest的postProcessBeforeInitialization方法被执行");
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("InstantiationAwareBeanPostProcessorTest的postProcessAfterInitialization方法被执行");
        return bean;
    }

    @Override
    public Object postProcessBeforeInstantiation(Class<?> beanClass, String beanName) throws BeansException {
        System.out.println("InstantiationAwareBeanPostProcessorTest的postProcessBeforeInstantiation方法被执行");
        return null;
    }

    @Override
    public boolean postProcessAfterInstantiation(Object bean, String beanName) throws BeansException {
        System.out.println("InstantiationAwareBeanPostProcessorTest的postProcessAfterInstantiation方法被执行");
        return true;
    }

    @Override
    public PropertyValues postProcessProperties(PropertyValues pvs, Object bean, String beanName) throws BeansException {
        System.out.println("InstantiationAwareBeanPostProcessorTest的postProcessProperties方法被执行");
        return pvs;
    }
}
```

## 七、SmartInstantiationAwareBeanPostProcessor

 该接口在org.springframework.beans.factory.config 包下，此接口有三个触发方法：

-   **predictBeanType**：该触发点发生在 postProcessBeforeInstantiation 之前(在图上并没有标明，因为一般不太需要扩展这个点)，这个方法用于预测 bean 的类型，返回第一个预测成功的 Class 类型，如果不能预测返回 null，当调用 BeanFactory.getType(name) 时通过 bean 的名字无法得到 bean 的类型信息时就调用该回调方法来决定类型信息。
    
-   **determineCandidateConstructors**：该触发点在 postProcessBeforeInstantiation 之后，用于确定该 bean 的构造函数，返回的是该 bean 的所有构造函数列表。用户可以扩展这个点，用来自定义选择相应的构造器来实例化这个 bean。
    
-   **getEarlyBeanReference**：该触发点发生在 postProcessBeforeInstantiation 之后，当有循环依赖场景时，当 bean 实例化好之后，为防止循环依赖，会提前暴露回调方法，用于 bean 实例化的后置处理。这个方法就是在提前暴露的回调方法中触发。
    
    扩展方式如下：
    
    ```java
    package com.example.demo;
    
    import org.springframework.beans.BeansException;
    import org.springframework.beans.factory.config.SmartInstantiationAwareBeanPostProcessor;
    import org.springframework.stereotype.Component;
    
    import java.lang.reflect.Constructor;
    
    @Component
    public class SmartInstantiationAwareBeanPostProcessorTest implements SmartInstantiationAwareBeanPostProcessor {
    
        @Override
        public Class<?> predictBeanType(Class<?> beanClass, String beanName) throws BeansException {
            System.out.println("predictBeanType方法执行");
            return beanClass;
        }
    
        @Override
        public Constructor<?>[] determineCandidateConstructors(Class<?> beanClass, String beanName) throws BeansException {
            System.out.println("determineCandidateConstructors方法执行");
            return null;
        }
    
        @Override
        public Object getEarlyBeanReference(Object bean, String beanName) throws BeansException {
            System.out.println("getEarlyBeanReference方法执行");
            return bean;
        }
    }
    ```
    

## 八、BeanFactoryAware

 该接口位于 org.springframework.beans.factory 包下，这个接口只有一个触发点，发生在 bean 实例化之后，注入属性之前，也就是 set 之前。这个接口的扩展点方法为 setBeanFactory，可以拿到 BeanFactory 这个属性。

 使用场景：可以在 bean 实例化之后，初始化之前，拿到 BeanFactory，在这个时候，可以对 bean 做特殊化的定制，也可以缓存 BeanFactory，后续拿来使用。扩展方式如下：

```java
package com.example.demo;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.BeanFactoryAware;
import org.springframework.stereotype.Component;

@Component
public class BeanFactoryAwareTest implements BeanFactoryAware {

    @Override
    public void setBeanFactory(BeanFactory beanFactory) throws BeansException {
        System.out.println("beanFactory=" + beanFactory);
    }
}
```

## 九、ApplicationContextAwareProcessor

 该类位于 org.springframework.context.support 包下，这个类内部有七个扩展可供实现（本文的 Spring 版本为v5.3.24），这个类触发的时机发生在 bean 实例化之后，初始化之前。

```java
private void invokeAwareInterfaces(Object bean) {
		if (bean instanceof EnvironmentAware) {
			((EnvironmentAware) bean).setEnvironment(this.applicationContext.getEnvironment());
		}
		if (bean instanceof EmbeddedValueResolverAware) {
			((EmbeddedValueResolverAware) bean).setEmbeddedValueResolver(this.embeddedValueResolver);
		}
		if (bean instanceof ResourceLoaderAware) {
			((ResourceLoaderAware) bean).setResourceLoader(this.applicationContext);
		}
		if (bean instanceof ApplicationEventPublisherAware) {
			((ApplicationEventPublisherAware) bean).setApplicationEventPublisher(this.applicationContext);
		}
		if (bean instanceof MessageSourceAware) {
			((MessageSourceAware) bean).setMessageSource(this.applicationContext);
		}
		if (bean instanceof ApplicationStartupAware) {
			((ApplicationStartupAware) bean).setApplicationStartup(this.applicationContext.getApplicationStartup());
		}
		if (bean instanceof ApplicationContextAware) {
			((ApplicationContextAware) bean).setApplicationContext(this.applicationContext);
		}
	}
```

 可以看到，该类用于执行各种驱动接口，在 bean 实例化之后，属性填充之后，通过执行上述 instanceof 后面标出的扩展接口，来获取对应容器的变量。

-   **EnvironmentAware**：用于获取 EnvironmentAware 的一个扩展类，可以获取系统内部的所有参数。
-   **EmbeddedValueResolverAware**：用于获取 StringValueResolver 的一个扩展类（EmbeddedValueResolverAware 接口中 setEmbeddedValueResolver 有一个 StringValueResolver 参数），StringValueResolver 用于获取基于 String 类型的 properties 的变量，一般我们用 @Value 注解的方式获取，如果实现了这个 Aware 接口，把 StringValueResolver 缓存起来，通过这个类去获取 String 类型的变量，效果是一样的。
-   **ResourceLoaderAware**：用于获取 ResourceLoader 的一个扩展类（同上），ResourceLoader 可以用于获取 classpath 内所有的资源对象，可以扩展此类来拿到 ResourceLoader 对象。
-   **ApplicationEventPublisherAware**：用于获取 ApplicationEventPublisher 的一个扩展类，ApplicationEventPublisher 可以用来发布事件，结合 ApplicationListener 来共同使用，下文在介绍 ApplicationListener 时会详细提到。这个对象也可以通过 spring 注入的方式来获得。
-   **MessageSourceAware**：用于获取 MessageSource 的一个扩展类， MessageSource 主要用来做国际化。
-   **ApplicationStartupAware**：用于获取 ApplicationStartup 的一个扩展类，主要提供一种方式用来追踪 Spring Boot 应用程序启动各个过程中的各个阶段，它允许你在应用程序启动时执行自定义的操作，比如记录启动的时间、日志、性能分析、监控等，帮助开发者分析启动性能。
-   **ApplicationContextAware**：用来获取 ApplicationContext 的一个扩展类，ApplicationContext 就是spring上下文管理器，可以手动的获取任何在 spring 上下文注册的 bean，我们经常扩展这个接口来缓存 spring 上下文，包装成静态方法。同时ApplicationContext 也实现了 BeanFactory，MessageSource，ApplicationEventPublisher 等接口，也可以用来做相关接口的事情。

## 十、BeanNameAware

 这个接口位于 org.springframework.beans.factory 包下，该接口也是 Aware 扩展的一种，触发点在 bean 初始化之前，也就是 postProcessBeforeInitialization 之前，这个接口的触发方法只有一个：setBeanName。

 使用场景：用户可以扩展这个点，在初始化 bean 之前拿到 Spring 容器中注册的 beanName，来自行修改这个 beanName 的值。

扩展方式如下：

```java
package com.example.demo;

import org.springframework.beans.factory.BeanNameAware;
import org.springframework.stereotype.Component;

@Component
public class BeanNameAwareTest implements BeanNameAware {
    @Override
    public void setBeanName(String name) {
        System.out.println("name=" + name);
    }
}
```

 启动项目后，打印日志如下：

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java
.
.

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-18 14:17:47.217  INFO 49803 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11
2024-12-18 14:17:47.218 DEBUG 49803 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
.
.
name=beanNameAwareTest
2024-12-18 14:17:47.589  INFO 49803 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080 (http) with context path ''
2024-12-18 14:17:47.592  INFO 49803 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.493 seconds (JVM running for 0.657)
```

## 十一、@PostConstruct

 这个注解，在包 javax.annotation 下，其作用是在 bean 的初始化阶段，如果一个方法标注了 @PostConstruct 注解，会先调用这个方法。这里重点是要关注这个标准的触发点，这个触发点是在 postProcessBeforeInitialization 之后，InitializingBean.afterPropertiesSet 之前。

 使用场景：用户可以对某一方法进行标注，来进行初始化某一个属性。扩展方式如下：

```java
package com.example.demo;

import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

@Component
public class Test {

    public Test() {
        System.out.println("test");
    }

    @PostConstruct
    public void init(){
        System.out.println("init");
    }
}
```

 项目启动后打印日志如下：

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java
.
.

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-18 14:28:39.014  INFO 49906 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11
2024-12-18 14:28:39.015 DEBUG 49906 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
.
.
test
init
2024-12-18 14:28:39.381  INFO 49906 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080 (http) with context path ''
2024-12-18 14:28:39.385  INFO 49906 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.481 seconds (JVM running for 0.65)
```

 init() 方法会在 Test 这个 bean 实例化并且依赖注入完成后执行，打印 init 日志。

## 十二、InitializingBean

 该接口位于 org.springframework.beans.factory 包下，这个接口是用来初始化 bean 的。InitializingBean 为 bean 提供了初始化方法的方式：afterPropertiesSet 方法。凡是继承该接口的类，在初始化 bean 的时候都会执行该方法。这个扩展点触发的时机在 postProcessAfterInitialization 之前。

 使用场景：用户实现此接口，来进行系统启动的时候一些业务指标的初始化工作。扩展方式如下：

```java
package com.example.demo;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

@Component
public class Test implements InitializingBean {

    @Override
    public void afterPropertiesSet() throws Exception {
        System.out.println("afterPropertiesSet方法执行");
    }
}
```

## 十三、FactoryBean

 该接口位于 org.springframework.beans.factory 包下。一般情况下，Spring 通过反射机制利用 bean 的 class 属性指定支线类去实例化bean，在某些情况下，实例化 bean 过程比较复杂，如果按照传统的方式，则需要在 bean 中提供大量的配置信息。配置方式的灵活性是受限的，这时采用编码的方式可能会得到一个简单的方案。Spring为此提供了一个 FactoryBean 的工厂类接口，用户可以通过实现该接口定制实例化 Bean 的逻辑。FactoryBean 接口对于 Spring 框架来说占用重要的地位，Spring 自身就提供了70多个 FactoryBean 的实现。它们隐藏了实例化一些复杂 bean 的细节，给上层应用带来了便利。从Spring3.0开始，FactoryBean 开始支持泛型，即接口声明改为 FactoryBean 的形式

 使用场景：用户可以扩展这个类，来为要实例化的 bean 做一个代理，比如为该对象的所有的方法作一个拦截，在调用前后输出一行log，模仿 ProxyFactoryBean 的功能。扩展方式为：

```java
package com.example.demo;

import org.springframework.beans.factory.FactoryBean;
import org.springframework.stereotype.Component;

@Component
public class FactoryBeanTest implements FactoryBean<FactoryBeanTest.A> {

    @Override
    public FactoryBeanTest.A getObject() throws Exception {
        System.out.println("FactoryBeanTest.getObject");
        return new FactoryBeanTest.A();
    }

    @Override
    public Class<?> getObjectType() {
        return FactoryBeanTest.A.class;
    }

    @Override
    public boolean isSingleton() {
        return true;
    }

    public static class A{

    }
}
```

## 十四、SmartInitializingSingleton

 该接口位于 org.springframework.beans.factory 包下。这个接口中只有一个方法 afterSingletonsInstantiated，其作用是 在spring 容器管理的所有单例对象（非懒加载对象）初始化完成之后调用的回调接口。其触发时机为 postProcessAfterInitialization 之后。

 使用场景：用户可以扩展此接口在对所有单例对象初始化完毕后，做一些后置的业务处理。扩展方式为：

```java
package com.example.demo;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.stereotype.Component;

@Component
public class SmartInitializingSingletonTest implements SmartInitializingSingleton {
    @Override
    public void afterSingletonsInstantiated() {
        System.out.println("afterSingletonsInstantiated方法执行");
    }
}
```

 启动项目，打印日志如下：

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java
.
.
.

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-22 11:34:21.014  INFO 66111 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11 
2024-12-22 11:34:21.015 DEBUG 66111 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
.
.
.
afterSingletonsInstantiated方法执行
2024-12-22 11:34:21.368  INFO 66111 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080 (http) with context path ''
2024-12-22 11:34:21.371  INFO 66111 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.464 seconds (JVM running for 0.629)
```

## 十五、CommandLineRunner

 位于 org.springframework.boot 包下，该接口只有一个方法 run(String… args) ，触发时机为整个项目启动完成后，自动执行，如果有多个 CommandLineRunner ，可以利用 @order 来进行排序。

 使用场景：用户扩展此接口，进行启动项目之后一些业务的预处理。扩展方式如下：

 第一个实现类：

```java
package com.example.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class CommandLineRunnerTest1 implements CommandLineRunner {
    @Override
    public void run(String... args) throws Exception {
        System.out.println("CommandLineRunnerTest1执行");
    }
}
```

 第二个实现类：

```java
package com.example.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class CommandLineRunnerTest2 implements CommandLineRunner {
    @Override
    public void run(String... args) throws Exception {
        System.out.println("CommandLineRunnerTest2执行");
    }
}
```

```
 项目启动完成后，打印日志如下：
```

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java
.
.
.

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-22 11:39:35.683  INFO 66170 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11
2024-12-22 11:39:35.684 DEBUG 66170 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
.
.
.
2024-12-22 11:39:36.062  INFO 66170 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080 (http) with context path ''
2024-12-22 11:39:36.066  INFO 66170 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.494 seconds (JVM running for 0.659)
CommandLineRunnerTest1执行
CommandLineRunnerTest2执行
```

 **注意： @Order 注解中的值越小，优先级越高。**

## 十六、DisposableBean

 位于 org.springframework.beans.factory 包下，这个扩展点也只有一个方法：destroy()，其触发时机为当此对象销毁时，会自动执行这个方法。比如说运行 applicationContext.registerShutdownHook 时，就会触发这个方法。扩展方式如下：

```java
package com.example.demo;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;

@Component
public class TestDestory implements DisposableBean {
    @Override
    public void destroy() throws Exception {
        System.out.println("TestDestory 的 destroy 方法执行");
    }
}
```

 新增一个接口如下：

```java
package com.example.demo;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @RequestMapping(value="/hello", method = RequestMethod.GET)
    public String hello1() throws Exception {
        TestDestory testDestory = new TestDestory();
        testDestory.destroy();
        return "hello";
    }
}
```

 启动项目后，调用 [http://localhost:8080/hello](http://localhost:8080/hello) 接口，打印日志如下：

```java
/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v2.7.7)

active=false
ApplicationContextInitializerTest的initialize方法执行
2024-12-22 11:49:56.968  INFO 66316 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication using Java 17.0.11
2024-12-22 11:49:56.969 DEBUG 66316 --- [           main] com.example.demo.DemoApplication         : Running with Spring Boot v2.7.7, Spring v5.3.24
.
.
.
2024-12-22 11:49:57.347  INFO 66316 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 0.486 seconds (JVM running for 0.65)
CommandLineRunnerTest2执行
CommandLineRunnerTest1执行
2024-12-22 11:50:03.198  INFO 66316 --- [nio-8080-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
2024-12-22 11:50:03.198  INFO 66316 --- [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet 'dispatcherServlet'
2024-12-22 11:50:03.199  INFO 66316 --- [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 1 ms
TestDestory 的 destroy 方法执行
```
