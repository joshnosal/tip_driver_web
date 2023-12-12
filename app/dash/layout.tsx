import Company, { CompanyDocument, CompanyProps } from '@/lib/database/models/company'
import AppContextProvider from '@/utils/AppContext'
import { currentUser, clerkClient, auth } from '@clerk/nextjs'
import React from 'react'
import DashHeader from './header'
import DashSidebar from './sidebar'
import { redirect } from 'next/navigation'
import { ErrorTypes } from '@/utils/Options'
import clerkTools from '@/lib/clerk/tools'
import api from '@/utils/API'
 
export default async function DashboardLayout(props: {children: React.ReactNode}){
  const user = await currentUser()
  let companies: CompanyProps[] = []
  const { getToken } = auth()

  if(!user) throw new Error(ErrorTypes.NoAuth)
  if(user.publicMetadata.validated === false || user.publicMetadata.validated === 'false') clerkClient.users.updateUser(user.id, { publicMetadata: {  }})

  let email = clerkTools.getPrimaryEmail(user)

  companies = await api.get<CompanyProps[]>({
    url: process.env.NEXT_PUBLIC_API_URL + '/user/companies',
    headers: { Authorization: `Bearer ${await getToken()}` }
  })

  return (
    <AppContextProvider
      companies={companies}
      user={JSON.parse(JSON.stringify(user))}
    >
      <div className='w-screen h-screen flex flex-col overflow-hidden bg-slate-100'>
        <DashHeader/>
        <div className='flex grow overflow-hidden'>
          <DashSidebar/>
          {props.children}
        </div>
      </div>
    </AppContextProvider>
  )
}
