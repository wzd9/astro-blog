---
title: 'redis 入门'
description: 'Redis 入门：常用数据类型、基本命令、安装配置与典型使用场景。'
---

## 一、基础知识

```plaintext
Redis是单线程的！      
```

官方表示，Redis是基于内存操作，CPU不是Redis性能的瓶颈，Redis的瓶颈是机器的内存和网络带宽，所有使用单线程。

```plaintext
为什么Redis单线程还这么快？
```

1、误区1：高性能的服务器一定是多线程的？

2、误区2：多线程一定比单线程效率高？

核心：redis是将所有的数据全部放在内存中的，所有说使用单线程去操作效率就是最高的，对于内存系统来说，如果没有上下文切换，效率就是最高的。多次读写都是在一个CPU上的，在内存情况下，这个就是最佳方案。

## 二、Redis的五大数据类型

### 2.1、Redis-key

```shell
127.0.0.1:6379> EXPIRE name 10  #设置key过期时间，单位是秒
(integer) 1
127.0.0.1:6379> ttl name     #查看当前key的剩余时间
(integer) 2
127.0.0.1:6379> type name		#查看当前key的类型
string
```

### 2.2、String（字符串）

```shell
127.0.0.1:6379> FLUSHALL    #清空所有数据库
OK
127.0.0.1:6379> set key1 v1   #设置值
OK 
127.0.0.1:6379> get key1     #获取key1的值
"v1"
127.0.0.1:6379> EXISTS key1    #判断key1的值是否存在
(integer) 1 
127.0.0.1:6379> APPEND key1 "hello"     #key1的值后面追加字符串，如果当前key不存在，则相当于set key
(integer) 7
127.0.0.1:6379> get key1
"v1hello"
127.0.0.1:6379> STRLEN key1    #获取字符串的长度
(integer) 7
127.0.0.1:6379> APPEND key1 ",wzd"
(integer) 11
127.0.0.1:6379> STRLEN key1
(integer) 11
127.0.0.1:6379> get key1
"v1hello,wzd"
127.0.0.1:6379> 
##################################################################################
127.0.0.1:6379> set views 0  
OK
127.0.0.1:6379> get views
"0"
127.0.0.1:6379> INCR views   #自增1
(integer) 1
127.0.0.1:6379> get views
"1"
127.0.0.1:6379> INCR views
(integer) 2
127.0.0.1:6379> get views
"2"
127.0.0.1:6379> DECR views   #自减1
(integer) 1
127.0.0.1:6379> DECR views
(integer) 0
127.0.0.1:6379> DECR views
(integer) -1
127.0.0.1:6379> INCRBY views 10   #自增10   可以设置步长指定增量
(integer) 9
127.0.0.1:6379> INCRBY views 10
(integer) 19
127.0.0.1:6379> DECRBY views 10
(integer) 9

##################################################################################
#字符串范围  range
127.0.0.1:6379> set key1 "hello,wzd"    #设置key1的值
OK
127.0.0.1:6379> get kye1 
(nil)
127.0.0.1:6379> get key1
"hello,wzd"
127.0.0.1:6379> GETRANGE key1 0 3    #截取字符串[0,3]
"hell"
127.0.0.1:6379> GETRANGE key1 0 -1   #获取全部字符串，相当于get key
"hello,wzd"

#替换！
127.0.0.1:6379> set key2 abcdfg
OK
127.0.0.1:6379> get kye2
(nil)
127.0.0.1:6379> get key2
"abcdfg"
127.0.0.1:6379> SETRANGE key2 1 xx   #替换指定位置开始的字符串
(integer) 6
127.0.0.1:6379> get key2
"axxdfg"
##################################################################################
#setex(set with expire)  #设置过期时间
#setnx(set if not exist)  #不存在再设置(在分布式锁中常用)

127.0.0.1:6379> setex key3 30 "hello"   #设置key3的值，30秒过期
OK
127.0.0.1:6379> ttl key3
(integer) 26
127.0.0.1:6379> get key3
"hello" 
127.0.0.1:6379> SETNX mykey "redis"   #如果mykey不存在，创建mykey
(integer) 1
127.0.0.1:6379> keys *
1) "key1"
2) "mykey"
3) "key2"
127.0.0.1:6379> ttl key3
(integer) -2
127.0.0.1:6379> setnx mykey "mongoDB"   #如果mykey存在，创建mykey失败
(integer) 0
127.0.0.1:6379> get mykey
"redis"

##################################################################################
mset
mget

127.0.0.1:6379> MSET k1 v1 k2 v2 k3 v3    #同时设置多个值
OK
127.0.0.1:6379> keys *
1) "k1"
2) "k2"
3) "k3"
127.0.0.1:6379> mget k1 k2 k3   #同时获取多个值
1) "v1"
2) "v2"
3) "v3"
127.0.0.1:6379> MSETNX k1 v1 k4 v4   #mset 是一个原子性的操作，要么一起成功，要么一起失败
(integer) 0
127.0.0.1:6379> get k4
(nil)

#对象
set user:1 {name:zhangsan,age:3}  #设置一个user:1对象，值为json字符串来保存一个对象

这里的key是一个巧妙的设计：user:{id}:{filed},如此设置在redis中是ok的

127.0.0.1:6379> mset user:1:name zhangsan user:1:age 20
OK
127.0.0.1:6379> mget user:1:name user:1:age
1) "zhangsan"
2) "20"

##################################################################################
getset  #先get再set
127.0.0.1:6379> GETSET db redis    #如果不存在值，则返回nil
(nil)
127.0.0.1:6379> get db
"redis"
127.0.0.1:6379> getset db mongodb  #如果存在值，则返回原来的值，并设置新的值
"redis"
127.0.0.1:6379> get db
"mongodb"

##################################################################################
```

