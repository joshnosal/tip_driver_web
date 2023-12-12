import Company, { CompanyDocument, CompanyProps } from '@/lib/database/models/company'
import { redirect } from 'next/navigation'
import { auth, clerkClient } from '@clerk/nextjs'
import { ErrorTypes } from '@/utils/Options'
import type { User } from '@clerk/nextjs/api'
import UserDisplay from './display'
import clerkTools from '@/lib/clerk/tools'
import api from '@/utils/API'

export interface UserWithRole extends User {
  role: 'Admin'|'User',
  email: string
}

export interface BasicUser {
  email: string
  lastSignInAt: number
  role: 'Admin'|'User'
  key: string,
  accepted: boolean
}

export default async function UsersPage({ params }: { params: {id: string}}){
  const { userId, getToken } = auth()
  if(!userId) throw new Error(ErrorTypes.NoAuth)

  if(!params.id || params.id === 'null') return redirect('/dash/company/new')

  let company: CompanyProps
  let users: BasicUser[]

  try {
    company = await api.get<CompanyProps>({
      url: process.env.NEXT_PUBLIC_API_URL + '/company/company',
      headers: {
        companyId: params.id,
        Authorization: `Bearer ${await getToken()}`
      }
    })

    let rawUsers = await clerkClient.users.getUserList({
      userId: [...company.admins, ...company.basic_users]
    })
    users = rawUsers.map(u => ({
      email: clerkTools.getPrimaryEmail(u),
      lastSignInAt: u.lastSignInAt||0,
      role: company && company.admins.includes(u.id) ? 'Admin' : 'User',
      key: u.id,
      accepted: u.publicMetadata.validated === false || u.publicMetadata.validated === 'false' ? false : true
    }))
    

  } catch(e) {
    throw new Error(ErrorTypes.DefaultServer)
  }

  return (
    <UserDisplay
      company={JSON.parse(JSON.stringify(company))}
      users={JSON.parse(JSON.stringify(users))}
      userId={userId}
    />
  )
}