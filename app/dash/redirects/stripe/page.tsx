import Company from '@/lib/database/models/company'
import { ErrorTypes } from '@/utils/Options'
import { redirect } from 'next/navigation'
import Stripe from 'stripe'
import { RedirectType } from 'next/dist/client/components/redirect'

export default async function Redirect({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}){

  let code = searchParams.code
  let companyId = searchParams.state

  if(!process.env.STRIPE_SECRET || !code || Array.isArray(code) || !companyId || Array.isArray(companyId)) throw new Error()
  
  redirect(`/dash/company/${companyId}/settings`, RedirectType.replace)

}