### 2.3、List(列表)

```shell
27.0.0.1:6379> LPUSH list one      #将一个值或者多个值插入列表的头部（左）
(integer) 1
127.0.0.1:6379> LPUSH list two
(integer) 2
127.0.0.1:6379> LPUSH list three
(integer) 3
127.0.0.1:6379> LRANGE list 0 -1   #获取list中的值
1) "three"
2) "two"
3) "one"
127.0.0.1:6379> LRANGE list 0 1    #通过区间获取具体的值
1) "three"
2) "two"
127.0.0.1:6379> RPUSH list right   #将一个值或者多个值插入列表的尾部（右）
(integer) 4
127.0.0.1:6379> LRANGE list 0 -1
1) "three"
2) "two"
3) "one"
4) "right"
##################################################################################
lpop   #移除列表的的第一个元素
rpop   #移除列表的的最后一个元素
127.0.0.1:6379> LRANGE list 0 -1    
1) "three"
2) "two"
3) "one"
4) "right"
127.0.0.1:6379> LPOP list    #移除列表的的第一个元素
"three"
127.0.0.1:6379> LRANGE list 0 -1
1) "two"
2) "one"
3) "right"
127.0.0.1:6379> RPOP list    #移除列表的的最后一个元素
"right"
127.0.0.1:6379> LRANGE list 0 -1
1) "two"
2) "one"
##################################################################################
Lindex
127.0.0.1:6379> LRANGE list 0 -1
1) "two"
2) "one"
127.0.0.1:6379> LINDEX list 0   #通过下标获取list中的某一个值
"two"
##################################################################################
Llen
127.0.0.1:6379> LPUSH list one
(integer) 1
127.0.0.1:6379> LPUSH list two
(integer) 2
127.0.0.1:6379> LPUSH list three
(integer) 3
127.0.0.1:6379> LLEN list    #返回列表的长度
(integer) 3

##################################################################################
移除指定的值
lrem 
127.0.0.1:6379> lrange list 0 -1
1) "three"
2) "three"
3) "two"
4) "one"
127.0.0.1:6379> lrem list 1 one    #移除list集合中指定个数的value,精确匹配
(integer) 1
127.0.0.1:6379> lrange list 0 -1  
1) "three"
2) "three"
3) "two"
127.0.0.1:6379> lrem list 1 three
(integer) 1
127.0.0.1:6379> LPUSH list three
(integer) 3
127.0.0.1:6379> lrem list 2 three
(integer) 2
127.0.0.1:6379> LRANGE list 0 -1
1) "two"

##################################################################################
trim     截取
127.0.0.1:6379> LRANGE mylist 0 -1
1) "hello"
2) "hello1"
3) "hello2"
4) "hello3"
127.0.0.1:6379> LTRIM mylist 1 2     #通过下标截取指定的长度，这个list已经被改变，截断只剩下截取的元素
OK
127.0.0.1:6379> LRANGE mylist 0 -1
1) "hello1"
2) "hello2"

##################################################################################
rpoplpush   #移除列表的最后一个元素，并将此元素移动到一个新的列表中
127.0.0.1:6379> LRANGE mylist 0 -1
1) "hello2"
2) "hello1"
3) "hello"
127.0.0.1:6379> RPOPLPUSH mylist myotherlist   #移除列表的最后一个元素，并将此元素移动到一个新的列表中
"hello"
127.0.0.1:6379> LRANGE mylist 0 -1
1) "hello2"
2) "hello1"
127.0.0.1:6379> LRANGE myotherlist 0 -1
1) "hello"

##################################################################################
lset  #将列表中指定下标的值替换为另外一个值
127.0.0.1:6379> EXISTS list				#判断这个列表是否存在
(integer) 0
127.0.0.1:6379> lset list 0 item        #不存在就会报错
(error) ERR no such key
127.0.0.1:6379> LPUSH list value1 
(integer) 1
127.0.0.1:6379> LRANGE list 0 0
1) "value1"
127.0.0.1:6379> lset list 0 item         #如果存在，更新当前下标的值
OK
127.0.0.1:6379> LRANGE list 0 0 
1) "item"
##################################################################################
linsert    #将具体的value插入到列表中某个元素的前面或者后面
127.0.0.1:6379> LRANGE mylist 0 -1
1) "hello"
2) "world"
127.0.0.1:6379> LINSERT mylist before world other   #将具体的value插入到列表中某个元素的前面
(integer) 3
127.0.0.1:6379> LRANGE mylist 0 -1
1) "hello"
2) "other"
3) "world"
127.0.0.1:6379> LINSERT mylist after world other    #将具体的value插入到列表中某个元素的后面
(integer) 4
127.0.0.1:6379> LRANGE mylist 0 -1
1) "hello"
2) "other"
3) "world"
4) "other"
```

