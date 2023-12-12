'use client'

import { Anchor } from 'antd'
import { SettingsProps } from './page';
import PaymentMethodForm from './form_payment_method';
import type { AnchorContainer } from 'antd/es/anchor/Anchor';
import SubscriptionsForm from './form_subscriptions';
import StripeForm from './form_stripe';
import TipSettingsForm from './form_tip_settings';
import React from 'react'


 
export default function SettingsDisplay(props: SettingsProps){
  const myRef = React.useRef<HTMLDivElement>(null)

  const TitleRow = (props: {title: string}) => (
    <div className='text-lg font-semibold mb-4 border border-solid border-x-0 border-t-0 border-slate-200' style={{ width: '80%'}}>{props.title}</div>
  )

  const sections: {
    key: string, 
    title: string, 
    content: React.ReactNode
  }[] = [
    {
      key: 'subscriptions',
      title: 'Subscriptions',
      content: (
        <SubscriptionsForm
          company={props.company}
          subscriptionInfo={props.subscriptionInfo}
        />
      )
    },
    {
      key: 'payment-method-form',
      title: 'Payment Method',
      content: (
        <PaymentMethodForm
          company={props.company}
          stripePublicKey={props.stripePublicKey}
          subscriptionInfo={props.subscriptionInfo}
        />
      )
    },
    {
      key: 'stripe-account',
      title: 'Stripe',
      content: (
        <StripeForm
          company={props.company}
          stripeStatus={props.stripeStatus}
        />
      )
    },
    {
      key: 'tip-settings',
      title: 'Tip Settings',
      content: (
        <TipSettingsForm
          company={props.company}
        />
      )
    }
  ]

  return (
    <div className='p-5 flex grow overflow-hidden'>
      <div className='bg-white rounded-lg grow overflow-hidden p-5 flex'>
        <div style={{ width: 200 }} className='overflow-hidden'>
          <Anchor
            items={sections.map(item => ({
              href: `#${item.key}`,
              title: item.title,
              key: item.key
            }))}
            affix={false}
            showInkInFixed={true}
            getContainer={() => myRef.current as AnchorContainer}
            targetOffset={200}
          />
        </div>
        <div 
          className='grow flex flex-col overflow-y-auto overflow-x-hidden space-y-20 pb-5 mt-5'
          ref={myRef}
        >
          {sections.map(item => (
            <div key={item.key} id={item.key} className='flex flex-col'>
              <TitleRow title={item.title}/>
              <div className='flex flex-col pl-5 self-start'>
                {item.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}