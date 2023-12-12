'use client'
import api from '@/utils/API'
import { getErrorMessage } from '@/utils/ErrorHandler'
import { CompanyProps } from '@/lib/database/models/company'
import { AppContext } from '@/utils/AppContext'
import { useContext, useState, useEffect } from 'react'
import { Button, Tag, Popconfirm } from 'antd'
import { useRouter } from 'next/navigation'
import { CheckCircleTwoTone, CheckOutlined, CloseOutlined } from '@ant-design/icons'

type Props = {
  company: CompanyProps
  stripeStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    missingFields: number
  }
}

const EnabledTag = ({ enabled }: { enabled: boolean }) => (
  <Tag
    color={ enabled ? 'success' : 'error'}
    icon={ enabled ? <CheckOutlined/> : <CloseOutlined/> }
  >
    {enabled ? 'Enabled' : 'Disabled'}
  </Tag>
)

export default function StripeForm({ company, stripeStatus }: Props){
  const { message, Authorization } = useContext(AppContext)
  const [ loading, setLoading ] = useState<string>('')
  const router = useRouter()

  const createAccount = (prop: string) => async () => {
    try {
      setLoading(prop)
      let url = await api.get<string>({ 
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/create_account', 
        headers: {
          companyId: company._id,
          redirectUrl: window.location.href,
          Authorization
        }
      })
      window.location.href = url
    } catch(e) {
      let msg = getErrorMessage(e)
      message(msg, 'error')
      setLoading('')
    }
  }

  const updateAccount = (prop: string) => async () => {
    try {
      setLoading(prop)
      let link = await api.get<string>({ 
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/update_link', 
        headers: { 
          companyId: company._id, 
          redirectUrl: window.location.href,
          Authorization
        }
      })
      window.location.href = link
    } catch(e) {
      let msg = getErrorMessage(e)
      message(msg, 'error')
      setLoading('')
    }
  }

  const goToDashboard = (prop: string) => async () => {
    try {
      setLoading(prop)
      let link = await api.get<string>({ 
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/dashboard_link', 
        headers: { 
          companyId: company._id,
          Authorization
        }
      })
      setLoading('')
      window.open(link, '_blank')?.focus()
    } catch(e) {
      let msg = getErrorMessage(e)
      message(msg, 'error')
      setLoading('')
    }
  }

  return company.stripe_id ? (
    <div className='flex flex-col space-y-5'>
      <div className='flex items-center justify-between border border-slate-300 border-solid rounded-md px-4 py-2'>
        <div className='text-base font-semibold' style={{ width: 150 }}>Charges</div>
        <EnabledTag enabled={stripeStatus.chargesEnabled}/>
      </div>
      <div className='flex items-center justify-between border border-slate-300 border-solid rounded-md px-4 py-2'>
        <div className='text-base font-semibold' style={{ width: 150 }}>Payouts</div>
        <EnabledTag enabled={stripeStatus.payoutsEnabled}/>
      </div>
      {stripeStatus.missingFields > 0 && (
      <div className='flex items-center justify-between border border-slate-300 border-solid rounded-md px-4 py-2'>
        <div className='text-base font-semibold' style={{ width: 150 }}>Missing Info</div>
        <Tag color='error'>
          {`${stripeStatus.missingFields} missing fields`}
        </Tag>
      </div>
      )}
      <div className='flex justify-between self-stretch'>
        <div className='flex gap-2'>
          <Button
            type='primary'
            onClick={updateAccount('stripeUpdate')}
            loading={Boolean(loading === 'stripeUpdate')}
          >Update</Button>
          <Button
            onClick={goToDashboard('stripeDashboard')}
            loading={Boolean(loading === 'stripeDashboard')}
            type='primary'
          >Dashboard</Button>
        </div>
      </div>
    </div>
  ) : (
    <div className='flex flex-col items-start space-y-5'>
      <div className='text-lg font-semibold'>Set up an account with Stripe</div>
      <div style={{maxWidth: 400}}>Setting up a stripe account will enable you to start collecting tips and receive weekly deposits into your bank account.</div>
      <Button 
        type='primary' 
        onClick={createAccount('create')}
        loading={Boolean(loading === 'create')}
      >
        Account Setup
      </Button>
    </div>
  )
}