```plaintext
小结
```

```
 - 它实际上是一个列表，before Node after, left,right 都可以插入值
 
 -  如果key不存在，创建新的链表
 
 -  如果key存在，新增内容。
 
 -  如果移除了所有的值，空链表，也代表不存在
 
 -  在两边插入或者改动值，效率最高！中间元素，相对来说效率会低一点。
```

### 2.4、Set(集合)

set中的值是不能重复的！

```shell
127.0.0.1:6379> sadd myset hello      #set集合中添加元素
(integer) 1
127.0.0.1:6379> sadd myset wzd
(integer) 1
127.0.0.1:6379> sadd myset lov
(integer) 1
127.0.0.1:6379> SMEMBERS myset       #查看set的所有值
1) "wzd"
2) "hello"
3) "lov"
127.0.0.1:6379> SISMEMBER myset hello    #判断某一个值是不是在set集合中
(integer) 1
127.0.0.1:6379> SISMEMBER myset word
(integer) 0

##################################################################################
127.0.0.1:6379> scard myset    #获取set集合中的内容元素个数
(integer) 3
127.0.0.1:6379> sadd myset wad
(integer) 1
127.0.0.1:6379> sadd myset wzd   #set集合无法添加重复的值
(integer) 0
127.0.0.1:6379> scard myset
(integer) 4

##################################################################################
127.0.0.1:6379> SMEMBERS myset
1) "wzd"
2) "hello"
3) "wad"
4) "lov"
127.0.0.1:6379> srem myset wad   #移除set集合中指定的元素
(integer) 1
127.0.0.1:6379> SMEMBERS myset
1) "lov"
2) "hello"
3) "wzd"

##################################################################################
set 无序不重复集合
127.0.0.1:6379> SRANDMEMBER myset   #随机抽选出一个元素
"wzd"
127.0.0.1:6379> SRANDMEMBER myset
"hello"
127.0.0.1:6379> SRANDMEMBER myset
"wzd"
127.0.0.1:6379> SRANDMEMBER myset 2   #随机抽选出指定个数的元素
1) "wzd"
2) "lov"
127.0.0.1:6379> SRANDMEMBER myset 2
1) "hello"
2) "lov"

##################################################################################
删除指定的key，随机删除key
127.0.0.1:6379> SMEMBERS myset
1) "hello"
2) "wzd"
3) "lov"
127.0.0.1:6379> spop myset   #随机删除set中的元素
"lov"
127.0.0.1:6379> spop myset
"hello"
127.0.0.1:6379> SMEMBERS myset
1) "wzd"

##################################################################################
SMOVE   将指定的值，移动到另外一个set集合中
127.0.0.1:6379> sadd myset hello
(integer) 1
127.0.0.1:6379> sadd myset world
(integer) 1
127.0.0.1:6379> sadd myset wzd
(integer) 1
127.0.0.1:6379> sadd myset2 set2
(integer) 1 
127.0.0.1:6379> SMOVE myset myset2 wzd   #将myset中指定的值，移动到另外一个集合myset2中
(integer) 1
127.0.0.1:6379> SMEMBERS myset2
1) "set2"
2) "wzd"
127.0.0.1:6379> SMEMBERS myset
1) "world"
2) "hello"

##################################################################################
数字集合类
  -差集
  -交集
  -并集
127.0.0.1:6379> SMEMBERS key 
1) "c"
2) "b"
3) "a"
127.0.0.1:6379> SMEMBERS key1
1) "c"
2) "d"
3) "e"
127.0.0.1:6379> SDIFF key key1   #差集
1) "a"
2) "b"
127.0.0.1:6379> SINTER key key1  #交集
1) "c"
127.0.0.1:6379> SUNION key key1  #并集
1) "c"
2) "d"
3) "a"
4) "b"
5) "e"
```

### 2.5、Hash(哈希)

Map集合，key-Map集合,本质和String类型没有太大区别

```shell
127.0.0.1:6379> hset myhash field1 wzd		#set一个具体 key-value
(integer) 1
127.0.0.1:6379> hget myhash field1		#获取一个字段值
"wzd"
127.0.0.1:6379> hmset myhash field1 hello field2 world  #set多个 key-value
OK  
127.0.0.1:6379> hmget myhash field1 field2    #获取多个字段值
1) "hello"
2) "world"
127.0.0.1:6379> hgetall myhash   #获取全部数据
1) "field1"
2) "hello"
3) "field2"
4) "world"
127.0.0.1:6379> hdel myhash field1   #删除hash指定的key字段，对应的value也就消失了
(integer) 1
127.0.0.1:6379> hgetall myhash
1) "field2"
2) "world"

##################################################################################
hlen     
127.0.0.1:6379> hmset myhash field1 hello field2 world
OK
127.0.0.1:6379> HGETALL myhash
1) "field2"
2) "world"
3) "field1"
4) "hello"
127.0.0.1:6379> hlen myhash			#获取hash表的字段数量
(integer) 2

##################################################################################
127.0.0.1:6379> HEXISTS myhash field1    #判断hash中指定的字段是否存在
(integer) 1
127.0.0.1:6379> HEXISTS myhash field3
(integer) 0

##################################################################################
只获得所有的field
只获得所有的value
127.0.0.1:6379> hkeys myhash  #获得所有的field
1) "field2"
2) "field1"
127.0.0.1:6379> HVALS myhash  #获得所有的value
1) "world"
2) "hello"

##################################################################################
incr  decr
127.0.0.1:6379> hset myhash field3 5    #指定增量
(integer) 1
127.0.0.1:6379> HINCRBY myhash field3 1   
(integer) 6
127.0.0.1:6379> HINCRBY myhash field3 -1
(integer) 5
127.0.0.1:6379> hsetnx myhash field4 hello    #如果不存在，则可以设置
(integer) 1
127.0.0.1:6379> hsetnx myhash field4 world    #如果存在，则不能设置
(integer) 0
```

