const { createClient } = require("redis");
const dotenv = require("dotenv");

dotenv.config();
const redisHost = process.env.redisHost;
const redisPort = process.env.redisPort;

const redis = createClient({
  socket: { host: redisHost, port: redisPort },
  database: 1,
});

redis.on("connect", () => {
  console.log("[REDIS] service connecting...");
});

redis.on("ready", () => {
  console.log("[REDIS] service ready");
});

redis.on("error", (err) => {
  console.error("[REDIS] error : ", err);
});

const connect = async () => {
  redis.connect();
};

const getHostDetail = async (type) => {
  const script = `
    local cache_key = 'cache:hosts:${type}:raw'
    local cached = redis.call('GET', cache_key)
    
    if cached then
      return cached
    end
    
    local ids = redis.call('SMEMBERS', 'nms_host:${type}')
    local results = {}
    
    for i, id in ipairs(ids) do
      local key = 'nms_host:' .. id
      local data = redis.call('HGETALL', key)
      
      if next(data) ~= nil then
        local obj = {}
        for j = 1, #data, 2 do
          obj[data[j]] = data[j + 1]
        end
        
        results[obj.host_object_id] = {
          host_object_id = obj.host_object_id or '',
          host_name = obj.host_name or '',
          address = obj.address or '',
          status = obj.status or '',
          last_check = obj.last_check or ''
        }
      end
    end
    
    local json_results = cjson.encode(results)
    redis.call('SETEX', cache_key, 30, json_results)
    
    return json_results
  `;

  try {
    const result = await redis.eval(script, 0);

    return { success: true, data: JSON.parse(result) };
  } catch (error) {
    console.error("Lua script failed, fallback to pipeline:", error);
    return { success: false, err: error };
  }
};

const getHostNotOkDetail = async () => {
  return await getHostDetail("notOk");
};

const getHostOkDetail = async () => {
  return await getHostDetail("ok");
};

const storeData = async (prevDown, prevUp, data) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "No data provided" };
    }

    const script = `
      local up = {}
      local down = {}
      
      for i = 1, #ARGV, 6 do
        local host_id = tostring(ARGV[i])
        local host_name = tostring(ARGV[i+1])
        local address = tostring(ARGV[i+2])
        local status = string.upper(tostring(ARGV[i+3]))
        local last_check = tostring(ARGV[i+4])
        local output = tostring(ARGV[i+5])
        
        local key = 'nms_host:' .. host_id
        
        redis.call('HSET', key,
          'host_object_id', host_id,
          'host_name', host_name,
          'address', address,
          'status', status,
          'last_check', last_check,
          'output', output
        )
        
        if status == 'OK' then
          redis.call('SADD', 'nms_host:ok', host_id)
          redis.call('SREM', 'nms_host:notOk', host_id)
          table.insert(up, host_id)
        else
          redis.call('SADD', 'nms_host:notOk', host_id)
          redis.call('SREM', 'nms_host:ok', host_id)
          table.insert(down, host_id)
        end
      end
      
      redis.call('DEL', 'cache:hosts:ok', 'cache:hosts:notok')
      
      local result = '{'
      result = result .. '"up":[' .. table.concat(up, ',') .. '],'
      result = result .. '"down":[' .. table.concat(down, ',') .. ']'
      result = result .. '}'
      
      return result
    `;

    const args = [];
    let up = [];
    let down = [];
    for (const e of data) {
      if (!e.host_object_id) continue;

      const status = (e.output || "").split(" ")[0].toUpperCase();

      args.push(
        String(e.host_object_id),
        String(e.host_name || ""),
        String(e.address || ""),
        status,
        String(e.last_check || ""),
        String(e.output || "")
      );

      const updStatus = newStatus(prevDown, prevUp, e);
      if (Object.keys(updStatus.newUp).length > 0) {
        up.push(updStatus.newUp);
      }
      if (Object.keys(updStatus.newDown).length > 0) {
        down.push(updStatus.newDown);
      }
    }

    const res = await redis.eval(script, { arguments: args });
    // const result = JSON.parse(res);
    return { success: true, data: { up, down } };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const newStatus = (prevDown, prevUp, data) => {
  let newDown = {};
  let newUp = {};

  const status = (data.output || "").split(" ")[0].toUpperCase();
  const hosts = {
    host_object_id: data.host_object_id,
    host_name: data.host_name,
    address: data.address,
    status: status,
    last_check: data.last_check,
    output: data.output,
  };

  if (prevUp.hasOwnProperty(data.host_object_id)) {
    if (status != "OK") newDown = hosts;
  } else {
    if (status == "OK") newUp = hosts;
  }

  if (prevDown.hasOwnProperty(data.host_object_id)) {
    if (status == "OK") newUp = hosts;
  } else {
    if (status != "OK") newDown = hosts;
  }

  return { newUp, newDown };
};

const getHostOk = async () => {
  const hostIds = await redis.sMembers("nms_host:ok");
  try {
    return { success: true, data: hostIds };
  } catch (error) {
    return { success: false, err: error };
  }
};

const getHostNotOk = async () => {
  const hostIds = await redis.sMembers("nms_host:notOk");
  try {
    return { success: true, data: hostIds };
  } catch (error) {
    return { success: false, err: error };
  }
};

module.exports = { redis, connect, getHostOk, getHostNotOk, getHostOkDetail, getHostNotOkDetail, storeData };
