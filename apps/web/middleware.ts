import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'dib_auth';
const PASSWORD = process.env.SITE_PASSWORD || '';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 未配置站点密码 → 不启用访问密码墙（自托管场景可选）
  if (!PASSWORD) return NextResponse.next();

  // 放行
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // 已认证
  const authCookie = req.cookies.get(AUTH_COOKIE);
  if (authCookie?.value === PASSWORD) {
    return NextResponse.next();
  }

  // 未认证 → 显示登录页（直接返回 HTML，不用跳转）
  const redirect = pathname;
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spanish Vocab</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#F5F3EE;display:flex;align-items:center;justify-content:center;min-height:100vh}form{background:#FCFBF8;padding:40px 36px;border-radius:20px;box-shadow:0 1px 4px rgba(30,24,16,.04);text-align:center;max-width:360px;width:90%}h1{font-size:20px;font-weight:700;color:#1E1810;margin-bottom:8px}p{font-size:13px;color:#7A7065;margin-bottom:24px}input{width:100%;padding:10px 14px;border:1.5px solid #E6E1D8;border-radius:10px;font-size:15px;text-align:center;font-family:inherit;outline:none}input:focus{border-color:#E0C898;box-shadow:0 0 0 3px rgba(194,136,74,.06)}button{margin-top:14px;width:100%;padding:10px;background:#F9F1E2;border:1.5px solid #E0C898;border-radius:10px;font-size:14px;font-weight:600;color:#9A6428;cursor:pointer;font-family:inherit}button:hover{background:#E0C898}#err{color:#C06658;font-size:12px;margin-top:10px;display:none}</style></head><body><form method="POST"><h1>西语单词</h1><p>需要密码才能访问</p><input type="password" name="p" placeholder="输入密码" autofocus><button type="submit">进入</button><p id="err"></p></form><script>
var p = new URLSearchParams(window.location.search).get('e');
if (p==='1') document.getElementById('err').style.display='block';
document.getElementById('err').textContent='密码错误';
</script></body></html>`;

  if (req.method === 'POST') {
    return req.formData().then((formData) => {
      const submitted = formData.get('p')?.toString() || '';
      if (submitted === PASSWORD) {
        const res = NextResponse.redirect(new URL(redirect, req.url));
        res.cookies.set(AUTH_COOKIE, PASSWORD, {
          httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
        });
        return res;
      }
      return new NextResponse(html, { status: 401, headers: { 'Content-Type': 'text/html' } });
    });
  }

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}