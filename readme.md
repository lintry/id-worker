# SnowFlake ID
[![NPM](https://nodei.co/npm/kml-id-worker.png)](https://nodei.co/npm/kml-id-worker/)

根据SnowFlake规则创建id



## 安装

```sh
npm i kml-id-worker
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



## 在PostgresQL中创建一个函数

通常在PostgresQL中会使用`sequence`作为id生成器，产生的数字有序，但是无法实现多个服务器并发产生ID且避免重复。如果在PostgresQL中定义一个函数生成id，采用相同逻辑实现代码，即可解决这个问题。

### 定义一个sequence来模拟同一个timestamp里的序列号

```sql
create sequence seq_snow_flake_id increment by 1 minvalue 1 no maxvalue start with 1;
```

### 定义函数实现相同的id算法

```sql
CREATE OR REPLACE FUNCTION "public"."fn_snow_flake_id"("dc_id" int4, "worker_id" int4)
  RETURNS "pg_catalog"."varchar" AS $BODY$BEGIN
	
  RETURN trim(to_char((extract('epoch' from now()) * 1000 - 1513182210789) * power(2,22) :: BIGINT + (((dc_id & 31)<<17) | ((worker_id & 31)<<10)) + (nextval('seq_snow_flake_id') & 4095), '9999999999999999999'));
END
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100
```



### 使用随机函数代替sequence

如果不创建sequence，而用随机函数代替，也能实现算法，但是否会在高并发时产生相同的随机数就要依赖数据库的random函数了。代码可以调整为

```sql
CREATE OR REPLACE FUNCTION "public"."fn_snow_flake_id"("dc_id" int4, "worker_id" int4, "f" bigint = 0)
  RETURNS "pg_catalog"."varchar" AS $BODY$BEGIN
	
  RETURN trim(to_char((extract('epoch' from now()) * 1000 + f - 1513182210789) * power(2,22) :: BIGINT + (((dc_id & 31)<<17) | ((worker_id & 31)<<10)) + ((random()*10000)::int & 4095), '9999999999999999999'));
END
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100
```

> 有趣的是，通过pgbench测试中，60秒内产生了60余万条数据，而使用随机函数产生的id重复率在40~60左右，而使用了sequence产生的重复id要高达上千条。可能的原因是因为随机参数的数据分布更广，在与上4095后产生的数据更分散。



### 警告

因为涉及到大整型的数字运算，使用了`long.js`模块，可以运算53位的整型数字，但是模块的`toNumber`方法有bug，会导致和`toString`不一致，例如：

```javascript
const Long = require('long')
const a = new Long(306315265,3377089)
const b = new Long(306315264,3377089)

console.log(a.toNumber(), a.toString()) // 14504487116996608 '14504487116996609'

console.log(b.toNumber(), b.toString()) // 14504487116996608 '14504487116996608'

```



很明显，其中的`a`在输出数字型的时候和字符串不同，这是因为Javascript在计算时的误差。所以`nextId()`返回值改成`toString`，如果在获得id后还需要进行计算，可以用`Long.fromString`转换后调用运算方法