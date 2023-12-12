import { NextRequest, NextResponse } from 'next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { clerkClient, currentUser } from '@clerk/nextjs'
import { headers } from 'next/headers'
import type { User } from '@clerk/nextjs/api'
import { sendErrorToClient } from '@/utils/ErrorHandler'
import { ErrorTypes } from '@/utils/Options'
import Company, { CompanyDocument, CompanyProps } from '@/lib/database/models/company'
import stripe from '@/lib/stripe'
import checkCompanyAuth from '@/utils/CompanyAuth'
import clerkTools from '@/lib/clerk/tools'

const getUpdateLink = async (id: string, user: User, redirectUrl: string) => {
  let company = await checkCompanyAuth(id, user.id, 'admin')
  if(!company.stripe_id) throw new Error()
  let link = await stripe.getAccountLink(company.stripe_id, redirectUrl)
  return link
}

const createStripeAccount = async (companyId: string, user: User, returnUrl: string) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  let { account, link } = await stripe.createAccount({
    name: company.name,
    email: clerkTools.getPrimaryEmail(user),
    companyId,
    returnUrl
  })

  await Company.updateOne({_id: company._id}, {
    stripe_id: account.id,
  })

  return link.url
}

const getDashboardLink = async (companyId: string, user: User) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  if(!company.stripe_id) throw new Error(ErrorTypes.NoAuth)
  return await stripe.dashboardLink(company.stripe_id)
}

const getAccount = async (companyId: string, user: User) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  if(!company.stripe_id) return
  return await stripe.getAccount(company.stripe_id)
}

const addPaymentMethod = async (companyId: string, user: User, paymentMethodId: string) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  if(!company.stripe_id) return
  await stripe.attachPaymentMethod({ paymentMethodId, customerId: company.stripe_customer_id })
  return
}

const removePaymentMethod = async (companyId: string, user: User ) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  await stripe.removePaymentMethod(company.stripe_customer_id)
}

export const GET = async (
  req: NextRequest,
  { params }: { params: { slug: string } }
) => {
  let headersList = headers()
  let user = await currentUser()
  if(!user) throw new Error(ErrorTypes.NoAuth)
  try {

    if (params.slug === 'update_link') {

      let companyId = headersList.get('companyId')
      let redirectUrl = headersList.get('redirectUrl')
      if(!companyId || !redirectUrl) throw new Error(ErrorTypes.NoAuth)
      return NextResponse.json(await getUpdateLink(companyId, user, redirectUrl))
  
    } else if (params.slug === 'create_account') {

      let companyId = headersList.get('companyId')
      let redirectUrl = headersList.get('redirectUrl')
      if(!companyId || !redirectUrl) throw new Error(ErrorTypes.NoAuth)
      return NextResponse.json(await createStripeAccount(companyId, user, redirectUrl))

    } else if (params.slug === 'dashboard_link') {

      let companyId = headersList.get('companyId')
      if(!companyId) throw new Error(ErrorTypes.NoAuth)
      return NextResponse.json(await getDashboardLink(companyId, user))

    } else if (params.slug === 'account') {

      let companyId = headersList.get('companyId')
      if(!companyId) throw new Error(ErrorTypes.NoAuth)
      let account = await getAccount(companyId, user)
      if(account) return NextResponse.json(account)

    } else if (params.slug === 'get_public_key') {

      return NextResponse.json(process.env.STRIPE_PUBLIC)

    } else if (params.slug === 'add_payment_method') {

      let companyId = headersList.get('companyId')
      let paymentMethodId = headersList.get('paymentMethodId')
      if(!companyId || !paymentMethodId) throw new Error(ErrorTypes.NoAuth)
      await addPaymentMethod(companyId, user, paymentMethodId)
    
    } else if (params.slug === 'delete_payment_method') {

      let companyId = headersList.get('companyId')
      if(!companyId) throw new Error(ErrorTypes.NoAuth)
      await removePaymentMethod(companyId, user)

    }

    return NextResponse.json({})
  } catch(e) {
    return sendErrorToClient(e)
  }

  
}

export const POST = async (
  req: NextRequest,
  { params }: { params: { slug: string } }
) => {
  try {
    let data = await req.json()
    let headersList = headers()
    let user = await currentUser()
    if(!user) throw new Error(ErrorTypes.NoAuth)
    let slug = params.slug

    return NextResponse.json({})
  } catch(e) {
    return sendErrorToClient(e)
  }
}