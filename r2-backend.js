var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400"
};
function handleOptions(request) {
  const headers = request.headers;
  if (headers.get("Origin") !== null && headers.get("Access-Control-Request-Method") !== null) {
    const respHeaders = {
      ...corsHeaders,
      "Access-Control-Allow-Headers": headers.get("Access-Control-Request-Headers") || "*"
    };
    return new Response(null, {
      status: 200,
      // 返回 200 状态码
      headers: respHeaders
    });
  }
  return new Response(null, {
    status: 405,
    // 方法不被允许
    headers: {
      Allow: "GET, PUT, HEAD, POST, OPTIONS"
    }
  });
}
__name(handleOptions, "handleOptions");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.slice(1));
    try {
      if (request.method === "OPTIONS") {
        return handleOptions(request);
      }
      const hasValidHeader = /* @__PURE__ */ __name((request2, env2) => {
        console.log(env2.AUTH_KEY_SECRET);
        return request2.headers.get("X-Custom-Auth-Key") === env2.AUTH_KEY_SECRET;
      }, "hasValidHeader");
      if (!hasValidHeader(request, env)) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      
      // 获取所有图片列表
      if (request.method === "GET" && path.startsWith("list")) {
        // 检查是否指定了目录
        const parts = path.split('/');
        if (parts.length < 2 || !parts[1]) {
          return new Response("必须指定目录", { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }
        
        const directory = parts[1];
        const options = {
          prefix: `${directory}/`
        };
        
        const list = await env.MY_BUCKET.list(options);
        const images = list.objects.map(obj => ({
          name: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          etag: obj.etag
        }));
        return new Response(JSON.stringify(images), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      if (request.method === "PUT") {
        await env.MY_BUCKET.put(path, request.body);
        return new Response("\u6587\u4EF6\u4E0A\u4F20\u6210\u529F", { status: 200, headers: corsHeaders });
      }
      if (request.method === "GET") {
        const object = await env.MY_BUCKET.get(path);
        if (object === null) {
          return new Response("Object Not Found", { status: 404, headers: corsHeaders });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        for (const [key, value] of Object.entries(corsHeaders)) {
          headers.set(key, value);
        }
        return new Response(object.body, {
          headers
        });
      }
      return new Response("\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u6CD5", { status: 405 });
    } catch (error) {
      return new Response(`\u8BF7\u6C42\u5931\u8D25: ${error.message}`, { status: 500 });
    }
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
