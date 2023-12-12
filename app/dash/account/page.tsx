import { UserProfile } from '@clerk/nextjs'

export default function AccountPage(){

  return(
    <div className='grow flex justify-center overflow-auto p-5'>
      <UserProfile/>
    </div>
  )
}