'use client'

import { Divider, Menu, Select, Button, Badge, Tag } from 'antd'
import { UserOutlined, BarChartOutlined, LogoutOutlined, SettingOutlined, UsergroupAddOutlined, PlusOutlined } from '@ant-design/icons'
import type { MenuProps, SelectProps } from 'antd'
import { useAuth } from '@clerk/nextjs'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useContext, useState, useEffect } from 'react'
import { AppContext } from '@/utils/AppContext'
import { CompanyProps } from '@/lib/database/models/company'
import api from '@/utils/API'
import Stripe from 'stripe'


export default function DashSidebar(){
  const { signOut } = useAuth()
  const router = useRouter()
  const pathName = usePathname()
  const searchParams = useSearchParams()

  const { message, companies, Authorization } = useContext(AppContext)
  const [ selectedKeys, setSelectedKeys ] = useState<string[]>([])
  const [ company, setCompany ] = useState<CompanyProps|void>()
  const [ errors, setErrors ] = useState<{settings: number, users: number, metrics: number}>({
    settings: 0,
    users: 0,
    metrics: 0
  })

  const selectCompany = (id: string) => {
    for(const co of companies){
      if(co._id === id) {
        setCompany(co)
        let paths = pathName.split('/').filter(p => p !== '')
        if(paths.includes('dash') && paths.includes('company') && !paths.includes('new')) {
          paths[2] = co._id
          router.push('/'+paths.join('/') + '?' + searchParams.toString())
        }
      }
    }
  }

  useEffect(() => {
    let paths = pathName.split('/').filter(p => p !== '')
    if(paths.includes('dash') && paths.includes('company') && !paths.includes('new')) {
      for(const co of companies) {
        if(co._id === paths[2]) return setCompany(co)
      }
    }
  }, [pathName, companies])

  useEffect(() => {
    let paths = pathName.split('/').filter(p => p !== '')
    let keys = ['settings', 'account', 'users', 'metrics']
    for(const key of keys) {
      if(paths.includes(key)) {
        return setSelectedKeys([key])
      }
    }
  }, [pathName])

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      if(!company) return
      let account: Stripe.Response<Stripe.Account>|undefined = undefined
      try {
        account = await api.get<Stripe.Response<Stripe.Account>>({
          url: process.env.NEXT_PUBLIC_API_URL + '/stripe/account',
          headers: { companyId: company._id, Authorization },
          signal: controller.signal
        })
      } catch(e) {
        if(controller.signal.aborted) return
      }
      
      if(
        !account ||
        !account.charges_enabled ||
        !account.details_submitted ||
        !account.payouts_enabled
      ) {
        setErrors(e => ({...e, settings: 1}))
      } else {
        setErrors(e => ({...e, settings: 0}))
      }
    }
    fetchData()
    return () => controller.abort()
  }, [company, Authorization, errors])

  const accountItems: MenuProps['items'] = [
    {
      label: <Button
        icon={<PlusOutlined/>}
        onClick={() => router.push('/dash/company/new')}
        type='primary'
        style={{ width: '100%' }}
      >New Company</Button>,
      key: 'newCoBtn',
      type: 'group'
    },
    {
      label: <Select
        value={company?._id || 'None'}
        onChange={selectCompany}
        options={companies.length ? companies.map(co => ({
          value: co._id, label: co.name
        })) : [{ value: 'None', label: 'None' }]}
        style={{ width: '100%' }}
      />,
      key: 'companySelect',
      type: 'group'
    },
    { type: 'divider' },
    {
      label: 'Company',
      key: 'divider-company',
      type: 'group',
      children: [
        {
          label: 'Users',
          key: 'users',
          icon: <UsergroupAddOutlined/>
        },
        {
          label: 'Settings',
          key: 'settings',
          icon: <Badge count={errors.settings} offset={[0,0]} size='small'>
            <SettingOutlined/>
          </Badge>,
          popupOffset: [10, 10]
        },
        {
          label: 'Metrics',
          key: 'metrics',
          icon: <BarChartOutlined/>
        }
      ]
    },
    { type: 'divider' },
    {
      label: 'Account',
      key: 'divider-account',
      type: 'group',
      children: [
        {
          label: 'My Account',
          key: 'account',
          icon: <UserOutlined/>
        },
        {
          label: 'Sign out',
          key: 'signout',
          icon: <LogoutOutlined/>
        }
      ]
    },
    
  ]

  const handleSelect: MenuProps["onClick"] = ({ key }) => {

    switch(key) {
      case 'users':
        router.push(`/dash/company/${company?._id||'null'}/users`)
        break;
      case 'settings':
        router.push(`/dash/company/${company?._id||'null'}/settings`)
        break;
      case 'metrics':
        router.push(`/dash/company/${company?._id||'null'}/metrics`)
        break;
      case 'signout':
        signOut(() => router.push('/'))
        break;
      case 'account':
        router.push('/dash/account')
        break;
      case 'companySelect': break;
      case 'newCoBtn': break;
      default: 
        message(`No available page`, 'warning')
        break;
    }

  }

  return (
    <div className='bg-white flex flex-col border-r border-solid border-gray-300 border-l-0 border-y-0' style={{ minWidth: 200 }}>
      <Menu
        items={accountItems}
        onSelect={handleSelect}
        selectedKeys={selectedKeys}
        style={{
          borderRight: 'none'
        }}
      />
    </div>
  )
}