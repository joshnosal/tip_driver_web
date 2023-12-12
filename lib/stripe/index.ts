import Stripe from 'stripe'

if(!process.env.STRIPE_SECRET) throw new Error('Missing stripe credentials')
const stripeSDK = new Stripe(process.env.STRIPE_SECRET)

const getAccount = async (id: string) => {
  const account = await stripeSDK.accounts.retrieve(id)
  return account
}

const getAccountLink = async (id: string, url: string) => {
  const link = await stripeSDK.accountLinks.create({
    account: id,
    type: 'account_onboarding',
    refresh_url: url,
    return_url: url
  })
  return link.url
}

const getOauthURL = async (id: string) => {
  if(!process.env.STRIPE_CLIENT_ID) throw new Error('Invalid stripe clientId')
  let link = await stripeSDK.oauth.authorizeUrl({ 
    client_id: process.env.STRIPE_CLIENT_ID, 
    response_type: 'code',
    state: id
  })
  return link
}

const unlinkAccount = async (accountId: string) => {
  if(!process.env.STRIPE_CLIENT_ID) throw new Error('Invalid stripe clientId')
  await stripeSDK.oauth.deauthorize({
    client_id: process.env.STRIPE_CLIENT_ID,
    stripe_user_id: accountId
  })
  return
}

const createAccount = async ({ name, email, companyId, returnUrl}: {name: string, email: string, companyId: string, returnUrl: string}) => {
  let account = await stripeSDK.accounts.create({
    type: 'express',
    business_type: 'company',
    business_profile: {
      name,
      support_email: email
    },
    country: 'US',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    metadata: {
      companyId
    },
    settings: {
      payouts: {
        schedule: {
          interval: 'weekly',
          weekly_anchor: 'monday'
        },
        debit_negative_balances: false
      }
    }
  })
  const link = await stripeSDK.accountLinks.create({
    account: account.id,
    type: 'account_onboarding',
    refresh_url: returnUrl,
    return_url: returnUrl
  })
  return { account, link }
}

const dashboardLink = async (accountId: string) => {
  let link = await stripeSDK.accounts.createLoginLink(accountId)
  return link.url
}

const createCustomer = async ({ email, name, metadata }: {email?: string, name: string, metadata?: {[key: string]: string}}) => {
  let customer = await stripeSDK.customers.create({
    name,
    email,
    metadata
  })
  return customer
}

const attachPaymentMethod = async (props: {
  paymentMethodId: string
  customerId: string
}) => {
  let oldMethods = await stripeSDK.customers.listPaymentMethods(props.customerId)

  // Attach setup intent to customer account
  let intent = await stripeSDK.setupIntents.create({
    customer: props.customerId,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
    payment_method: props.paymentMethodId,
  })

  // Update subscriptions
  let subs = await stripeSDK.subscriptions.list({ customer: props.customerId })
  for(const sub of subs.data) {
    await stripeSDK.subscriptions.update(sub.id, {default_payment_method: props.paymentMethodId })
  }

  // Update customer's default payment method
  await stripeSDK.customers.update(props.customerId,{
    invoice_settings: {
      default_payment_method: props.paymentMethodId
    }
  })

  // Detach old payment methods
  for(const method of oldMethods.data) {
    await stripeSDK.paymentMethods.detach(method.id)
  }
}

const removePaymentMethod = async (customerId: string) => {
  let subs = await stripeSDK.subscriptions.list({ customer: customerId })
  for(const sub of subs.data) {
    await stripeSDK.subscriptions.cancel(sub.id, { invoice_now: true })
    let invoices = await stripeSDK.invoices.list({ subscription: sub.id, status: 'draft' })
    for(const invoice of invoices.data) {
      await stripeSDK.invoices.finalizeInvoice(invoice.id)
    }
  }
  let customer = await stripeSDK.customers.retrieve(customerId)
  if(customer.deleted || !customer.invoice_settings.default_payment_method) return
  await stripeSDK.paymentMethods.detach(customer.invoice_settings.default_payment_method.toString())
}

const getCustomer = async (customerId: string) => {
  const customer = await stripeSDK.customers.retrieve(customerId)
  return customer
}

const getCustomerPaymentMethod = async(customerId: string) => {
  try {
    const customer = await stripeSDK.customers.retrieve(customerId)
    if(customer.deleted || !customer.invoice_settings.default_payment_method) return
    const paymentMethod = await stripeSDK.customers.retrievePaymentMethod(customerId, customer.invoice_settings.default_payment_method.toString())
    return paymentMethod
  } catch(e) {
    console.log(e)
  }
}

