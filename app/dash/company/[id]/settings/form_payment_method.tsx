import { AppContext } from '@/utils/AppContext';
import { SettingsProps } from './page';
import { Button, Card, Popconfirm } from 'antd';
import React from 'react';
import Stripe from 'stripe';
import api from '@/utils/API';
import { useRouter } from 'next/navigation'
import { PaymentElement, Elements, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '@clerk/nextjs';

type Props =  Pick<SettingsProps, 'company'|'stripePublicKey'|'subscriptionInfo'> 
interface SubProps extends Props {
  setView: (v: string|void) => any
}

function CustomForm(props: SubProps){

  const stripe = useStripe()
  const elements = useElements()
  const [ loading, setLoading ] = React.useState(false)
  const { message } = React.useContext(AppContext)
  const { getToken } = useAuth()
  const router = useRouter()

  const handleSubmit: React.MouseEventHandler<HTMLElement> = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if(!elements || !stripe) return

      const { error: submitError } = await elements.submit()
      if(submitError) throw new Error()

      let method = await stripe.createPaymentMethod({ elements })

      if(!method.paymentMethod) throw new Error()
      
      await api.get({
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/add_payment_method',
        headers: {
          companyId: props.company._id,
          paymentMethodId: method.paymentMethod.id,
          Authorization: `Bearer ${ await getToken() }`
        }
      })

      router.refresh()
      props.setView()
    } catch(e) {
      message('Failed to create card', 'error')
    }
    setLoading(false)
  }

  return (
    <>
      <PaymentElement/>
      <AddressElement options={{ mode: 'billing'}}/>
      <div className='flex gap-4 mt-4'>
        <Button
          onClick={handleSubmit}
          loading={loading}
          type='primary'
        >{props.subscriptionInfo.paymentMethod ? 'Update Card' : 'Add Card'}</Button>
        {props.subscriptionInfo.paymentMethod && (
          <Button
            onClick={() => props.setView()}
          >Cancel</Button>
        )}
      </div>
    </>
  )
}

export default function PaymentMethodForm(props: Props){
  const [ view, setView ] = React.useState<string|void>()
  const { message } = React.useContext(AppContext)
  const { getToken } = useAuth()
  const router = useRouter()

  let method = props.subscriptionInfo.paymentMethod
  let name: string
  let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', "Dec"]
  let date = method ? new Date(method.created * 1000) : new Date()
  let created: string = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  let expires: string
  if(method && method.card && method.type === 'card') {
    name = `${method.card.brand.toUpperCase()} (x${method.card.last4})`
    expires = `${method.card.exp_month}/${method.card.exp_year.toString().slice(2)}`
  } else {
    name = 'Unknown'
    expires = 'Unknown'
  }

  const deletePaymentMethod = async () => {
    try {
      await api.get({
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/delete_payment_method',
        headers: { 
          companyId: props.company._id, 
          Authorization: `Bearer ${ await getToken() }`
        }
      })
      router.refresh()
    } catch(e) {
      message('Failed to remove payment method', 'error')
    }
  }

  return (
    <>
      <Elements
        stripe={loadStripe(props.stripePublicKey)}
        options={{
          mode: 'setup',
          currency: 'usd',
          paymentMethodCreation: 'manual'
        }}
      >
        {!props.subscriptionInfo.paymentMethod || view === 'new' ? (
          <CustomForm
            {...props}
            setView={setView}
          />
        ) : (
          <Card
            title={name}
            actions={method ? [
              <Button
                type='primary'
                onClick={() => setView('new')}
                key={'1'}
              >Change</Button>,
              <Popconfirm
                onConfirm={deletePaymentMethod}
                title='Are you sure?'
                okText='Yes'
                cancelText='No'
                description='This will immediately cancel all subscriptions and cannot be un-done. If you would like to use a different card for payment, click "Change" below.'
                overlayInnerStyle={{ width: 250 }}
                key={'2'}
              >
                <Button
                  danger
                >Remove</Button>
              </Popconfirm>,
            ] : [
              <Button
                type='primary'
                onClick={() => setView('new')}
                key={'1'}
              >Add Payment Method</Button>
            ]}
          >
            <div className='flex flex-col space-y-2' style={{ minWidth: 300 }}>
              <div className='flex gap-2'>
                <div style={{ width: 100 }} className='font-semibold text-slate-500'>Card Holder:</div>
                <div>{method ? method.billing_details.name : '-'}</div>
              </div>
              <div className='flex gap-2'>
                <div style={{ width: 100 }} className='font-semibold text-slate-500'>Expires:</div>
                <div>{method ? expires : '-'}</div>
              </div>
              <div className='flex gap-2'>
                <div style={{ width: 100 }} className='font-semibold text-slate-500'>Added:</div>
                <div>{method ? created: '-'}</div>
              </div>
            </div>
          </Card>
        )}
        
      </Elements>
    </>
  )
}