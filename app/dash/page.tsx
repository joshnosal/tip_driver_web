'use client'
import { AppContext } from '@/utils/AppContext'
import { redirect } from 'next/navigation'
import { useContext } from 'react'

export default function DashPage(){
  const { companies } = useContext(AppContext)
  if(!companies.length) {
    redirect('/dash/company/new')
  } else {
    redirect(`/dash/company/${companies[0]._id}/settings`)
  }
}