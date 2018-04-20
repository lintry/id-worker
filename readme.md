# SnowFlake ID

根据SnowFlake规则创建id



## 安装

```sh
npm i id-worker
```



## 使用

```javascript
const IdWorker = require('id-worker');

//定义一个数据中心为3，第9个worker的id生成器
const idWorker = new IdWorker({datacenterId: 3, workerId: 9});
// 获取一个id
let next_id = idWorker.nextId();
console.log('Next ID is', next_id)

// 解析已经生成的id内的信息
let {timestamp, datacenterId, workerId, sequence} = idWorker.parse(next_id);
// 打印时间戳、数据中心、工作者、序列号
console.log({timestamp, datacenterId, workerId, sequence});

```



## 说明

id生成器根据twitter的SnowFlake算法实现，原算法实现代码见[github](https://github.com/twitter/snowflake/blob/snowflake-2010/src/main/scala/com/twitter/service/snowflake/IdWorker.scala)

每个id由64位正整数组成：

- 最高位固定0
- 后面41位存放时间戳，时间戳使用当前时间和指定的创世时间戳之间的毫秒数
- 后面5位存放数据中心id
- 后面5位存放每个数据中心能同时处理的工作者id
- 最后12位存放在同一个数据中心的同一个工作者在相同的时间戳里产生的不同id

时间戳的41位长度是固定的，后面的22位长度按照SnowFlake的算法定义，也可以自行根据需要调整。创世时间戳有个默认值，可以指定任何一个时间，在实际应用中应该是预先指定过去的某个时刻，并且尽量不要改变，避免产生id的重复



## 提醒

id生成器的计算仅保证在当前机器的进程内并发生成id时，会考虑利用序列号解决id重复的问题。但是如果在生产环境中有多台机器多个服务启动时，要自行保证每个进程创建生成器的初始参数是不同的。