hash变更的的数据 user name age,尤其是用户信息之类的，经常变动的信息！hash更适合于对象的存储，String更加适合字符串存储

### 2.6、Zset(有序集合)

在set的基础上，增加了一个值，set k1 v1 ,zse k1 score v1

```shell
127.0.0.1:6379> ZADD myset 1 one    #添加一个值
(integer) 1
127.0.0.1:6379> ZADD myset 2 two 3 three  #添加多个值
(integer) 2
127.0.0.1:6379> ZRANGE myset 0 -1   #查看myset的所有值
1) "one"
2) "two"
3) "three"

##################################################################################
排序如何实现
127.0.0.1:6379> ZADD salary 2500 xiaohong    #添加三个用户的
(integer) 1
127.0.0.1:6379> ZADD salary 5000 zhangsan
(integer) 1
127.0.0.1:6379> ZADD salary 500 wzd
(integer) 1
127.0.0.1:6379> ZRANGEBYSCORE salary -inf +inf   #显示全部的用户，从小到大排序
1) "wzd"
2) "xiaohong"
3) "zhangsan"
127.0.0.1:6379> ZREVRANGE salary 0 -1      #显示全部的用户，从大到小排序
1) "zhangsan"
2) "wzd"
127.0.0.1:6379> ZRANGEBYSCORE salary -inf +inf withscores    #显示全部用户，并且附带成绩
1) "wzd"
2) "500"
3) "xiaohong"
4) "2500"
5) "zhangsan"
6) "5000"
127.0.0.1:6379> ZRANGEBYSCORE salary -inf 2500 withscores   #显示工资小于2500的员工的升序排列
1) "wzd"
2) "500"
3) "xiaohong"
4) "2500"

##################################################################################
移除元素
127.0.0.1:6379> ZRANGE salary 0 -1
1) "wzd"
2) "xiaoming"
3) "zhangsan"
127.0.0.1:6379> zrem salary xiaoming   #移除元素
(integer) 1
127.0.0.1:6379> ZRANGE salary 0 -1
1) "wzd"
2) "zhangsan"
127.0.0.1:6379> zcard salary   #获取有序集合中的个数
(integer) 2

##################################################################################
127.0.0.1:6379> zadd myset 1 hello 
(integer) 1
127.0.0.1:6379> zadd myset 2 world 3 wzd
(integer) 2
127.0.0.1:6379> ZCOUNT myset 1 3    #获取指定区间的成员数量
(integer) 3
127.0.0.1:6379> ZCOUNT myset 1 2
(integer) 2

```

## 三、三种特殊数据类型

### 3.1、geospatial 地理位置

朋友的地位，附近的人，距离计算，使用redis的Geo,这个功能可以推算地理位置的信息，两地之间的距离，方圆几里的人！

只有六个命令

```plaintext
GEOADD
GEODIST
GEOHASH
GEOPOS
GEORADIUS
GEORADIUSBYMEMBER
```

```plaintext
#geoadd   添加地理位置
```

```shell
#规则：两极无法添加，我们一般会下载城市数据，直接通过java程序一次性导入
#参数  key  值（经度、纬度、名称）
#有效的经度从-180度到180度。
#有效的纬度从-85.05112878度到85.05112878度。
#当坐标位置超出上述指定范围时，该命令将会返回一个错误。
127.0.0.1:6379> geoadd china:city 39.90 116.40 beijing
(error) ERR invalid longitude,latitude pair 39.900000,116.400000

127.0.0.1:6379> geoadd china:city 116.40 39.90 beijing      #添加城市数据
(integer) 1
127.0.0.1:6379> geoadd china:city 121.47 31.23 shanghai
(integer) 1
127.0.0.1:6379> geoadd china:city 106.50 29.53 chongqin 114.05 22.52 shenzhen
(integer) 2
127.0.0.1:6379> geoadd china:city 120.16 30.24 hangzhou 108.96 34.26 xian
(integer) 2
```

```plaintext
#geopos  从key里返回所有给定位置元素的位置（经度和纬度）
```

```shell
127.0.0.1:6379> geopos china:city beijing   #获取指定的城市的经纬度
1) 1) "116.39999896287918091"
   2) "39.90000009167092543"
127.0.0.1:6379> geopos china:city beijing chongqin
1) 1) "116.39999896287918091"
   2) "39.90000009167092543"
2) 1) "106.49999767541885376"
   2) "29.52999957900659211"
```

