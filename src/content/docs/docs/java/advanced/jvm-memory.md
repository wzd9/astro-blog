---
title: 'JAVA 内存区域与内存溢出异常'
description: '从概念上介绍 Java 虚拟机运行时数据区域：程序计数器、虚拟机栈、本地方法栈、堆、方法区，以及各区域可能产生的内存溢出异常。'
---

本文主要从概念上介绍 Java 虚拟机内存的各个区域，讲解这些区域的作用、服务对象以及其中可能产生的问题。

## 1、运行时数据区域

 Java 虚拟机在执行 Java 程序的过程中会把它所管理的内存划分为若干个不同的数据区域。这些区域有各自的用途，各自创建和销毁的时间，有的区域随着虚拟机进程的启动而一直存在，有些区域则是依赖用户线程的启动和结束而建立和销毁。根据《 Java 虚拟机规范》的规定，Java 虚拟机所管理的内存将会包括以下几个运行时区域。如图1-1所示。

![图1-1](/images/blog/jvm-memory-areas/jvm-memory-areas-1.png)

## 2、程序计数器

 程序计数器（Program Counter Register）是一块较小的空间，可以看作是当前线程所执行的字节码的行号指示器。在 Java 虚拟机的概念模型里，字节码解释器工作时就是通过改变这个计数器的值来选取下一条需要执行的字节码指令，它是程序控制流的指示器，分支、循环、跳转、异常处理、线程恢复都需要依赖这个计数器完成。

 由于 Java 虚拟机的多线程是通过线程轮流切换、分配处理器执行时间来实现的，为了线程切换后能恢复到正确的执行位置，每条线程都需要一个独立的程序计数器，各个线程之间计数器互不影响，独立存储，因此，程序计数器是线程私有的内存。

 如果线程正在执行一个 Java 方法，计数器记录的是正在执行的虚拟机字节码的指令地址；如果正在执行的是本地（ Native ）方法，计数器的值则应为空（Undefined）。此内存区域是唯一个在《Java虚拟机规范》中没有规定任何 OutOfMemoryError 情况的区域。

## 3、Java虚拟机栈

 与程序计数器一样，Java虚拟机栈（ Java Virtual Machine Stack）也是线程私有的，它的生命周期与线程相同。虚拟机栈描述的是 Java 方法执行的的线程内存模型：每个方法被执行的时候，Java 虚拟机都会同步创建一个栈帧（ Stack Frame ）用于存储局部变量表、操作数栈、动态连接、方法出口等信息。每一个方法被调用直至执行完毕的过程，就对应着一个栈帧在虚拟机栈中从入栈到出栈的过程。

## 4、本地方法栈

 本地方法栈（ Native Method Stack ）与虚拟机栈所发挥的作用是非常相似的，其区别只是虚拟机栈为虚拟机执行 Java 方法服务，而本地方法栈则是虚拟机使用到本地（ Native ）方法服务。

## 5、Java 堆

 对于 Java 应用程序来说，Java 堆（ Java Heap）是虚拟机所管理的内存中最大的一块。 Java 堆是被所有线程共享的一块内存区域，在虚拟机启动时创建。此内存的唯一目的就是存放对象实例， Java 世界里 “几乎” 所有的对象实例都在这里分配内存。在《 Java 虚拟机规范 》中对 Java 堆的描述是：“所有对象实例以及数组都应当在堆上分配”。

 Java 堆既可以被实现成固定大小的，也可以是可扩展的，不过当前主流的 Java 虚拟机都是按照可扩展来实现的（通过参数 -Xmx 和 -Xms 设定）。如果在 Java 堆中没有内存完成实例分配，并且堆也无法再扩展时，Java 虚拟机会抛出 OutOfMemoryError 异常。

## 6、方法区

 方法区（ Method Area）与 Java 堆一样，是各个线程共享的内存区域，它用于存储已被虚拟机加载的类型信息、常量、静态变量、即时编译器编译后的代码缓存等数据。虽然《 Java 虚拟机规范 》 中把方法区描述为堆的一个逻辑部分，但是它却有一个别名叫做 “非堆”，目的是与 Java 堆区分开来。

 运行时常量池（ Runtime Constant Pool）是方法区的一部分。Class 文件中除了有类的版本、字段、方法、接口等描述信息外，还有一项信息是常量池表（ Constant Pool Table ）,用于存放编译期生成的各种字面量与符号引用，这部分内容将在类加载后存放到方法区的运行时常量池中。

