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
import { BasicUser } from '@/app/dash/company/[id]/users/page'
import Device, { DeviceDocument } from '@/lib/database/models/device'

type ValidationProps = {
  validCompany: boolean,
  companyCount: number,
  validDevice: boolean,
  deviceCount: number,
  errorMessage: string,
  company?: CompanyDocument,
  device?: DeviceDocument,
  accountActive: boolean,
  paymentsEnabled: boolean,
  stripeUpdateLink?: string
}
// const validateApp = async (props: {
//   companyId: string|null
//   deviceId: string|null
//   uniqueId: string|null
//   ipAddress: string|null,
//   user: User
// }): Promise<ValidationProps> => {
//   let company: CompanyDocument

//   // Set initial negative validation state
//   const results: ValidationProps = {
//     validCompany: false,
//     companyCount: 0,
//     validDevice: false,
//     deviceCount: 0,
//     errorMessage: '',
//     accountActive: false,
//     paymentsEnabled: false
//   }

//   // Validate company
//   try {
//     results.companyCount = await Company.countDocuments({$or: [
//       {admins: props.user.id},
//       {basic_users: props.user.id}
//     ]})
//     if(!props.companyId) throw new Error()
//     company = await checkCompanyAuth(props.companyId, props.user.id)
//     results.validCompany = true
//     results.company = company
//   } catch(e) {
//     results.errorMessage = 'Missing company'
//     return results
//   }

//   // Check stripe customer account
//   try {
//     let subscriptions = await stripe.getCustomerSubscriptions(company.stripe_customer_id)
//     if(subscriptions.length) results.accountActive = true
//     for(const sub of subscriptions) {
//       if(sub.status !== 'active' && sub.status !== 'trialing') results.accountActive = false
//     }
//   } catch(e) {

//   }

//   // Check stripe connected account
//   try {
//     if(!company.stripe_id) throw new Error()
//     let account = await stripe.getAccount(company.stripe_id)
//     results.paymentsEnabled = Boolean(account.payouts_enabled && account.charges_enabled)
//     let link = await stripe.getAccountLink(account.id, process.env.HOME_URL + '/dash/company/'+ props.companyId+'/settings')
//     results.stripeUpdateLink = link
//   } catch(e) {
//     console.log(e)
//     results.errorMessage = 'Stripe account not set up'
//   }

//   // Validate device
//   try {
//     results.deviceCount = await Company.countDocuments({ company })
//     if(!props.deviceId) throw new Error()
//     let device = await Device.findOne({$and: [
//       {_id: props.deviceId},
//       {company: company._id}
//     ]})
//     if(!device) throw new Error()
//     results.validDevice = true
//     results.device = device
//   } catch(e) {
//     results.errorMessage = 'Missing device'
//   }

//   return results
// }

export const GET = async (
  req: NextRequest,
  { params }: { params: { slug: string } }
) => {
  let headersList = headers()
  let user = await currentUser()
  if(!user) throw new Error(ErrorTypes.NoAuth)
  try {

    if(params.slug === 'validate') {
      // let companyId = headersList.get('companyId')
      // let deviceId = headersList.get('deviceId')
      // let uniqueId = headersList.get('uniqueId')
      // let ipAddress = headersList.get('ipAddress')
      // return NextResponse.json(await validateApp({ companyId, user, deviceId, uniqueId, ipAddress }))
    } else {params.slug === 'connection_token'} {
      // return NextResponse.json(await stripe.getConnectionToken())
    }

    return NextResponse.json(params.slug)
  } catch(e) {
    return sendErrorToClient(e)
  }
}