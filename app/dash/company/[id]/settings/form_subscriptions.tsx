import { AppContext } from '@/utils/AppContext';
import { SettingsProps } from './page';
import { Button, Card } from 'antd';
import React from 'react';
import Stripe from 'stripe';
import api from '@/utils/API';
import { useRouter } from 'next/navigation'
import { CheckCircleTwoTone, MinusCircleOutlined } from '@ant-design/icons'

type Props = Pick<SettingsProps, 'company'|'subscriptionInfo'>

export default function SubscriptionsForm({ company, subscriptionInfo: { prices, products, subscriptions, trialed }}: Props){
  const [ loading, setLoading ] = React.useState<string|void>()
  const { message, Authorization } = React.useContext(AppContext)
  const router = useRouter()

  const startSubscription = (priceId: string) => async () => {
    setLoading(`start-${priceId}`)
    try {
      await api.get({
        url: process.env.NEXT_PUBLIC_API_URL + '/subscription/start',
        headers: {
          companyId: company._id,
          priceId,
          Authorization
        }
      })
      router.refresh()
    } catch(e) {
      console.log(e)
      message('Failed to start', 'error')
      setLoading()
    }
  } 

  const stopSubscription = (priceId: string) => async () => {
    setLoading(`stop-${priceId}`)
    try {
      await api.get({
        url: process.env.NEXT_PUBLIC_API_URL + '/subscription/stop',
        headers: {
          companyId: company._id,
          priceId,
          Authorization
        }
      })
      router.refresh()
    } catch(e) {
      console.log(e)
      message('Failed to stop', 'error')
      setLoading()
    }
  } 

  return (
    <>
      {products.map(product => {
        let subscription: Stripe.Subscription | undefined = undefined
        for(const sub of subscriptions) {
          for(const subItem of sub.items.data) {
            if(subItem.plan.product === product.id) {
              subscription = sub
              break
            }
          }
          if(subscription) break
        }
        return (
          <Card
            key={product.id}
            title={
              <div className='flex items-center gap-2'>
                {subscription ? <CheckCircleTwoTone twoToneColor='#03C04A' style={{ fontSize: 24 }}/> : <MinusCircleOutlined style={{ fontSize: 24 }}/> }
                <div className='text-lg font-semibold'>{product.name}</div>
              </div>
            }
            size='small'
            actions={subscription ? [
              <Button>Usage</Button>,
              <Button
                danger
                onClick={stopSubscription(product.default_price.id)}
                loading={Boolean(loading === `stop-${product.default_price.id}`)}
              >Cancel</Button>
            ] : [
              <Button
                type='primary'
                onClick={startSubscription(product.default_price.id)}
                loading={Boolean(loading === `start-${product.default_price.id}`)}
              >{trialed ? 'Subscribe' : 'Start Free Trial'}</Button>
            ]}
          >
            <div className='flex flex-col space-y-2'>
            <div className='flex gap-2'>
              <div style={{ width: 50 }} className='font-semibold text-slate-500'>About:</div>
              <div>{product.description}</div>
            </div>
            <div className='flex gap-2'>
              <div style={{ width: 50 }} className='font-semibold text-slate-500'>Pricing:</div>
              <div>{product.default_price.billing_scheme === 'tiered' ? 'Based on monthly usage' : ''}</div>
            </div>
              
            <div className='flex gap-2'>
              <div style={{ width: 50 }} className='font-semibold text-slate-500'>Tiers:</div>
              <div>
                {product.default_price.tiers?.map((tier, index) => (
                  <div key={index}>{tier.up_to ? 
                    `$${((tier.unit_amount || 0) / 100).toLocaleString()} per device up to ${tier.up_to.toLocaleString()} devices`
                    : `$${((tier.unit_amount || 0) / 100).toLocaleString()} per device (unlimited)`
                  }</div>
                ))}
              </div>
            </div>
            </div>
          </Card>
        )
      })}
    </>
    
  )
}