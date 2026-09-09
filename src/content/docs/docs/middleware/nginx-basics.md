---
title: 'nginx 入门'
description: 'Nginx 入门知识：安装启动、常用配置、反向代理与负载均衡基础。'
---

## 一、简介

 官方描述: 【nginx \[engine x\] is an HTTP and reverse proxy server, a mail proxy server, and a generic TCP/UDP proxy server, According to Netcraft, nginx served or proxied 23.20% busiest sites in January 2021】**nginx是一个Http服务器、反向代理服务器、邮件代理服务器、和通用TCP/UDP代理服务器**,根据Netcraft统计,截至2021年,它代理了世界上最繁忙的网站的比例达到了23.20%。

## 二、为什么使用nginx

```
 根据Nginx中的官方网站的介绍我们知道,nginx的功能强大,在实际的工作中,我们会有很多场景会需要借助nginx来实现,比如:
```

  1、想要访问外国的网站,但是因为某些原因,国内直接访问会被限制,因此可以通过nginx的正向代理来实现”科学上网”。

  2、在某种工作环境下,项目部署在内网,无法访问外网的资源,可以使用nginx进行代理完成此需求。

  3、项目是完全前后端分离开发,需要分布部署前后端项目,此时可以将前端项目部署到nginx中,因为nginx处理静态资源的效率比常见的应用服务器如Tomcat的要快很多。

  4、nginx支持负载均衡,可以更大程度的提高服务器的使用效率。

  5、除此之外,nginx还可以用作请求拦截,根据配置文件的配置,可以对请求路径进行自定义拦截。

## 三、nginx的功能

```
   **1、缓存静态文件(html,css,js)**：实现完全的前后端分离,且它处理静态文件的效率是应用服务器的几倍。
```

  **2、反向代理:** 当真实服务器不能被直接访问到时,nginx可作为反向代理服务,用于中间做转发

  **3、web缓存:** 可以对不同的文件做不同的缓存处理，配置灵活，并且支持FastCGI\_Cache，主要用于对FastCGI的动态程序进行缓存。配合着第三方的ngx\_cache\_purge，对制定的URL缓存内容可以的进行增删管理。

  **4、正向代理:** 实现”科学上网”

  **5、负载均衡:** 更大程度提高服务器的使用效率

  **6、邮件代理服务器:** 实现轻松扩展邮件服务器的数量、根据不同的规则选择邮件服务器，例如，根据客户的IP地址选择最近的服务器,实现邮件服务器的负载均衡

## 四、nginx的常用命令

 **启动：**./nginx 或者 ./nginx -c /配置文件的路径

  **停止:** ./nginx -s stop

  **重启:** ./nginx -s reload

  **检查配置文件:** ./nginx -t

  **查看nginx启动情况:** ps -ef | grep nginx

注: 需要切换到安装好的nginx对应的sbin目录。

## 五:nginx的配置文件详解

 注:nginx的配置文件在安装后的nginx目录下的conf文件夹中

### **(一):刚安装好的配置文件具体如下:**

```shell
#user  nobody;
worker_processes  1;

#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

#pid        logs/nginx.pid;
events {
    worker_connections  1024;
}
http {
    include       mime.types;
    default_type  application/octet-stream;

    #log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    #                  '$status $body_bytes_sent "$http_referer" '
    #                  '"$http_user_agent" "$http_x_forwarded_for"';

    #access_log  logs/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    #keepalive_timeout  0;
    keepalive_timeout  65;

    #gzip  on;

    server {
        listen       80;
        server_name  localhost;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        location / {
            root   html;
            index  index.html index.htm;
        }

        #error_page  404              /404.html;

        # redirect server error pages to the static page /50x.html
        #
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }

        # proxy the PHP scripts to Apache listening on 127.0.0.1:80
        #
        #location ~ \.php$ {
        #    proxy_pass   http://127.0.0.1;
        #}

        # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
        #
        #location ~ \.php$ {
        #    root           html;
        #    fastcgi_pass   127.0.0.1:9000;
        #    fastcgi_index  index.php;
        #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
        #    include        fastcgi_params;
        #}

        # deny access to .htaccess files, if Apache's document root
        # concurs with nginx's one
        #
        #location ~ /\.ht {
        #    deny  all;
        #}
    }
    # another virtual host using mix of IP-, name-, and port-based configuration
    #
    #server {
    #    listen       8000;
    #    listen       somename:8080;
    #    server_name  somename  alias  another.alias;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}
    # HTTPS server
    #
    #server {
    #    listen       443 ssl;
    #    server_name  localhost;

    #    ssl_certificate      cert.pem;
    #    ssl_certificate_key  cert.key;

    #    ssl_session_cache    shared:SSL:1m;
    #    ssl_session_timeout  5m;

    #    ssl_ciphers  HIGH:!aNULL:!MD5;
    #    ssl_prefer_server_ciphers  on;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}

}
```

### **(二)配置详解**

 **1、根据上面的nginx配置文件,可以将nginx的配置分为以下的组成结构**

