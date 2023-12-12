import { ErrorTypes } from '@/utils/Options'
import type { User } from '@clerk/nextjs/api'

const getPrimaryEmail = (user: User|null): string => {
  if(!user) throw new Error(ErrorTypes.NoAuth)
  for(const email of user.emailAddresses) {
    if(email.id === user.primaryEmailAddressId) return email.emailAddress
  }
  throw new Error(ErrorTypes.DefaultServer)
}

const getUserName = (user: User | null): string => {
  if(!user) return ''
  let name: string = ''
  if(user.firstName) name += user.firstName
  if(user.lastName) name += ' ' + user.lastName
  if(!name) name += getPrimaryEmail(user)
  return name
}

const clerkTools = {
  getPrimaryEmail,
  getUserName
}

export default clerkTools