'use client'

import { getErrorMessage } from '@/utils/ErrorHandler'
import { Button } from 'antd'
import { useRouter } from 'next/navigation'

export default function ErrorPage({ error, reset }: {
  error: Error & { digest?: string },
  reset: () => void
}){
  let msg = getErrorMessage(error)
  const router = useRouter()

  return(
    <div className='p-5 flex flex-col grow items-center justify-center'>
      <div className=' text-2xl mb-10 font-bold'>{msg}</div>
      <div className='flex gap-5'> 
        <Button size='large' type='primary' onClick={reset}>Retry</Button>
        <Button size='large' onClick={() => router.push('/')}>Back to Tip Driver</Button>
      </div>
    </div>
  )
}