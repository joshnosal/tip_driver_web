import { authMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default authMiddleware({
  publicRoutes: [
    '/',
    '/access/signin',
    '/access/signup'
  ],
  // afterAuth(auth, req, evt){
  //   if(!auth.userId && !auth.isPublicRoute) {
  //     return 
  //   }
  //   return NextResponse.next()
  // }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};