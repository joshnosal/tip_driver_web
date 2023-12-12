import Company from '@/lib/database/models/company'
import { redirect } from 'next/navigation'

export default async function MetricsPage({ params }: { params: {id: string}}){

  if(!params.id || params.id === 'null') redirect('/dash/company/new')

  let company = await Company.findById(params.id)
  if(!company) throw new Error()

  return (
    <div>Metrics Page</div>
  )
}