```plaintext
#geodist
返回两个给定位置之间的距离。
如果两个位置之间的其中一个不存在， 那么命令返回空值。
指定单位的参数 unit 必须是以下单位的其中一个
m 表示单位为米。
km 表示单位为千米。
mi 表示单位为英里。
ft 表示单位为英尺。
```

```shell
127.0.0.1:6379> GEODIST china:city beijing shanghai km   #查看上海到北京的直线距离
"1067.3788"
127.0.0.1:6379> GEODIST china:city beijing shanghai 
"1067378.7564"
127.0.0.1:6379> GEODIST china:city beijing chongqin km   #查看重庆到北京的直线距离
"1464.0708"
```

```plaintext
#georadius 
以给定的经纬度为中心， 返回键包含的位置元素当中， 与中心的距离不超过给定最大距离的所有位置元素。
范围可以使用以下其中一个单位：
m 表示单位为米。
km 表示单位为千米。
mi 表示单位为英里。
ft 表示单位为英尺。
```

我附近的人？（获取所有附近的人的地址，定位！）通过半径来查询！

```shell
127.0.0.1:6379> GEORADIUS china:city 110 30 1000 km   #查询110，30这个经纬度为中心，寻找方圆1000km之内的所有城市
1) "chongqin"
2) "xian"
3) "shenzhen"
4) "hangzhou"
127.0.0.1:6379> GEORADIUS china:city 110 30 500 km  #查询当前位置500km之内的所有城市
1) "chongqin"
2) "xian" 
127.0.0.1:6379> GEORADIUS china:city 110 30 500 km withdist   #查询当前位置500km之内的所有城市，包含直线距离
1) 1) "chongqin"
   2) "341.9374"
2) 1) "xian"
   2) "483.8340"
127.0.0.1:6379> GEORADIUS china:city 110 30 500 km withdist withcoord  #查询当前位置500km之内的所有城市，包含直线距																		离，经纬度
1) 1) "chongqin"
   2) "341.9374"
   3) 1) "106.49999767541885376"
      2) "29.52999957900659211"
2) 1) "xian"
   2) "483.8340"
   3) 1) "108.96000176668167114"
      2) "34.25999964418929977"
127.0.0.1:6379> GEORADIUS china:city 110 30 500 km withdist withcoord count 1  #查询当前位置500km之内的所有城市，																					包含直线距离，经纬度，只查询一个
1) 1) "chongqin"
   2) "341.9374"
   3) 1) "106.49999767541885376"
      2) "29.52999957900659211"
```

```shell
#georadiusbymember 
找出位于指定范围内的元素，GEORADIUSBYMEMBER 的中心点是由给定的位置元素决定的， 而不是像 GEORADIUS 那样， 使用输入的经度和纬度来决定中心点
#找出位于指定元素周围的其他元素
127.0.0.1:6379> GEORADIUSBYMEMBER china:city beijing 1000 km   
1) "beijing"
2) "xian"
127.0.0.1:6379> GEORADIUSBYMEMBER china:city shanghai 400 km
1) "hangzhou"
2) "shanghai"
```

```plaintext
#geohash
返回一个或多个位置元素的 Geohash 表示
```

该命令将返回11个字符的Geohash字符串!

```shell
#将二维的经纬度转换为一维的字符串，如果两个字符串越接近，则距离越近
127.0.0.1:6379> GEOHASH china:city beijing chongqin
1) "wx4fbxxfke0"
2) "wm5xzrybty0"
```

```shell
GEO底层的实现原理其实就是Zset!我们可以收用Zset命令来操作geo!
127.0.0.1:6379> ZRANGE china:city 0 -1      #查看地图中全部元素
1) "chongqin" 
2) "xian"
3) "shenzhen"
4) "hangzhou"
5) "shanghai"
6) "beijing"
127.0.0.1:6379> zrem china:city beijing   #移除指定元素
(integer) 1
127.0.0.1:6379> ZRANGE china:city 0 -1
1) "chongqin"
2) "xian"
3) "shenzhen"
4) "hangzhou"
5) "shanghai"
127.0.0.1:6379> 
```

### 3.2、Hyperloglog 数据结构

什么是基数？

A{1，3，5，7，8，7}

B{1，3，5，7，8}

基数（不重复的元素）= 5，可以接受误差。

> 简介

Redis Hyperloglog 基数统计的算法！

优点：占用的内存是固定的，2^64不同元素的技术，只需要废12kb内存！

```shell
#测试使用

127.0.0.1:6379> PFADD mykey a b c d e f g h i j    #创建第一组元素mykey
(integer) 1
127.0.0.1:6379> PFCOUNT mykey     #统计mykey中元素的基数数量
(integer) 10
127.0.0.1:6379> PFADD mykey2 i j z x c v b n m   #创建第一组元素mykey2
(integer) 1
127.0.0.1:6379> PFCOUNT mykey2
(integer) 9
127.0.0.1:6379> PFMERGE mykey3 mykey mykey2   #合并两组  mykey  mykey2  => mykey3 并集
OK
127.0.0.1:6379> PFCOUNT mykey3   #查看并集的数量
(integer) 15
```

