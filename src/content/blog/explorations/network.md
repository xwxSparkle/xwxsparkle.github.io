---
title: NanoPi校园网锐捷认证与多拨方案
date: 2026-11-23
---

## 1.前言

众所周知大部分学校的校园网的上网体验都十分糟糕，验证繁琐，网速也慢。以前还在学校的时候，花了很多时间，做了诸多尝试后，总算是折腾了一套自动验证与多拨提速的方案，不过毕业之后也不需要了，为了能再发挥些价值，就有了这篇教程。

教程仅适用于使用锐捷认证的有线网络，且仅在中山大学珠海校区验证通过，其他学校一些设置可能不同。

## 2.准备

主要设备包括一台无线路由器、一台搭载OpenWRT系统的软路由。其他准备包括两根网线、一根Type-C数据线、一个或多个中大校园网账号、一根网线转接器，用于有线连接设置软路由。

我的设备是小米的AX3000路由器和友善NanoPi R5C，整套方案的原理是在软路由上使用`minieap`进行锐捷验证，然后使用`macvlan`和`mwan3`进行单线多拨来提高网速，再将软路由有线中继至无线路由器。

注意，`minieap`项目的编译比较麻烦，预编译安装包可以在<https://github.com/AutoCONFIG/minieap-openwrt>或<https://github.com/DreamOfStars/SYSU-Network-Guide>下载。

使用Type-C数据线供电，启动软路由。连接电脑和软路由LAN口，打开浏览器地址栏输入192.168.1.1访问软路由网页管理界面。

## 3.安装OpenWRT系统

在OpenWRT官网选择适配你的软路由型号的最新系统更新固件，完成后在OpenWRT界面顶栏选择System -> Backup / Flash Firmware，然后选择Flash image，上传系统更新固件后进行更新。安装系统是为了使用官方OpenWRT系统获取自动更新，NanoPi原厂自带FriendlyWRT系统，无法通过管理界面直接更新系统。

## 4.替换OpenWRT软件源

将`apk`软件源替换为国内镜像，推荐中科大镜像源。更换国内软件源后能避免网络问题导致的下载速度缓慢，官方源大部分情况下网速也是正常的。注意最新的OpenWRT系统将软件包管理工具从`opkg`换成了`apk`。

## 5.下载macvlan，mwan3和minieap

在顶栏选择System -> Software，点击Update lists，搜索`macvlan`，下载`kmod-macvlan`，搜索`mwan3`，下载`luci-app-mwan3`，此处`luci-app-`前缀是网页管理界面，下载时会同时下载软件本体即`mwan3`，OpenWRT属于linux系统分支，cli命令行程序，比如`mwan3`在网页管理界面是没有单独的设置页面的。选择Upload Package，上传`minieap`后进行安装。

## 6.配置虚拟网卡

由于中大的有线网络锐捷认证不支持同一账号多设备同时在线，你需要不使用有线网的同学的校园网账号来提升网速，验证不占据无线网络的设备数量限制，但是会挤占有线网络认证，如果没有办法获取多个账号，可以忽略`macvlan`与`mwan3`的配置。大部分宿舍的交换机为百兆，单账号的下载网速在40Mbps左右，因此2-3个账号就可以跑满网速上限。

在顶栏选择Network -> Interfaces，点击Devices，点击Add device configuration，Device type选择MAC VLAN，Base Device选择设备WAN口绑定的接口，例如`eth1`，MAC Address可以按照`eth1`的MAC Address的格式填写，例如`32:0A:AA:D4:38:AA`，不要与已有的MAC地址重复。根据拥有的校园网账号数量继续新增网卡。点击Interfaces，点进Add new interface，Name可填`wan_v1`，Device选择之前创建的一个虚拟网卡，点击Firewall Settings，Create / Assign firewall-zone选择wan，继续给每个新增的虚拟网卡添加一个接口。

在顶栏选择Network -> MultiWAN Manager，点击Interface，按照每个接口的名字`wan_v1`新增接口，点击Member，给每个接口名字加入后缀，例如`wan_v1_m1`，点击Policy，修改balanced策略，Member used填入新增的每个成员。

此时便完成了单线多拨的所有设置，在Status -> Overview中应该可以看见所有新增接口的连接状态。

## 7.锐捷认证

连接有线网口和软路由WAN口，开始设置锐捷认证，使用ssh连接软路由，或安装`luci-app-ttyd`，在网页终端
中输入

```sh
minieap -u username -p password -n eth1 -b 2 --save --module rjv3
```

其中用户名和密码为你的NetID账号和密码，单线多拨时，为每个虚拟网卡名称如`eth1mac0`分配一个账号并验证一次，建议直接设置开启自启动脚本，选择System -> Startup -> Local Startup，然后将命令复制在`exit 0`前，这样每次系统开机就能自动运行验证。

## 8.结语

花了一晚上的时间写完教程，看着静静地躺在角落里的NanoPi R5C，回想起曾经折腾的过程，不断地踩坑，耗费了很多时间，尤其是设置单线多拨，需要配置网卡，接口，负载均衡。但是经历过从不熟悉到理解，也收获了不少成就感。至少在大学宿舍里的那几年，每次下载游戏更新的时候那将近百兆的网速，也会令人感到欣慰，那是现在已经很难再体会到的东西。没想到写这篇文章错过了英伟达35%的涨幅，唉。写之前都看了一眼股市的。

## 9.参考资料

- <https://github.com/DreamOfStars/SYSU-Network-Guide>
- <https://myth.cx/p/openwrt-macvlan-mwan3/>