const getCustomerSubscriptions = async(customerId: string) => {
  return (await stripeSDK.subscriptions.list({ customer: customerId })).data
}

const checkSubscriptionTrial = async (customerId: string) => {
  const subs = await stripeSDK.subscriptions.list({customer: customerId, status: 'all'})
  for(const sub of subs.data) {
    if(sub.trial_start) return true
  }
  return false
}

const startSubscription = async (props: {
  customerId: string,
  priceId: string
}) => {
  const customer = await stripeSDK.customers.retrieve(props.customerId)
  if(customer.deleted) throw new Error('No customer payment method')

  let subs = await stripeSDK.subscriptions.list({ customer: props.customerId, status: 'all' })

  let hadTrial = true
  if(process.env.TRIAL_PERIOD === 'Yes') {
    hadTrial = false
    for(const sub of subs.data) {
      if(sub.trial_start) hadTrial = true
    }
  }

  // Check for previous device trial
  let trial_period_days = Number(process.env.TRIAL_PERIOD_DAYS || 0)
  let now = new Date()

  subs = await stripeSDK.subscriptions.list({ customer: props.customerId })
  let sub: Stripe.Subscription
  if(subs.data.length) {
    sub = subs.data[0]
    await stripeSDK.subscriptionItems.create({
      subscription: sub.id,
      price: props.priceId,
    })
  } else {
    sub = await stripeSDK.subscriptions.create({
      customer: props.customerId,
      collection_method: 'charge_automatically',
      items: [{ price: props.priceId }],
      ...(!hadTrial && {
        trial_period_days,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel'
          }
        },
      }),
      billing_cycle_anchor: new Date(now.getFullYear(), now.getMonth()+1, 1).getTime() / 1000
    })
  }
}

const stopSubscription = async (props: {
  customerId: string,
  priceId: string
}) => {
  const customer = await stripeSDK.customers.retrieve(props.customerId)
  if(customer.deleted) throw new Error('No customer payment method')

  let subs = await stripeSDK.subscriptions.list({ customer: props.customerId, price: props.priceId })
  if(!subs.data.length) {
    return
  } else if(subs.data.length < 2) {
    await stripeSDK.subscriptions.cancel(subs.data[0].id, {
      invoice_now: true,
      prorate: true
    })
  } else {
    for(const sub of subs.data) {
      for(const item of sub.items.data) {
        if(item.price.id === props.priceId) {
          await stripeSDK.subscriptionItems.del(item.id, {
            proration_behavior: 'always_invoice',
            clear_usage: true
          })
        }
      }
    }
  }
  

}

const cancelAppSubscription = async (customerId: string) => {
  const subs = await stripeSDK.subscriptions.list({ customer: customerId })
  for(const sub of subs.data) {
    if(sub.status === 'canceled' || sub.metadata.type !== 'app') continue 

    // Invoice for pro-rated period
    const invoice = await stripeSDK.invoices.create({
      auto_advance: true,
      collection_method: 'charge_automatically',
      customer: sub.customer.toString(),
      description: 'Prorated invoice for premium app subscription',
      subscription: sub.id,
    })

    // Cancel subscription
    await stripeSDK.subscriptions.update(sub.id, {
      cancel_at_period_end: true
    })
    return
  }
  throw new Error('Failed to pause subscription. No invoice found.')
}

// const getPrices = async () => {
//   return (await stripeSDK.prices.list({ expand: ['data.tiers']})).data
// }

// const getProducts = async () => {
//   return (await stripeSDK.products.list({ expand: ['data.default_price', 'data.default_price.tiers']})).data
// }

const getConnectionToken = async () => {
  return await stripeSDK.terminal.connectionTokens.create()
}

const stripe = {
  getAccount,
  getAccountLink,
  getOauthURL,
  unlinkAccount,
  createAccount,
  dashboardLink,
  createCustomer,
  attachPaymentMethod,
  removePaymentMethod,
  getCustomer,
  getCustomerPaymentMethod,
  getCustomerSubscriptions,
  startSubscription,
  stopSubscription,
  cancelAppSubscription,
  // getPrices,
  // getProducts,
  checkSubscriptionTrial,
  getConnectionToken
}

export default stripe