### 3.3、Bitmap 位图

Bitmap 位图，数据结构，都是操作二进制来记录，就只有0和1两个状态！

使用bitmap来记录 周一到周日的打卡！

周一：1 周二：0 周三：0 周四：1 周五：1 周六：0 周日：0

```shell
#测试使用

127.0.0.1:6379> setbit sign 0 1
(integer) 0
127.0.0.1:6379> setbit sign 1 0
(integer) 0
127.0.0.1:6379> setbit sign 2 0
(integer) 0
127.0.0.1:6379> setbit sign 3 1
(integer) 0
127.0.0.1:6379> setbit sign 4 1
(integer) 0
127.0.0.1:6379> setbit sign 5 0
(integer) 0
127.0.0.1:6379> setbit sign 6 0
(integer) 0
```

查看某一天是否打卡

```shell
127.0.0.1:6379> GETBIT sign 3
(integer) 1
127.0.0.1:6379> GETBIT sign 6
(integer) 0
```

统计打卡的天数

```shell
127.0.0.1:6379> BITCOUNT sign   #统计这周的打卡记录，就可以看到是否有全勤
(integer) 3
```

## 四、事务

Redis事务本质：一组命令的集合！一个事务中的所有命令都会被序列化，在事务执行过程中，会按照顺序执行！

一次性、顺序性、排他性，执行一系列的命令！

```plaintext
--------- 队列  set  set  set 执行 -------------
```

Redis事务没有隔离级别的概念

所有的命令在事务中，并没有被执行，只有发起执行命令的时候才会执行（Exec）！

Redis单条命令是保证原子性的，但是redis事务不保证原子性！

redis的事务：

```
- 开启事务（Multi）
- 命令入队（...）
- 执行事务（exec）
```

```shell
#正常执行事务！

127.0.0.1:6379> MULTI   #开启事务
OK
#入队命令
127.0.0.1:6379> set k1 v1
QUEUED
127.0.0.1:6379> set k2 v2
QUEUED
127.0.0.1:6379> get k2
QUEUED
127.0.0.1:6379>  set k3 v3
QUEUED
127.0.0.1:6379> EXEC  #执行事务
1) OK
2) OK
3) "v2"
4) OK
```

```plaintext
#放弃事务
```

```shell
127.0.0.1:6379> MULTI   #开启事务
OK
#入队命令
127.0.0.1:6379> set k1 v1 
QUEUED
127.0.0.1:6379> set k2 v2
QUEUED
127.0.0.1:6379> set k4 v4
QUEUED
127.0.0.1:6379> DISCARD    #取消事务
OK
127.0.0.1:6379> get k4	   #事务队列中的命令都不会执行
(nil)
```

```plaintext
编译型异常（命令有错！），事务中所有的命令都不会被执行
```

```shell
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> set k1 v1 
QUEUED
127.0.0.1:6379> set k2 v2
QUEUED
127.0.0.1:6379> set k3 v3
QUEUED
127.0.0.1:6379> getset k3    #错误的命令
(error) ERR wrong number of arguments for 'getset' command
127.0.0.1:6379> set k4 v4
QUEUED
127.0.0.1:6379> set k5 v5
QUEUED
127.0.0.1:6379> EXEC   #执行事务报错
(error) EXECABORT Transaction discarded because of previous errors.
127.0.0.1:6379> get k5   #所有的命令都不会被执行
(nil)
127.0.0.1:6379> get k2  #所有的命令都不会被执行
(nil)
```

```plaintext
运行时异常,如果事务队列中存在语法错误，那么执行命令的时候，其他命令是可以正常执行的，错误命令会抛出异常！
```

```shell
127.0.0.1:6379> set k1 "v1"
OK
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> INCR k1   #执行的时候失败
QUEUED
127.0.0.1:6379> set k2 v2
QUEUED
127.0.0.1:6379> set k3 v3
QUEUED
127.0.0.1:6379> get k3 
QUEUED
127.0.0.1:6379> EXEC
1) (error) ERR value is not an integer or out of range   #虽然第一条命令报错了，但是依旧正常执行成功了
2) OK
3) OK
4) "v3"
127.0.0.1:6379> get k2
"v2"
127.0.0.1:6379> get k3
"v3"
```

```plaintext
监控！ Watch
```

### 4.1、悲观锁：

-   很悲观，认为什么时候都会出问题，无论做什么都会加锁！

### 4.2、乐观锁：

-   很乐观，认为什么时候都不会出问题，所有不会上锁！更新数据的时候去判断一下，在此期间是否有人修改过数据。
-   获取version
-   更新的时候比较version

```plaintext
Redis的监视测试
```

正常执行成功！

```shell
127.0.0.1:6379> set money 100
OK
127.0.0.1:6379> WATCH money   #监视 money 对象
OK
127.0.0.1:6379> set out 0 
OK
127.0.0.1:6379> MULTI  #事务正常结束，数据期间没有发生变动，这个时候就正常执行成功
OK
127.0.0.1:6379> DECRBY money 20
QUEUED
127.0.0.1:6379> INCRBY out 20
QUEUED
127.0.0.1:6379> EXEC
1) (integer) 80
2) (integer) 20
```