## 7、直接内存

 直接内存（ Direct Memory ）并不是虚拟机运行时数据区的一部分，也不是《 Java 虚拟机规范 》中定义的内存区域。但是这部分内存也被频繁的使用，而且也可能导致 OutOfMemoryError 异常出现，所以这里放到一起讲。

 在 JDK 1.4 中新加入了 NIO（ New Input/Output ）类，引入了一种基于通道（ Channel ）与缓冲区（ Buffer ）的 I/O 方式，它可以使用 Native 函数库直接分配堆外内存，然后通过一个存储在 Java 堆里面的 DirectByteBuffer 对象作为这块内存的引用进行操作。这样能在一些场景中显著的提高性能，因为避免了在 Java 堆和 Native 堆中来回复制数据。

## 8、对象创建过程

 本次主要以 HotSpot 和最常用的内存区域 Java 堆为例，深入探讨一下 HotSpot 虚拟机在 Java 堆中分配对象、布局和访问的全过程。

 Java 程序运行过程中无时无刻都有对象被创建出来，在语言层面上，创建对象通常（ 例外：复制、反序列化）仅仅是一个 new 关键字而已, 而创建又是一个怎样的过程呢？

 当 Java 虚拟机遇到一条字节码 new 指令时，首先去检查这个指令的参数是否能在常量池中定位到一个类的符号引用，并且检查这个符号引用代表的类是否已被加载、解析和初始化过。如果没有，那必须先执行相应的类加载过程。

 在类加载检查通过后，接下来虚拟机将为新生对象分配内存。对象所需内存的大小在类加载完成后便可以完全确定，为对象分配空间的任务实际上便等同于把一块确定大小的内存块从 Java 堆中划分出来。

-   假设 Java 堆中内存是绝对规整，所有被使用过的内存都被放在一边，空闲的内存都被放在另一边，中间放着一个指针作为分界点的指示器，那所分配内存就仅仅是把那个指针向空闲方向挪动一段与对象大小相等的距离，这种分配方式成为 “指针碰撞”（ Bump The Pointer）。
-   如果 Java 堆中的内存不是规整的，已被使用的内存和空闲的内存相互交错在一起，那就没办法简单的进行指针碰撞了，虚拟机就必须维护一个列表，记录上哪些内存块是可用的，在分配的时候从列表中找到一块足够大的空间划分给对象实例，并更新列表上的记录，这种分配方式称为 “空闲列表”（ Free List ）。

选择哪种分配方式由 Java 堆是否规整决定，而 Java 堆是否规整又由所采用的垃圾收集器是否带有空间压缩整理（ Compact ）的能力决定。因此，当使用 Serial、ParNew 等带压缩整理过程的收集器时，系统采用分配算法是指针碰撞，既简单又高效；而当使用 CMS 这种基于清除（ Sweep ）算法的收集器时，理论上就只能采用较为复杂的空闲列表来进行分配内存。

 内存分配完成后，虚拟机必须将分配到的内存空间（但不包括对象头）都初始化为零值。这步操作保证了对象的实例字段在 Java 代码中可以不赋初始值就可以直接使用，使程序能访问到这些字段的数据类型所对应的零值。接下里，Java 虚拟机还要对堆对象进行必要的设置，例如对象是哪个类的实例、如何才能找到类的元数据等信息。这些信息存放在对象的对象头（ Object Header）之中。

 在上面的工作完成之后，从虚拟机视角来看，一个新的对象已经产生。但是从 Java 程序视角来看，对象创建才刚刚开始-构造函数，即 Class 文件中的 init() 方法还没有执行，所有的字段都为默认的零值，对象需要的其他资源和状态信息也还没有按照预定的意图构造好。一般来说， new 指令之后会接着执行 init() 方法，按照程序员的意图对对象进行初始化，这样一个真正的对象才算完全被构造出来。

## 9、对象的内存布局

 在 HotSpot 虚拟机中，对象在堆内存的存储布局可以划分为三个部分：对象头（ Header ）、实例数据（ Instance Data ）和对齐填充（ Padding ）。

