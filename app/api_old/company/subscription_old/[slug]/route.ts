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

const startSubscription = async (companyId: string, user: User, priceId: string) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  await stripe.startSubscription({ customerId: company.stripe_customer_id, priceId })
}

const stopSubscription = async (companyId: string, user: User, priceId: string) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  await stripe.stopSubscription({ customerId: company.stripe_customer_id, priceId })
}

const pauseSubscription = async (companyId: string, user: User, subscriptionType: string) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  if(subscriptionType === 'app') {
    await stripe.cancelAppSubscription(company.stripe_customer_id)
  } else {
    throw new Error('Failed to pause subscription')
  }
}

export const GET = async (
  req: NextRequest,
  { params }: { params: { slug: string } }
) => {
  let headersList = headers()
  let user = await currentUser()
  if(!user) throw new Error(ErrorTypes.NoAuth)

  try {
    if(params.slug === 'start' || params.slug === 'stop') {
      let companyId = headersList.get('companyId')
      let priceId = headersList.get('priceId')
      if(!companyId || !priceId) throw new Error(ErrorTypes.NoAuth)
      if(params.slug === 'start') {
        await startSubscription(companyId, user, priceId)
      } else {
        await stopSubscription(companyId, user, priceId)
      }
    }
    
    
    else if (params.slug === 'pause') {
      let companyId = headersList.get('companyId')
      let subscriptionType = headersList.get('subscriptionType') as 'device'|'app'|null
      if(!companyId || !subscriptionType) throw new Error(ErrorTypes.NoAuth)
      await pauseSubscription(companyId, user, subscriptionType)
    }

    return NextResponse.json({})
  } catch(e) {
    console.log(e)
    return sendErrorToClient(e)
  }
}