测试多线程修改值，使用watch可以当作redis的乐观锁操作！

```shell
127.0.0.1:6379> get money    
"80"
127.0.0.1:6379> watch money   #监视money
OK
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> DECRBY money 10
QUEUED
127.0.0.1:6379> INCRBY out 10
QUEUED
127.0.0.1:6379> EXEC   #执行之前，另外一个线程修改了money的值，这个时候就会导致事务执行失败
(nil)
127.0.0.1:6379> unwatch   #取消监视money(如果事务执行失败，先解锁)
OK
127.0.0.1:6379> watch money   #重新监视money（获取锁）
OK
```

## 五、Redis持久化

### 5.1、RDB （Redis DataBase)

```plaintext
触发机制
1、save规则满足的情况下，，会触发rdb规则
2、执行flushall命令，也会出发rdb规则
3、退出redis，也会产生rdb文件
```

备份就会自动生成一个dump.rdb文件。

如何恢复rdb文件？

```plaintext
只需要将rdb文件放到redis启动目录下就可以，redis启动时会自动检查dump.rdb文件，恢复其中的数据
```

```shell
127.0.0.1:6379> config get dir
1) "dir"
2) "/usr/local/bin"    #如果在这个目录下存在dump.rdb文件，启动redis就会自动恢复其中的数据
```

优点：

1、适合大规模的数据恢复!

2、对数据的完整性要求不高！

缺点：

1、需要一定的时间间隔进行操作，如果redis意外宕机了，最后一次修改的数据就没有了！

2、fock进程的时候，会占用一定的内存空间！

### 5.2、AOF (Append Only File)

将我们所有的命令记录下来，恢复的时候把这个文件全部再执行一遍。

以日志的形式来记录每个写操作，将Redis执行过的所有指令记录下来（读操作不记录），只追加文件但不可以改写文件，redis启动之初会读取该文件重新构建数据。

Aof保存的是appendinly.aof文件

默认是不开启的，需要手动进行配置！我们只需要将appendonly 改为yes就开启了aof.

重启redis就可以生效。

如果这个aof文件有错误，这时候redis是启动不起来的，我们需要修复aof文件，redis给我们提供了这样一个工具 redis-check-aof --fix

```shell
[root@localhost bin]# redis-check-aof --fix appendonly.aof 
0x              4d: Expected \r\n, got: 6176
AOF analyzed: size=84, ok_up_to=52, diff=32
This will shrink the AOF from 84 bytes, with 32 bytes, to 52 bytes
Continue? [y/N]: y
Successfully truncated AOF
```

如果文件正常，重启就可以恢复了。

优点：

1、每次修改都同步，文件完整性更加好

2、每秒同步一次，可能会丢失一秒的数据

缺点：

1、相对于数据文件来说，aof远远大于rdb,修复的速度也比rdb慢。

2、aof运行效率也要比rdb慢，所有redis默认的配置就是rdb持久化！

## 六、Redis主从复制

### 6.1、环境配置

只配置从库，不用配置主库！

```shell
127.0.0.1:6379> info replication     #查看当前库的信息
# Replication
role:master    #角色，master
connected_slaves:0    #没有从机
master_replid:f71f9f3e820529cb1d83e8481168f13d59a35b0d
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:0
second_repl_offset:-1
repl_backlog_active:0
repl_backlog_size:1048576
repl_backlog_first_byte_offset:0
repl_backlog_histlen:0
```

赋值三个配置文件，修改对应的信息

1、端口

2、pid名字

3、log文件

4、dump.rdb名字

修改完毕后启动三个redis服务器，可以通过进程查看信息。

### 6.2、一主二从

默认情况下，每台redis服务器都是主节点，我们一般情况值用配置从机就好了。

一主（79）二从（80、81）

```shell
127.0.0.1:6380> SLAVEOF 127.0.0.1 6379    # SLAVEOF  host 6379   找谁当自己的老大
OK
127.0.0.1:6380> info replication
# Replication
role:slave               #当前角色  从机
master_host:127.0.0.1    #可以看到主机的地址信息
master_port:6379		 #可以看到主机的端口信息
master_link_status:up
master_last_io_seconds_ago:3
master_sync_in_progress:0
slave_repl_offset:0
slave_priority:100
slave_read_only:1
connected_slaves:0
master_replid:5d10c8af41a828c211df6393826247d9f2894398
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:0
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:0

#在主机中查看信息
127.0.0.1:6379> info replication
# Replication
role:master
connected_slaves:1           #多了从机的配置
slave0:ip=127.0.0.1,port=6380,state=online,offset=126,lag=1      #从机信息
master_replid:5d10c8af41a828c211df6393826247d9f2894398
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:126
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:126
```

```shell
#如果两个都配置完了，就是有两个从机了
127.0.0.1:6379> info replication
# Replication
role:master
connected_slaves:2    #从机个数
slave0:ip=127.0.0.1,port=6380,state=online,offset=406,lag=0    #从机1信息
slave1:ip=127.0.0.1,port=6381,state=online,offset=406,lag=0    #从机2信息
master_replid:5d10c8af41a828c211df6393826247d9f2894398
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:406
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:406
```