-   对象头
    
    1.  对象头包含两类信息，第一类是用于存储对象自身的运行数据。这部分数据的长度在 32 位和 64 位的虚拟机（ 未开启压缩指针 ）中分别为 32 个比特和 64 个比特。对象头的信息是与对象自身定义的数据无关的额外存储成本，考虑到空间效率，这部分被设计成一个有着动态定义的数据结构，以便在极小的空间存储尽量多的数据。
    2.  第二类是类型指针，及对象指向它的类型元数据的指针， Java 虚拟机通过这个指针来确定该对象是哪个类的实例。但是并不是所有的虚拟机实现都必须在对象数据上保留类型指针。此外，如果对象是一个 Java 数组，那对象头中还必须有一块用于记录数组长度的数据。因为虚拟机可以通过普通 Java 对象的元数据信息确定 Java 对象的大小，但是如果数组长度不确定，就无法通过元数据中的信息推断出数组的大小。
-   实例数据
    
     对象真正存储的有效信息，即我们在程序代码里面所定义的各种类型的字段内容，无论是从父类继承下来的，还是子类中定义的字段都必须记录起来。这部分的存储顺序会受到虚拟机分配策略参数（ -XX:FieldsAllocationStyle ）和字段在 Java 源码中定义顺序的影响 。
    
-   对齐填充
    
     这不是必然存在的，也没有特别的含义，仅仅起着占位符的作用。
    

## 10、对象的访问定位

 创建对象自然是为了后续使用该对象，我们在 Java 程序会通过栈上的 reference 数据来操作堆上的具体对象。由于 reference 类型在 《 Java 虚拟机规范 》里面只规定了它是一个指向对象的引用，并没有定义这个引用应该通过什么方式去定位、访问堆中对象的具体位置，所以访问方式也是由虚拟机实现而定，主流的访问方式有使用句柄和直接指针两种：

-   使用句柄访问：Java 堆中将可能会划分出一块内存作为句柄池， reference 中存储的就是对象的句柄地址，而句柄中包含了对象实例数据与类型数据各自具体的地址信息，其结构如图 2-2 所示。
    
    ![图2-2](/images/blog/jvm-memory-areas/jvm-memory-areas-2.png)
-   直接指针访问：Java 堆中对象的内存布局就必须考虑如何放置访问类型数据的相关信息，reference 中存储的直接就是对象地址，如果只是访问对象本身的话，就不需要多一次间接访问的开销，如图 2-3 所示。
    
    ![图2-3](/images/blog/jvm-memory-areas/jvm-memory-areas-3.png)

 使用直接指针来访问最大的好处就是速度更快，它节省了一次指针定位的时间开销，由于对象访问在 Java 中非常频繁，因此这类开销积少成多也是一项极为可观的执行成本。

## 11、内存溢出异常

 以下部分通过代码演绎除了程序计数器外，虚拟机内存的其他几个运行时区域发生 OutOfMemoryError （ 下文称 OOM ）异常的场景。以下代码都是在 JDK 1.8 下进行编写。

### 11.1 Java 堆溢出

 Java 堆用于存储对象实例，我们只要不断创建对象，并且保证 GC Roots 到对象之间有可达路径来避免垃圾回收机制清除这些对象，那么随着对象数量的增加，总容量触及最大堆的容量限制后就会产生内存溢出异常。

```java
package com.wzd;

import java.util.ArrayList;
import java.util.List;

/**
 * VM Args: -Xms20m -Xmx20m -XX:+HeapDumpOnOutOfMemoryError
 * @author wzd
 */
public class HeapOOM {

	static class OOMObject {

	}

	public static void main(String[] args) {
		List<OOMObject> list = new ArrayList<>();
		while (true) {
			list.add(new OOMObject());
		}
	}
}
#运行结果如下：
java.lang.OutOfMemoryError: Java heap space
Dumping heap to java_pid25476.hprof ...
Heap dump file created [27957401 bytes in 0.067 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at java.util.Arrays.copyOf(Arrays.java:3210)
	at java.util.Arrays.copyOf(Arrays.java:3181)
	at java.util.ArrayList.grow(ArrayList.java:265)
	at java.util.ArrayList.ensureExplicitCapacity(ArrayList.java:239)
	at java.util.ArrayList.ensureCapacityInternal(ArrayList.java:231)
	at java.util.ArrayList.add(ArrayList.java:462)
	at com.wzd.HeapOOM.main(HeapOOM.java:19) 
```

### 11.2、虚拟机栈和本地方法栈溢出

 此处仅演示虚拟机栈溢出。如果线程请求的栈深度大于虚拟机栈所允许的最大深度，将抛出 StackOverflowError 异常。