```shell
... #全局快
events {  #events快
}
http{ #http块
    server { #server快
        location { #location快
        }
    }
}
```

 **2、每块的结构功能**

 **(1)、全局块:** 配置影响nginx全局的指令。一般有运行nginx服务器的用户组，nginx进程pid存放路径，日志存放路径，配置文件引入，允许生成worker process数等。

  **(2)、events块:** 配置影响nginx服务器或与用户的网络连接。有每个进程的最大连接数，选取哪种事件驱动模型处理连接请求，是否允许同时接受多个网路连接，开启多个网络连接序列化等

  **(3)、http块:** 可以配置多个server,配置代理、缓存、日志定义等能和第三方模块的配置。如文件引入，mime-type定义，日志自定义，是否使用sendfile传输文件，连接超时时间，单连接请求数等。

  **(4)、server块:** 配置虚拟主机的相关参数，一个http中可以有多个server。

  **(5)、location块:** 配置请求的路由，以及各种页面的处理情况。

 **3、nginx配置文件详细的解释**

```shell
########### 每个指令必须有分号结束。#################
#user administrator administrators;  #配置用户或者组，默认为nobody nobody。
#worker_processes 2;  #允许生成的进程数，默认为1
#pid /nginx/pid/nginx.pid;   #指定nginx进程运行文件存放地址
error_log log/error.log debug;  #制定日志路径，级别。这个设置可以放入全局块，http块，server块，级别以此为：debug|info|notice|warn|error|crit|alert|emerg
events {
    accept_mutex on;   #设置网路连接序列化，防止惊群现象发生，默认为on
    multi_accept on;  #设置一个进程是否同时接受多个网络连接，默认为off
    #use epoll;      #事件驱动模型，select|poll|kqueue|epoll|resig|/dev/poll|eventport
    worker_connections  1024;    #最大连接数，默认为512
}
http {
    include       mime.types;   #文件扩展名与文件类型映射表
    default_type  application/octet-stream; #默认文件类型，默认为text/plain
    #access_log off; #取消服务日志    
    log_format myFormat '$remote_addr-$remote_user [$time_local] $request $status $body_bytes_sent $http_referer $http_user_agent $http_x_forwarded_for'; #自定义格式
    access_log log/access.log myFormat;  #combined为日志格式的默认值
    sendfile on;   #允许sendfile方式传输文件，默认为off，可以在http块，server块，location块。
    sendfile_max_chunk 100k;  #每个进程每次调用传输数量不能大于设定的值，默认为0，即不设上限。
    keepalive_timeout 65;  #连接超时时间，默认为75s，可以在http，server，location块。

    upstream mysvr {   
      server 127.0.0.1:7878;
      server 192.168.10.121:3333 backup;  #热备
    }
    error_page 404 https://www.baidu.com; #错误页
    server {
        keepalive_requests 120; #单连接请求上限次数。
        listen       4545;   #监听端口
        server_name  127.0.0.1;   #监听地址       
        location  ~*^.+$ {       #请求的url过滤，正则匹配，~为区分大小写，~*为不区分大小写。
           #root path;  #根目录
           #index vv.txt;  #设置默认页
           proxy_pass  http://mysvr;  #请求转向mysvr 定义的服务器列表
           deny 127.0.0.1;  #拒绝的ip
           allow 172.18.5.54; #允许的ip           
        } 
    }
}
```

## 六: nginx中常用的小知识

### **1、配置文件中常用的变量,可以用于请求拦截或者匹配路由**

```shell
1.$remote_addr 与 $http_x_forwarded_for 用以记录客户端的ip地址；
2.$remote_user ：用来记录客户端用户名称；
3.$time_local ： 用来记录访问时间与时区；
4.$request ： 用来记录请求的url与http协议；
5.$status ： 用来记录请求状态；成功是200；
6.$body_bytes_s ent ：记录发送给客户端文件主体内容大小；
7.$http_referer ：用来记录从那个页面链接访问过来的；
8.$http_user_agent ：记录客户端浏览器的相关信息；
```

### **2、location下常见的参数含义解释**

 (1)、try\_files参数(常用于部署前端项目时使用)

 具体含义:如: 请求路径是: <http://localhost/demo>，在location中配置: try_files $uri $uri/ /demo/index.html; 的含义:
　　$uri便是demo,try_files的作用,它会先去到硬盘中查找是否存在demo这个文件,如果存在则返回,如果不存在,则查找是否存在/root/demo/的目录($uri/),如果找不到,则会fallback到try_files的最后一个选项index.html,发起一个内部“子请求”，也就是相当于 nginx 发起一个 HTTP 请求到 <http://localhost/index.html>。


 (2)、root和index参数

 root：表示根目录、index：表示默认页

 (3)、proxy\_set\_header参数

 用来重定义发往后端服务器的请求头，Value值可以是包含文本、变量或者它们的组合.

 格式: proxy\_set\_header Field Value;

  原http请求的Header中的Host字段也放到转发的请求里。如果不加这一行的话，nginx转发的请求header里就不会有Host字段，而服务器是靠这个Host值来区分你请求的是哪个域名的资源的

 (4)、X-Forwarded-For参数

 用途: 为了记录整个的代理过程，如果存在多层代理跳转的情况下,可以通过它来获取到被代理的客户端的地址。

 (5)、X-Real-IP参数

 被代理的客户端的真是地址,在header里面的 X-Real-IP只是一个变量，后面的设置会覆盖前面的设置,一般只在第一个代理设置 proxy_set_header X-Real-IP $remote_addr; 就好了，然后再应用端直接引用 $http_x_real_ip 就行.