真实的主从配置应该在配置文件中配置，这样的话是永久的，我们这里使用命令来配置，是暂时的。

```plaintext
细节：
  主机可以写，从机只能读不能写！主机中所有的信息和数据，都会自动被从机保存。
  当主机断开连接，从机依旧连接到主机的，但是没有写操作，这个时候，主机如果回来了，从机依旧可以获取主机写入的信息。
  如果是使用命令行，来配置的主从，从机这个时候如果重启了，就会变回主机，只有再次变为79的从机，立马就能从主机中获取所有数据。
```

### 6.3、哨兵模式

（自动选举老大的模式）

```plaintext
测试
```

```plaintext
我们目前的状态是一主二从
```

1、配置哨兵配置文件sentinel.conf

```shell
#sentinel monitor 被监控的名称 host port <quorum> ，<quorum>:配置了多少个sentinel哨兵统一认为master主节点失联，那么这时客观上认为主节点失联了。
sentinel monitor myredis 127.0.0.1 6379 1     
```

2、启动哨兵

```shell
[root@localhost bin]# redis-sentinel wconfig/sentinel.conf 
3608:X 06 Nov 2020 16:22:58.841 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
3608:X 06 Nov 2020 16:22:58.841 # Redis version=6.0.6, bits=64, commit=00000000, modified=0, pid=3608, just started
3608:X 06 Nov 2020 16:22:58.841 # Configuration loaded
3608:X 06 Nov 2020 16:22:58.842 * Increased maximum number of open files to 10032 (it was originally set to 1024).
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis 6.0.6 (00000000/0) 64 bit
  .-`` .-```.  ```\/    _.,_ ''-._                                   
 (    '      ,       .-`  | `,    )     Running in sentinel mode
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 26379
 |    `-._   `._    /     _.-'    |     PID: 3608
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           http://redis.io        
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                           
              `-.__.-'                                               

3608:X 06 Nov 2020 16:22:58.843 # WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
3608:X 06 Nov 2020 16:22:58.845 # Sentinel ID is 00586711845405f9b432187d56bf6fcd567262e0
3608:X 06 Nov 2020 16:22:58.845 # +monitor master myredis 127.0.0.1 6379 quorum 1
3608:X 06 Nov 2020 16:22:58.846 * +slave slave 127.0.0.1:6380 127.0.0.1 6380 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:22:58.848 * +slave slave 127.0.0.1:6381 127.0.0.1 6381 @ myredis 127.0.0.1 6379
```

如果master节点断开了，这个时候就会从从机中随机选择一个服务器！（这里面有一个投票算法）

```shell
3608:X 06 Nov 2020 16:25:10.705 # +selected-slave slave 127.0.0.1:6381 127.0.0.1 6381 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:10.705 * +failover-state-send-slaveof-noone slave 127.0.0.1:6381 127.0.0.1 6381 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:10.775 * +failover-state-wait-promotion slave 127.0.0.1:6381 127.0.0.1 6381 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:11.351 # +promoted-slave slave 127.0.0.1:6381 127.0.0.1 6381 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:11.351 # +failover-state-reconf-slaves master myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:11.417 * +slave-reconf-sent slave 127.0.0.1:6380 127.0.0.1 6380 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:12.368 * +slave-reconf-inprog slave 127.0.0.1:6380 127.0.0.1 6380 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:12.368 * +slave-reconf-done slave 127.0.0.1:6380 127.0.0.1 6380 @ myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:12.471 # +failover-end master myredis 127.0.0.1 6379
3608:X 06 Nov 2020 16:25:12.471 # +switch-master myredis 127.0.0.1 6379 127.0.0.1 6381
3608:X 06 Nov 2020 16:25:12.471 * +slave slave 127.0.0.1:6380 127.0.0.1 6380 @ myredis 127.0.0.1 6381
3608:X 06 Nov 2020 16:25:12.471 * +slave slave 127.0.0.1:6379 127.0.0.1 6379 @ myredis 127.0.0.1 6381
3608:X 06 Nov 2020 16:25:42.482 # +sdown slave 127.0.0.1:6379 127.0.0.1 6379 @ myredis 127.0.0.1 6381
```

```shell
127.0.0.1:6381> info replication
# Replication
role:master
connected_slaves:1
slave0:ip=127.0.0.1,port=6380,state=online,offset=12533,lag=1
master_replid:8dd070fc6ce1485eaabcf12c2515144c4b4c576c
master_replid2:c1e23431f8b5ebafe4eab3671e92c05fd4ec564c
master_repl_offset:12533
second_repl_offset:8467
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:43
repl_backlog_histlen:12491
```

如果此时主机回来了，只能归并到新的主机下，成为从机。这就是哨兵模式的规则。

哨兵模式：

优点：

1、哨兵集群，基于主从复制模式，所有主从赋值优点，它全有。

2、主从可以切换，故障可以转义，系统可用性更好。

3、哨兵模式就是主从模式的升级，手动到自动。

缺点：

1、redis不好在线扩容，集群容量一旦到达上限，在线扩容就十分麻烦。

2、实现哨兵模式的配置很麻烦，里面有很多选择。

## 七、Redis缓存穿透和雪崩

暂定
