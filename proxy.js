import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/hosgeldin', '/giris', '/api/access', '/admin-giris', '/api/admin-access'];

export function proxy(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (pathname === '/admin' || pathname.startsWith('/api/admin')) {
    const adminOk = req.cookies.get('admin_ok')?.value === '1';
    if (!adminOk) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/admin-giris';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const accessOk = req.cookies.get('access_ok')?.value === '1';
  if (!accessOk) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/hosgeldin';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg).*)'],
};
