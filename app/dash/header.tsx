'use client'
import { AppContext } from '@/utils/AppContext'
import { usePathname } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import clerkTools from '@/lib/clerk/tools'
import type { CompanyProps } from '@/lib/database/models/company'

export default function DashHeader(){
  const pathname = usePathname()
  const { user, companies } = useContext(AppContext)
  const [ company, setCompany ] = useState<CompanyProps>()

  useEffect(() => {
    let chunks = pathname.split('/').filter(i => i !== '')
    if(chunks.includes('dash') && chunks.includes('company') && !chunks.includes('new')) {
      let companyId = chunks[2]
      for(const company of companies){
        if(company._id === companyId) return setCompany(company)
      }
    }
  }, [pathname, companies])

  return (
    <div className='pr-5 flex justify-between align-center border-b border-solid border-gray-300 border-t-0 border-x-0 bg-white'>
      <div className='flex items-center'>
        <div className='text-2xl font-bold border-r border-solid border-y-0 border-l-0 border-gray-300 text-center py-2' style={{ width: 200 }}>Tip Driver</div>
        <div className='text-xl font-semibold pl-10'>{company ? company.name : ''}</div>
      </div>
      <div className='flex items-center gap-3'>
        {clerkTools.getPrimaryEmail(user)}
      </div>
    </div>
  )

}