```java
package com.wzd;

/**
 * VM Args: -Xss128k
 * @author wzd
 */
public class JavaVMStack {
	
	private int stackLength = 1;
	
	private void stackLeak() {
		stackLength++;
		stackLeak();
	}

	public static void main(String[] args) throws Throwable{
		JavaVMStack oom = new JavaVMStack();
		try {
			oom.stackLeak();
		} catch (Throwable e) {
			System.out.println("stack length:" + oom.stackLength);
			throw e;
		}
	}

}
#运行结果如下：
stack length:992
Exception in thread "main" java.lang.StackOverflowError
	at com.wzd.JavaVMStack.stackLeak(JavaVMStack.java:12)
	at com.wzd.JavaVMStack.stackLeak(JavaVMStack.java:13)
	at com.wzd.JavaVMStack.stackLeak(JavaVMStack.java:13)
	......后续异常堆栈信息省略
```

### 11.3、方法区和运行时常量池

 由于运行时常量池也属于方法区，所以这两个区域的溢出测试放到一次进行。在JDK 1.8 中，方法区移到了堆中，为了演示方便，此处使用 JDK 1.6 来测试。JVM的参数如下。

```java
package com.wzd;

import java.util.HashSet;
import java.util.Set;

/**
 * VM Args: -XX:PermSize=6M -XX:MaxPermSize=6M
 * @author wzd
 */
public class RuntimeConstantPoolOOM {
	
	public static void main(String[] args) {
		// 使用 Set 保持着常量池引用，避免 Full GC 回收常量池行为
		Set<String> set = new HashSet<>();
		// 在 short 范围内足以让 6MB 的元空间产生 OOM
		short i = 0;
		while (true) {
			set.add(String.valueOf(i++).intern());
		}
	}
}
#运行结果如下：
Exception in thread "main" java.lang.OutOfMemoryError: PermGen space
	at java.lang.String.intern(Native Method)
	at org.fenixsoft.oom.RuntimeConstantPoolOOM.main(RuntimeConstantPoolOOM.java: 12)

JDK 1.8 中参数需要修改成： -XX:MetaspaceSize 和 -XX:MaxMetaspaceSize 
```

元空间参数：

| 指令 | 介绍 |
| :-- | --- |
| \-XX:MetaspaceSize=256M | 指定元空间的初始空间大小。 |
| \-XX:MaxMetaspaceSize=512M | 指定元空间的最大值，默认是-1，即不控制。 |
| \-XX:MinMetaspaceFreeRatio=40 | 在垃圾收集之后控制最小的元空间剩余容量的百分比，可减少因元空间不足导致的垃圾收集频率。 |
| \-XX:MaxMetaspaceFreeRatio=40 | 在垃圾收集之后控制最大的元空间剩余容量的百分比。 |

### 11.4、本机直接内存溢出

 直接内存的容量大小可通过 -XX:MaxDirectMemorySize 参数来指定，如果不指定，则默认与 Java 堆最大值（ 由 -Xmx 指定）一致。

```java
package com.wzd;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

/**
 * VM Args: -Xmx20M -XX:MaxDirectMemorySize=10M
 * @author wzd
 */
public class DirectMemoryOOM {
	
	private static final int _1MB = 1024 * 1024;
	
	public static void main(String[] args) {
		List<ByteBuffer> list = new ArrayList<>();
		int i = 0;
		try {
			while (true) {
				ByteBuffer buffer = ByteBuffer.allocateDirect(_1MB);
				list.add(buffer);
				i++;
			}
		} finally {
			System.out.println(i);
		}
	}
}
# 运行结果：
10
Exception in thread "main" java.lang.OutOfMemoryError: Direct buffer memory
	at java.nio.Bits.reserveMemory(Bits.java:694)
	at java.nio.DirectByteBuffer.<init>(DirectByteBuffer.java:123)
	at java.nio.ByteBuffer.allocateDirect(ByteBuffer.java:311)
	at com.wzd.DirectMemoryOOM.main(DirectMemoryOOM.java:20)
```

 此处使用 NIO 的 ByteBuffer 去获取直接内存的分配，并限制直接内存的大小，一直循环分配从而导致直接内存溢出。底层通过 unsafe.allocateMemory() 向操作系统申请一块新的本地内存，并返回一个内存地址，再通过 **unsafe**.setMemory() 方法对已有内存进行初始化/填充。如果需要释放该内存地址，通过 *unsafe*.freeMemory(address) 方法释放指定的地址，这个地址通过 unsafe.allocateMemory() 返回。
