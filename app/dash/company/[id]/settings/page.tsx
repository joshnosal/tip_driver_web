
import Company, { CompanyDocument } from '@/lib/database/models/company'
import { redirect } from 'next/navigation'
import SettingsDisplay from './display'
import { currentUser, clerkClient, auth } from '@clerk/nextjs'
import { ErrorTypes } from '@/utils/Options'
// import stripe from '@/lib/stripe'
import Stripe from 'stripe'
import type { CompanyProps } from '@/lib/database/models/company'
import api from '@/utils/API'

// export type SubscriptionData = {
//   deviceSubscription: Stripe.Subscription | undefined
//   deviceProduct: Stripe.Product | undefined
//   devicePrice: Stripe.Price | undefined
// }

interface ProductWithPrice extends Stripe.Product {
  default_price: Stripe.Price
}

export type SettingsProps = {
  company: CompanyProps
  stripeStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    missingFields: number
  }
  stripePublicKey: string
  subscriptionInfo: {
    prices: Stripe.Price[],
    products: ProductWithPrice[]
    paymentMethod?: Stripe.PaymentMethod
    subscriptions: Stripe.Subscription[]
    trialed: boolean
  }
}

export default async function SettingsPage({ params }: { params: {id: string}}){
  const user = await currentUser()
  const { getToken } = auth()
  if(!user) throw new Error(ErrorTypes.NoAuth)

  if(!params.id || params.id === 'null') return redirect('/dash/company/new')

  let props: SettingsProps

  try {
    const Authorization = `Bearer ${await getToken()}`

    let company = await api.get<CompanyProps>({
      url: process.env.NEXT_PUBLIC_API_URL + '/company/company',
      headers: {
        companyId: params.id,
        Authorization
      }
    })
    if(!company) throw new Error(ErrorTypes.NoAuth)
    if(!process.env.STRIPE_PUBLIC) throw new Error()
    
    props = {
      company: JSON.parse(JSON.stringify(company)),
      stripeStatus: { chargesEnabled: false, payoutsEnabled: false, missingFields: 0 },
      stripePublicKey: process.env.STRIPE_PUBLIC,
      subscriptionInfo: {
        prices: [],
        products: [],
        subscriptions: [],
        trialed: false
      }
    }

    if(company.stripe_id) {
      try {
        const account = await api.get<Stripe.Account>({
          url: process.env.NEXT_PUBLIC_API_URL + '/stripe/account',
          headers: {
            companyId: params.id,
            Authorization
          }
        })
        if(account.charges_enabled) props.stripeStatus.chargesEnabled = true
        if(account.payouts_enabled) props.stripeStatus.payoutsEnabled = true
        if(account.requirements && account.requirements.currently_due) props.stripeStatus.missingFields = account.requirements.currently_due.length || 0
      } catch(e) {

      }
      
    }

    let method: Stripe.PaymentMethod|undefined
    try {
      method = await api.get<Stripe.PaymentMethod>({
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/payment_method',
        headers: {
          companyId: params.id,
          Authorization
        }
      })
    } catch(e) {}

    let trialed = true
    try {
      trialed = await api.get<boolean>({
        url: process.env.NEXT_PUBLIC_API_URL + '/subscription/had_trial',
        headers: {
          companyId: params.id,
          Authorization
        }
      })
    } catch(e) {}

    let prices: Stripe.Price[] = []
    try {
      prices = await api.get<Stripe.Price[]>({
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/prices',
        headers: { Authorization }
      })
    } catch(e) {}
    
    let products: Stripe.Product[] = []
    try {
      products = await api.get<Stripe.Product[]>({
        url: process.env.NEXT_PUBLIC_API_URL + '/stripe/products',
        headers: { Authorization }
      })
    } catch(e) {}

    let subscriptions: Stripe.Subscription[] = []
    try {
      subscriptions = await api.get<Stripe.Subscription[]>({
        url: process.env.NEXT_PUBLIC_API_URL + '/subscription/customer_subscriptions',
        headers: { Authorization, companyId: params.id }
      })
    } catch(e) {}

    props.subscriptionInfo = {
      paymentMethod: method ? JSON.parse(JSON.stringify(method)) : method,
      prices: JSON.parse(JSON.stringify(prices)),
      products: JSON.parse(JSON.stringify(products)),
      subscriptions: JSON.parse(JSON.stringify(subscriptions)),
      trialed
    } 
    
  } catch(e) {
    console.log(e)
    throw new Error(ErrorTypes.DefaultServer)
  }

  return (
    <SettingsDisplay {...props}/>
  )
}